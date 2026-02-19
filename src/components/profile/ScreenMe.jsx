import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usePackage } from '../../context/PackageContext';
import { Icons } from '../ui/Icons';
import ScreenPackages from '../packages/ScreenPackages';

const ScreenMe = ({ onOpenAdmin, showNotification }) => {
  const { user, logout, isAdmin } = useAuth();
  const { currentPackage, subscription, isPremium } = usePackage();
  const [showPackages, setShowPackages] = useState(false);

  const expiresAt = subscription?.expires_at ? new Date(subscription.expires_at) : null;
  const daysLeft = expiresAt ? Math.max(0, Math.ceil((expiresAt - new Date()) / (1000 * 60 * 60 * 24))) : null;

  const getPackageIcon = (slug) => {
    switch (slug) {
      case 'free': return <Icons.Package size={20} />;
      case 'monthly': return <Icons.Zap size={20} />;
      case 'yearly': return <Icons.Crown size={20} />;
      default: return <Icons.Package size={20} />;
    }
  };

  return (
    <div className="p-10 pt-20 bg-[#0a0a0a] min-h-screen flex flex-col items-center max-w-md mx-auto w-full">
      <div className="relative mb-8">
        <div className="w-32 h-32 gold-bg rounded-[2.5rem] flex items-center justify-center text-black shadow-2xl shadow-gold-900/40 animate-pulse-slow">
          <Icons.User size={64} />
        </div>
        <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-green-500 border-4 border-[#0a0a0a] rounded-full"></div>
      </div>
      
      <h2 className="text-3xl font-black text-white tracking-tight mb-1">{user?.name}</h2>
      <p className="text-gold-primary font-bold text-sm mb-1 opacity-80">{user?.email || user?.username}</p>
      <div className="flex items-center gap-2 mb-8">
        {isAdmin && (
          <span className="px-3 py-1 rounded-xl gold-bg text-black text-xs font-black">ADMIN</span>
        )}
      </div>

      {/* Current Package Card */}
      <div
        onClick={() => setShowPackages(true)}
        className="w-full glass-dark p-5 rounded-[2rem] border border-white/10 mb-6 cursor-pointer hover:border-gold-primary/30 transition-all active:scale-[0.98]"
      >
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isPremium ? 'bg-gold-primary/20 text-gold-primary' : 'bg-gray-500/20 text-gray-400'}`}>
            {getPackageIcon(currentPackage?.slug)}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-white">แพ็คเกจ: {currentPackage?.name || 'ฟรี'}</span>
              {isPremium && (
                <span className="px-2 py-0.5 rounded-lg bg-green-500/20 text-green-400 text-[10px] font-black">ACTIVE</span>
              )}
            </div>
            {expiresAt && daysLeft !== null ? (
              <div className="flex items-center gap-1 mt-1">
                <Icons.Clock size={12} className={daysLeft <= 7 ? 'text-red-400' : 'text-gray-500'} />
                <span className={`text-xs font-bold ${daysLeft <= 7 ? 'text-red-400' : 'text-gray-500'}`}>
                  {daysLeft <= 0 ? 'หมดอายุแล้ว' : `เหลือ ${daysLeft} วัน (${expiresAt.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })})`}
                </span>
              </div>
            ) : (
              <span className="text-xs text-gray-500 font-bold">กดเพื่อดูแพ็คเกจทั้งหมด</span>
            )}
          </div>
          <Icons.ChevronRight size={16} className="text-gray-600" />
        </div>
      </div>

      <div className="w-full space-y-4 pb-32">
        {/* Upgrade Button for free users */}
        {!isPremium && (
          <button
            onClick={() => setShowPackages(true)}
            className="w-full py-5 bg-gradient-to-r from-gold-primary/20 to-gold-primary/5 text-gold-primary rounded-[1.5rem] font-black text-lg border border-gold-primary/20 hover:border-gold-primary/40 transition-all active:scale-95 flex items-center justify-center gap-3"
          >
            <Icons.Crown size={24} />
            อัพเกรดแพ็คเกจ
          </button>
        )}

        {isAdmin && (
          <button
            onClick={onOpenAdmin}
            className="w-full py-5 bg-white/5 text-gold-primary rounded-[1.5rem] font-black text-lg border border-gold-primary/20 hover:bg-gold-primary/5 transition-all active:scale-95 flex items-center justify-center gap-3"
          >
            <Icons.Shield size={24} />
            Admin Dashboard
          </button>
        )}
        <button
          onClick={logout}
          className="w-full py-5 bg-white/5 text-red-500 rounded-[1.5rem] font-black text-lg border border-red-500/10 hover:bg-red-500/5 transition-all active:scale-95"
        >
          ออกจากระบบ
        </button>
      </div>

      {showPackages && (
        <ScreenPackages onClose={() => setShowPackages(false)} showNotification={showNotification} />
      )}
    </div>
  );
};

export default ScreenMe;
