import { useState } from 'react';
import { useData } from '../../context/DataContext';
import { generateId } from '../../lib/utils';
import { Icons } from '../ui/Icons';

const WalletManager = ({ onClose, requestConfirm }) => {
  const { wallets, setWallets, updateWallets, deleteWallet } = useData();
  const [editing, setEditing] = useState(null);
  const [tempName, setTempName] = useState('');
  const [tempBalance, setTempBalance] = useState('');
  const [tempColor, setTempColor] = useState('#D4AF37');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [draggedItem, setDraggedItem] = useState(null);

  const openEditor = (w) => {
    setEditing(w);
    setTempName(w ? w.name : '');
    setTempBalance(w ? String(w.initialbalance || 0) : '');
    setTempColor(w ? w.color : '#D4AF37');
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!tempName) return;
    let newWallets = [...wallets];

    if (editing) {
      newWallets = newWallets.map(w => w.id === editing.id 
        ? { ...w, name: tempName, initialbalance: parseFloat(tempBalance) || 0, color: tempColor } 
        : w
      );
    } else {
      const newWallet = { 
        id: generateId(), 
        name: tempName, 
        type: 'other', 
        initialbalance: parseFloat(tempBalance) || 0, 
        color: tempColor 
      };
      newWallets.push(newWallet);
      const savedOrder = JSON.parse(localStorage.getItem('wallet_order') || '[]');
      if (savedOrder.length > 0) {
        savedOrder.push(newWallet.id);
        localStorage.setItem('wallet_order', JSON.stringify(savedOrder));
      }
    }
    setWallets(newWallets);
    await updateWallets(newWallets);
    setIsModalOpen(false);
  };

  const saveOrder = (newWallets) => {
    const order = newWallets.map(w => w.id);
    localStorage.setItem('wallet_order', JSON.stringify(order));
    setWallets(newWallets);
  };

  const onDragStart = (e, index) => {
    setDraggedItem(wallets[index]);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (e, index) => {
    e.preventDefault();
    const draggedOverItem = wallets[index];
    if (draggedItem === draggedOverItem) return;

    let items = wallets.filter(item => item !== draggedItem);
    items.splice(index, 0, draggedItem);
    saveOrder(items);
  };

  const onDragEnd = () => {
    setDraggedItem(null);
  };

  return (
    <div className="fixed inset-0 bg-[#0a0a0a] z-50 flex flex-col max-w-md mx-auto w-full animate-slide-up">
      <div className="p-6 border-b border-white/10 flex justify-between items-center px-8">
        <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
          <Icons.X />
        </button>
        <h2 className="text-xl font-black text-white tracking-tight">จัดการกระเป๋าเงิน</h2>
        <div className="w-6" />
      </div>

      <div className="p-6 flex-1 overflow-y-auto bg-[#0a0a0a] pb-24">
        {/* Add Button at Top */}
        <button
          onClick={() => openEditor(null)}
          className="w-full mb-6 py-4 rounded-[1.5rem] font-black text-black gold-bg shadow-xl shadow-gold-900/30 active:scale-[0.98] transition-all"
        >
          + เพิ่มกระเป๋าเงินใหม่
        </button>

        <div className="space-y-3">
          {wallets.map((w, index) => (
            <div
              key={w.id}
              data-wallet-index={index}
              draggable
              onDragStart={(e) => onDragStart(e, index)}
              onDragOver={(e) => onDragOver(e, index)}
              onDragEnd={onDragEnd}
              onClick={() => openEditor(w)}
              className={`glass-dark p-5 rounded-[1.5rem] flex justify-between items-center border border-white/10 hover:border-gold-primary/30 transition-all cursor-pointer group select-none ${draggedItem === w ? 'opacity-50 scale-95 border-gold-primary border-dashed' : ''}`}
            >
              <div className="flex items-center gap-5 pointer-events-none">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-black shadow-lg group-hover:scale-110 transition-transform"
                  style={{ backgroundColor: w.color, boxShadow: `0 6px 15px -4px ${w.color}66` }}
                >
                  <Icons.Wallet size={24} />
                </div>
                <span className="font-black text-white text-sm">{w.name}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-gold-primary font-black text-sm pointer-events-none">
                  ฿{(w.initialbalance || 0).toLocaleString()}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    requestConfirm('ลบกระเป๋าเงิน?', `ยืนยันลบกระเป๋าเงิน "${w.name}"?`, async () => {
                      const next = wallets.filter(x => x.id !== w.id);
                      setWallets(next);
                      await deleteWallet(w.id);
                    });
                  }}
                  className="p-2 text-gray-600 hover:text-red-500 transition-colors"
                >
                  <Icons.Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-end justify-center">
          <div className="glass-dark w-full max-w-md rounded-t-[3rem] p-8 pb-36 animate-slide-up border-t border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-black text-white mb-8 tracking-tight">ข้อมูลกระเป๋าเงิน</h3>
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">ชื่อกระเป๋าเงิน</label>
                <input
                  type="text"
                  value={tempName}
                  onChange={e => setTempName(e.target.value)}
                  className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl outline-none font-black text-white focus:border-gold-primary/30 transition-all"
                  placeholder="เช่น เงินสด, บัญชีหลัก..."
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">ยอดเงินเริ่มต้น</label>
                <input
                  type="number"
                  value={tempBalance}
                  onChange={e => setTempBalance(e.target.value)}
                  className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl outline-none font-black text-white focus:border-gold-primary/30 transition-all"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">สีประจำกระเป๋า</label>
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

export default WalletManager;
