import { useState, useEffect, useRef, useCallback } from 'react';
import { useData } from '../../context/DataContext';
import { formatCurrency, toLocalDateString } from '../../lib/utils';
import { Icons } from '../ui/Icons';
import ConfirmModal from '../ui/ConfirmModal';

const ScreenHistory = ({ activeWalletId, setActiveWalletId, setEditTx, setActiveTab, onSelectModeChange }) => {
  const { transactions, categories, wallets, deleteTransaction, setTransactions } = useData();
  const [filterType, setFilterType] = useState('all');
  const [filterCatId, setFilterCatId] = useState('all');
  const [startDate, setStartDate] = useState(toLocalDateString(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [endDate, setEndDate] = useState(toLocalDateString(new Date()));
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const searchInputRef = useRef(null);
  const longPressTimerRef = useRef(null);

  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  useEffect(() => {
    onSelectModeChange?.(selectMode);
  }, [selectMode, onSelectModeChange]);

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const handleLongPressStart = useCallback((txId) => {
    longPressTimerRef.current = setTimeout(() => {
      setSelectMode(true);
      setSelectedIds(new Set([txId]));
    }, 500);
  }, []);

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const toggleSelect = (txId) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(txId)) next.delete(txId);
      else next.add(txId);
      return next;
    });
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    setShowDeleteConfirm(false);
    setIsDeleting(true);
    for (const id of selectedIds) {
      await deleteTransaction(id);
      setTransactions(prev => prev.filter(t => t.id !== id));
    }
    setIsDeleting(false);
    exitSelectMode();
  };

  const filteredCategories = filterType === 'all'
    ? categories
    : categories.filter(c => c.type === filterType);

  const handleTypeChange = (newType) => {
    setFilterType(newType);
    if (filterCatId !== 'all') {
      const currentCat = categories.find(c => c.id === filterCatId);
      if (currentCat && newType !== 'all' && currentCat.type !== newType) {
        setFilterCatId('all');
      }
    }
  };

  const filtered = transactions.filter(t => {
    if (filterType !== 'all' && t.type !== filterType) return false;
    if (activeWalletId !== 'all' && t.walletId !== activeWalletId) return false;
    if (filterCatId !== 'all' && t.categoryId !== filterCatId) return false;
    if (t.date < startDate || t.date > endDate) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const cat = categories.find(c => c.id === t.categoryId);
      const noteMatch = t.note && t.note.toLowerCase().includes(query);
      const amountMatch = t.amount.toString().includes(query);
      const catMatch = cat && cat.name.toLowerCase().includes(query);
      if (!noteMatch && !amountMatch && !catMatch) return false;
    }
    return true;
  }).sort((a, b) => b.date.localeCompare(a.date));

  const totalFiltered = filtered.reduce((s, t) => s + (t.type === 'income' ? Number(t.amount) : -Number(t.amount)), 0);
  const grouped = filtered.reduce((acc, t) => {
    if (!acc[t.date]) acc[t.date] = [];
    acc[t.date].push(t);
    return acc;
  }, {});

  const getDailySummary = (dayTransactions) => {
    const income = dayTransactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
    const expense = dayTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
    return { income, expense };
  };

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

      {/* Header & Filters */}
      <div className="mb-8 space-y-6">
        <div className="flex justify-between items-end">
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-black text-white tracking-tight">ประวัติ</h2>
            <button
              onClick={() => setShowSearch(!showSearch)}
              className={`p-2 rounded-xl transition-all ${showSearch ? 'gold-bg text-black' : 'bg-white/5 text-gray-500 hover:text-white'}`}
            >
              <Icons.Search size={20} />
            </button>
          </div>
          <div className="text-right">
            <div className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1">ยอดรวมช่วงนี้</div>
            <div className={`text-lg font-black ${totalFiltered >= 0 ? 'gold-text' : 'text-red-500'}`}>
              {formatCurrency(totalFiltered)}
            </div>
          </div>
        </div>

        {showSearch && (
          <div className="relative animate-fade-in">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
              <Icons.Search size={18} />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-10 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white outline-none focus:border-gold-primary/30 transition-all placeholder:text-gray-600"
              placeholder="ค้นหารายการ, จำนวนเงิน, หมวดหมู่..."
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
              >
                <Icons.X size={18} />
              </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="bg-white/5 border border-white/10 p-3 rounded-2xl text-xs font-bold text-gray-300 outline-none focus:border-gold-primary/30 transition-all"
          />
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="bg-white/5 border border-white/10 p-3 rounded-2xl text-xs font-bold text-gray-300 outline-none focus:border-gold-primary/30 transition-all"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto hide-scroll pb-2">
          {['all', 'expense', 'income'].map(m => (
            <button
              key={m}
              onClick={() => handleTypeChange(m)}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all border ${filterType === m ? 'gold-bg text-black border-gold-primary shadow-lg shadow-gold-900/20' : 'bg-white/5 text-gray-500 border-white/5'}`}
            >
              {m === 'all' ? 'ทั้งหมด' : (m === 'expense' ? 'จ่าย' : 'รับ')}
            </button>
          ))}
        </div>

        <div className="flex gap-2 overflow-x-auto hide-scroll pb-2">
          <button
            onClick={() => setFilterCatId('all')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all border whitespace-nowrap ${filterCatId === 'all' ? 'gold-bg text-black border-gold-primary shadow-lg shadow-gold-900/20' : 'bg-white/5 text-gray-500 border-white/5'}`}
          >
            ทุกหมวดหมู่
          </button>
          {filteredCategories.map(c => (
            <button
              key={c.id}
              onClick={() => setFilterCatId(c.id)}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all border whitespace-nowrap ${filterCatId === c.id ? 'gold-bg text-black border-gold-primary shadow-lg shadow-gold-900/20' : 'bg-white/5 text-gray-500 border-white/5'}`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Transaction List */}
      <div className="space-y-8">
        {Object.keys(grouped).map(date => {
          const dailySummary = getDailySummary(grouped[date]);
          return (
            <div key={date}>
              <div className="flex justify-between items-center mb-4 px-2">
                <div className="text-xs font-black text-gray-600 uppercase tracking-[0.15em]">
                  {new Date(date).toLocaleDateString('th-TH', { dateStyle: 'long' })}
                </div>
                <div className="text-xs font-bold">
                  <span className={(dailySummary.income - dailySummary.expense) >= 0 ? 'text-green-400 dark:text-green-400 text-green-600' : 'text-red-400 dark:text-red-400 text-red-600'}>
                    {(dailySummary.income - dailySummary.expense) >= 0 ? '+' : ''}
                    {(dailySummary.income - dailySummary.expense).toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="glass-dark rounded-xl border border-white/10 overflow-hidden shadow-xl">
                {grouped[date].map(t => {
                  const cat = categories.find(c => c.id === t.categoryId) || { name: 'อื่นๆ', color: '#333' };
                  const isSelected = selectedIds.has(t.id);
                  return (
                    <div
                      key={t.id}
                      onClick={() => {
                        if (selectMode) {
                          toggleSelect(t.id);
                        } else {
                          setEditTx(t); setActiveTab('add');
                        }
                      }}
                      onTouchStart={() => handleLongPressStart(t.id)}
                      onTouchEnd={handleLongPressEnd}
                      onTouchMove={handleLongPressEnd}
                      onMouseDown={() => handleLongPressStart(t.id)}
                      onMouseUp={handleLongPressEnd}
                      onMouseLeave={handleLongPressEnd}
                      className={`p-5 flex justify-between items-center border-b border-white/5 last:border-0 transition-colors cursor-pointer group select-none ${isSelected ? 'bg-gold-primary/10' : 'active:bg-white/5'}`}
                    >
                      <div className="flex items-center gap-4">
                        {selectMode && (
                          <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${isSelected ? 'gold-bg border-gold-primary' : 'border-gray-400 bg-gray-100 dark:border-white/30 dark:bg-white/10'}`}>
                            {isSelected && <Icons.Check size={14} className="text-black" />}
                          </div>
                        )}
                        <div
                          className="w-12 h-12 rounded-2xl text-white flex items-center justify-center font-black text-lg shadow-lg group-hover:scale-110 transition-transform"
                          style={{ backgroundColor: cat.color, boxShadow: `0 6px 15px -4px ${cat.color}66` }}
                        >
                          {cat.name[0]}
                        </div>
                        <div>
                          <div className="font-black text-white text-sm mb-0.5">{cat.name}</div>
                          <div className="text-xs text-gray-500 font-bold">{t.note || 'ไม่มีบันทึก'}</div>
                        </div>
                      </div>
                      <div className={`text-base font-black tracking-tight ${t.type === 'income' ? 'text-green-400 dark:text-green-400 text-green-600' : 'text-red-400 dark:text-red-400 text-red-600'}`}>
                        {t.type === 'income' ? '+' : '-'}{Number(t.amount).toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {Object.keys(grouped).length === 0 && (
          <div className="text-center py-20 opacity-50">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-600">
              <Icons.List size={40} />
            </div>
            <p className="text-gray-500 font-bold">ไม่พบรายการในช่วงเวลานี้</p>
          </div>
        )}
      </div>

      {/* Select Mode Toolbar */}
      {selectMode && (
        <div className="fixed bottom-6 left-0 right-0 mx-auto max-w-md px-4 z-[100] animate-slide-up">
          <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl px-6 py-4 flex items-center justify-between shadow-2xl">
            <button
              onClick={exitSelectMode}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 font-black text-sm active:scale-95 transition-all"
            >
              <Icons.X size={18} />
              ยกเลิก
            </button>
            <div className="text-xs font-black text-gray-500">
              เลือก {selectedIds.size} รายการ
            </div>
            <button
              onClick={handleDeleteSelected}
              disabled={selectedIds.size === 0 || isDeleting}
              className={`flex items-center gap-2 font-black text-sm px-4 py-2 rounded-xl transition-all active:scale-95 ${
                selectedIds.size > 0
                  ? 'bg-red-500/20 text-red-500 border border-red-500/30'
                  : 'text-gray-400 opacity-40'
              }`}
            >
              {isDeleting ? (
                <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Icons.Trash2 size={18} />
              )}
              ลบ
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="ลบรายการ?"
        message={`ยืนยันลบรายการนี้?`}
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        type="danger"
      />
    </div>
  );
};

export default ScreenHistory;
