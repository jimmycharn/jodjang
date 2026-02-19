import { useState, useRef } from 'react';
import { useAuth } from './context/AuthContext';
import { useData } from './context/DataContext';
import { usePackage } from './context/PackageContext';
import { Icons } from './components/ui/Icons';
import ConfirmModal from './components/ui/ConfirmModal';
import ScreenAuth from './components/auth/ScreenAuth';
import ScreenDashboard from './components/dashboard/ScreenDashboard';
import ScreenAdd from './components/transactions/ScreenAdd';
import ScreenHistory from './components/transactions/ScreenHistory';
import ScreenSavings from './components/savings/ScreenSavings';
import ScreenSettings from './components/settings/ScreenSettings';
import ScreenMe from './components/profile/ScreenMe';
import ScreenAdmin from './components/admin/ScreenAdmin';
import { processWithGemini } from './services/geminiService';
import { generateId } from './lib/utils';

function App() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const { categories, wallets, transactions, setTransactions, saveTransaction, loading: dataLoading } = useData();
  const { features: pkgFeatures } = usePackage();
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAdmin, setShowAdmin] = useState(false);
  const [activeWalletId, setActiveWalletId] = useState('all');
  const [editTx, setEditTx] = useState(null);
  const [notification, setNotification] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
  const [isGlobalListening, setIsGlobalListening] = useState(false);
  const globalRecogRef = useRef(null);

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const requestConfirm = (title, message, onConfirm) => {
    setConfirmDialog({ isOpen: true, title, message, onConfirm });
  };

  const handleGlobalVoiceAdd = async () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const isLine = /Line/i.test(navigator.userAgent);
    
    if (isLine || !SpeechRecognition) {
      showNotification(isLine ? 'LINE ไม่รองรับเสียง กรุณาเปิดใน Chrome/Safari' : 'เบราว์เซอร์ไม่รองรับ', 'error');
      return;
    }
    
    // กดซ้ำเพื่อหยุดและวิเคราะห์
    if (isGlobalListening && globalRecogRef.current) {
      globalRecogRef.current.stop();
      return;
    }

    // ขอ permission ไมโครโฟนล่วงหน้า
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // หยุด stream ทันทีหลังได้ permission
      stream.getTracks().forEach(track => track.stop());
    } catch (e) {
      showNotification('กรุณาอนุญาตการใช้ไมโครโฟน', 'error');
      return;
    }

    setIsGlobalListening(true);
    showNotification('🎤 กำลังฟัง... พูดแล้วกดอีกครั้งเพื่อวิเคราะห์');

    const transcript = await new Promise((resolve) => {
      let resolved = false;
      const recognition = new SpeechRecognition();
      recognition.lang = 'th-TH';
      recognition.interimResults = false;
      recognition.continuous = false;
      recognition.maxAlternatives = 1;

      globalRecogRef.current = recognition;

      recognition.onresult = (event) => {
        if (!resolved) {
          resolved = true;
          resolve(event.results[0][0].transcript);
        }
      };

      recognition.onerror = (event) => {
        if (!resolved) {
          resolved = true;
          if (event.error === 'no-speech') {
            showNotification('ไม่ได้ยินเสียง ลองพูดใหม่อีกครั้ง', 'error');
          }
          resolve('');
        }
      };

      recognition.onend = () => {
        globalRecogRef.current = null;
        if (!resolved) {
          resolved = true;
          resolve('');
        }
      };

      try {
        recognition.start();
      } catch (e) {
        resolved = true;
        resolve('');
      }
    });

    setIsGlobalListening(false);
    globalRecogRef.current = null;

    if (!transcript.trim()) return;

    showNotification(`กำลังวิเคราะห์: "${transcript}"...`);

    const res = await processWithGemini(transcript, categories);
    
    if (res.success) {
      const d = res.data;
      const cat = categories.find(c => 
        (c.name.toLowerCase() === d.categoryName.toLowerCase() || d.categoryName.includes(c.name)) && c.type === d.type
      ) || categories.find(c => c.name === 'อื่นๆ' && c.type === d.type);
      
      const newTx = {
        id: generateId(),
        amount: d.amount,
        type: d.type,
        date: d.date,
        note: d.note,
        categoryId: cat?.id || '',
        walletId: activeWalletId === 'all' ? (wallets[0]?.id || '') : activeWalletId
      };

      if (newTx.categoryId && newTx.walletId) {
        setTransactions(prev => [newTx, ...prev]);
        await saveTransaction(newTx, false);
        showNotification(`บันทึกแล้ว: ${d.note} ${d.amount}฿`);
        setActiveTab('history');
      } else {
        showNotification('ข้อมูลไม่ครบถ้วน กรุณาบันทึกเอง', 'error');
        setEditTx(newTx);
        setActiveTab('add');
      }
    } else {
      showNotification(res.error, 'error');
    }
  };

  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="w-12 h-12 border-4 border-gold-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <ScreenAuth />;
  }

  if (showAdmin && isAdmin) {
    return (
      <div className="bg-[#0a0a0a] min-h-screen text-white font-sans selection:bg-gold-primary/30">
        <div className="max-w-md mx-auto relative min-h-screen">
          <ScreenAdmin onBack={() => setShowAdmin(false)} />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0a0a0a] min-h-screen text-white font-sans selection:bg-gold-primary/30">
      <div className="max-w-md mx-auto relative min-h-screen">
        {activeTab === 'dashboard' && (
          <ScreenDashboard activeWalletId={activeWalletId} setActiveWalletId={setActiveWalletId} />
        )}
        {activeTab === 'add' && (
          <ScreenAdd
            editTx={editTx}
            setEditTx={setEditTx}
            setActiveTab={setActiveTab}
            showNotification={showNotification}
            requestConfirm={requestConfirm}
            setActiveWalletId={setActiveWalletId}
          />
        )}
        {activeTab === 'history' && (
          <ScreenHistory
            activeWalletId={activeWalletId}
            setActiveWalletId={setActiveWalletId}
            setEditTx={setEditTx}
            setActiveTab={setActiveTab}
          />
        )}
        {activeTab === 'savings' && (
          <ScreenSavings requestConfirm={requestConfirm} />
        )}
        {activeTab === 'settings' && (
          <ScreenSettings showNotification={showNotification} requestConfirm={requestConfirm} />
        )}
        {activeTab === 'me' && <ScreenMe onOpenAdmin={() => setShowAdmin(true)} showNotification={showNotification} />}
        {activeTab === 'admin' && isAdmin && <ScreenAdmin onBack={() => setActiveTab('dashboard')} />}

        {/* Bottom Navigation */}
        <nav className="fixed bottom-6 left-0 right-0 mx-auto w-[calc(100%-2rem)] glass-dark border border-white/10 px-6 py-4 flex justify-between items-center z-50 max-w-md rounded-[2.5rem] shadow-2xl">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`p-2 transition-all ${activeTab === 'dashboard' ? 'gold-text scale-125' : 'text-gray-600 hover:text-gray-400'}`}
          >
            <Icons.PieChart size={24} />
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`p-2 transition-all ${activeTab === 'history' ? 'gold-text scale-125' : 'text-gray-600 hover:text-gray-400'}`}
          >
            <Icons.List size={24} />
          </button>
          <button
            onClick={() => { setEditTx(null); setActiveTab('add'); }}
            className="absolute left-1/2 -translate-x-1/2 -top-12 w-16 h-16 gold-bg rounded-[1.5rem] flex items-center justify-center text-black shadow-2xl shadow-gold-900/40 border-[6px] border-[#0a0a0a] active:scale-90 transition-all nav-add-glow"
          >
            <Icons.PlusCircle size={32} />
          </button>
          <button
            onClick={() => setActiveTab('savings')}
            className={`p-2 transition-all ${activeTab === 'savings' ? 'gold-text scale-125' : 'text-gray-600 hover:text-gray-400'}`}
          >
            <Icons.Star size={24} />
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`p-2 transition-all ${activeTab === 'settings' ? 'gold-text scale-125' : 'text-gray-600 hover:text-gray-400'}`}
          >
            <Icons.Settings size={24} />
          </button>
          <button
            onClick={() => setActiveTab('me')}
            className={`p-2 transition-all ${activeTab === 'me' ? 'gold-text scale-125' : 'text-gray-600 hover:text-gray-400'}`}
          >
            <Icons.User size={24} />
          </button>
        </nav>

        {/* Notification */}
        {notification && (
          <div className="fixed top-10 left-1/2 -translate-x-1/2 px-8 py-4 rounded-2xl shadow-2xl z-[200] glass-dark border border-gold-primary/30 text-white font-black text-sm animate-slide-down">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full gold-bg animate-pulse"></div>
              {notification.msg}
            </div>
          </div>
        )}

        {/* Voice Button */}
        {!/Line/i.test(navigator.userAgent) && pkgFeatures.voice && (
          <button
            onClick={handleGlobalVoiceAdd}
            className={`fixed bottom-28 right-6 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl z-50 transition-all active:scale-90 ${isGlobalListening ? 'bg-red-500 text-white animate-pulse shadow-red-500/40' : 'gold-bg text-black shadow-gold-900/20'}`}
          >
            <Icons.Mic size={24} />
          </button>
        )}

        {/* Confirm Modal */}
        <ConfirmModal
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          onConfirm={() => {
            confirmDialog.onConfirm();
            setConfirmDialog({ ...confirmDialog, isOpen: false });
          }}
          onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        />
      </div>
    </div>
  );
}

export default App;
