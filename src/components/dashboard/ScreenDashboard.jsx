import { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { formatCurrency, toLocalDateString } from '../../lib/utils';
import DonutChart from '../ui/DonutChart';
import TrendChart from '../ui/TrendChart';

const ScreenDashboard = ({ activeWalletId, setActiveWalletId }) => {
  const { transactions, categories, wallets } = useData();
  const [dashboardTab, setDashboardTab] = useState('expense');
  const today = new Date();

  const monthOptions = useMemo(() => {
    const options = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      options.push({
        label: d.toLocaleString('th-TH', { month: 'long', year: 'numeric' }),
        startDate: toLocalDateString(d),
        endDate: toLocalDateString(new Date(d.getFullYear(), d.getMonth() + 1, 0)),
        value: i
      });
    }
    return options;
  }, []);

  const [selMonth, setSelMonth] = useState(monthOptions[0]);
  const [showCumulative, setShowCumulative] = useState(false); // Toggle for monthly vs cumulative savings

  const filtered = transactions.filter(t =>
    t.date >= selMonth.startDate &&
    t.date <= selMonth.endDate &&
    t.type === dashboardTab &&
    (activeWalletId === 'all' || t.walletId === activeWalletId)
  );

  const totalDisplay = filtered.reduce((s, t) => s + Number(t.amount), 0);

  const totalExpAll = transactions.filter(t =>
    t.date >= selMonth.startDate &&
    t.date <= selMonth.endDate &&
    t.type === 'expense' &&
    (activeWalletId === 'all' || t.walletId === activeWalletId)
  ).reduce((s, t) => s + Number(t.amount), 0);

  const totalIncAll = transactions.filter(t =>
    t.date >= selMonth.startDate &&
    t.date <= selMonth.endDate &&
    t.type === 'income' &&
    (activeWalletId === 'all' || t.walletId === activeWalletId)
  ).reduce((s, t) => s + Number(t.amount), 0);

  const daysInMonth = new Date(selMonth.endDate).getDate();
  const avgExp = totalExpAll / daysInMonth;
  const avgInc = totalIncAll / daysInMonth;

  // Cumulative savings (all-time)
  const cumulativeExpense = transactions.filter(t =>
    t.type === 'expense' &&
    (activeWalletId === 'all' || t.walletId === activeWalletId)
  ).reduce((s, t) => s + Number(t.amount), 0);

  const cumulativeIncome = transactions.filter(t =>
    t.type === 'income' &&
    (activeWalletId === 'all' || t.walletId === activeWalletId)
  ).reduce((s, t) => s + Number(t.amount), 0);

  const cumulativeSavings = cumulativeIncome - cumulativeExpense;
  const monthlySavings = totalIncAll - totalExpAll;

  const trendData = useMemo(() => {
    const data = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = toLocalDateString(d);
      const val = transactions.filter(t =>
        t.date === dateStr &&
        t.type === 'expense' &&
        (activeWalletId === 'all' || t.walletId === activeWalletId)
      ).reduce((s, t) => s + Number(t.amount), 0);
      data.push({ date: dateStr, value: val });
    }
    return data;
  }, [transactions, activeWalletId]);

  const categoryAgg = filtered.reduce((acc, curr) => {
    acc[curr.categoryId] = (acc[curr.categoryId] || 0) + Number(curr.amount);
    return acc;
  }, {});

  const chartData = Object.keys(categoryAgg).map(id => {
    const c = categories.find(cat => cat.id === id) || { name: 'อื่นๆ', color: '#ccc' };
    return { id, name: c.name, color: c.color, value: categoryAgg[id] };
  }).sort((a, b) => b.value - a.value);

  return (
    <div className="pb-32 pt-6 px-4 min-h-screen bg-[#0a0a0a] flex flex-col max-w-md mx-auto w-full">
      {/* Wallet Filter */}
      <div className="flex items-center mb-8 overflow-x-auto gap-3 hide-scroll pb-2">
        <button
          onClick={() => setActiveWalletId('all')}
          className={`px-6 py-3 rounded-2xl font-black text-xs whitespace-nowrap transition-all border ${activeWalletId === 'all' ? 'gold-bg text-black border-gold-primary shadow-lg shadow-gold-900/20' : 'bg-white/5 text-gray-500 border-white/5'}`}
        >
          ทั้งหมด
        </button>
        {wallets.map(w => (
          <button
            key={w.id}
            onClick={() => setActiveWalletId(w.id)}
            className={`px-6 py-3 rounded-2xl font-black text-xs whitespace-nowrap transition-all border ${activeWalletId === w.id ? 'gold-bg text-black border-gold-primary shadow-lg shadow-gold-900/20' : 'bg-white/5 text-gray-500 border-white/5'}`}
          >
            {w.name}
          </button>
        ))}
      </div>

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black text-white tracking-tight">สรุปข้อมูล</h2>
        <div className="relative">
          <select
            value={selMonth.value}
            onChange={e => setSelMonth(monthOptions[e.target.value])}
            className="bg-white/5 border border-white/10 rounded-2xl px-4 py-2 text-xs font-bold text-gray-300 outline-none appearance-none pr-8"
          >
            {monthOptions.map(opt => (
              <option key={opt.value} value={opt.value} className="bg-[#1a1a1a]">{opt.label}</option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">▼</div>
        </div>
      </div>

      {/* Net Balance Card */}
      <div className="glass-dark p-8 rounded-2xl shadow-2xl mb-8 text-center border border-white/10 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 gold-bg opacity-50"></div>
        
        {/* Toggle for monthly vs cumulative */}
        <div className="flex justify-center mb-3">
          <div className="flex gap-1 bg-white/5 p-1 rounded-full border border-white/10">
            <button
              onClick={() => setShowCumulative(false)}
              className={`px-4 py-1.5 rounded-full font-black text-[10px] transition-all ${!showCumulative ? 'gold-bg text-black shadow-lg' : 'text-gray-500'}`}
            >
              เหลือเก็บ
            </button>
            <button
              onClick={() => setShowCumulative(true)}
              className={`px-4 py-1.5 rounded-full font-black text-[10px] transition-all ${showCumulative ? 'gold-bg text-black shadow-lg' : 'text-gray-500'}`}
            >
              เหลือเก็บสะสม
            </button>
          </div>
        </div>

        <div className="text-5xl font-black text-white tracking-tighter mb-4">
          {formatCurrency(showCumulative ? cumulativeSavings : monthlySavings).replace('฿', '')}
          <span className="text-lg gold-text ml-1">฿</span>
        </div>
        <TrendChart data={trendData} color="#D4AF37" />
      </div>

      {/* Income/Expense Toggle */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div
          onClick={() => setDashboardTab('expense')}
          className={`p-5 rounded-xl border transition-all cursor-pointer ${dashboardTab === 'expense' ? 'bg-white/5 border-gold-primary/30 scale-[1.02]' : 'bg-white/5 border-transparent opacity-40'}`}
        >
          <div className="text-sm text-gray-500 font-black uppercase tracking-widest mb-2">รายจ่าย</div>
          <div className="text-2xl font-black text-white">{formatCurrency(totalExpAll).replace('฿', '')}</div>
          <div className="text-xs text-gold-primary font-bold mt-1 opacity-80">เฉลี่ย {formatCurrency(avgExp)}/วัน</div>
        </div>
        <div
          onClick={() => setDashboardTab('income')}
          className={`p-5 rounded-xl border transition-all cursor-pointer ${dashboardTab === 'income' ? 'bg-white/5 border-gold-primary/30 scale-[1.02]' : 'bg-white/5 border-transparent opacity-40'}`}
        >
          <div className="text-sm text-gray-500 font-black uppercase tracking-widest mb-2">รายรับ</div>
          <div className="text-2xl font-black text-white">{formatCurrency(totalIncAll).replace('฿', '')}</div>
          <div className="text-xs text-gold-primary font-bold mt-1 opacity-80">เฉลี่ย {formatCurrency(avgInc)}/วัน</div>
        </div>
      </div>

      {/* Chart & Categories */}
      <div className="glass-dark rounded-2xl p-8 shadow-2xl flex-1 flex flex-col items-center border border-white/10">
        <div className="mb-10">
          <DonutChart data={chartData} total={totalDisplay || 1} />
        </div>
        <div className="space-y-6 w-full">
          {chartData.map(cat => {
            const category = categories.find(c => c.id === cat.id);
            const budget = category?.budget || 0;
            const budgetPercent = budget > 0 ? (cat.value / budget) * 100 : 0;
            const isOverBudget = budget > 0 && cat.value > budget;
            return (
              <div key={cat.id} className="group">
                <div className="flex justify-between text-xs mb-2 font-bold px-1">
                  <span className="text-gray-400 group-hover:text-white transition-colors">{cat.name}</span>
                  <div className="text-right">
                    <span className="text-white">{formatCurrency(cat.value)}</span>
                    {budget > 0 && (
                      <span className={`ml-1 ${isOverBudget ? 'text-red-400' : 'text-gray-500'}`}>
                        / {formatCurrency(budget)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${isOverBudget ? 'bg-red-500' : ''}`}
                    style={{
                      width: budget > 0 ? `${Math.min(budgetPercent, 100)}%` : `${(cat.value / totalDisplay) * 100}%`,
                      backgroundColor: isOverBudget ? undefined : cat.color
                    }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ScreenDashboard;
