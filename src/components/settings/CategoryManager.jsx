import { useState } from 'react';
import { useData } from '../../context/DataContext';
import { generateId } from '../../lib/utils';
import { Icons } from '../ui/Icons';

const CategoryManager = ({ onClose, requestConfirm }) => {
  const { categories, setCategories, updateCategories, deleteCategory } = useData();
  const [tab, setTab] = useState('expense');
  const [editing, setEditing] = useState(null);
  const [tempName, setTempName] = useState('');
  const [tempColor, setTempColor] = useState('#D4AF37');
  const [tempBudget, setTempBudget] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openEditor = (cat) => {
    setEditing(cat);
    setTempName(cat ? cat.name : '');
    setTempColor(cat ? cat.color : '#D4AF37');
    setTempBudget(cat?.budget ? String(cat.budget) : '');
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!tempName) return;
    let newCats = [...categories];
    const budgetValue = parseFloat(tempBudget) || 0;

    if (editing) {
      newCats = newCats.map(c => c.id === editing.id 
        ? { ...c, name: tempName, color: tempColor, budget: budgetValue } 
        : c
      );
    } else {
      newCats.push({ id: generateId(), name: tempName, type: tab, color: tempColor, budget: budgetValue });
    }
    setCategories(newCats);
    await updateCategories(newCats);
    setIsModalOpen(false);
  };

  return (
    <div className="fixed inset-0 bg-[#0a0a0a] z-50 flex flex-col max-w-md mx-auto w-full animate-slide-up">
      <div className="p-6 border-b border-white/10 flex justify-between items-center px-8">
        <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
          <Icons.X />
        </button>
        <h2 className="text-xl font-black text-white tracking-tight">จัดการหมวดหมู่</h2>
        <div className="w-6" />
      </div>

      <div className="p-6 flex-1 overflow-y-auto bg-[#0a0a0a] pb-24">
        <div className="flex gap-2 mb-6 bg-white/5 p-1.5 rounded-2xl border border-white/10">
          <button
            onClick={() => setTab('expense')}
            className={`flex-1 py-3 rounded-xl font-black text-xs transition-all ${tab === 'expense' ? 'gold-bg text-black shadow-lg shadow-gold-900/20' : 'text-gray-500'}`}
          >
            รายจ่าย
          </button>
          <button
            onClick={() => setTab('income')}
            className={`flex-1 py-3 rounded-xl font-black text-xs transition-all ${tab === 'income' ? 'gold-bg text-black shadow-lg shadow-gold-900/20' : 'text-gray-500'}`}
          >
            รายรับ
          </button>
        </div>

        {/* Add Button at Top */}
        <button
          onClick={() => openEditor(null)}
          className="w-full mb-6 py-4 rounded-xl font-black text-black gold-bg shadow-xl shadow-gold-900/30 active:scale-[0.98] transition-all"
        >
          + เพิ่มหมวดหมู่ใหม่
        </button>

        <div className="space-y-3">
          {categories.filter(c => c.type === tab).map(c => (
            <div
              key={c.id}
              onClick={() => openEditor(c)}
              className="glass-dark p-5 rounded-xl flex items-center justify-between border border-white/10 hover:border-gold-primary/30 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-5">
                <div
                  className="w-10 h-10 rounded-xl shadow-lg group-hover:scale-110 transition-transform"
                  style={{ backgroundColor: c.color, boxShadow: `0 4px 12px -3px ${c.color}66` }}
                ></div>
                <span className="font-black text-white text-sm">{c.name}</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  requestConfirm('ลบหมวดหมู่?', `ยืนยันลบหมวดหมู่ "${c.name}"?`, async () => {
                    const next = categories.filter(x => x.id !== c.id);
                    setCategories(next);
                    await deleteCategory(c.id);
                  });
                }}
                className="p-2 text-gray-600 hover:text-red-500 transition-colors"
              >
                <Icons.Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>

      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-end justify-center">
          <div className="glass-dark w-full max-w-md rounded-t-[3rem] p-8 pb-36 animate-slide-up border-t border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-black text-white mb-8 tracking-tight">ข้อมูลหมวดหมู่</h3>
            <div className="space-y-6">
              <div>
                <label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2 block">ชื่อหมวดหมู่</label>
                <input
                  type="text"
                  value={tempName}
                  onChange={e => setTempName(e.target.value)}
                  className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl outline-none font-black text-white focus:border-gold-primary/30 transition-all"
                  placeholder="เช่น อาหาร, เดินทาง..."
                />
              </div>
              {tab === 'expense' && (
                <div>
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2 block">งบประจำเดือน (ไม่บังคับ)</label>
                  <input
                    type="number"
                    value={tempBudget}
                    onChange={e => setTempBudget(e.target.value)}
                    className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl outline-none font-black text-white focus:border-gold-primary/30 transition-all"
                    placeholder="0"
                  />
                </div>
              )}
              <div>
                <label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2 block">สีประจำหมวด</label>
                <div className="flex gap-4 items-center">
                  <input
                    type="color"
                    value={tempColor}
                    onChange={e => setTempColor(e.target.value)}
                    className="w-20 h-20 bg-transparent border-none cursor-pointer rounded-2xl overflow-hidden"
                  />
                  <div className="flex-1 text-xs font-bold text-gray-400">เลือกสีที่ช่วยให้คุณจดจำหมวดหมู่ได้ง่ายขึ้น</div>
                </div>
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

export default CategoryManager;
