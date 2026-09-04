"use client";
import dynamic from 'next/dynamic';
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Coffee, CheckCircle, Users, LogOut, Camera, 
  MessageSquare, CheckSquare, ListOrdered, Send, ShieldAlert,
  ChevronRight, AlertTriangle, RotateCcw, ShieldCheck, 
  Mic, MicOff, Wifi, WifiOff, Sparkles, Check
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useRouter } from 'next/navigation';

const MN_NUMBER_WORDS: Record<string, number> = {
  "тал": 0.5, "хагас": 0.5, "нэг": 1, "нэгэн": 1, "ганц": 1,
  "хоёр": 2, "гурав": 3, "дөрөв": 4, "тав": 5, "зургаа": 6,
  "долоо": 7, "найм": 8, "ес": 9, "арав": 10, "хорь": 20, "гуч": 30
};
// =========================================================================
// ⚡ 1. MONGOLIAN FAST LOCAL PARSER (0.01ms Deterministic Match)
// =========================================================================
function advancedMongolianVoiceParser(rawText: string, ingredients: any[]) {
  let text = rawText.toLowerCase().trim();

  // 1. Амаар хэлсэн монгол тоог тоон цифр болгох ("хоёр литр" -> "2 литр")
  for (const [word, val] of Object.entries(MN_NUMBER_WORDS)) {
    const reg = new RegExp(`\\b${word}\\b`, 'gi');
    text = text.replace(reg, val.toString());
  }

  // 2. Тоо болон хэмжих нэгжийг салгах
  const numMatch = text.match(/(\d+(?:\.\d+)?)\s*(л|литр|l|мл|ml|кг|kg|гр|грамм|gram|ш|ширхэг|хайрцаг|уут)?/);
  if (!numMatch) return null;

  let qty = parseFloat(numMatch[1]);
  const unitStr = numMatch[2] || '';
  if (['л', 'литр', 'l', 'кг', 'kg'].includes(unitStr)) {
    qty *= 1000;
  }

  // 3. Үйлдлийг язгуураар нь таних
  let type: 'spoilage' | 'purchase' | 'staff_meal' | 'testing' | null = null;
  if (/асг|мууд|гаш|хая|цуц|хагар|уна|дуус/.test(text)) type = 'spoilage';
  else if (/ава|авс|татан|ирл|нэм/.test(text)) type = 'purchase';
  else if (/хоол|идс|уусан/.test(text)) type = 'staff_meal';
  else if (/турш|амт/.test(text)) type = 'testing';

  if (!type) return null;

  // 4. Түүхий эдийг Монгол ба Англи нэршлээр тааруулах
  let matchedIng = ingredients.find(ing => text.includes(ing.name.toLowerCase().trim()));
  
  if (!matchedIng) {
    const MN_SYNONYMS: Record<string, string[]> = {
      "Milk": ["сүү", "сү", "милк"],
      "Beans": ["кофе", "үр", "үрэл"],
      "Eggs": ["өндөг", "өндөгний"],
      "Bread": ["талх", "талхны", "булочка"],
      "Butter": ["масло", "цөцгийн тос"],
      "Sugar": ["сахар", "элсэн чихэр"],
      "Syrup": ["сироп", "чихэрлэг"],
      "Cheese": ["бяслаг", "чеддер", "сыр"]
    };

    for (const [engName, syns] of Object.entries(MN_SYNONYMS)) {
      if (syns.some(s => text.includes(s))) {
        matchedIng = ingredients.find(ing => ing.name.toLowerCase().includes(engName.toLowerCase()));
        if (matchedIng) break;
      }
    }
  }

  if (!matchedIng) return null;

  return {
    is_transaction: true,
    success: true,
    item_id: matchedIng.id,
    item_name: matchedIng.name,
    unit: matchedIng.unit,
    quantity: type === 'purchase' ? Math.abs(qty) : -Math.abs(qty),
    type: type,
    notes: `${rawText} (🎙️ Монгол дуут бүртгэл)`
  };
}
// =========================================================================
// 📸 2. UPLOAD EVIDENCE PHOTO TO SUPABASE STORAGE
// =========================================================================
async function uploadEvidencePhoto(file: File, folder: string = 'logs'): Promise<string | null> {
  try {
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from('receipts_evidence')
      .upload(fileName, file, { cacheControl: '3600', upsert: true });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage
      .from('receipts_evidence')
      .getPublicUrl(fileName);

    return publicUrlData.publicUrl;
  } catch (err) {
    console.error("Storage upload error:", err);
    return null;
  }
}

