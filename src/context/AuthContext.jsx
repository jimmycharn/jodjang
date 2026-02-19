import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const stored = localStorage.getItem('money_tracker_user');
      if (stored) {
        const userData = JSON.parse(stored);
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userData.id)
          .single();
        
        if (data && !error) {
          setUser(data);
        } else {
          localStorage.removeItem('money_tracker_user');
        }
      }
    } catch (error) {
      console.error('Check user error:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const { hashPassword } = await import('../lib/utils');
      const passwordHash = await hashPassword(password);
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', email)
        .single();

      if (error || !data) {
        return { success: false, message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' };
      }

      if (data.password_hash === passwordHash || data.password_hash === password) {
        if (data.password_hash === password) {
          await supabase
            .from('users')
            .update({ password_hash: passwordHash })
            .eq('id', data.id);
        }
        
        const userData = { id: data.id, username: data.username, name: data.name };
        localStorage.setItem('money_tracker_user', JSON.stringify(userData));
        setUser(data);
        return { success: true, user: userData };
      }

      return { success: false, message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  const signup = async (email, password, name) => {
    try {
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('username', email)
        .single();

      if (existing) {
        return { success: false, message: 'อีเมลนี้ถูกใช้ไปแล้ว' };
      }

      const { hashPassword } = await import('../lib/utils');
      const passwordHash = await hashPassword(password);

      const { data, error } = await supabase
        .from('users')
        .insert({
          username: email,
          password_hash: passwordHash,
          name,
          email
        })
        .select()
        .single();

      if (error) {
        return { success: false, message: error.message };
      }

      const defaultCategories = [
        { id: 'c1_' + Date.now(), name: 'อาหาร', type: 'expense', budget: 6000, color: '#FF6B6B', user_id: data.id },
        { id: 'c2_' + Date.now(), name: 'เดินทาง', type: 'expense', budget: 3000, color: '#4ECDC4', user_id: data.id },
        { id: 'c3_' + Date.now(), name: 'ช้อปปิ้ง', type: 'expense', budget: 2000, color: '#FFE66D', user_id: data.id },
        { id: 'c4_' + Date.now(), name: 'อื่นๆ', type: 'expense', budget: 1000, color: '#A0AEC0', user_id: data.id },
        { id: 'c5_' + Date.now(), name: 'เงินเดือน', type: 'income', budget: 0, color: '#95D5B2', user_id: data.id }
      ];

      const defaultWallets = [
        { id: 'w1_' + Date.now(), name: 'เงินสด', type: 'cash', initial_balance: 0, color: '#4A5568', user_id: data.id }
      ];

      await supabase.from('categories').insert(defaultCategories);
      await supabase.from('wallets').insert(defaultWallets);

      const userData = { id: data.id, username: data.username, name: data.name };
      localStorage.setItem('money_tracker_user', JSON.stringify(userData));
      setUser(data);
      
      return { success: true, user: userData };
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  const logout = () => {
    localStorage.removeItem('money_tracker_user');
    setUser(null);
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export default AuthContext;
