import { Icons } from './Icons';

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, type = 'danger' }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="glass-dark w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-scale-in text-center border border-white/10">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${type === 'danger' ? 'bg-red-500/10 text-red-500' : 'bg-gold-primary/10 text-gold-primary'}`}>
          <Icons.AlertCircle size={40} />
        </div>
        <h3 className="text-xl font-black text-white mb-2">{title}</h3>
        <p className="text-gray-400 text-sm mb-8 leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <button 
            onClick={onCancel} 
            className="flex-1 py-4 bg-white/5 text-gray-400 font-bold rounded-2xl active:scale-95 transition-all border border-white/5"
          >
            ยกเลิก
          </button>
          <button 
            onClick={onConfirm} 
            className={`flex-1 py-4 text-black font-bold rounded-2xl active:scale-95 transition-all shadow-lg ${type === 'danger' ? 'bg-red-500 shadow-red-900/20' : 'gold-bg shadow-gold-900/20'}`}
          >
            ยืนยัน
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
