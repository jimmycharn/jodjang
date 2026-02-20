import { useState, useEffect, useRef } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { usePackage } from '../../context/PackageContext';
import { Icons } from '../ui/Icons';
import { toLocalDateString, generateId } from '../../lib/utils';
import { processWithGemini } from '../../services/geminiService';
import { readSlipWithAI } from '../../lib/slipReader';

const ScreenAdd = ({ editTx, setEditTx, setActiveTab, showNotification, requestConfirm, setActiveWalletId }) => {
  const { user } = useAuth();
  const { categories, wallets, transactions, setTransactions, saveTransaction, deleteTransaction } = useData();
  const { features: pkgFeatures } = usePackage();
  
  const [type, setType] = useState(editTx ? editTx.type : 'expense');
  const [amount, setAmount] = useState(editTx ? String(editTx.amount) : '');
  const [date, setDate] = useState(editTx ? editTx.date : toLocalDateString(new Date()));
  const [categoryId, setCategoryId] = useState(editTx ? editTx.categoryId : '');
  const [walletId, setWalletId] = useState(editTx ? editTx.walletId : (wallets[0]?.id || ''));
  const [note, setNote] = useState(editTx ? editTx.note : '');
  const [aiText, setAiText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [slipLoading, setSlipLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [useAiMode, setUseAiMode] = useState(true); // Default to AI mode for new transactions
  const aiInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const recogRef = useRef(null);

  const handleVoiceInput = async () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const isLine = /Line/i.test(navigator.userAgent);
    
    if (isLine || !SpeechRecognition) {
      showNotification(isLine ? 'LINE ไม่รองรับเสียง กรุณาเปิดใน Chrome/Safari' : 'เบราว์เซอร์ไม่รองรับการสั่งงานด้วยเสียง', 'error');
      return;
    }

    // กดซ้ำเพื่อหยุด
    if (isListening && recogRef.current) {
      recogRef.current.stop();
      return;
    }

    // ขอ permission ไมโครโฟนล่วงหน้า
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
    } catch (e) {
      showNotification('กรุณาอนุญาตการใช้ไมโครโฟน', 'error');
      return;
    }

    setIsListening(true);

    const transcript = await new Promise((resolve) => {
      let resolved = false;
      const recognition = new SpeechRecognition();
      recognition.lang = 'th-TH';
      recognition.interimResults = false;
      recognition.continuous = false;
      recognition.maxAlternatives = 1;

      recogRef.current = recognition;

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
            showNotification('ไม่ได้ยินเสียง ลองพูดใหม่', 'error');
          }
          resolve('');
        }
      };

      recognition.onend = () => {
        recogRef.current = null;
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

    setIsListening(false);
    recogRef.current = null;

    if (transcript) {
      setAiText(prev => prev ? `${prev} ${transcript}` : transcript);
    }
  };

  useEffect(() => {
    if (!editTx && aiInputRef.current) {
      aiInputRef.current.focus();
    }
  }, [editTx]);

  const processSave = async (txData) => {
    // Validate required fields
    if (!txData.amount || isNaN(txData.amount)) {
      showNotification('กรุณาระบุจำนวนเงิน', 'error');
      return false;
    }
    if (!txData.categoryId) {
      showNotification('กรุณาเลือกหมวดหมู่', 'error');
      return false;
    }
    if (!txData.walletId) {
      showNotification('กรุณาเลือกกระเป๋าเงิน', 'error');
      return false;
    }
    
    const newTx = { ...txData, id: editTx ? editTx.id : generateId() };
    
    if (editTx) {
      setTransactions(prev => prev.map(t => t.id === editTx.id ? newTx : t));
    } else {
      setTransactions(prev => [newTx, ...prev]);
    }
    
    const result = await saveTransaction(newTx, !!editTx);
    if (result?.error) {
      showNotification('บันทึกไม่สำเร็จ: ' + result.error, 'error');
      return false;
    }
    
    showNotification('บันทึกรายการเรียบร้อย', 'success');
    setActiveWalletId(newTx.walletId);
    setActiveTab('history');
    setEditTx(null);
    return true;
  };

  const handleAI = async () => {
    if (!aiText) return;
    setAiLoading(true);
    
    const res = await processWithGemini(aiText, categories);
    setAiLoading(false);
    
    if (res.success) {
      const d = res.data;
      const cat = categories.find(c => 
        (c.name.toLowerCase() === d.categoryName.toLowerCase() || d.categoryName.includes(c.name)) && c.type === d.type
      ) || categories.find(c => c.name === 'อื่นๆ' && c.type === d.type);
      
      const txData = {
        amount: d.amount,
        type: d.type,
        date: d.date,
        note: d.note,
        categoryId: cat?.id || '',
        walletId: walletId
      };
      
      setAmount(String(d.amount));
      setType(d.type);
      setNote(d.note);
      setDate(d.date);
      if (cat) setCategoryId(cat.id);
      
      if (txData.categoryId && txData.walletId) {
        showNotification('AI บันทึกข้อมูลเรียบร้อย');
        processSave(txData);
      } else {
        showNotification('AI วิเคราะห์เสร็จแล้ว กรุณาตรวจสอบหมวดหมู่');
      }
    } else {
      showNotification(res.error, 'error');
    }
  };

  const handleSlipUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setSlipLoading(true);
    const totalFiles = files.length;
    showNotification(`กำลังอ่านสลิป ${totalFiles} รูป...`, 'success');

    const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    let lastResult = null;
    let isDuplicateSingle = false;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Skip files larger than 5MB
      if (file.size > 5 * 1024 * 1024) {
        errorCount++;
        continue;
      }

      try {
        // Read file as base64
        const reader = new FileReader();
        const base64Promise = new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
        });
        reader.readAsDataURL(file);
        const base64Image = await base64Promise;

        const res = await readSlipWithAI(base64Image, geminiKey);
        
        if (res) {
          // Check duplicate by ref
          if (res.ref) {
            const isDuplicate = transactions.some(t => t.note?.includes(res.ref));
            if (isDuplicate) {
              skipCount++;
              if (totalFiles === 1) isDuplicateSingle = true;
              continue;
            }
          }

          // If single file, fill form for review
          if (totalFiles === 1) {
            lastResult = res;
          } else {
            // Multiple files: auto-save each one
            let finalNote = res.note || 'สลิปโอนเงิน';
            if (res.ref) finalNote += ` (Ref: ${res.ref})`;

            const cat = categories.find(c =>
              (c.name.toLowerCase() === (res.categoryName || '').toLowerCase() || (res.categoryName || '').includes(c.name)) && c.type === res.type
            ) || categories.find(c => c.name === 'อื่นๆ' && c.type === res.type);

            const txData = {
              amount: res.amount,
              type: res.type || 'expense',
              date: res.date || toLocalDateString(new Date()),
              categoryId: cat?.id || '',
              walletId: walletId,
              note: finalNote
            };

            if (txData.amount && txData.walletId) {
              await processSave(txData);
              successCount++;
            } else {
              errorCount++;
            }
          }
        } else {
          errorCount++;
        }
      } catch (error) {
        console.error("Slip reading error:", error);
        errorCount++;
      }
    }

    // Handle results
    if (totalFiles === 1 && lastResult) {
      // Single file: fill form for review
      if (lastResult.amount) setAmount(String(lastResult.amount));
      if (lastResult.type) setType(lastResult.type);
      if (lastResult.date) setDate(lastResult.date);
      
      let finalNote = lastResult.note || 'สลิปโอนเงิน';
      if (lastResult.ref) finalNote += ` (Ref: ${lastResult.ref})`;
      setNote(finalNote);

      if (lastResult.categoryName) {
        const cat = categories.find(c =>
          (c.name.toLowerCase() === lastResult.categoryName.toLowerCase() || lastResult.categoryName.includes(c.name)) && c.type === lastResult.type
        ) || categories.find(c => c.name === 'อื่นๆ' && c.type === lastResult.type);
        if (cat) setCategoryId(cat.id);
      }

      setUseAiMode(false);
      showNotification('อ่านข้อมูลสำเร็จ กรุณาตรวจสอบและกดบันทึก', 'success');
    } else if (totalFiles > 1) {
      // Multiple files: show summary
      let msg = `บันทึกสำเร็จ ${successCount} รายการ`;
      if (skipCount > 0) msg += `, ข้าม ${skipCount} (ซ้ำ)`;
      if (errorCount > 0) msg += `, ผิดพลาด ${errorCount}`;
      showNotification(msg, successCount > 0 ? 'success' : 'error');
    } else if (isDuplicateSingle) {
      showNotification('สลิปนี้บันทึกข้อมูลแล้ว', 'warning');
    } else {
      showNotification('ไม่สามารถอ่านข้อมูลสลิปได้', 'error');
    }

    setSlipLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    processSave({ amount: parseFloat(amount), type, date, categoryId, walletId, note });
  };

  const handleDelete = () => {
    requestConfirm('ลบรายการ?', 'ยืนยันลบรายการนี้?', async () => {
      setTransactions(p => p.filter(t => t.id !== editTx.id));
      await deleteTransaction(editTx.id);
      setEditTx(null);
      setActiveTab('history');
    });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col max-w-md mx-auto w-full">
      {/* Header */}
      <div className="p-6 flex justify-between items-center px-8">
        {editTx ? (
          <button onClick={handleDelete} className="text-red-500 hover:text-red-400 transition-colors">
            <Icons.Trash2 />
          </button>
        ) : (
          <div className="w-8" />
        )}
        <h2 className="text-xl font-black text-white tracking-tight">
          {editTx ? 'แก้ไขรายการ' : 'รายการใหม่'}
        </h2>
        <button onClick={() => { setEditTx(null); setActiveTab('history'); }} className="text-gray-500 hover:text-white transition-colors">
          <Icons.X />
        </button>
      </div>

      {/* Wallet Selector */}
      <div className="px-8 mb-4 flex justify-center">
        <div className="flex gap-2 overflow-x-auto hide-scroll p-1">
          {wallets.map(w => (
            <button
              key={w.id}
              onClick={() => setWalletId(w.id)}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all border ${walletId === w.id ? 'gold-bg text-black border-gold-primary' : 'bg-white/5 text-gray-500 border-white/5'}`}
            >
              {w.name}
            </button>
          ))}
        </div>
      </div>

      {/* Mode Toggle - Only show when adding new transaction */}
      {!editTx && (
        <div className="px-8 mb-4 flex justify-center">
          <div className="flex gap-2 bg-white/5 p-1.5 rounded-full border border-white/10">
            <button
              onClick={() => setUseAiMode(true)}
              className={`px-5 py-2 rounded-full font-black text-xs transition-all flex items-center gap-2 ${useAiMode ? 'gold-bg text-black shadow-lg shadow-gold-900/20' : 'text-gray-500'}`}
            >
              <Icons.Sparkles size={14} />
              AI
            </button>
            <button
              onClick={() => setUseAiMode(false)}
              className={`px-5 py-2 rounded-full font-black text-xs transition-all flex items-center gap-2 ${!useAiMode ? 'gold-bg text-black shadow-lg shadow-gold-900/20' : 'text-gray-500'}`}
            >
              <Icons.Edit size={14} />
              ป้อนเอง
            </button>
          </div>
        </div>
      )}

      {/* AI Input - Show when AI mode is on and not editing */}
      {!editTx && useAiMode && (
        <div className="px-8 mb-6 space-y-3">
          <div className={`glass-dark rounded-2xl p-3 flex items-center gap-3 border transition-all shadow-lg relative ${isListening ? 'border-red-500/50 shadow-red-500/20' : 'border-white/10'}`}>
            <div className={`p-2 transition-colors shrink-0 ${isListening ? 'text-red-500 animate-pulse' : 'text-gold-primary'}`}>
              <Icons.Sparkles size={20} />
            </div>
            <input
              ref={aiInputRef}
              value={aiText}
              onChange={e => setAiText(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleAI()}
              className="flex-1 bg-transparent outline-none text-sm font-bold text-white placeholder:text-gray-600 min-w-0 pr-20"
              placeholder="พิมพ์หรือพูด เช่น 'กินข้าว 50 บาท'..."
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {!/Line/i.test(navigator.userAgent) && pkgFeatures.voice && (
                <button
                  onClick={handleVoiceInput}
                  className={`p-2 rounded-xl transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-gray-400 hover:text-white'}`}
                >
                  <Icons.Mic size={20} />
                </button>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={slipLoading}
                className={`p-2 rounded-xl transition-all ${slipLoading ? 'text-gold-primary animate-pulse' : 'text-gray-400 hover:text-white'}`}
                title="อัพโหลดรูปสลิป"
              >
                <Icons.ImageIcon size={20} />
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleSlipUpload} 
                accept="image/*" 
                multiple
                className="hidden" 
              />
            </div>
          </div>
          <button
            onClick={handleAI}
            disabled={aiLoading || slipLoading}
            className="w-full py-3 gold-bg text-black rounded-xl font-black text-xs active:scale-95 transition-all shadow-lg shadow-gold-900/20 disabled:opacity-50"
          >
            {aiLoading ? '...' : slipLoading ? 'กำลังอ่านสลิป...' : 'วิเคราะห์ด้วย AI'}
          </button>
        </div>
      )}

      {/* Manual Input - Show when manual mode is on OR when editing */}
      {(editTx || !useAiMode) && (
        <>
          {/* Amount Input */}
          <div className="flex flex-col items-center py-8">
            <div className="flex gap-2 mb-8 bg-white/5 p-1.5 rounded-full border border-white/10">
              <button
                onClick={() => setType('expense')}
                className={`px-8 py-2.5 rounded-full font-black text-xs transition-all ${type === 'expense' ? 'gold-bg text-black shadow-lg shadow-gold-900/20' : 'text-gray-500'}`}
              >
                จ่าย
              </button>
              <button
                onClick={() => setType('income')}
                className={`px-8 py-2.5 rounded-full font-black text-xs transition-all ${type === 'income' ? 'gold-bg text-black shadow-lg shadow-gold-900/20' : 'text-gray-500'}`}
              >
                รับ
              </button>
            </div>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="amount-input text-7xl font-black bg-transparent text-center outline-none text-white tracking-tighter w-full"
                placeholder="0"
              />
            </div>
            <div className="flex gap-3 mt-8">
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="bg-white/5 border border-white/10 px-6 py-3 rounded-2xl text-sm font-bold text-gray-300 outline-none focus:border-gold-primary/30 transition-all min-w-[180px]"
              />
            </div>
          </div>

          {/* Category Selection */}
          <div className="glass-dark flex-1 rounded-t-2xl p-8 pb-32 shadow-2xl overflow-y-auto border-t border-white/10">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Horizontal scrollable category pills */}
              <div className="overflow-x-auto hide-scroll -mx-2 px-2">
                <div className="flex gap-3 pb-2" style={{ width: 'max-content' }}>
                  {categories.filter(c => c.type === type).map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoryId(cat.id)}
                      className={`flex items-center gap-2 px-4 py-3 rounded-full transition-all whitespace-nowrap ${categoryId === cat.id ? 'ring-2 ring-gold-primary shadow-lg' : 'hover:bg-white/10'}`}
                      style={{ 
                        backgroundColor: categoryId === cat.id ? cat.color : 'rgba(255,255,255,0.05)',
                        boxShadow: categoryId === cat.id ? `0 4px 15px -3px ${cat.color}66` : 'none'
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded-full text-white flex items-center justify-center font-black text-sm"
                        style={{ backgroundColor: categoryId === cat.id ? 'rgba(0,0,0,0.2)' : cat.color }}
                      >
                        {cat.name[0]}
                      </div>
                      <span className={`text-sm font-bold ${categoryId === cat.id ? 'text-white' : 'text-gray-400'}`}>
                        {cat.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  className="w-full p-5 bg-white/5 border border-white/10 rounded-xl outline-none font-bold text-white focus:border-gold-primary/30 transition-all"
                  placeholder="บันทึกเพิ่มเติม..."
                />
              </div>
              <button
                type="submit"
                className="w-full py-5 gold-bg text-black rounded-xl font-black text-lg shadow-2xl shadow-gold-900/30 active:scale-[0.98] transition-all"
              >
                บันทึกรายการ
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
};

export default ScreenAdd;
