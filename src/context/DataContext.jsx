import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const DataContext = createContext();

export const DataProvider = ({ children }) => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [savingsGoals, setSavingsGoals] = useState([]);
  const [settings, setSettings] = useState({ cutoffDay: 1 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user]);

  const fetchAllData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [txRes, catRes, walRes, savRes, setRes] = await Promise.all([
        supabase.from('transactions').select('*').eq('user_id', user.id).order('date', { ascending: false }),
        supabase.from('categories').select('*').eq('user_id', user.id),
        supabase.from('wallets').select('*').eq('user_id', user.id),
        supabase.from('savings_goals').select('*').eq('user_id', user.id),
        supabase.from('settings').select('*').eq('user_id', user.id)
      ]);

      if (txRes.data) setTransactions(txRes.data.map(t => ({
        ...t,
        categoryId: t.category_id,
        walletId: t.wallet_id
      })));
      if (catRes.data) setCategories(catRes.data);
      if (walRes.data) {
        const savedOrder = JSON.parse(localStorage.getItem('wallet_order') || '[]');
        if (savedOrder.length > 0) {
          const walletMap = new Map(walRes.data.map(w => [w.id, w]));
          const sorted = [];
          savedOrder.forEach(id => {
            if (walletMap.has(id)) {
              sorted.push(walletMap.get(id));
              walletMap.delete(id);
            }
          });
          walletMap.forEach(w => sorted.push(w));
          setWallets(sorted.map(w => ({ ...w, initialbalance: w.initial_balance })));
        } else {
          setWallets(walRes.data.map(w => ({ ...w, initialbalance: w.initial_balance })));
        }
      }
      if (savRes.data) setSavingsGoals(savRes.data.map(s => ({
        ...s,
        targetamount: s.target_amount,
        currentamount: s.current_amount
      })));
      if (setRes.data) {
        const settingsObj = { cutoffDay: 1 };
        setRes.data.forEach(s => { settingsObj[s.key] = s.value; });
        setSettings(settingsObj);
      }
    } catch (error) {
      console.error('Fetch data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveTransaction = async (tx, isEdit = false) => {
    if (!user) return { success: false };
    try {
      const txData = {
        id: tx.id,
        date: tx.date,
        type: tx.type,
        category_id: tx.categoryId,
        amount: tx.amount,
        note: tx.note,
        wallet_id: tx.walletId,
        user_id: user.id
      };

      if (isEdit) {
        const { error } = await supabase
          .from('transactions')
          .update(txData)
          .eq('id', tx.id)
          .eq('user_id', user.id);
        if (error) return { success: false, error: error.message };
      } else {
        const { error } = await supabase
          .from('transactions')
          .insert(txData);
        if (error) return { success: false, error: error.message };
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const deleteTransaction = async (id) => {
    if (!user) return { success: false };
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const updateCategories = async (cats) => {
    if (!user) return { success: false };
    try {
      await supabase.from('categories').delete().eq('user_id', user.id);
      const catsData = cats.map(c => ({
        id: c.id,
        name: c.name,
        type: c.type,
        budget: c.budget || 0,
        color: c.color,
        user_id: user.id
      }));
      const { error } = await supabase.from('categories').insert(catsData);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const deleteCategory = async (id) => {
    if (!user) return { success: false };
    try {
      await supabase.from('categories').delete().eq('id', id).eq('user_id', user.id);
      await supabase.from('transactions').update({ category_id: null }).eq('category_id', id).eq('user_id', user.id);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const updateWallets = async (walletsData) => {
    if (!user) return { success: false };
    try {
      await supabase.from('wallets').delete().eq('user_id', user.id);
      const data = walletsData.map(w => ({
        id: w.id,
        name: w.name,
        type: w.type || 'other',
        initial_balance: w.initialbalance || 0,
        color: w.color,
        user_id: user.id
      }));
      const { error } = await supabase.from('wallets').insert(data);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const deleteWallet = async (id) => {
    if (!user) return { success: false };
    try {
      await supabase.from('wallets').delete().eq('id', id).eq('user_id', user.id);
      await supabase.from('transactions').update({ wallet_id: null }).eq('wallet_id', id).eq('user_id', user.id);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const updateSavingsGoals = async (goals) => {
    if (!user) return { success: false };
    try {
      await supabase.from('savings_goals').delete().eq('user_id', user.id);
      const data = goals.map(g => ({
        id: g.id,
        name: g.name,
        target_amount: g.targetamount || 0,
        current_amount: g.currentamount || 0,
        color: g.color,
        icon: g.icon || 'Star',
        user_id: user.id
      }));
      const { error } = await supabase.from('savings_goals').insert(data);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const deleteSavingsGoal = async (id) => {
    if (!user) return { success: false };
    try {
      await supabase.from('savings_goals').delete().eq('id', id).eq('user_id', user.id);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const transferBetweenWallets = async (fromId, toId, amount, date, note) => {
    if (!user) return { success: false };
    try {
      const { generateId } = await import('../lib/utils');
      const outTx = {
        id: 'trf_out_' + generateId(),
        date,
        type: 'expense',
        category_id: null,
        amount,
        note: `[โอนออก] ${note}`,
        wallet_id: fromId,
        user_id: user.id
      };
      const inTx = {
        id: 'trf_in_' + generateId(),
        date,
        type: 'income',
        category_id: null,
        amount,
        note: `[โอนเข้า] ${note}`,
        wallet_id: toId,
        user_id: user.id
      };
      const { error } = await supabase.from('transactions').insert([outTx, inTx]);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  return (
    <DataContext.Provider value={{
      transactions, setTransactions,
      categories, setCategories,
      wallets, setWallets,
      savingsGoals, setSavingsGoals,
      settings, setSettings,
      loading,
      fetchAllData,
      saveTransaction,
      deleteTransaction,
      updateCategories,
      deleteCategory,
      updateWallets,
      deleteWallet,
      updateSavingsGoals,
      deleteSavingsGoal,
      transferBetweenWallets
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => useContext(DataContext);

export default DataContext;