// =========================================================================
// 🎙️ 3. KIOSK AI CHAT & VOICE RECORDING SECTION
// =========================================================================
function KioskAiChatSection({ 
  selectedWorker, 
  activeShift, 
  ingredients,
  onBack 
}: { 
  selectedWorker: any; 
  activeShift: any; 
  ingredients: any[];
  onBack: () => void; 
}) {
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{ sender: 'worker' | 'ai'; text: string; logId?: string }[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 1-Tap Quick Action Presets (Хамгийн түгээмэл 5 хаягдал)
  const QUICK_SPILLS = [
    { label: "🥛 500мл Сүү", text: "500 мл сүү асгарсан" },
    { label: "🥛 1л Сүү", text: "1 литр сүү асгарсан" },
    { label: "☕ 18г Кофе", text: "18 грамм кофе асгарсан" },
    { label: "🥚 1ш Өндөг", text: "1 ширхэг өндөг хагарсан" },
    { label: "🥪 1ш Талх", text: "1 ширхэг талх муудсан" }
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [chatHistory, isAiLoading]);


// 📱 ТӨХӨӨРӨМЖ ТАНИГЧ: iOS (iPhone/iPad) мөн эсэхийг шалгах
  const isAppleDevice = () => {
    if (typeof window === 'undefined') return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  };

  // 🎙️ УХААЛАГ ДУУТ БҮРТГЭЛ (Android дээр Web Speech, Apple дээр Gemini Audio)
  const startVoiceRecording = async () => {
    // 🍏 ХЭРЭВ IPAD ЭСВЭЛ IPHONE БАЙВАЛ -> GEMINI FLASH АУДИОГООР ШУУД СОНСГОХ
    if (isAppleDevice()) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mimeType = MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : 'audio/webm';
        const mediaRecorder = new MediaRecorder(stream);
        const audioChunks: Blob[] = [];

        setIsListening(true);
        if (navigator.vibrate) navigator.vibrate(20);

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
          setIsListening(false);
          setIsAiLoading(true);
          stream.getTracks().forEach(track => track.stop()); // Микрофоныг унтраах

          const audioBlob = new Blob(audioChunks, { type: mimeType });
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64Audio = (reader.result as string).split(',')[1];

            // Gemini 3.6 Flash руу аудиог илгээх
            try {
              const res = await fetch('/api/kiosk-ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  tenantClientId: selectedWorker.client_id,
                  workerName: activeShift?.character_role || selectedWorker.full_name || "Ажилтан",
                  audioBase64: base64Audio,
                  audioMimeType: mimeType,
                  userRole: 'staff'
                })
              });
              const data = await res.json();
              setChatHistory(prev => [...prev, { sender: 'ai', text: data.message, logId: data.log_id }]);
            } catch (err) {
              setChatHistory(prev => [...prev, { sender: 'ai', text: '❌ Дуу танихад алдаа гарлаа.' }]);
            } finally {
              setIsAiLoading(false);
            }
          };
        };

        mediaRecorder.start();
        // Баристаг 3.5 секунд ярьсны дараа автоматаар бичлэгийг зогсоож илгээнэ
        setTimeout(() => {
          if (mediaRecorder.state === 'recording') mediaRecorder.stop();
        }, 3500);

      } catch (err) {
        alert("Микрофон ашиглах зөвшөөрөл олгоно уу.");
        setIsListening(false);
      }
      return;
    }

    // 🤖 ХЭРЭВ ANDROID ТАБЛЕТ ЭСВЭЛ CHROME БАЙВАЛ -> WEB SPEECH (0.2s) ХЭРЭГЛЭНЭ
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Энэ хөтөч дээр дуу таних боломжгүй байна.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'mn-MN';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        if (navigator.vibrate) navigator.vibrate(20);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) handleAiChatSubmit(undefined, undefined, transcript);
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognition.start();
    } catch (err) {
      setIsListening(false);
    }
  };


  const handleAiChatSubmit = async (e?: React.FormEvent, file?: File, directText?: string) => {
    if (e) e.preventDefault();
    const textToProcess = directText || chatInput.trim();
    if (!textToProcess && !file) return;

    // ⚡ Optimistic Bubble: Хэрэглэгчийн бичсэн зүйл дэлгэцэнд 0 миллисекундэд шууд гарна!
    setChatHistory(prev => [...prev, { 
      sender: 'worker', 
      text: file ? '📸 Зураг илгээлээ (E-Barimt/Бараа)' : textToProcess 
    }]);

    setChatInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setIsAiLoading(true);

    // 📶 ОФЛАЙН ГОРИМ ШАЛГАЛТ (Интернэт тасарсан бол LocalStorage-д хадгалах)
    if (!navigator.onLine && !file) {
      const offlineItem = {
        client_id: selectedWorker.client_id,
        notes: `${textToProcess} (Офлайн хадгалав)`,
        date: new Date().toISOString(),
        worker_name: activeShift?.character_role || selectedWorker.full_name
      };
      const queue = JSON.parse(localStorage.getItem('kiosk_offline_queue') || '[]');
      queue.push(offlineItem);
      localStorage.setItem('kiosk_offline_queue', JSON.stringify(queue));

      setChatHistory(prev => [...prev, { 
        sender: 'ai', 
        text: "📶 **Интернэт тасарсан байна.** Мэдээллийг төхөөрөмжид түр хадгаллаа. Сүлжээ ормогц бааз руу автоматаар бүртгэгдэнэ." 
      }]);
      setIsAiLoading(false);
      return;
    }

    let uploadedImageUrl: string | null = null;
    let base64Data: string | null = null;

    if (file) {
      uploadedImageUrl = await uploadEvidencePhoto(file, 'receipts');

      base64Data = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
          const img = new Image();
          img.src = event.target?.result as string;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 800;
            const scaleSize = MAX_WIDTH / img.width;
            canvas.width = MAX_WIDTH;
            canvas.height = img.height * scaleSize;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.7).split(',')[1]);
          };
        };
      });
    } else {
      // ⚡ 0.01ms LOCAL MONGOLIAN MATCH (Сервер, AI дуудахгүйгээр шууд баазад хадгалах)
      const localMatch = advancedMongolianVoiceParser(textToProcess, ingredients);
      if (localMatch && localMatch.success) {
        const { data: newLog, error } = await supabase.from('inventory_logs').insert([{
          client_id: selectedWorker.client_id,
          ingredient_id: localMatch.item_id,
          quantity: localMatch.quantity,
          type: localMatch.type,
          notes: localMatch.notes,
          worker_name: activeShift?.character_role || selectedWorker.full_name || 'Ажилтан',
          date: new Date().toISOString()
        }]).select().single();

        if (!error && newLog) {
          setChatHistory(prev => [...prev, { 
            sender: 'ai', 
            text: `⚡ **Бүртгэгдлээ (Шуурхай 0.01s):**\n• Бараа: **${localMatch.item_name}**\n• Төрөл: \`${localMatch.type}\`\n• Хэмжээ: **${Math.abs(localMatch.quantity)} ${localMatch.unit}**`,
            logId: newLog.id
          }]);
          setIsAiLoading(false);
          return;
        }
      }
    }

    // Хэрэв шууд танигдаагүй бол Gemini API руу илгээх
    try {
      const res = await fetch('/api/kiosk-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantClientId: selectedWorker.client_id,
          workerName: activeShift?.character_role || selectedWorker.full_name || "Ажилтан",
          text: textToProcess,
          imageBase64: base64Data,
          imageUrl: uploadedImageUrl,
          userRole: 'staff'
        })
      });

      const data = await res.json();
      setChatHistory(prev => [...prev, { sender: 'ai', text: data.message || "Гүйлгээ боловсруулагдлаа.", logId: data.log_id }]);
    } catch (err) {
      setChatHistory(prev => [...prev, { sender: 'ai', text: '❌ Алдаа: Сервертэй холбогдож чадсангүй.' }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleUndo = async (logId: string, index: number) => {
    setIsAiLoading(true);
    try {
      const { error } = await supabase.from('inventory_logs').delete().eq('id', logId);
      if (error) throw error;
      const newHistory = [...chatHistory];
      newHistory[index] = { sender: 'ai', text: "↩️ Бүртгэл амжилттай цуцлагдаж, агуулахын үлдэгдэл буцаж сэргэлээ." };
      setChatHistory(newHistory);
    } catch (err) {
      alert("Буцаах үйлдэл амжилтгүй.");
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#0d1527] rounded-3xl border border-slate-800 shadow-xl p-3 sm:p-4 overflow-hidden">
      {/* Дэд толгой */}
      <div className="flex justify-between items-center pb-2.5 border-b border-slate-800/80 shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-blue-400" />
          <h2 className="font-bold text-blue-400 text-sm sm:text-base">AI Туслах & Зарлага</h2>
          {!isOnline && (
            <span className="bg-amber-500/20 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <WifiOff className="h-3 w-3" /> Офлайн
            </span>
          )}
        </div>
        <button 
          onClick={onBack} 
          className="bg-slate-900 px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-800 hover:bg-slate-800 text-slate-300 active:scale-95 transition"
        >
          ← Буцах
        </button>
      </div>

      {/* Мессежүүд гүйх талбар */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3 py-3 overscroll-contain pr-1">
        {chatHistory.length === 0 && (
          <div className="text-center text-slate-400 text-xs sm:text-sm mt-4 space-y-2">
            <div className="bg-blue-500/10 p-3.5 rounded-2xl border border-blue-500/20 w-fit mx-auto">
              <Mic className="h-7 w-7 text-blue-400" />
            </div>
            <p className="font-black text-white text-base">Монголоор ярьж эсвэл зураг дарж бүртгэнэ үү</p>
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              Микрофон товчийг дараад <strong>"2 литр сүү асгарсан"</strong> гэж хэлэхэд л AI шууд ойлгоно!
            </p>
          </div>
        )}

        {chatHistory.map((msg, i) => (
          <div key={i} className={`flex ${msg.sender === 'worker' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed ${
              msg.sender === 'worker' 
                ? 'bg-blue-600 text-white rounded-tr-none font-medium shadow-md' 
                : 'bg-slate-900 text-slate-100 rounded-tl-none border border-slate-800/80 shadow-md'
            }`}>
              {msg.sender === 'worker' ? (
                msg.text
              ) : (
                <div className="prose prose-invert max-w-none text-xs leading-relaxed font-normal">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.text}
                  </ReactMarkdown>
                </div>
              )}
              
              {msg.logId && (
                <button 
                  onClick={() => handleUndo(msg.logId!, i)}
                  className="mt-2.5 w-full bg-slate-950 border border-slate-700 hover:bg-rose-500/20 hover:text-rose-400 text-slate-300 py-1.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <RotateCcw className="h-3 w-3" /> Буцаах (Undo)
                </button>
              )}
            </div>
          </div>
        ))}
        {isAiLoading && (
          <div className="flex items-center gap-2 text-blue-400 text-xs font-bold px-2 py-1 bg-blue-500/10 rounded-xl w-fit">
            <span className="animate-spin text-sm">☕</span>
            <span>AI бүртгэж байна...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ⚡ 1-TAP ХУРДАН ХАЯГДАЛ СОНГОХ ТОВЧНУУД (Гар бохир үед шууд товших) */}
      <div className="flex gap-1.5 overflow-x-auto py-1.5 shrink-0 no-scrollbar">
        {QUICK_SPILLS.map((preset, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleAiChatSubmit(undefined, undefined, preset.text)}
            className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white px-2.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap active:scale-95 transition flex items-center gap-1 shrink-0"
          >
            <span>{preset.label}</span>
          </button>
        ))}
      </div>

      {/* Оруулах талбар + Зураг + Дуу хоолой (Mic) */}
      <div className="pt-1.5 shrink-0 w-full">
        <form 
          onSubmit={(e) => handleAiChatSubmit(e)} 
          className="bg-[#1e293b] border border-slate-700 rounded-2xl p-2.5 flex flex-col gap-2 shadow-lg focus-within:border-blue-500 w-full"
        >
          <textarea 
            ref={textareaRef}
            rows={1}
            value={chatInput} 
            onChange={e => {
              setChatInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`;
            }} 
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (chatInput.trim()) handleAiChatSubmit();
              }
            }}
            placeholder={isListening ? "🎙️ Ярьж байна... '2 литр сүү асгасан' гэж хэлнэ үү" : "Зарлага бичих эсвэл микрофоноор ярих..."} 
            className={`w-full bg-transparent text-white text-[15px] leading-relaxed resize-none outline-none placeholder:text-slate-500 px-1 ${isListening ? 'animate-pulse text-emerald-400 font-bold' : ''}`} 
            style={{ minHeight: '38px', maxHeight: '100px' }}
          />

          <div className="flex justify-between items-center pt-1.5 border-t border-slate-800/60 shrink-0">
            <div className="flex items-center gap-2">
              {/* 📸 ЗУРАГ ДАРАХ */}
              <input 
                type="file" 
                accept="image/*" 
                capture="environment" 
                id="kiosk-ai-camera" 
                className="hidden" 
                onChange={(e) => { if(e.target.files && e.target.files[0]) handleAiChatSubmit(undefined, e.target.files[0]); }}
              />
              <label 
                htmlFor="kiosk-ai-camera" 
                className="h-9 px-3 bg-slate-800 hover:bg-slate-700 active:scale-95 rounded-xl flex items-center gap-1.5 cursor-pointer text-emerald-400 font-bold text-xs transition-colors"
              >
                <Camera className="h-4 w-4" />
                <span>Зураг</span>
              </label>

              {/* 🎙️ МОНГОЛ ДУУ ХООЛОЙГООР ЯРИХ (MIC BUTTON) */}
              <button
                type="button"
                onClick={startVoiceRecording}
                className={`h-9 px-3.5 rounded-xl flex items-center gap-1.5 font-bold text-xs active:scale-95 transition-all ${
                  isListening 
                    ? 'bg-rose-600 text-white animate-bounce shadow-[0_0_15px_rgba(225,29,72,0.6)]' 
                    : 'bg-slate-800 hover:bg-slate-700 text-blue-400'
                }`}
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                <span>{isListening ? "Сонсож байна..." : "Ярих"}</span>
              </button>
            </div>

            <button 
              type="submit" 
              disabled={isAiLoading || !chatInput.trim()} 
              className={`h-9 px-5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                chatInput.trim() && !isAiLoading 
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md active:scale-95' 
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <span>{isAiLoading ? "..." : "Илгээх"}</span>
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =========================================================================
// 📱 4. MAIN COMPONENT: KIOSK PAGE
// =========================================================================
function KioskPage() {
  const router = useRouter(); 
  const [step, setStep] = useState<'select_worker' | 'pin_code' | 'shift_handover' | 'menu' | 'ai_chat' | 'tasks' | 'incident_report' | 'close_shift'>('select_worker');
  
  const [tenantClientId, setTenantClientId] = useState<string>('SF Coffee');
  const [workers, setWorkers] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<any>(null);
  const [pin, setPin] = useState('');
  const [activeShift, setActiveShift] = useState<any>(null);
  const [msg, setMsg] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Shift Handover Start States
  const [handoverNote, setHandoverNote] = useState('');
  const [handoverFile, setHandoverFile] = useState<File | null>(null);

  // Incident Report States (Previous Shift Damage)
  const [incidentWorker, setIncidentWorker] = useState('');
  const [incidentItem, setIncidentItem] = useState('');
  const [incidentQty, setIncidentQty] = useState('');
  const [incidentNote, setIncidentNote] = useState('');
  const [incidentFile, setIncidentFile] = useState<File | null>(null);

  // Tasks & Shift Close States
  const [tasks, setTasks] = useState<any[]>([]);
  const [inventoryToCount, setInventoryToCount] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [posZFile, setPosZFile] = useState<File | null>(null);

  useEffect(() => { 
    initKioskContext();
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('kiosk_device_locked', 'true');
    }

    // 📶 ОФЛАЙН ГОРИМ ДЭЭР ХАДГАЛАГДСАН ӨГӨГДЛИЙГ АВТОМАТААР БААЗ РУУ СИНХРОНЧЛОХ
    const syncOfflineLogs = async () => {
      const offlineQueue = JSON.parse(localStorage.getItem('kiosk_offline_queue') || '[]');
      if (offlineQueue.length === 0 || !navigator.onLine) return;

      try {
        const { error } = await supabase.from('inventory_logs').insert(offlineQueue);
        if (!error) {
          localStorage.removeItem('kiosk_offline_queue');
          console.log("Офлайн үед хадгалсан логууд амжилттай баазад синк хийгдлээ.");
        }
      } catch (err) {
        console.warn("Sync failed, will retry later:", err);
      }
    };

    window.addEventListener('online', syncOfflineLogs);
    syncOfflineLogs();

    return () => window.removeEventListener('online', syncOfflineLogs);
  }, []);

  const initKioskContext = async () => {
    let detectedClient = 'SF Coffee';
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlClient = urlParams.get('clientId');
      const savedClient = localStorage.getItem('kiosk_client_id');
      if (urlClient) {
        detectedClient = urlClient;
        localStorage.setItem('kiosk_client_id', urlClient);
      } else if (savedClient) {
        detectedClient = savedClient;
      }
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.user_metadata?.client_id) {
      detectedClient = session.user.user_metadata.client_id;
      localStorage.setItem('kiosk_client_id', detectedClient);
    }

    setTenantClientId(detectedClient);
    fetchKioskData(detectedClient);
  };

  const fetchKioskData = async (client: string) => {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .ilike('client_id', client)
      .neq('role', 'owner');
    
    if (profiles) setWorkers(profiles);

    const { data: ingData } = await supabase
      .from('ingredients')
      .select('id, name, unit, current_stock, is_critical, last_counted_at, client_id, is_suspicious_promoted, promoted_until')
      .ilike('client_id', client)
      .order('name', { ascending: true });

    if (ingData) setIngredients(ingData);
  };

  const loadLiveTodayTasks = async (tenantId: string, worker: any) => {
    const { data: allTasks } = await supabase
      .from('tasks')
      .select('*')
      .ilike('client_id', tenantId)
      .eq('is_active', true);

    const workerName = worker.email.split('@')[0];
    const workerDisplayName = (worker.full_name || workerName).trim();
    const workerRoleLower = (worker.role || '').toLowerCase().trim();
    const workerNameLower = workerDisplayName.toLowerCase().trim();
    const isBarista = workerRoleLower.includes('barista') || workerRoleLower.includes('бариста');
    const isCook = workerRoleLower.includes('cook') || workerRoleLower.includes('chef') || workerRoleLower.includes('тогооч');

    const matchedTemplateTasks = (allTasks || []).filter((t: any) => {
      if (t.is_active === false) return false;
      const tRole = (t.role || '').toLowerCase().trim();
      if (tRole === 'бүх ажилтан' || tRole.includes('бүх')) return true;
      if (tRole === workerNameLower || tRole.includes(workerNameLower)) return true;
      if (isBarista && (tRole.includes('бариста') || tRole.includes('barista'))) return true;
      if (isCook && (tRole.includes('тогооч') || tRole.includes('cook') || tRole.includes('chef'))) return true;
      return false;
    }).map((t: any) => ({ id: t.id, name: t.task_name, weight: t.weight || 10, done: false }));

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data: todayShifts } = await supabase
      .from('shifts')
      .select('daily_tasks_checklist')
      .eq('client_id', tenantId)
      .gte('start_time', todayStart.toISOString());

    const completedTasksToday = new Set<string>();
    (todayShifts || []).forEach((s: any) => {
      let list = s.daily_tasks_checklist;
      if (typeof list === 'string') list = JSON.parse(list);
      if (Array.isArray(list)) {
        list.forEach((item: any) => {
          if (item.done && item.name) completedTasksToday.add(item.name.toLowerCase().trim());
        });
      }
    });

    return matchedTemplateTasks.map(t => ({
      ...t,
      done: completedTasksToday.has(t.name.toLowerCase().trim())
    }));
  };

  // 💡 ШИНЭ: Менежер өдөр дундуур даалгавар нэмсэн бол дахин татаж шинэчлэх
  const openTasksScreen = async () => {
    if (!selectedWorker) {
      setStep('tasks');
      return;
    }
    const liveTasks = await loadLiveTodayTasks(tenantClientId, selectedWorker);
    setTasks(liveTasks);
    if (activeShift) {
      await supabase.from('shifts').update({ daily_tasks_checklist: liveTasks }).eq('id', activeShift.id);
    }
    setStep('tasks');
  };

  const handleKeypadPress = (digit: string) => {
    if (typeof window !== 'undefined' && window.navigator?.vibrate) {
      window.navigator.vibrate(8);
    }
    setPin(p => p.length < 4 ? p + digit : p);
  };

  const handleVerifyPin = async () => {
    if (!selectedWorker) return;
    const validPin = selectedWorker.pin_code || '1234';

    if (pin !== validPin) {
      setMsg("❌ Буруу PIN код! Та өөрийн нууц кодыг зөв оруулна уу.");
      setPin('');
      return;
    }

    const workerName = selectedWorker.email.split('@')[0];
    const workerDisplayName = (selectedWorker.full_name || workerName).trim();
    const fullNameRole = `${selectedWorker.role} (${workerDisplayName})`;

    let { data: shift } = await supabase
      .from('shifts')
      .select('*')
      .eq('client_id', tenantClientId)
      .eq('is_active', true)
      .order('start_time', { ascending: false })
      .limit(1)
      .maybeSingle();

    const liveTasks = await loadLiveTodayTasks(tenantClientId, selectedWorker);
    setTasks(liveTasks);

    if (!shift) {
      // Идэвхтэй ээлж байхгүй бол Handover/Start Check хийлгэх
      setStep('shift_handover');
    } else {
      setActiveShift(shift);
      setStep('menu');
    }

    setPin('');
    setMsg('');
  };

  const handleStartShiftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAiLoading(true);

    let startImgUrl = null;
    if (handoverFile) {
      startImgUrl = await uploadEvidencePhoto(handoverFile, 'handover_starts');
    }

    const workerName = selectedWorker.email.split('@')[0];
    const workerDisplayName = (selectedWorker.full_name || workerName).trim();
    const fullNameRole = `${selectedWorker.role} (${workerDisplayName})`;

    const { data: newShift, error } = await supabase.from('shifts').insert([{
      client_id: tenantClientId,
      character_role: fullNameRole,
      is_active: true,
      start_notes: handoverNote || 'Ээлж хэвийн хүлээн авсан.',
      start_evidence_image: startImgUrl,
      daily_tasks_checklist: tasks,
      telegram_chat_id: selectedWorker.telegram_chat_id || 0
    }]).select().single();

    if (error || !newShift) {
      setMsg(`❌ Алдаа: ${error?.message || 'Ээлж үүсгэж чадсангүй.'}`);
      setIsAiLoading(false);
      return;
    }

    setActiveShift(newShift);
    setIsAiLoading(false);
    setStep('menu');
  };

  const handleReportIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentItem || !incidentQty) return;
    setIsAiLoading(true);

    let damageImgUrl = null;
    if (incidentFile) {
      damageImgUrl = await uploadEvidencePhoto(incidentFile, 'damage_proofs');
    }

    const ing = ingredients.find(i => i.id === incidentItem);
    const qty = parseFloat(incidentQty) || 0;
    const lossCost = ing ? qty * (parseFloat(ing.unit_price) || 0) : 0;

    await supabase.from('inventory_logs').insert([{
      client_id: tenantClientId,
      ingredient_id: ing ? ing.id : null,
      quantity: -Math.abs(qty),
      total_cost: lossCost,
      type: 'spoilage',
      incident_type: 'previous_shift_damage',
      reported_against_worker: incidentWorker || 'Өмнөх ээлжийн ажилтан',
      image_url: damageImgUrl,
      notes: `Өмнөх ээлжийн алдагдал: ${incidentNote || 'Шалтгаангүй хаягдал илэрсэн'}`,
      worker_name: activeShift?.character_role || selectedWorker.full_name,
      date: new Date().toISOString()
    }]);

    setIsAiLoading(false);
    alert("⚠️ Өмнөх ээлжийн алдагдал менежерийн хяналтад бүртгэгдлээ!");
    setIncidentItem('');
    setIncidentQty('');
    setIncidentNote('');
    setIncidentFile(null);
    setStep('menu');
  };

  const completeTask = async (index: number) => {
    const updatedTasks = [...tasks];
    if (updatedTasks[index].done) return;
    updatedTasks[index].done = true;
    setTasks(updatedTasks);
    if (activeShift) {
      await supabase.from('shifts').update({ daily_tasks_checklist: updatedTasks }).eq('id', activeShift.id);
    }
  };

  
// 🧮 ШИНЖЛЭХ УХААНЫ ТОГТВОРТОЙ ЦИКЛ БА ДЭЭД ТАЛ НЬ 5-6 БАРАА ТОЛОХ ЛОГИК
 // 🧮 БҮХ НИЙТИЙН ШИНЖЛЭХ УХААНЫ ЦИКЛ ТОМЬЁО (k_shift = N_A/2 + N_B/20 + N_C/60)
  const loadInventoryToCount = async () => {
    setMsg('');
    setIsAiLoading(true);

    try {
      // 1. Баазаас хамгийн сүүлийн үлдэгдэл ба сүүлд тоолсон огноог авах
      const { data: freshIngs } = await supabase
        .from('ingredients')
        .select('*')
        .ilike('client_id', tenantClientId)
        .order('name', { ascending: true });

      const baseList = freshIngs && freshIngs.length > 0 ? freshIngs : ingredients;

      // 2. Analytics-аас АВС зэрэглэлийг авах
      let analMap = new Map<string, string>();
      try {
        const res = await fetch(`/api/analytics?clientId=${encodeURIComponent(tenantClientId)}`, { cache: 'no-store' });
        if (res.ok) {
          const analData = await res.json();
          (analData.all_inventory_data || []).forEach((i: any) => {
            analMap.set(i.id, i.abc_class);
            analMap.set(i.name.toLowerCase().trim(), i.abc_class);
          });
        }
      } catch (e) {
        console.warn("Analytics fetch failed, using fallback");
      }

      const now = new Date();
      const twelveHoursAgo = new Date(Date.now() - (12 * 60 * 60 * 1000)).toISOString();

      // 3. Бараа бүрт ABC ангилал оноох
      const enrichedList = baseList.map((item: any) => {
        const classFromMap = analMap.get(item.id) || analMap.get(item.name.toLowerCase().trim());
        const finalClass = item.is_critical ? 'A' : (classFromMap || 'C');
        return { ...item, abc_class: finalClass };
      });

      // =========================================================================
      // 🚨 ТҮВШИН 0: ЯАРАЛТАЙ ДУУСАХ ЭРСДЭЛТЭЙ БАРАА (STOCKOUT PREVENT)
      // С-Class байсан ч Par Level-ээсээ буурсан бол шууд эхэнд орно!
      // =========================================================================
      const urgentLowStockItems = enrichedList.filter((item: any) => {
        const stock = parseFloat(item.current_stock ?? item.live_stock ?? 0);
        const par = parseFloat(item.par_level ?? 0);
        const notCountedRecently = !item.last_counted_at || item.last_counted_at < twelveHoursAgo;
        return par > 0 && stock <= par && notCountedRecently;
      });

      const urgentIds = new Set(urgentLowStockItems.map(i => i.id));

      // Ангилал тус бүрээр нь ялгах:
      const classAAll = enrichedList.filter((i: any) => !urgentIds.has(i.id) && (i.abc_class === 'A' || i.is_critical));
      const classBAll = enrichedList.filter((i: any) => !urgentIds.has(i.id) && i.abc_class === 'B' && !i.is_critical);
      const classCAll = enrichedList.filter((i: any) => !urgentIds.has(i.id) && i.abc_class === 'C' && !i.is_critical);

      // =========================================================================
      // 📐 ШИНЖЛЭХ УХААНЫ ТОМЬЁОГООР ТООЛОХ ТООГ ОЛОХ:
      // S_day = 2 ээлж, T_A = 1 хоног, T_B = 10 хоног, T_C = 30 хоног
      // =========================================================================
      const shiftsPerDay = 2;
      const kA = Math.max(1, Math.ceil(classAAll.length / (shiftsPerDay * 1)));   // Жишээ нь: 4 байвал 2, 20 байвал 10
      const kB = Math.max(1, Math.ceil(classBAll.length / (shiftsPerDay * 10)));  // 10 хоногт 1 бүтэн цикл
      const kC = Math.max(1, Math.ceil(classCAll.length / (shiftsPerDay * 30)));  // 30 хоногт 1 бүтэн цикл

      // 1. А-Class-аас хамгийн удаан тоологдоогүйг сонгох:
      const selectedA = classAAll
        .filter((item: any) => !item.last_counted_at || item.last_counted_at < twelveHoursAgo)
        .sort((a: any, b: any) => new Date(a.last_counted_at || '2000-01-01').getTime() - new Date(b.last_counted_at || '2000-01-01').getTime())
        .slice(0, kA);

      // 2. B-Class-аас хамгийн удаан тоологдоогүйг сонгох:
      const selectedB = classBAll
        .filter((item: any) => !item.last_counted_at || item.last_counted_at < twelveHoursAgo)
        .sort((a: any, b: any) => new Date(a.last_counted_at || '2000-01-01').getTime() - new Date(b.last_counted_at || '2000-01-01').getTime())
        .slice(0, kB);

      // 3. C-Class-аас хамгийн удаан тоологдоогүйг сонгох:
      const selectedC = classCAll
        .filter((item: any) => !item.last_counted_at || item.last_counted_at < twelveHoursAgo)
        .sort((a: any, b: any) => new Date(a.last_counted_at || '2000-01-01').getTime() - new Date(b.last_counted_at || '2000-01-01').getTime())
        .slice(0, kC);

      // Бүх сонгогдсон барааг нэгтгэх (Яаралтай дуусаж буй нь хамгийн дээрээ байна!)
      const finalToCount = [...urgentLowStockItems, ...selectedA, ...selectedB, ...selectedC];

      setInventoryToCount(finalToCount);
      setCounts({});
      setStep('close_shift');
    } catch (err) {
      console.error("Cycle count calculation error:", err);
      setInventoryToCount(ingredients.slice(0, 5));
      setStep('close_shift');
    } finally {
      setIsAiLoading(false);
    }
  };
  // 🌙 НЭГДСЭН BATCH ХААЛТ (Trigger-тэй төгс зохицож 0.15с-д ажиллана)
  const handleCloseShift = async () => {
    const uncountedItems = inventoryToCount.filter(i => counts[i.id] === undefined || counts[i.id].toString().trim() === '');
    
    if (uncountedItems.length > 0) {
      setMsg(`⚠️ Тооллого дутуу байна: ${uncountedItems.map(i => i.name).join(', ')}`);
      return;
    }

    setIsAiLoading(true);
    const endTime = new Date().toISOString();

    let posZUrl = null;
    if (posZFile) {
      posZUrl = await uploadEvidencePhoto(posZFile, 'pos_z_reports');
    }

    // 1. БҮХ ТООЛЛОГЫГ 1 ХҮСЭЛТЭЭР БӨӨНӨӨР ХАДГАЛАХ
    const countLogsToInsert = inventoryToCount.map(item => ({
      client_id: tenantClientId,
      ingredient_id: item.id,
      quantity: parseFloat(counts[item.id]) || 0,
      type: 'count',
      notes: 'Ээлж хаалтын бодит тооллого (Kiosk)',
      worker_name: activeShift?.character_role || selectedWorker.full_name,
      date: endTime
    }));

    if (countLogsToInsert.length > 0) {
      await supabase.from('inventory_logs').insert(countLogsToInsert);

        await Promise.all(
        inventoryToCount.map(item =>
          supabase
            .from('ingredients')
            .update({
              current_stock: parseFloat(counts[item.id]) || 0,
              last_counted_at: endTime
            })
            .eq('id', item.id)
        )
      );
    }

    // 2. ДААЛГАВАР БОЛОН ЭЭЛЖИЙГ ХААХ
    const completedTaskIds = tasks.filter((t: any) => t.done && t.id).map((t: any) => t.id);
    if (completedTaskIds.length > 0) {
      await supabase.from('tasks').update({ is_active: false }).in('id', completedTaskIds);
    }

    if (activeShift) {
      await supabase.from('shifts').update({ 
        is_active: false, 
        end_time: endTime,
        pos_z_image_url: posZUrl 
      }).eq('id', activeShift.id);
    }

    setMsg("🌙 Ээлж амжилттай хаагдлаа. Сайн ажиллалаа!");
    setIsAiLoading(false);
    
    await fetchKioskData(tenantClientId);

    setTimeout(() => { 
      setMsg(''); 
      setStep('select_worker'); 
      setSelectedWorker(null); 
      setActiveShift(null);
      setTasks([]);
      setCounts({});
      setPosZFile(null);
    }, 2200);
  };

  return (
    <div className="h-[100dvh] w-full bg-[#070b14] text-slate-100 flex flex-col items-center p-2.5 sm:p-4 select-none overflow-hidden touch-none">
      
      {/* 🔝 HEADER */}
      <header className="w-full max-w-md flex justify-between items-center border-b border-slate-800/80 pb-2.5 mb-2 shrink-0 px-1">
        <div className="flex items-center gap-2">
          <div className="bg-emerald-500/10 p-1.5 rounded-xl border border-emerald-500/20">
            <Coffee className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-black tracking-tight text-white uppercase">{tenantClientId} KIOSK</h1>
            <p className="text-[10px] text-emerald-400 font-bold uppercase">Smart Operations</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => router.push('/dashboard')} 
            className="text-slate-300 hover:text-white text-xs font-bold bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 active:scale-95 transition"
          >
            🔒 Dashboard
          </button>

          {selectedWorker && (
            <button 
              onClick={() => { setSelectedWorker(null); setStep('select_worker'); setMsg(''); }} 
              className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 px-2.5 py-1.5 rounded-xl text-xs font-bold active:scale-95 transition flex items-center gap-1"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Гарах</span>
            </button>
          )}
        </div>
      </header>

      {/* 🚀 MAIN CONTENT */}
      <main className="w-full max-w-md flex-1 min-h-0 flex flex-col overflow-hidden">
        
        {msg && (
          <div className="bg-rose-500/10 text-rose-400 p-2.5 rounded-xl mb-2 w-full text-center font-bold text-xs border border-rose-500/20 animate-pulse flex items-center justify-center gap-2 shrink-0">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>{msg}</span>
          </div>
        )}

        {/* 1. SELECT WORKER */}
        {step === 'select_worker' && (
          <div className="w-full h-full bg-[#0d1527] p-4 sm:p-5 rounded-3xl border border-slate-800 shadow-xl flex flex-col justify-between overflow-hidden">
            <div className="text-center pt-2 shrink-0">
              <div className="bg-emerald-500/10 p-3 rounded-2xl border border-emerald-500/20 w-fit mx-auto mb-2">
                <Users className="text-emerald-400 h-7 w-7"/>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white">Ажилтнаа сонгоно уу</h2>
              <p className="text-xs text-slate-400 mt-0.5">Өөрийн нэр дээр дарж ээлжиндээ нэвтэрнэ үү</p>
            </div>

            <div className="space-y-3 w-full my-auto overflow-y-auto max-h-[60vh] px-1">
              {workers.length === 0 ? (
                <div className="text-center text-slate-500 text-xs py-8">
                  Энэ салбарт ажилтан бүртгэгдээгүй байна.<br />(Dashboard-аас ажилтан нэмнэ үү)
                </div>
              ) : (
                workers.map(w => (
                  <button 
                    key={w.id} 
                    onClick={() => { setSelectedWorker(w); setStep('pin_code'); }} 
                    className="bg-[#0b1329] hover:bg-slate-800 active:scale-95 border-2 border-slate-800 hover:border-emerald-500/50 p-4 rounded-2xl text-left transition-all shadow-md flex justify-between items-center group w-full"
                  >
                    <div>
                      <span className="text-base sm:text-lg font-black text-white uppercase block group-hover:text-emerald-400 transition">
                        {w.full_name || w.email.split('@')[0]}
                      </span>
                      <span className="text-xs text-emerald-400 font-bold uppercase mt-0.5 block">
                        🏷️ {w.role}
                      </span>
                    </div>
                    <div className="bg-slate-950 p-2.5 rounded-xl text-slate-500 group-hover:text-emerald-400 font-black text-xs">
                      ➔
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="text-center text-[10px] text-slate-500 pb-1 shrink-0">
              {tenantClientId} Kitchen Kiosk • Voice & AI Powered
            </div>
          </div>
        )}

        {/* 2. PIN PAD */}
        {step === 'pin_code' && (
          <div className="w-full h-full bg-[#0d1527] p-4 sm:p-5 rounded-3xl border border-slate-800 shadow-xl flex flex-col justify-between items-center overflow-hidden touch-none">
            
            <div className="text-center w-full shrink-0 pt-1">
              <h2 className="text-xl sm:text-2xl font-black text-emerald-400 tracking-tight">PIN код оруулна уу</h2>
              <p className="text-xs text-slate-300 font-medium mt-0.5">Өөрийн хувийн нууц кодыг оруулна уу</p>
              <div className="mt-1.5 inline-block bg-slate-950 px-3.5 py-1 rounded-xl border border-slate-800">
                <span className="text-xs sm:text-sm text-emerald-300 font-black">
                  👤 {selectedWorker?.full_name || selectedWorker?.email.split('@')[0]} ({selectedWorker?.role})
                </span>
              </div>
            </div>

            <div className="bg-[#060b17] border border-slate-800 rounded-2xl py-2 px-6 flex justify-center items-center gap-4 w-full max-w-[200px] my-1 shrink-0">
              {[0, 1, 2, 3].map((dotIndex) => (
                <div 
                  key={dotIndex} 
                  className={`h-3.5 w-3.5 rounded-full transition-all duration-75 ${
                    pin.length > dotIndex ? 'bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.9)] scale-110' : 'bg-slate-800'
                  }`}
                />
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-2.5 w-full flex-1 max-h-[50vh] sm:max-h-[52vh] my-1 px-1">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                <button 
                  key={num} 
                  type="button"
                  onPointerDown={(e) => { e.preventDefault(); handleKeypadPress(num); }}
                  className="w-full h-full min-h-[50px] sm:min-h-[56px] bg-[#0b1329] hover:bg-slate-800 active:bg-slate-700 active:scale-95 border-2 border-slate-800/90 rounded-2xl text-2xl sm:text-3xl font-black text-white shadow-md flex items-center justify-center select-none transition-transform"
                >
                  {num}
                </button>
              ))}
              
              <button 
                type="button"
                onPointerDown={(e) => { e.preventDefault(); setPin(''); }}
                className="w-full h-full min-h-[50px] sm:min-h-[56px] bg-[#2a0e1c] hover:bg-[#3d1429] active:scale-95 border-2 border-rose-900/40 text-rose-400 rounded-2xl text-sm sm:text-base font-black shadow-md flex items-center justify-center select-none transition-transform"
              >
                Clear
              </button>

              <button 
                type="button"
                onPointerDown={(e) => { e.preventDefault(); handleKeypadPress('0'); }}
                className="w-full h-full min-h-[50px] sm:min-h-[56px] bg-[#0b1329] hover:bg-slate-800 active:bg-slate-700 active:scale-95 border-2 border-slate-800/90 rounded-2xl text-2xl sm:text-3xl font-black text-white shadow-md flex items-center justify-center select-none transition-transform"
              >
                0
              </button>

              <button 
                type="button"
                onPointerDown={(e) => { e.preventDefault(); handleVerifyPin(); }}
                className="w-full h-full min-h-[50px] sm:min-h-[56px] bg-[#059669] hover:bg-emerald-500 active:scale-95 text-slate-950 rounded-2xl text-base sm:text-lg font-black shadow-[0_0_20px_rgba(16,185,129,0.4)] flex items-center justify-center select-none transition-transform"
              >
                OK
              </button>
            </div>

            <div className="text-center space-y-1 w-full pt-1 shrink-0">
              <p className="text-[11px] text-slate-400">💡 Анхдагч PIN: <strong className="text-white">1234</strong></p>
              <button 
                onClick={() => { setStep('select_worker'); setPin(''); setMsg(''); }} 
                className="text-xs text-slate-400 hover:text-white font-bold"
              >
                ← Буцах
              </button>
            </div>
          </div>
        )}

        {/* 3. SHIFT START HANDOVER */}
        {step === 'shift_handover' && (
          <div className="w-full h-full bg-[#0d1527] p-4 sm:p-5 rounded-3xl border border-slate-800 shadow-xl flex flex-col justify-between overflow-hidden">
            <div className="text-center shrink-0">
              <div className="bg-blue-500/10 p-3 rounded-2xl border border-blue-500/20 w-fit mx-auto mb-2">
                <ShieldCheck className="text-blue-400 h-7 w-7"/>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white">Шинэ Ээлж Эхлүүлэх</h2>
              <p className="text-xs text-slate-400 mt-0.5">Гал тогооны цэвэрлэгээ, хөргөгчийн төлөвийг шалгаж хүлээн авна уу</p>
            </div>

            <form onSubmit={handleStartShiftSubmit} className="space-y-4 my-auto">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  📸 Ээлж хүлээж авах үеийн зураг (Нотлох зураг)
                </label>
                <div className="flex items-center gap-2">
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment" 
                    id="handover-start-cam" 
                    className="hidden" 
                    onChange={e => { if (e.target.files?.[0]) setHandoverFile(e.target.files[0]); }}
                  />
                  <label 
                    htmlFor="handover-start-cam" 
                    className="flex-1 bg-slate-950 border border-slate-800 p-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer text-xs font-bold text-slate-300 hover:border-blue-500 transition"
                  >
                    <Camera className="h-4 w-4 text-blue-400" />
                    <span>{handoverFile ? `✅ ${handoverFile.name.substring(0, 20)}...` : "Гал тогооны зураг дарах"}</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  📝 Тэмдэглэл / Хүлээлцэх тайлбар
                </label>
                <textarea 
                  rows={3}
                  value={handoverNote}
                  onChange={e => setHandoverNote(e.target.value)}
                  placeholder="Жишээ: Өмнөх ээлжээс хөргөгч цэвэрхэн, сүү 4 хайрцаг үлдсэн..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-xs font-medium outline-none focus:border-blue-500"
                />
              </div>

              <button 
                type="submit" 
                disabled={isAiLoading}
                className="w-full bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-black py-3.5 rounded-xl text-sm transition shadow-lg flex items-center justify-center gap-2"
              >
                <span>{isAiLoading ? "Эхлүүлж байна..." : "☀️ Ээлж Албан Ёсоор Эхлүүлэх"}</span>
              </button>
            </form>

            <div className="text-center">
              <button 
                onClick={() => { setStep('select_worker'); setSelectedWorker(null); }} 
                className="text-xs text-slate-400 hover:text-white font-bold"
              >
                ← Буцах
              </button>
            </div>
          </div>
        )}

        {/* 4. MAIN ACTION MENU */}
        {step === 'menu' && (
          <div className="w-full h-full bg-[#0d1527] p-4 sm:p-5 rounded-3xl border border-slate-800 shadow-xl flex flex-col justify-between overflow-hidden touch-none">
            
            <div className="text-center pt-1 shrink-0">
              <h2 className="text-xl sm:text-2xl font-black text-white">Сайн байна уу?</h2>
              <p className="text-base sm:text-lg text-emerald-400 font-black mt-0.5 uppercase tracking-wide">
                {selectedWorker?.full_name || selectedWorker?.email.split('@')[0]}
              </p>
            </div>
            
            <div className="flex-1 flex flex-col justify-between gap-2.5 my-2 w-full overflow-y-auto">
              {/* BUTTON 1: VOICE & AI ASSISTANT */}
              <button 
                onClick={() => setStep('ai_chat')} 
                className="flex-1 w-full min-h-[76px] p-3.5 bg-blue-500/10 hover:bg-blue-500/20 active:scale-95 rounded-2xl flex items-center justify-between border-2 border-blue-500/30 transition shadow-md text-left group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="bg-blue-500/20 p-2.5 rounded-xl border border-blue-500/30 shrink-0">
                    <Mic className="h-6 w-6 text-blue-400" />
                  </div>
                  <div>
                    <p className="font-black text-sm sm:text-base text-blue-400 flex items-center gap-1.5">
                      <span>Дуугаар Бүртгэх & AI Туслах</span>
                      <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded font-bold">Mic 🎙️</span>
                    </p>
                    <p className="text-xs text-slate-300 font-medium">Амаараа хэлж хаягдал хасах & E-Barimt уншуулах</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-blue-400/50 group-hover:text-blue-400 transition shrink-0" />
              </button>

              {/* BUTTON 2: DAILY SOP TASKS */}
              <button 
                onClick={openTasksScreen} 
                className="flex-1 w-full min-h-[76px] p-3.5 bg-purple-500/10 hover:bg-purple-500/20 active:scale-95 rounded-2xl flex items-center justify-between border-2 border-purple-500/30 transition shadow-md text-left group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="bg-purple-500/20 p-2.5 rounded-xl border border-purple-500/30 shrink-0">
                    <CheckSquare className="h-6 w-6 text-purple-400" />
                  </div>
                  <div>
                    <p className="font-black text-sm sm:text-base text-purple-400">Өнөөдрийн Даалгавар (SOP)</p>
                    <p className="text-xs text-slate-300 font-medium">
                      Цэвэрлэгээ, SOP үүргүүд ({tasks.filter(t => t.done).length}/{tasks.length})
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-purple-400/50 group-hover:text-purple-400 transition shrink-0" />
              </button>

              {/* BUTTON 3: REPORT PREVIOUS SHIFT DAMAGE */}
              <button 
                onClick={() => setStep('incident_report')} 
                className="flex-1 w-full min-h-[76px] p-3.5 bg-amber-500/10 hover:bg-amber-500/20 active:scale-95 rounded-2xl flex items-center justify-between border-2 border-amber-500/30 transition shadow-md text-left group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="bg-amber-500/20 p-2.5 rounded-xl border border-amber-500/30 shrink-0">
                    <AlertTriangle className="h-6 w-6 text-amber-400" />
                  </div>
                  <div>
                    <p className="font-black text-sm sm:text-base text-amber-400">Өмнөх Ээлжийн Алдагдал</p>
                    <p className="text-xs text-slate-300 font-medium">Муудсан/асгарсан барааг зургаар нотлох</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-amber-400/50 group-hover:text-amber-400 transition shrink-0" />
              </button>

              {/* BUTTON 4: CLOSE SHIFT */}
              <button 
                onClick={loadInventoryToCount} 
                className="flex-1 w-full min-h-[76px] p-3.5 bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-95 rounded-2xl flex items-center justify-between border-2 border-emerald-500/30 transition shadow-md text-left group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="bg-emerald-500/20 p-2.5 rounded-xl border border-emerald-500/30 shrink-0">
                    <ListOrdered className="h-6 w-6 text-emerald-400" />
                  </div>
                  <div>
                    <p className="font-black text-sm sm:text-base text-emerald-400">Ээлж Хаах (Тооллого)</p>
                    <p className="text-xs text-slate-300 font-medium">Бараа тоолж, Z-тайлангийн зураг дарах</p>
                  </div>
                </div>
                <ChevronRight className="h-6 w-6 text-emerald-400/50 group-hover:text-emerald-400 transition shrink-0" />
              </button>
            </div>

            <div className="text-center text-[10px] text-slate-500 shrink-0 pb-1">
              Ээлж идэвхтэй байна • {tenantClientId}
            </div>
          </div>
        )}

        {/* 5. AI CHAT INTERFACE */}
        {step === 'ai_chat' && (
          <KioskAiChatSection 
            selectedWorker={selectedWorker} 
            activeShift={activeShift} 
            ingredients={ingredients}
            onBack={() => setStep('menu')} 
          />
        )}

        {/* 6. DAILY TASKS */}
        {step === 'tasks' && (
          <div className="w-full h-full bg-[#0d1527] p-4 sm:p-5 rounded-3xl border border-slate-800 shadow-xl flex flex-col justify-between overflow-hidden">
            <h2 className="text-lg sm:text-xl font-black text-purple-400 mb-2 flex items-center gap-2 shrink-0">
              <CheckSquare className="h-5 w-5" /> Өнөөдрийн Даалгавар (SOP)
            </h2>

            {tasks.length === 0 ? (
              <p className="text-center text-slate-400 py-8 text-sm my-auto">Өнөөдөр хийх даалгавар байхгүй байна.</p>
            ) : (
              <div className="space-y-2 py-2 flex-1 overflow-y-auto overscroll-contain pr-1">
                {tasks.map((t, idx) => (
                  <button
                    key={idx}
                    disabled={t.done}
                    onClick={() => completeTask(idx)}
                    className={`w-full p-3.5 rounded-xl flex items-center justify-between border transition active:scale-95 ${
                      t.done 
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 opacity-60' 
                        : 'bg-slate-950 hover:bg-slate-900 border-slate-800 text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {t.done ? (
                        <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
                      ) : (
                        <div className="h-5 w-5 rounded-lg border-2 border-slate-600 shrink-0" />
                      )}
                      <span className="font-bold text-sm text-left">{t.name}</span>
                    </div>
                    {t.done && <span className="text-xs font-black text-emerald-400 shrink-0">Хийсэн ✅</span>}
                  </button>
                ))}
              </div>
            )}

            <button 
              onClick={() => setStep('menu')} 
              className="w-full mt-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-white font-bold py-3 rounded-xl text-xs transition shrink-0 active:scale-95"
            >
              ← Буцах
            </button>
          </div>
        )}

        {/* 7. INCIDENT REPORTING */}
        {step === 'incident_report' && (
          <div className="w-full h-full bg-[#0d1527] p-4 sm:p-5 rounded-3xl border border-slate-800 shadow-xl flex flex-col justify-between overflow-hidden">
            <div className="shrink-0 mb-3">
              <h2 className="text-lg font-black text-amber-400 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" /> Өмнөх Ээлжийн Алдагдал Бүртгэх
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Өмнөх ээлжийн ажилтны хаягдал эсвэл гэмтсэн барааг менежерт тайлагнана
              </p>
            </div>

            <form onSubmit={handleReportIncident} className="space-y-3 flex-1 overflow-y-auto pr-1">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  1. Өмнөх ээлжинд ажилласан ажилтан
                </label>
                <select 
                  value={incidentWorker}
                  onChange={e => setIncidentWorker(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-bold"
                >
                  <option value="">-- Ажилтан сонгох --</option>
                  {workers.filter(w => w.id !== selectedWorker?.id).map(w => (
                    <option key={w.id} value={w.full_name || w.email.split('@')[0]}>
                      {w.full_name || w.email.split('@')[0]} ({w.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  2. Алдагдсан / Муудсан түүхий эд
                </label>
                <select 
                  required
                  value={incidentItem}
                  onChange={e => setIncidentItem(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-bold"
                >
                  <option value="">-- Түүхий эд сонгох --</option>
                  {ingredients.map(ing => (
                    <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  3. Алдагдсан тоо хэмжээ
                </label>
                <input 
                  type="number" 
                  step="any" 
                  required
                  value={incidentQty}
                  onChange={e => setIncidentQty(e.target.value)}
                  placeholder="Тоо оруулна уу (жнь: 2)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  4. Нотлох зураг авах (Evidence Photo)
                </label>
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment" 
                  id="incident-camera-input" 
                  className="hidden" 
                  onChange={e => { if (e.target.files?.[0]) setIncidentFile(e.target.files[0]); }}
                />
                <label 
                  htmlFor="incident-camera-input" 
                  className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer text-xs font-bold text-slate-300 hover:border-amber-500 transition"
                >
                  <Camera className="h-4 w-4 text-amber-400" />
                  <span>{incidentFile ? `✅ ${incidentFile.name.substring(0, 18)}...` : "Зураг дарах"}</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  5. Тайлбар
                </label>
                <input 
                  type="text" 
                  value={incidentNote}
                  onChange={e => setIncidentNote(e.target.value)}
                  placeholder="Жишээ: Шөнө хөргөгчний хаалга дутуу хаагдсан..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-medium"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setStep('menu')} 
                  className="flex-1 bg-slate-950 border border-slate-800 py-3 rounded-xl text-xs font-bold text-slate-300"
                >
                  Буцах
                </button>
                <button 
                  type="submit" 
                  disabled={isAiLoading}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3 rounded-xl text-xs transition"
                >
                  {isAiLoading ? "Хадгалж байна..." : "Бүртгэх"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 8. CLOSE SHIFT & POS Z-REPORT */}
        {step === 'close_shift' && (
          <div className="w-full h-full bg-[#0d1527] p-4 sm:p-5 rounded-3xl border border-slate-800 shadow-xl flex flex-col justify-between overflow-hidden">
            <div className="shrink-0 mb-2">
              <h2 className="text-lg sm:text-xl font-black text-emerald-400 mb-0.5 flex items-center gap-2">
                <ListOrdered className="h-5 w-5" /> Ээлжийн Тооллого & Z-Тайлан
              </h2>
              <p className="text-xs text-slate-400">Хөргөгч/лангуун дахь үлдэгдлийг тоолж, Z-тайлангийн зураг оруулна уу.</p>
            </div>
            
            <div className="space-y-2 py-1 flex-1 overflow-y-auto overscroll-contain pr-1">
              {/* POS Z-REPORT UPLOAD */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 mb-2">
                <p className="text-xs font-bold text-white mb-1.5 flex items-center gap-1.5">
                  🧾 ПОС-ын Z-Тайлангийн зураг (End-of-day Z-Report)
                </p>
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment" 
                  id="pos-z-camera" 
                  className="hidden" 
                  onChange={e => { if (e.target.files?.[0]) setPosZFile(e.target.files[0]); }}
                />
                <label 
                  htmlFor="pos-z-camera" 
                  className="w-full bg-slate-900 border border-slate-700 p-2.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer text-xs font-bold text-emerald-400 hover:border-emerald-500 transition"
                >
                  <Camera className="h-4 w-4" />
                  <span>{posZFile ? `✅ ${posZFile.name.substring(0, 20)}...` : "Z-Тайлангийн зураг дарах"}</span>
                </label>
              </div>

           {/* PARETO 80/20 CYCLE COUNT ITEMS */}
              {inventoryToCount.map(item => {
                const stock = parseFloat(item.current_stock ?? item.live_stock ?? 0);
                const par = parseFloat(item.par_level ?? 0);
                const isUrgent = par > 0 && stock <= par;

                return (
                  <div key={item.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center gap-3">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-bold text-sm text-white">{item.name}</p>
                        
                        {/* 🏷️ ПАЙЗНУУД: Яаралтай дуусаж буй бол УЛААН, A-Class бол ЯГААН, Цикл бол ЦЭНХЭР */}
                        {isUrgent ? (
                          <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded font-black animate-pulse">
                            🚨 Яаралтай (Нөөц бага)
                          </span>
                        ) : item.abc_class === 'A' || item.is_critical ? (
                          <span className="text-[10px] bg-rose-500/20 text-rose-400 border border-rose-500/30 px-1.5 py-0.5 rounded font-black">
                            ⭐ A-Class (Гол бараа)
                          </span>
                        ) : (
                          <span className="text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded font-bold">
                            🔄 Цикл тооллого
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Системд: <strong className="text-slate-200">{Math.round(stock * 10) / 10}</strong> {item.unit}
                        {par > 0 && <span className="text-slate-500 ml-1.5">(Хэвийн нөөц: {par} {item.unit})</span>}
                      </p>
                    </div>

                    <input 
                      type="number" 
                      step="any" 
                      required 
                      placeholder="Тоо..." 
                      value={counts[item.id] !== undefined ? counts[item.id] : ''} 
                      onChange={e => setCounts({...counts, [item.id]: e.target.value})} 
                      className="w-24 h-10 bg-slate-900 px-3 rounded-xl text-center text-white border border-slate-700 font-bold text-base focus:border-emerald-500 outline-none" 
                    />
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2.5 mt-2.5 shrink-0">
              <button 
                type="button" 
                onClick={() => setStep('menu')} 
                className="flex-1 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 font-bold py-3 rounded-xl text-xs transition active:scale-95"
              >
                Буцах
              </button>
              <button 
                onClick={handleCloseShift} 
                disabled={isAiLoading || inventoryToCount.some(i => !counts[i.id])} 
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black py-3 rounded-xl text-xs transition disabled:opacity-50 shadow-md"
              >
                {isAiLoading ? 'Хааж байна...' : 'Хаах & Илгээх'}
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

const KioskPageExport = dynamic(() => Promise.resolve(KioskPage), {
  ssr: false,
});

export default KioskPageExport;