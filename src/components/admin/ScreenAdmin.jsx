import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Icons } from '../ui/Icons';
import { formatCurrency, toLocalDateString, generateId } from '../../lib/utils';

const ScreenAdmin = ({ onBack }) => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [allWallets, setAllWallets] = useState([]);
  const [allPackages, setAllPackages] = useState([]);
  const [allSubscriptions, setAllSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [activeView, setActiveView] = useState('overview');
  const [editingPkg, setEditingPkg] = useState(null);
  const [pkgForm, setPkgForm] = useState({ name: '', slug: '', price: '', duration_days: '', description: '', user_visible: true, features: { voice: true, max_wallets: 999, wallet_edit: true, csv_export: true, transfer: true } });
  const [assigningUser, setAssigningUser] = useState(null);
  const [assignPkgId, setAssignPkgId] = useState('');
  const [assignDays, setAssignDays] = useState('');

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [usersRes, txRes, catRes, walRes, pkgRes, subRes] = await Promise.all([
        supabase.from('users').select('id, username, name, email, role, created_at').order('created_at', { ascending: false }),
        supabase.from('transactions').select('*').order('date', { ascending: false }),
        supabase.from('categories').select('*'),
        supabase.from('wallets').select('*'),
        supabase.from('packages').select('*').order('sort_order'),
        supabase.from('user_subscriptions').select('*, packages(name, slug)').eq('status', 'active')
      ]);

      if (usersRes.data) setUsers(usersRes.data);
      if (txRes.data) setAllTransactions(txRes.data);
      if (catRes.data) setAllCategories(catRes.data);
      if (walRes.data) setAllWallets(walRes.data);
      if (pkgRes.data) setAllPackages(pkgRes.data);
      if (subRes.data) setAllSubscriptions(subRes.data);
    } catch (error) {
      console.error('Admin fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const today = new Date();
  const thisMonth = toLocalDateString(new Date(today.getFullYear(), today.getMonth(), 1));
  const thisMonthEnd = toLocalDateString(new Date(today.getFullYear(), today.getMonth() + 1, 0));

  const stats = useMemo(() => {
    const totalUsers = users.length;
    const monthTx = allTransactions.filter(t => t.date >= thisMonth && t.date <= thisMonthEnd);
    const totalExpense = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
    const totalIncome = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
    const totalTxCount = allTransactions.length;
    const monthTxCount = monthTx.length;

    const activeUsers = new Set(monthTx.map(t => t.user_id)).size;

    return { totalUsers, totalExpense, totalIncome, totalTxCount, monthTxCount, activeUsers };
  }, [users, allTransactions, thisMonth, thisMonthEnd]);

  const userStats = useMemo(() => {
    return users.map(u => {
      const userTx = allTransactions.filter(t => t.user_id === u.id);
      const monthTx = userTx.filter(t => t.date >= thisMonth && t.date <= thisMonthEnd);
      const expense = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
      const income = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
      const walletCount = allWallets.filter(w => w.user_id === u.id).length;
      const catCount = allCategories.filter(c => c.user_id === u.id).length;

      return {
        ...u,
        totalTx: userTx.length,
        monthTx: monthTx.length,
        expense,
        income,
        walletCount,
        catCount
      };
    });
  }, [users, allTransactions, allWallets, allCategories, thisMonth, thisMonthEnd]);

  const selectedUserData = useMemo(() => {
    if (!selectedUser) return null;
    const u = userStats.find(us => us.id === selectedUser);
    if (!u) return null;

    const userTx = allTransactions.filter(t => t.user_id === selectedUser);
    const userCats = allCategories.filter(c => c.user_id === selectedUser);
    const userWallets = allWallets.filter(w => w.user_id === selectedUser);

    const monthTx = userTx.filter(t => t.date >= thisMonth && t.date <= thisMonthEnd);

    const catAgg = monthTx.filter(t => t.type === 'expense').reduce((acc, t) => {
      acc[t.categoryId] = (acc[t.categoryId] || 0) + Number(t.amount);
      return acc;
    }, {});

    const topCategories = Object.entries(catAgg)
      .map(([id, amount]) => {
        const cat = userCats.find(c => c.id === id);
        return { name: cat?.name || 'อื่นๆ', color: cat?.color || '#ccc', amount };
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    const recentTx = userTx.slice(0, 10).map(t => {
      const cat = userCats.find(c => c.id === t.categoryId);
      const wallet = userWallets.find(w => w.id === t.walletId);
      return { ...t, categoryName: cat?.name || '-', walletName: wallet?.name || '-' };
    });

    return { ...u, topCategories, recentTx, userWallets };
  }, [selectedUser, userStats, allTransactions, allCategories, allWallets, thisMonth, thisMonthEnd]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="w-12 h-12 border-4 border-gold-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="pb-32 pt-6 px-4 min-h-screen bg-[#0a0a0a] flex flex-col max-w-md mx-auto w-full">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-2 text-gray-400 hover:text-white transition-colors">
          <Icons.ArrowLeft size={24} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Icons.Shield size={20} className="text-gold-primary" />
            <h1 className="text-2xl font-black text-white tracking-tight">Admin Dashboard</h1>
          </div>
          <p className="text-xs text-gray-500 font-bold mt-1">จัดการระบบและดูข้อมูลผู้ใช้</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 overflow-x-auto hide-scroll pb-2">
        {[
          { id: 'overview', label: 'ภาพรวม', icon: <Icons.BarChart3 size={16} /> },
          { id: 'users', label: 'ผู้ใช้', icon: <Icons.Users size={16} /> },
          { id: 'packages', label: 'แพ็คเกจ', icon: <Icons.Package size={16} /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveView(tab.id); setSelectedUser(null); }}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-xs whitespace-nowrap transition-all border ${activeView === tab.id ? 'gold-bg text-black border-gold-primary shadow-lg shadow-gold-900/20' : 'bg-white/5 text-gray-500 border-white/5'}`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeView === 'overview' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-dark p-5 rounded-xl border border-white/10">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Icons.Users size={16} className="text-blue-400" />
                </div>
              </div>
              <div className="text-2xl font-black text-white">{stats.totalUsers}</div>
              <div className="text-xs text-gray-500 font-bold">ผู้ใช้ทั้งหมด</div>
            </div>

            <div className="glass-dark p-5 rounded-xl border border-white/10">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <Icons.Activity size={16} className="text-green-400" />
                </div>
              </div>
              <div className="text-2xl font-black text-white">{stats.activeUsers}</div>
              <div className="text-xs text-gray-500 font-bold">ใช้งานเดือนนี้</div>
            </div>

            <div className="glass-dark p-5 rounded-xl border border-white/10 dark:bg-white/5 bg-red-500/10 dark:border-white/10 border-red-500/30">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl bg-red-500/20 flex items-center justify-center">
                  <Icons.TrendingUp size={16} className="text-red-400 dark:text-red-400 text-red-600" />
                </div>
              </div>
              <div className="text-lg font-black text-white dark:text-white text-red-600">{formatCurrency(stats.totalExpense)}</div>
              <div className="text-xs text-gray-500 dark:text-gray-500 text-red-600 font-bold">รายจ่ายเดือนนี้</div>
            </div>

            <div className="glass-dark p-5 rounded-xl border border-white/10 dark:bg-white/5 bg-green-500/10 dark:border-white/10 border-green-500/30">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl bg-gold-primary/20 flex items-center justify-center">
                  <Icons.DollarSign size={16} className="text-gold-primary dark:text-gold-primary text-green-600" />
                </div>
              </div>
              <div className="text-lg font-black text-white dark:text-white text-green-600">{formatCurrency(stats.totalIncome)}</div>
              <div className="text-xs text-gray-500 dark:text-gray-500 text-green-600 font-bold">รายรับเดือนนี้</div>
            </div>
          </div>

          {/* Transaction Stats */}
          <div className="glass-dark p-6 rounded-xl border border-white/10">
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">สถิติรายการ</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400 font-bold">รายการทั้งหมด</span>
                <span className="text-sm text-white font-black">{stats.totalTxCount.toLocaleString()} รายการ</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400 font-bold">รายการเดือนนี้</span>
                <span className="text-sm text-white font-black">{stats.monthTxCount.toLocaleString()} รายการ</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400 font-bold">เงินสุทธิเดือนนี้</span>
                <span className={`text-sm font-black ${stats.totalIncome - stats.totalExpense >= 0 ? 'text-green-400 dark:text-green-400 text-green-600' : 'text-red-400 dark:text-red-400 text-red-600'}`}>
                  {formatCurrency(stats.totalIncome - stats.totalExpense)}
                </span>
              </div>
            </div>
          </div>

          {/* Top Users */}
          <div className="glass-dark p-6 rounded-xl border border-white/10">
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">ผู้ใช้ที่ใช้งานมากสุด</h3>
            <div className="space-y-3">
              {userStats
                .sort((a, b) => b.monthTx - a.monthTx)
                .slice(0, 5)
                .map((u, i) => (
                  <div key={u.id} className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${i === 0 ? 'gold-bg text-black' : 'bg-white/10 text-gray-400'}`}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-black text-white truncate">{u.name || u.username}</div>
                      <div className="text-xs text-gray-500">{u.monthTx} รายการเดือนนี้</div>
                    </div>
                    <div className="text-xs font-bold text-gray-400 dark:text-gray-400 text-red-600">{formatCurrency(u.expense)}</div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Users List */}
      {activeView === 'users' && !selectedUser && (
        <div className="space-y-3">
          {userStats.map(u => (
            <button
              key={u.id}
              onClick={() => setSelectedUser(u.id)}
              className="w-full glass-dark p-5 rounded-xl border border-white/10 text-left hover:border-gold-primary/30 transition-all active:scale-[0.98]"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
                  {u.role === 'admin' ? (
                    <Icons.Shield size={20} className="text-gold-primary" />
                  ) : (
                    <Icons.User size={20} className="text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-white truncate">{u.name || u.username}</span>
                    {u.role === 'admin' && (
                      <span className="px-2 py-0.5 rounded-lg gold-bg text-black text-[10px] font-black">ADMIN</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 font-bold">@{u.username}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-black text-white">{u.monthTx} รายการ</div>
                  <div className="text-[10px] text-gray-500 font-bold">เดือนนี้</div>
                </div>
                <Icons.ChevronRight size={16} className="text-gray-600" />
              </div>

              <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-white/5">
                <div>
                  <div className="text-[10px] text-gray-500 font-bold">รายจ่าย</div>
                  <div className="text-xs font-black text-red-400 dark:text-red-400 text-red-600">{formatCurrency(u.expense)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 font-bold">รายรับ</div>
                  <div className="text-xs font-black text-green-400 dark:text-green-400 text-green-600">{formatCurrency(u.income)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 font-bold">กระเป๋า</div>
                  <div className="text-xs font-black text-gray-300">{u.walletCount}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* User Detail */}
      {activeView === 'users' && selectedUser && selectedUserData && (
        <div className="space-y-6">
          {/* Back & User Info */}
          <div className="flex items-center gap-3 mb-2">
            <button onClick={() => setSelectedUser(null)} className="p-2 text-gray-400 hover:text-white transition-colors">
              <Icons.ArrowLeft size={20} />
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-white">{selectedUserData.name || selectedUserData.username}</span>
                {selectedUserData.role === 'admin' && (
                  <span className="px-2 py-0.5 rounded-lg gold-bg text-black text-[10px] font-black">ADMIN</span>
                )}
              </div>
              <div className="text-xs text-gray-500 font-bold">@{selectedUserData.username} • {selectedUserData.email || 'ไม่มีอีเมล'}</div>
            </div>
          </div>

          {/* Current Package & Assign */}
          {(() => {
            const userSub = allSubscriptions.find(s => s.user_id === selectedUser && s.status === 'active');
            const userPkgName = userSub?.packages?.name || 'ฟรี';
            const expiresAt = userSub?.expires_at ? new Date(userSub.expires_at) : null;
            return (
              <div className="glass-dark p-5 rounded-xl border border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest">แพ็คเกจปัจจุบัน</div>
                    <div className="text-lg font-black text-white">{userPkgName}</div>
                    {expiresAt && (
                      <div className="text-xs text-gray-500 font-bold">หมดอายุ: {expiresAt.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setAssigningUser(selectedUser);
                      setAssignPkgId(allPackages[0]?.id || '');
                      setAssignDays('');
                    }}
                    className="px-4 py-2 gold-bg text-black rounded-xl text-xs font-black active:scale-95 transition-all"
                  >
                    กำหนดแพ็คเกจ
                  </button>
                </div>
              </div>
            );
          })()}

          {/* User Summary Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-dark p-5 rounded-xl border border-white/10 dark:bg-white/5 bg-red-500/10 dark:border-white/10 border-red-500/30">
              <div className="text-xs text-gray-500 dark:text-gray-500 text-red-600 font-bold mb-1">รายจ่ายเดือนนี้</div>
              <div className="text-xl font-black text-red-400 dark:text-red-400 text-red-600">{formatCurrency(selectedUserData.expense)}</div>
            </div>
            <div className="glass-dark p-5 rounded-xl border border-white/10 dark:bg-white/5 bg-green-500/10 dark:border-white/10 border-green-500/30">
              <div className="text-xs text-gray-500 dark:text-gray-500 text-green-600 font-bold mb-1">รายรับเดือนนี้</div>
              <div className="text-xl font-black text-green-400 dark:text-green-400 text-green-600">{formatCurrency(selectedUserData.income)}</div>
            </div>
          </div>

          {/* Top Categories */}
          {selectedUserData.topCategories.length > 0 && (
            <div className="glass-dark p-6 rounded-xl border border-white/10">
              <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">หมวดหมู่ที่ใช้จ่ายมากสุด</h3>
              <div className="space-y-3">
                {selectedUserData.topCategories.map((cat, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }}></div>
                    <span className="text-sm text-gray-300 font-bold flex-1">{cat.name}</span>
                    <span className="text-sm text-white font-black">{formatCurrency(cat.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Wallets */}
          {selectedUserData.userWallets.length > 0 && (
            <div className="glass-dark p-6 rounded-xl border border-white/10">
              <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">กระเป๋าเงิน</h3>
              <div className="space-y-3">
                {selectedUserData.userWallets.map(w => (
                  <div key={w.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: w.color + '30' }}>
                      <Icons.Wallet size={14} style={{ color: w.color }} />
                    </div>
                    <span className="text-sm text-gray-300 font-bold flex-1">{w.name}</span>
                    <span className="text-xs text-gray-500 font-bold">{w.type}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Transactions */}
          <div className="glass-dark p-6 rounded-xl border border-white/10">
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">รายการล่าสุด</h3>
            <div className="space-y-3">
              {selectedUserData.recentTx.length === 0 ? (
                <div className="text-center text-gray-500 text-sm py-4">ไม่มีรายการ</div>
              ) : (
                selectedUserData.recentTx.map(tx => (
                  <div key={tx.id} className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${tx.type === 'expense' ? 'bg-red-400' : 'bg-green-400'}`}></div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white font-bold truncate">{tx.note || tx.categoryName}</div>
                      <div className="text-[10px] text-gray-500">{tx.date} • {tx.walletName}</div>
                    </div>
                    <div className={`text-sm font-black ${tx.type === 'expense' ? 'text-red-400' : 'text-green-400'}`}>
                      {tx.type === 'expense' ? '-' : '+'}{formatCurrency(tx.amount)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      {/* Packages Management */}
      {activeView === 'packages' && (
        <div className="space-y-4">
          {/* Add Package Button */}
          <button
            onClick={() => {
              setEditingPkg('new');
              setPkgForm({ name: '', slug: '', price: '', duration_days: '', description: '', user_visible: true, features: { voice: true, max_wallets: 999, wallet_edit: true, csv_export: true, transfer: true } });
            }}
            className="w-full py-4 rounded-xl font-black text-black gold-bg shadow-xl shadow-gold-900/30 active:scale-[0.98] transition-all"
          >
            + เพิ่มแพ็คเกจใหม่
          </button>

          {/* Package List */}
          {allPackages.map(pkg => {
            const subCount = allSubscriptions.filter(s => s.package_id === pkg.id).length;
            return (
              <div key={pkg.id} className="glass-dark p-5 rounded-xl border border-white/10">
                <div className="flex items-center gap-4 mb-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${pkg.slug === 'free' ? 'bg-gray-500/20 text-gray-400' : pkg.slug === 'yearly' ? 'bg-gold-primary/20 text-gold-primary' : 'bg-blue-500/20 text-blue-400'}`}>
                    {pkg.slug === 'yearly' ? <Icons.Crown size={24} /> : pkg.slug === 'monthly' ? <Icons.Zap size={24} /> : <Icons.Package size={24} />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-white">{pkg.name}</span>
                      {!pkg.is_active && <span className="px-2 py-0.5 rounded-lg bg-red-500/20 text-red-400 text-[10px] font-black">ปิดใช้งาน</span>}
                      {pkg.user_visible === false && <span className="px-2 py-0.5 rounded-lg bg-yellow-500/20 text-yellow-400 text-[10px] font-black">ซ่อนจาก User</span>}
                    </div>
                    <div className="text-xs text-gray-500 font-bold">{pkg.description}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-white">{pkg.price === 0 ? 'ฟรี' : formatCurrency(pkg.price)}</div>
                    <div className="text-[10px] text-gray-500 font-bold">{subCount} สมาชิก</div>
                  </div>
                </div>

                <div className="flex gap-2 mt-3 pt-3 border-t border-white/5">
                  <button
                    onClick={() => {
                      setEditingPkg(pkg.id);
                      setPkgForm({
                        name: pkg.name,
                        slug: pkg.slug,
                        price: String(pkg.price),
                        duration_days: String(pkg.duration_days),
                        description: pkg.description || '',
                        user_visible: pkg.user_visible !== false,
                        features: pkg.features || {}
                      });
                    }}
                    className="flex-1 py-2 bg-white/5 rounded-xl text-xs font-black text-gray-300 hover:bg-white/10 transition-all"
                  >
                    แก้ไข
                  </button>
                  <button
                    onClick={async () => {
                      await supabase.from('packages').update({ user_visible: !(pkg.user_visible !== false) }).eq('id', pkg.id);
                      fetchAdminData();
                    }}
                    className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${pkg.user_visible !== false ? 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20' : 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'}`}
                  >
                    {pkg.user_visible !== false ? 'ซ่อนจาก User' : 'แสดงให้ User'}
                  </button>
                  {pkg.slug !== 'free' && (
                    <button
                      onClick={async () => {
                        await supabase.from('packages').update({ is_active: !pkg.is_active }).eq('id', pkg.id);
                        fetchAdminData();
                      }}
                      className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${pkg.is_active ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'}`}
                    >
                      {pkg.is_active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Edit/Create Modal */}
          {editingPkg && (
            <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-end justify-center">
              <div className="bg-[#1a1a1a] w-full max-w-md rounded-t-[3rem] p-8 pb-36 animate-slide-up border-t border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto">
                <h3 className="text-2xl font-black text-white mb-6 tracking-tight">
                  {editingPkg === 'new' ? 'เพิ่มแพ็คเกจใหม่' : 'แก้ไขแพ็คเกจ'}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 block">ชื่อแพ็คเกจ</label>
                    <input value={pkgForm.name} onChange={e => setPkgForm({ ...pkgForm, name: e.target.value })} className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl outline-none font-black text-white focus:border-gold-primary/30 transition-all" placeholder="เช่น รายเดือน" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 block">Slug (ภาษาอังกฤษ)</label>
                    <input value={pkgForm.slug} onChange={e => setPkgForm({ ...pkgForm, slug: e.target.value })} className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl outline-none font-black text-white focus:border-gold-primary/30 transition-all" placeholder="เช่น monthly" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 block">ราคา (บาท)</label>
                      <input type="number" value={pkgForm.price} onChange={e => setPkgForm({ ...pkgForm, price: e.target.value })} className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl outline-none font-black text-white focus:border-gold-primary/30 transition-all" placeholder="0" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 block">ระยะเวลา (วัน)</label>
                      <input type="number" value={pkgForm.duration_days} onChange={e => setPkgForm({ ...pkgForm, duration_days: e.target.value })} className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl outline-none font-black text-white focus:border-gold-primary/30 transition-all" placeholder="30" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 block">คำอธิบาย</label>
                    <input value={pkgForm.description} onChange={e => setPkgForm({ ...pkgForm, description: e.target.value })} className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl outline-none font-black text-white focus:border-gold-primary/30 transition-all" placeholder="คำอธิบายแพ็คเกจ" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 block">การแสดงผล</label>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white font-black">แสดงให้ User เห็น</span>
                      <div
                        onClick={() => setPkgForm({ ...pkgForm, user_visible: !pkgForm.user_visible })}
                        className={`w-10 h-5 rounded-full p-0.5 cursor-pointer transition-colors ${pkgForm.user_visible ? 'bg-green-500' : 'bg-gray-700'}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${pkgForm.user_visible ? 'translate-x-5' : 'translate-x-0'}`}></div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 block">ฟีเจอร์</label>
                    <div className="space-y-3">
                      {[
                        { key: 'voice', label: 'สั่งงานด้วยเสียง' },
                        { key: 'wallet_edit', label: 'จัดการกระเป๋าเงิน' },
                        { key: 'csv_export', label: 'ส่งออก CSV' },
                        { key: 'transfer', label: 'โอนเงินระหว่างกระเป๋า' },
                      ].map(f => (
                        <div key={f.key} className="flex items-center justify-between">
                          <span className="text-sm text-white font-black">{f.label}</span>
                          <div
                            onClick={() => setPkgForm({ ...pkgForm, features: { ...pkgForm.features, [f.key]: !pkgForm.features[f.key] } })}
                            className={`w-10 h-5 rounded-full p-0.5 cursor-pointer transition-colors ${pkgForm.features[f.key] ? 'bg-green-500' : 'bg-gray-700'}`}
                          >
                            <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${pkgForm.features[f.key] ? 'translate-x-5' : 'translate-x-0'}`}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="pt-4 space-y-3">
                    <button
                      onClick={async () => {
                        const pkgData = {
                          name: pkgForm.name,
                          slug: pkgForm.slug,
                          price: parseFloat(pkgForm.price) || 0,
                          duration_days: parseInt(pkgForm.duration_days) || 0,
                          description: pkgForm.description,
                          user_visible: pkgForm.user_visible,
                          features: pkgForm.features,
                          sort_order: allPackages.length + 1
                        };
                        if (editingPkg === 'new') {
                          await supabase.from('packages').insert(pkgData);
                        } else {
                          await supabase.from('packages').update(pkgData).eq('id', editingPkg);
                        }
                        setEditingPkg(null);
                        fetchAdminData();
                      }}
                      className="w-full py-4 gold-bg text-black rounded-2xl font-black text-lg shadow-xl shadow-gold-900/20"
                    >
                      บันทึก
                    </button>
                    <button onClick={() => setEditingPkg(null)} className="w-full py-3 text-gray-500 font-black text-sm hover:text-white transition-colors">
                      ยกเลิก
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Assign Package Modal */}
      {assigningUser && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-end justify-center">
          <div className="bg-[#1a1a1a] w-full max-w-md rounded-t-[3rem] p-8 pb-36 animate-slide-up border-t border-white/10 shadow-2xl">
            <h3 className="text-2xl font-black text-white mb-2 tracking-tight">กำหนดแพ็คเกจ</h3>
            <p className="text-xs text-gray-500 font-bold mb-6">กำหนดแพ็คเกจให้ผู้ใช้โดยไม่ต้องชำระเงิน</p>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">เลือกแพ็คเกจ</label>
                <div className="space-y-2">
                  {allPackages.map(pkg => (
                    <div
                      key={pkg.id}
                      onClick={() => {
                        setAssignPkgId(pkg.id);
                        if (pkg.duration_days > 0) setAssignDays(String(pkg.duration_days));
                        else setAssignDays('');
                      }}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center gap-3 ${assignPkgId === pkg.id ? 'border-gold-primary/50 bg-gold-primary/10' : 'border-white/10 bg-white/5 hover:border-white/20'}`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${pkg.slug === 'free' ? 'bg-gray-500/20 text-gray-400' : pkg.slug === 'yearly' ? 'bg-gold-primary/20 text-gold-primary' : 'bg-blue-500/20 text-blue-400'}`}>
                        {pkg.slug === 'yearly' ? <Icons.Crown size={18} /> : pkg.slug === 'monthly' ? <Icons.Zap size={18} /> : <Icons.Package size={18} />}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-black text-white">{pkg.name}</div>
                        <div className="text-[10px] text-gray-500 font-bold">{pkg.description}</div>
                      </div>
                      {assignPkgId === pkg.id && (
                        <div className="w-5 h-5 rounded-full gold-bg flex items-center justify-center">
                          <Icons.Check size={12} className="text-black" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              {assignPkgId && allPackages.find(p => p.id === assignPkgId)?.slug !== 'free' && (
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 block">ระยะเวลา (วัน) - เว้นว่างใช้ค่าเริ่มต้นของแพ็คเกจ</label>
                  <input
                    type="number"
                    value={assignDays}
                    onChange={e => setAssignDays(e.target.value)}
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl outline-none font-black text-white focus:border-gold-primary/30 transition-all"
                    placeholder={String(allPackages.find(p => p.id === assignPkgId)?.duration_days || 30)}
                  />
                </div>
              )}
              <div className="pt-4 space-y-3">
                <button
                  onClick={async () => {
                    const pkg = allPackages.find(p => p.id === assignPkgId);
                    if (!pkg) return;

                    // Cancel existing active subscription
                    await supabase
                      .from('user_subscriptions')
                      .update({ status: 'cancelled' })
                      .eq('user_id', assigningUser)
                      .eq('status', 'active');

                    if (pkg.slug !== 'free') {
                      const now = new Date();
                      const days = parseInt(assignDays) || pkg.duration_days;
                      const expiresAt = new Date(now);
                      expiresAt.setDate(expiresAt.getDate() + days);

                      await supabase.from('user_subscriptions').insert({
                        user_id: assigningUser,
                        package_id: assignPkgId,
                        status: 'active',
                        started_at: now.toISOString(),
                        expires_at: expiresAt.toISOString(),
                        payment_amount: 0,
                        payment_method: 'admin_assigned'
                      });
                    }

                    setAssigningUser(null);
                    fetchAdminData();
                  }}
                  className="w-full py-4 gold-bg text-black rounded-2xl font-black text-lg shadow-xl shadow-gold-900/20"
                >
                  ยืนยันกำหนดแพ็คเกจ
                </button>
                <button onClick={() => setAssigningUser(null)} className="w-full py-3 text-gray-500 font-black text-sm hover:text-white transition-colors">
                  ยกเลิก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScreenAdmin;
