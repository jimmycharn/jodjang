import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Icons } from '../ui/Icons';

const ScreenAuth = () => {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    let result;
    if (mode === 'login') {
      result = await login(email, password);
    } else {
      result = await signup(email, password, name);
    }

    setLoading(false);
    if (!result.success) {
      setError(result.message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#0a0a0a]">
      <div className="glass-dark p-8 rounded-2xl shadow-2xl w-full max-w-sm mx-auto animate-scale-in border border-white/10">
        <div className="text-center mb-10">
          <div className="w-20 h-20 gold-bg rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-gold-900/20 text-black">
            <Icons.PieChart size={40} />
          </div>
          <h1 className="text-3xl font-black gold-text tracking-tight">Money Tracker</h1>
          <p className="text-gray-500 text-sm mt-2 font-medium">จัดการการเงินอย่างมีระดับ</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 text-red-500 text-xs rounded-2xl text-center border border-red-500/20 font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {mode === 'signup' && (
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                <Icons.User size={20} />
              </div>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-gold-primary/50 transition-all font-bold"
                placeholder="ชื่อเล่น"
                required
              />
            </div>
          )}

          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
              <Icons.Mail size={20} />
            </div>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-gold-primary/50 transition-all font-bold"
              placeholder="อีเมล"
              required
            />
          </div>

          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
              <Icons.Lock size={20} />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full pl-12 pr-12 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-gold-primary/50 transition-all font-bold"
              placeholder="Password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
            >
              {showPassword ? <Icons.EyeOff size={20} /> : <Icons.Eye size={20} />}
            </button>
          </div>

          <button
            disabled={loading}
            type="submit"
            className="w-full py-4 gold-bg text-black font-black rounded-2xl shadow-xl shadow-gold-900/20 active:scale-95 transition-all mt-4 disabled:opacity-50"
          >
            {loading ? 'กำลังดำเนินการ...' : (mode === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก')}
          </button>
        </form>

        <button
          onClick={() => {
            setMode(mode === 'login' ? 'signup' : 'login');
            setError('');
          }}
          className="w-full mt-8 text-sm text-gray-400 font-bold hover:text-gold-primary transition-colors"
        >
          {mode === 'login' ? 'ยังไม่มีบัญชี? สมัครสมาชิก' : 'มีบัญชีอยู่แล้ว? เข้าสู่ระบบ'}
        </button>
      </div>
    </div>
  );
};

export default ScreenAuth;
