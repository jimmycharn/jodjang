import { useState } from 'react';
import { useData } from '../../context/DataContext';
import { formatCurrency, generateId } from '../../lib/utils';
import { Icons } from '../ui/Icons';

const ScreenSavings = ({ requestConfirm }) => {
  const { savingsGoals, setSavingsGoals, updateSavingsGoals, deleteSavingsGoal } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [tempName, setTempName] = useState('');
  const [tempTarget, setTempTarget] = useState('');
  const [tempCurrent, setTempCurrent] = useState('');
  const [tempColor, setTempColor] = useState('#D4AF37');

  const openEditor = (goal) => {
    setEditing(goal);
    setTempName(goal ? goal.name : '');
    setTempTarget(goal ? String(goal.targetamount) : '');
    setTempCurrent(goal ? String(goal.currentamount) : '0');
    setTempColor(goal ? goal.color : '#D4AF37');
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!tempName || !tempTarget) return;
    let newGoals = [...savingsGoals];
    const targetVal = parseFloat(tempTarget) || 0;
    const currentVal = parseFloat(tempCurrent) || 0;

    if (editing) {
      newGoals = newGoals.map(g => g.id === editing.id 
        ? { ...g, name: tempName, targetamount: targetVal, currentamount: currentVal, color: tempColor } 
        : g
      );
    } else {
      newGoals.push({ 
        id: generateId(), 
        name: tempName, 
        targetamount: targetVal, 
        currentamount: currentVal, 
        color: tempColor, 
        icon: 'Star' 
      });
    }
    setSavingsGoals(newGoals);
    await updateSavingsGoals(newGoals);
    setIsModalOpen(false);
  };

  const handleAddFunds = async (goal, amount) => {
    const newAmount = (goal.currentamount || 0) + amount;
    if (newAmount < 0) return;
    const newGoals = savingsGoals.map(g => g.id === goal.id ? { ...g, currentamount: newAmount } : g);
    setSavingsGoals(newGoals);
    await updateSavingsGoals(newGoals);
  };

  return (
    <div className="pb-32 pt-6 px-4 min-h-screen bg-[#0a0a0a] flex flex-col max-w-md mx-auto w-full">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-black text-white tracking-tight">เป้าหมายการออม</h2>
        <button
          onClick={() => openEditor(null)}
          className="w-10 h-10 gold-bg rounded-full flex items-center justify-center text-black shadow-lg shadow-gold-900/20 active:scale-90 transition-all"
        >
          <Icons.PlusCircle size={24} />
        </button>
      </div>

      <div className="space-y-4">
        {savingsGoals.map(goal => {
          const progress = Math.min((goal.currentamount / goal.targetamount) * 100, 100);
          return (
            <div key={goal.id} className="glass-dark p-6 rounded-xl border border-white/10 relative overflow-hidden group">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg"
                    style={{ backgroundColor: goal.color, boxShadow: `0 6px 15px -4px ${goal.color}66` }}
                  >
                    <Icons.Star size={24} />
                  </div>
                  <div>
                    <div className="font-black text-white text-lg">{goal.name}</div>
                    <div className="text-xs text-gray-500 font-bold">เป้าหมาย {formatCurrency(goal.targetamount)}</div>
                  </div>
                </div>
                <button onClick={() => openEditor(goal)} className="p-2 text-gray-600 hover:text-white transition-colors">
                  <Icons.Settings size={20} />
                </button>
              </div>

              <div className="mb-2 flex justify-between items-end">
                <div className="text-3xl font-black text-white tracking-tight">
                  {formatCurrency(goal.currentamount).replace('฿', '')}
                  <span className="text-sm text-gold-primary ml-1">฿</span>
                </div>
                <div className="text-xs font-black text-gray-500">{Math.round(progress)}%</div>
              </div>

              <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden mb-6">
                <div
                  className="h-full rounded-full transition-all duration-1000 relative"
                  style={{ width: `${progress}%`, backgroundColor: goal.color }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleAddFunds(goal, 100)}
                  className="flex-1 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-white transition-all border border-white/5"
                >
                  +100
                </button>
                <button
                  onClick={() => handleAddFunds(goal, 500)}
                  className="flex-1 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-white transition-all border border-white/5"
                >
                  +500
                </button>
                <button
                  onClick={() => handleAddFunds(goal, 1000)}
                  className="flex-1 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-white transition-all border border-white/5"
                >
                  +1,000
                </button>
              </div>
            </div>
          );
        })}

        {savingsGoals.length === 0 && (
          <div className="text-center py-20 opacity-50">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-600">
              <Icons.Star size={40} />
            </div>
            <p className="text-gray-500 font-bold">ยังไม่มีเป้าหมายการออม</p>
            <button onClick={() => openEditor(null)} className="mt-4 text-gold-primary text-sm font-black hover:underline">
              สร้างเป้าหมายแรก
            </button>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-end justify-center">
          <div className="glass-dark w-full max-w-md rounded-t-[3rem] p-8 pb-10 animate-slide-up border-t border-white/10 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-white tracking-tight">
                {editing ? 'แก้ไขเป้าหมาย' : 'สร้างเป้าหมายใหม่'}
              </h3>
              {editing && (
                <button
                  onClick={() => requestConfirm('ลบเป้าหมาย?', 'ยืนยันลบเป้าหมายนี้?', async () => {
                    const newGoals = savingsGoals.filter(g => g.id !== editing.id);
                    setSavingsGoals(newGoals);
                    await deleteSavingsGoal(editing.id);
                    setIsModalOpen(false);
                  })}
                  className="text-red-500 hover:text-red-400 font-bold text-sm"
                >
                  ลบ
                </button>
              )}
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">ชื่อเป้าหมาย</label>
                <input
                  type="text"
                  value={tempName}
                  onChange={e => setTempName(e.target.value)}
                  className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl outline-none font-black text-white focus:border-gold-primary/30 transition-all"
                  placeholder="เช่น เที่ยวญี่ปุ่น, ซื้อ iPhone..."
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">จำนวนเงินเป้าหมาย</label>
                <input
                  type="number"
                  value={tempTarget}
                  onChange={e => setTempTarget(e.target.value)}
                  className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl outline-none font-black text-white focus:border-gold-primary/30 transition-all"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">เก็บได้แล้ว (เริ่มต้น)</label>
                <input
                  type="number"
                  value={tempCurrent}
                  onChange={e => setTempCurrent(e.target.value)}
                  className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl outline-none font-black text-white focus:border-gold-primary/30 transition-all"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">สีประจำเป้าหมาย</label>
                <input
                  type="color"
                  value={tempColor}
                  onChange={e => setTempColor(e.target.value)}
                  className="w-full h-14 bg-transparent border-none cursor-pointer rounded-2xl overflow-hidden"
                />
              </div>
              <div className="pt-4 space-y-3">
                <button
                  onClick={handleSave}
                  className="w-full py-5 gold-bg text-black rounded-2xl font-black text-lg shadow-xl shadow-gold-900/20"
                >
                  บันทึกข้อมูล
                </button>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-full py-4 text-gray-500 font-black text-sm hover:text-white transition-colors"
                >
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

export default ScreenSavings;
