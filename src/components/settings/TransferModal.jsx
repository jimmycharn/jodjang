import { useState } from 'react';
import { useData } from '../../context/DataContext';
import { toLocalDateString, generateId } from '../../lib/utils';
import { Icons } from '../ui/Icons';

const TransferModal = ({ onClose, showNotification }) => {
  const { wallets, transactions, setTransactions, transferBetweenWallets, fetchAllData } = useData();
  const [fromId, setFromId] = useState(wallets[0]?.id || '');
  const [toId, setToId] = useState(wallets[1]?.id || wallets[0]?.id || '');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const handleTransfer = async () => {
    if (!amount || fromId === toId) return;
    
    const amountNum = parseFloat(amount);
    const dateStr = toLocalDateString(new Date());
    
    const outTx = {
      id: 'trf_out_' + generateId(),
      date: dateStr,
      type: 'expense',
      categoryId: '',
      walletId: fromId,
      amount: amountNum,
      note: `[โอนออก] ${note}`
    };
    const inTx = {
      id: 'trf_in_' + generateId(),
      date: dateStr,
      type: 'income',
      categoryId: '',
      walletId: toId,
      amount: amountNum,
      note: `[โอนเข้า] ${note}`
    };
    
    setTransactions(prev => [outTx, inTx, ...prev]);
    showNotification('กำลังโอนเงิน...');
    onClose();
    
    const result = await transferBetweenWallets(fromId, toId, amountNum, dateStr, note);
    if (result.success) {
      showNotification('โอนเงินสำเร็จ');
      fetchAllData();
    } else {
      showNotification(result.error || 'เกิดข้อผิดพลาด', 'error');
      fetchAllData();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="glass-dark w-full max-w-sm rounded-[2rem] p-6 shadow-2xl border border-white/10 animate-scale-in my-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black text-white tracking-tight">โอนเงิน</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <Icons.X size={24} />
          </button>
        </div>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">จากกระเป๋า</label>
            <select
              value={fromId}
              onChange={e => setFromId(e.target.value)}
              className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl outline-none font-black text-white focus:border-gold-primary/30 transition-all appearance-none"
            >
              {wallets.map(w => (
                <option key={w.id} value={w.id} className="bg-[#1a1a1a]">{w.name}</option>
              ))}
            </select>
          </div>
          
          <div className="flex justify-center py-1">
            <div className="w-10 h-10 gold-bg rounded-full flex items-center justify-center text-black shadow-lg">
              <Icons.ChevronRight className="rotate-90" size={20} />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">ไปยังกระเป๋า</label>
            <select
              value={toId}
              onChange={e => setToId(e.target.value)}
              className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl outline-none font-black text-white focus:border-gold-primary/30 transition-all appearance-none"
            >
              {wallets.map(w => (
                <option key={w.id} value={w.id} className="bg-[#1a1a1a]">{w.name}</option>
              ))}
            </select>
          </div>
          
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">จำนวนเงิน</label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl outline-none font-black text-white focus:border-gold-primary/30 transition-all text-center text-2xl"
              placeholder="0.00"
            />
          </div>
          
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl outline-none font-bold text-white focus:border-gold-primary/30 transition-all"
            placeholder="บันทึกช่วยจำ..."
          />
          
          <button
            onClick={handleTransfer}
            className="w-full py-5 gold-bg text-black rounded-2xl font-black text-lg shadow-xl shadow-gold-900/20 active:scale-95 transition-all mt-4"
          >
            ยืนยันการโอน
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransferModal;
