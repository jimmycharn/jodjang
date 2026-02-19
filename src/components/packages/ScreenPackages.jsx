import { useState } from 'react';
import { usePackage } from '../../context/PackageContext';
import { Icons } from '../ui/Icons';
import { formatCurrency } from '../../lib/utils';

const ScreenPackages = ({ onClose, showNotification }) => {
  const { userVisiblePackages, currentPackage, subscription, subscribe, isPremium } = usePackage();
  const [selectedPkg, setSelectedPkg] = useState(null);
  const [showPayment, setShowPayment] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const handleSelectPackage = (pkg) => {
    if (pkg.slug === 'free') {
      // ถ้าเลือกฟรี ก็ downgrade เลย
      if (currentPackage?.slug !== 'free') {
        setSelectedPkg(pkg);
        setShowPayment(true);
      }
      return;
    }
    if (currentPackage?.id === pkg.id) return;
    setSelectedPkg(pkg);
    setShowPayment(true);
  };

  const handlePayment = async () => {
    if (!selectedPkg) return;
    setProcessing(true);

    // Simulate payment processing
    await new Promise(r => setTimeout(r, 2000));

    const result = await subscribe(selectedPkg.id, 'promptpay');
    setProcessing(false);

    if (result.success) {
      setPaymentSuccess(true);
      if (showNotification) {
        showNotification(selectedPkg.slug === 'free' ? 'เปลี่ยนเป็นแพ็คเกจฟรีแล้ว' : `สมัคร${selectedPkg.name}สำเร็จ!`);
      }
    } else {
      if (showNotification) showNotification(result.message || 'เกิดข้อผิดพลาด', 'error');
    }
  };

  const getPackageIcon = (slug) => {
    switch (slug) {
      case 'free': return <Icons.Package size={28} />;
      case 'monthly': return <Icons.Zap size={28} />;
      case 'yearly': return <Icons.Crown size={28} />;
      default: return <Icons.Package size={28} />;
    }
  };

  const getPackageColor = (slug) => {
    switch (slug) {
      case 'free': return { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30' };
      case 'monthly': return { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' };
      case 'yearly': return { bg: 'bg-gold-primary/20', text: 'text-gold-primary', border: 'border-gold-primary/30' };
      default: return { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30' };
    }
  };

  const featureList = [
    { key: 'voice', label: 'สั่งงานด้วยเสียง', icon: <Icons.Mic size={16} /> },
    { key: 'max_wallets', label: 'กระเป๋าเงินไม่จำกัด', icon: <Icons.Wallet size={16} /> },
    { key: 'wallet_edit', label: 'เพิ่ม/ลบ/แก้ไขกระเป๋า', icon: <Icons.Settings size={16} /> },
    { key: 'csv_export', label: 'ส่งออกข้อมูล CSV', icon: <Icons.Download size={16} /> },
    { key: 'transfer', label: 'โอนเงินระหว่างกระเป๋า', icon: <Icons.TrendingUp size={16} /> },
  ];

  // Payment Success Screen
  if (paymentSuccess && selectedPkg) {
    const expiresAt = subscription?.expires_at ? new Date(subscription.expires_at) : null;
    return (
      <div className="fixed inset-0 bg-[#0a0a0a] z-50 flex flex-col items-center justify-center max-w-md mx-auto w-full animate-scale-in p-8">
        <div className="w-24 h-24 rounded-full bg-green-500/20 flex items-center justify-center mb-8 animate-pulse">
          <Icons.Check size={48} className="text-green-400" />
        </div>
        <h2 className="text-2xl font-black text-white mb-2">
          {selectedPkg.slug === 'free' ? 'เปลี่ยนแพ็คเกจแล้ว' : 'ชำระเงินสำเร็จ!'}
        </h2>
        <p className="text-gray-400 text-sm font-bold mb-2">แพ็คเกจ: {selectedPkg.name}</p>
        {selectedPkg.slug !== 'free' && (
          <>
            <p className="text-gold-primary text-lg font-black mb-1">{formatCurrency(selectedPkg.price)}</p>
            {expiresAt && (
              <p className="text-gray-500 text-xs font-bold">
                หมดอายุ: {expiresAt.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}
          </>
        )}
        <button
          onClick={onClose}
          className="mt-10 w-full py-4 gold-bg text-black rounded-2xl font-black text-lg shadow-xl shadow-gold-900/20 active:scale-95 transition-all"
        >
          เสร็จสิ้น
        </button>
      </div>
    );
  }

  // Payment Screen
  if (showPayment && selectedPkg) {
    return (
      <div className="fixed inset-0 bg-[#0a0a0a] z-50 flex flex-col max-w-md mx-auto w-full animate-slide-up">
        <div className="p-6 border-b border-white/10 flex items-center gap-4 px-8">
          <button onClick={() => { setShowPayment(false); setSelectedPkg(null); }} className="text-gray-500 hover:text-white transition-colors">
            <Icons.ArrowLeft size={24} />
          </button>
          <h2 className="text-xl font-black text-white tracking-tight">
            {selectedPkg.slug === 'free' ? 'ยืนยันเปลี่ยนแพ็คเกจ' : 'ชำระเงิน'}
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Package Summary */}
          <div className="glass-dark p-6 rounded-[2rem] border border-white/10">
            <div className="flex items-center gap-4 mb-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${getPackageColor(selectedPkg.slug).bg} ${getPackageColor(selectedPkg.slug).text}`}>
                {getPackageIcon(selectedPkg.slug)}
              </div>
              <div>
                <h3 className="text-lg font-black text-white">{selectedPkg.name}</h3>
                <p className="text-xs text-gray-500 font-bold">{selectedPkg.description}</p>
              </div>
            </div>
            <div className="border-t border-white/5 pt-4 flex justify-between items-center">
              <span className="text-sm text-gray-400 font-bold">ราคา</span>
              <span className="text-2xl font-black text-white">
                {selectedPkg.price === 0 ? 'ฟรี' : formatCurrency(selectedPkg.price)}
              </span>
            </div>
            {selectedPkg.duration_days > 0 && (
              <div className="flex justify-between items-center mt-2">
                <span className="text-sm text-gray-400 font-bold">ระยะเวลา</span>
                <span className="text-sm font-black text-gold-primary">{selectedPkg.duration_days} วัน</span>
              </div>
            )}
          </div>

          {selectedPkg.slug === 'free' ? (
            <div className="glass-dark p-6 rounded-[2rem] border border-red-500/20">
              <div className="flex items-center gap-3 mb-3">
                <Icons.AlertCircle size={20} className="text-red-400" />
                <h3 className="text-sm font-black text-red-400">คำเตือน</h3>
              </div>
              <p className="text-xs text-gray-400 font-bold leading-relaxed">
                การเปลี่ยนเป็นแพ็คเกจฟรีจะทำให้คุณไม่สามารถใช้ฟีเจอร์พรีเมียมได้ 
                เช่น สั่งงานด้วยเสียง, จัดการกระเป๋าเงิน, ส่งออก CSV 
                แต่ข้อมูลทั้งหมดจะยังคงอยู่ คุณสามารถดูรายการของกระเป๋าอื่นได้ แต่ไม่สามารถเพิ่มหรือแก้ไขได้
              </p>
            </div>
          ) : (
            <>
              {/* Payment Method */}
              <div className="glass-dark p-6 rounded-[2rem] border border-white/10">
                <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">ช่องทางชำระเงิน</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-gold-primary/30">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                      <Icons.CreditCard size={20} className="text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-black text-white">PromptPay / QR Code</div>
                      <div className="text-[10px] text-gray-500 font-bold">สแกนจ่ายผ่าน Mobile Banking</div>
                    </div>
                    <div className="w-5 h-5 rounded-full border-2 border-gold-primary flex items-center justify-center">
                      <div className="w-2.5 h-2.5 rounded-full gold-bg"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* QR Code Placeholder */}
              <div className="glass-dark p-6 rounded-[2rem] border border-white/10 text-center">
                <div className="w-48 h-48 mx-auto bg-white rounded-2xl flex items-center justify-center mb-4">
                  <div className="text-center">
                    <Icons.CreditCard size={48} className="text-gray-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-500 font-bold">QR Code</p>
                    <p className="text-lg font-black text-black">{formatCurrency(selectedPkg.price)}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 font-bold">สแกน QR Code เพื่อชำระเงิน</p>
              </div>
            </>
          )}
        </div>

        {/* Confirm Button */}
        <div className="p-6 border-t border-white/10">
          <button
            onClick={handlePayment}
            disabled={processing}
            className="w-full py-5 gold-bg text-black rounded-2xl font-black text-lg shadow-xl shadow-gold-900/20 active:scale-95 transition-all disabled:opacity-50"
          >
            {processing ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                กำลังดำเนินการ...
              </span>
            ) : selectedPkg.slug === 'free' ? 'ยืนยันเปลี่ยนแพ็คเกจ' : `ยืนยันชำระ ${formatCurrency(selectedPkg.price)}`}
          </button>
        </div>
      </div>
    );
  }

  // Package List Screen
  return (
    <div className="fixed inset-0 bg-[#0a0a0a] z-50 flex flex-col max-w-md mx-auto w-full animate-slide-up">
      <div className="p-6 border-b border-white/10 flex items-center gap-4 px-8">
        <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
          <Icons.ArrowLeft size={24} />
        </button>
        <div>
          <h2 className="text-xl font-black text-white tracking-tight">เลือกแพ็คเกจ</h2>
          <p className="text-xs text-gray-500 font-bold">เลือกแพ็คเกจที่เหมาะกับคุณ</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 pb-32">
        {userVisiblePackages.map(pkg => {
          const colors = getPackageColor(pkg.slug);
          const isCurrent = currentPackage?.id === pkg.id;
          const features = pkg.features || {};

          return (
            <div
              key={pkg.id}
              onClick={() => handleSelectPackage(pkg)}
              className={`glass-dark p-6 rounded-[2rem] border transition-all cursor-pointer active:scale-[0.98] ${isCurrent ? `${colors.border} ring-1 ring-gold-primary/20` : 'border-white/10 hover:border-white/20'}`}
            >
              {/* Header */}
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${colors.bg} ${colors.text}`}>
                  {getPackageIcon(pkg.slug)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-white">{pkg.name}</h3>
                    {isCurrent && (
                      <span className="px-2 py-0.5 rounded-lg gold-bg text-black text-[10px] font-black">ใช้อยู่</span>
                    )}
                    {pkg.slug === 'yearly' && !isCurrent && (
                      <span className="px-2 py-0.5 rounded-lg bg-green-500/20 text-green-400 text-[10px] font-black">คุ้มสุด</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 font-bold">{pkg.description}</p>
                </div>
              </div>

              {/* Price */}
              <div className="mb-4">
                <span className="text-3xl font-black text-white">
                  {pkg.price === 0 ? 'ฟรี' : formatCurrency(pkg.price).replace('฿', '')}
                </span>
                {pkg.price > 0 && (
                  <>
                    <span className="text-lg font-black text-gold-primary ml-1">฿</span>
                    <span className="text-sm text-gray-500 font-bold ml-2">
                      / {pkg.duration_days === 30 ? 'เดือน' : pkg.duration_days === 365 ? 'ปี' : `${pkg.duration_days} วัน`}
                    </span>
                  </>
                )}
                {pkg.slug === 'yearly' && (
                  <div className="text-xs text-green-400 font-bold mt-1">ประหยัด {formatCurrency(60 * 12 - 365)} ต่อปี</div>
                )}
              </div>

              {/* Features */}
              <div className="space-y-2 border-t border-white/5 pt-4">
                {featureList.map(f => {
                  const enabled = f.key === 'max_wallets' ? (features[f.key] || 1) > 1 : features[f.key];
                  return (
                    <div key={f.key} className="flex items-center gap-3">
                      {enabled ? (
                        <Icons.Check size={14} className="text-green-400" />
                      ) : (
                        <Icons.X size={14} className="text-red-400/50" />
                      )}
                      <span className={`text-xs font-bold ${enabled ? 'text-gray-300' : 'text-gray-600 line-through'}`}>
                        {f.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* CTA */}
              {!isCurrent && (
                <button className={`w-full mt-4 py-3 rounded-2xl font-black text-sm transition-all ${pkg.slug === 'free' ? 'bg-white/5 text-gray-400 border border-white/10' : 'gold-bg text-black shadow-lg shadow-gold-900/20'}`}>
                  {pkg.slug === 'free' ? 'เปลี่ยนเป็นฟรี' : `สมัคร ${pkg.name}`}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ScreenPackages;
