import { useState } from 'react';
import { useData } from '../../context/DataContext';
import { toLocalDateString } from '../../lib/utils';
import { Icons } from '../ui/Icons';

const ExportModal = ({ isOpen, onClose }) => {
  const { transactions, categories, wallets } = useData();
  const [startDate, setStartDate] = useState(toLocalDateString(new Date(new Date().getFullYear(), 0, 1)));
  const [endDate, setEndDate] = useState(toLocalDateString(new Date()));

  if (!isOpen) return null;

  const escapeCSV = (str) => {
    if (!str) return '';
    const stringValue = String(str);
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  const handleExport = () => {
    const filtered = transactions.filter(t => t.date >= startDate && t.date <= endDate);
    const header = ["วันที่", "ประเภท", "หมวดหมู่", "จำนวนเงิน", "กระเป๋า", "บันทึก"].join(",") + "\n";

    let body = "";
    filtered.forEach(t => {
      const cat = categories.find(c => c.id === t.categoryId) || { name: 'ไม่ระบุ' };
      const wallet = wallets.find(w => w.id === t.walletId) || { name: 'ไม่ระบุ' };
      const type = t.type === 'income' ? 'รายรับ' : 'รายจ่าย';

      const row = [
        t.date,
        type,
        cat.name,
        t.amount,
        wallet.name,
        t.note || ''
      ].map(escapeCSV).join(',');

      body += row + '\n';
    });

    const csvContent = header + body;
    // UTF-8 BOM for proper Thai character support in Excel
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `money_tracker_${startDate}_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="glass-dark w-full max-w-sm rounded-[2rem] p-6 shadow-2xl border border-white/10 animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black text-white tracking-tight">ส่งออกข้อมูล (CSV)</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <Icons.X size={24} />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">ตั้งแต่วันที่</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl outline-none font-bold text-white focus:border-gold-primary/30 transition-all"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">ถึงวันที่</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl outline-none font-bold text-white focus:border-gold-primary/30 transition-all"
            />
          </div>
          <div className="pt-2">
            <button
              onClick={handleExport}
              className="w-full py-4 gold-bg text-black rounded-2xl font-black text-lg shadow-xl shadow-gold-900/20 active:scale-95 transition-all"
            >
              <div className="flex items-center justify-center gap-2">
                <Icons.Download size={20} />
                <span>ดาวน์โหลด CSV</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
