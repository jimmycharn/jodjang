import { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { usePackage } from '../../context/PackageContext';
import { Icons } from '../ui/Icons';
import CategoryManager from './CategoryManager';
import WalletManager from './WalletManager';
import TransferModal from './TransferModal';
import ExportModal from './ExportModal';

const ScreenSettings = ({ showNotification, requestConfirm }) => {
  const { theme, toggleTheme } = useTheme();
  const { features: pkgFeatures } = usePackage();
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showWalletManager, setShowWalletManager] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  return (
    <div className="p-8 pt-12 pb-40 bg-[#0a0a0a] min-h-screen max-w-md mx-auto w-full">
      <h2 className="text-3xl font-black mb-10 tracking-tight text-white">ตั้งค่า</h2>
      
      <div className="space-y-4">
        {/* Theme Toggle */}
        <div
          onClick={toggleTheme}
          className="flex items-center justify-between p-6 glass-dark rounded-xl cursor-pointer border border-white/5 hover:border-gold-primary/30 transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform ${theme === 'dark' ? 'bg-gold-primary/10 text-gold-primary' : 'bg-blue-500/10 text-blue-500'}`}>
              {theme === 'dark' ? <Icons.Sparkles size={24} /> : <Icons.Settings size={24} />}
            </div>
            <div>
              <div className="font-black text-sm text-white">โหมดสี (Theme)</div>
              <div className="text-xs text-gray-500 font-bold">{theme === 'dark' ? 'Dark Mode (สีเข้ม)' : 'Light Mode (สีสว่าง)'}</div>
            </div>
          </div>
          <div className={`w-12 h-6 rounded-full p-1 transition-colors ${theme === 'dark' ? 'bg-gray-700' : 'bg-blue-500'}`}>
            <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${theme === 'dark' ? 'translate-x-0' : 'translate-x-6'}`}></div>
          </div>
        </div>

        {/* Category Manager */}
        <div
          onClick={() => setShowCategoryManager(true)}
          className="flex items-center justify-between p-6 glass-dark rounded-xl cursor-pointer border border-white/5 hover:border-gold-primary/30 transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gold-primary/10 flex items-center justify-center text-gold-primary group-hover:scale-110 transition-transform">
              <Icons.List size={24} />
            </div>
            <span className="font-black text-sm text-white">จัดการหมวดหมู่</span>
          </div>
          <Icons.ChevronRight className="text-gray-600" />
        </div>

        {/* Wallet Manager */}
        <div
          onClick={() => {
            if (!pkgFeatures.wallet_edit) {
              showNotification('ฟีเจอร์นี้ต้องอัพเกรดแพ็คเกจ', 'error');
              return;
            }
            setShowWalletManager(true);
          }}
          className={`flex items-center justify-between p-6 glass-dark rounded-xl cursor-pointer border transition-all group ${!pkgFeatures.wallet_edit ? 'border-white/5 opacity-50' : 'border-white/5 hover:border-gold-primary/30'}`}
        >
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform ${!pkgFeatures.wallet_edit ? 'bg-gray-500/10 text-gray-500' : 'bg-gold-primary/10 text-gold-primary'}`}>
              <Icons.Wallet size={24} />
            </div>
            <div>
              <span className="font-black text-sm text-white">จัดการกระเป๋าเงิน</span>
              {!pkgFeatures.wallet_edit && <div className="text-[10px] text-red-400 font-bold flex items-center gap-1"><Icons.Lock size={10} /> ต้องอัพเกรดแพ็คเกจ</div>}
            </div>
          </div>
          {!pkgFeatures.wallet_edit ? <Icons.Lock size={16} className="text-gray-600" /> : <Icons.ChevronRight className="text-gray-600" />}
        </div>

        {/* Transfer */}
        <div
          onClick={() => {
            if (!pkgFeatures.transfer) {
              showNotification('ฟีเจอร์นี้ต้องอัพเกรดแพ็คเกจ', 'error');
              return;
            }
            setShowTransferModal(true);
          }}
          className={`flex items-center justify-between p-6 glass-dark rounded-xl cursor-pointer border transition-all group ${!pkgFeatures.transfer ? 'border-white/5 opacity-50' : 'border-white/5 hover:border-gold-primary/30'}`}
        >
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform ${!pkgFeatures.transfer ? 'bg-gray-500/10 text-gray-500' : 'bg-gold-primary/10 text-gold-primary'}`}>
              <Icons.TrendingUp size={24} />
            </div>
            <div>
              <span className="font-black text-sm text-white">โอนเงินระหว่างกระเป๋า</span>
              {!pkgFeatures.transfer && <div className="text-[10px] text-red-400 font-bold flex items-center gap-1"><Icons.Lock size={10} /> ต้องอัพเกรดแพ็คเกจ</div>}
            </div>
          </div>
          {!pkgFeatures.transfer ? <Icons.Lock size={16} className="text-gray-600" /> : <Icons.ChevronRight className="text-gray-600" />}
        </div>

        {/* Export */}
        <div
          onClick={() => {
            if (!pkgFeatures.csv_export) {
              showNotification('ฟีเจอร์นี้ต้องอัพเกรดแพ็คเกจ', 'error');
              return;
            }
            setShowExportModal(true);
          }}
          className={`flex items-center justify-between p-6 glass-dark rounded-xl cursor-pointer border transition-all group ${!pkgFeatures.csv_export ? 'border-white/5 opacity-50' : 'border-white/5 hover:border-gold-primary/30'}`}
        >
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform ${!pkgFeatures.csv_export ? 'bg-gray-500/10 text-gray-500' : 'bg-gold-primary/10 text-gold-primary'}`}>
              <Icons.Download size={24} />
            </div>
            <div>
              <span className="font-black text-sm text-white">ส่งออกข้อมูล (CSV)</span>
              {!pkgFeatures.csv_export && <div className="text-[10px] text-red-400 font-bold flex items-center gap-1"><Icons.Lock size={10} /> ต้องอัพเกรดแพ็คเกจ</div>}
            </div>
          </div>
          {!pkgFeatures.csv_export ? <Icons.Lock size={16} className="text-gray-600" /> : <Icons.ChevronRight className="text-gray-600" />}
        </div>
      </div>

      {showCategoryManager && <CategoryManager onClose={() => setShowCategoryManager(false)} requestConfirm={requestConfirm} />}
      {showWalletManager && <WalletManager onClose={() => setShowWalletManager(false)} requestConfirm={requestConfirm} />}
      {showTransferModal && <TransferModal onClose={() => setShowTransferModal(false)} showNotification={showNotification} />}
      {showExportModal && <ExportModal isOpen={showExportModal} onClose={() => setShowExportModal(false)} />}
    </div>
  );
};

export default ScreenSettings;
