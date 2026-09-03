"use client";
import dynamic from 'next/dynamic';
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Coffee, CheckCircle, Users, LogOut, Camera, 
  MessageSquare, CheckSquare, ListOrdered, Send, ShieldAlert, Sparkles
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useRouter } from 'next/navigation';

// =========================================================================
// 🚀 GOOGLE AI STUDIO CHAT INTERFACE FOR MOBILE & TABLET
// =========================================================================
function KioskAiChatSection({ 
  selectedWorker, 
  activeShift, 
  onBack 
}: { 
  selectedWorker: any; 
  activeShift: any; 
  onBack: () => void; 
}) {
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{ sender: 'worker' | 'ai'; text: string; logId?: string }[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Шинэ мессеж нэмэгдэхэд үргэлж хамгийн доод хэсэг рүү гүйлгэх
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, isAiLoading]);

  const handleAiChatSubmit = async (e?: React.FormEvent, file?: File) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() && !file) return;

    setIsAiLoading(true);
    let base64Data = null;

    if (file) {
      setChatHistory(prev => [...prev, { sender: 'worker', text: '📸 Зураг илгээлээ (Баримт/Бараа)' }]);
      
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
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
            resolve(compressedBase64);
          };
        };
      });
    } else {
      setChatHistory(prev => [...prev, { sender: 'worker', text: chatInput }]);
    }

    const payloadText = chatInput;
    
    // Илгээсний дараа textarea-г цэвэрлэж, өндрийг анхны хэмжээнд оруулах
    setChatInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      const res = await fetch('/api/kiosk-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantClientId: selectedWorker.client_id,
          workerName: activeShift?.character_role || "Ажилтан",
          text: payloadText,
          imageBase64: base64Data,
          userRole: 'staff'
        })
      });

      const contentType = res.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        const data = await res.json();
        setChatHistory(prev => [...prev, { sender: 'ai', text: data.message, logId: data.log_id }]);
      } else if (res.body) {
        setChatHistory(prev => [...prev, { sender: 'ai', text: '' }]);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          accumulatedText += chunk;

          setChatHistory(prev => {
            const updated = [...prev];
            if (updated.length > 0) {
              updated[updated.length - 1] = { sender: 'ai', text: accumulatedText };
            }
            return updated;
          });
        }
      }
    } catch (err) {
      setChatHistory(prev => [...prev, { sender: 'ai', text: '❌ Алдаа: Сервертэй холбогдож чадсангүй.' }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleUndo = async (logId: string, index: number) => {
    setIsAiLoading(true);
    try {
      const res = await fetch('/api/kiosk-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'undo', logId })
      });
      const data = await res.json();
      const newHistory = [...chatHistory];
      newHistory[index] = { sender: 'ai', text: data.message };
      setChatHistory(newHistory);
    } catch (err) {
      alert("Буцаах үйлдэл амжилтгүй.");
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#0b0f19] overflow-hidden relative">
      
      {/* 1. TOP BAR (Google Studio Header Style) */}
      <div className="h-14 px-4 border-b border-slate-800/70 flex justify-between items-center bg-[#070b14]/90 backdrop-blur-md shrink-0 z-10">
        <div className="flex items-center gap-2.5">
          <div className="bg-blue-500/10 p-2 rounded-xl border border-blue-500/20 text-blue-400">
            <Sparkles className="h-4 w-4 text-blue-400 animate-pulse" />
          </div>
          <div>
            <h2 className="font-bold text-white text-sm flex items-center gap-2">
              Kiosk AI Assistant
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">ONLINE</span>
            </h2>
            <p className="text-[11px] text-slate-400 font-medium">SF Coffee Back-of-House</p>
          </div>
        </div>

        <button 
          onClick={onBack} 
          className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-900 border border-slate-800 text-slate-300 hover:text-white active:scale-95 transition"
        >
          ← Буцах
        </button>
      </div>
      
      {/* 2. CHAT MESSAGES SCROLL CONTAINER (ONLY THIS SCROLLS) */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-6 space-y-5 min-h-0 custom-scrollbar">
        {chatHistory.length === 0 && (
          <div className="text-center text-slate-400 text-sm mt-8 space-y-3 max-w-sm mx-auto px-4">
            <div className="bg-blue-500/10 p-4 rounded-3xl border border-blue-500/20 w-fit mx-auto shadow-inner">
              <Camera className="h-8 w-8 text-blue-400" />
            </div>
            <p className="font-bold text-white text-base">Гал тогооны ухаалаг туслах</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Баримтын зураг дарж оруулах эсвэл хаягдал, зарлагаа бичнэ үү.<br />
              <span className="text-slate-500 block mt-1">Жишээ: "500 мл сүү асгарсан", "Хоолонд 2 өндөг орлоо"</span>
            </p>
          </div>
        )}

        {chatHistory.map((msg, i) => (
          <div key={i} className={`flex ${msg.sender === 'worker' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] sm:max-w-[75%] p-4 rounded-2xl text-sm sm:text-base leading-relaxed ${
              msg.sender === 'worker' 
                ? 'bg-[#1e293b] text-white rounded-tr-none border border-slate-700/60 shadow-lg font-medium' 
                : 'bg-[#111827] text-slate-200 rounded-tl-none border border-slate-800 shadow-xl overflow-x-auto'
            }`}>
              {msg.sender === 'worker' ? (
                msg.text
              ) : (
                <div className="prose prose-invert max-w-none text-sm sm:text-base leading-relaxed">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      table: ({ node, ...props }) => (
                        <table className="w-full my-2 border-collapse border border-slate-800 text-xs sm:text-sm rounded-xl overflow-hidden" {...props} />
                      ),
                      thead: ({ node, ...props }) => (
                        <thead className="bg-slate-950 text-emerald-400 border-b border-slate-800 font-bold" {...props} />
                      ),
                      th: ({ node, ...props }) => (
                        <th className="border border-slate-800 px-3 py-2 text-left font-black" {...props} />
                      ),
                      td: ({ node, ...props }) => (
                        <td className="border border-slate-800/80 px-3 py-1.5 text-slate-300 font-medium" {...props} />
                      ),
                      h3: ({ node, ...props }) => (
                        <h3 className="text-sm sm:text-base font-black text-white mt-2 mb-1" {...props} />
                      ),
                      ul: ({ node, ...props }) => (
                        <ul className="list-disc list-inside space-y-1 my-1.5" {...props} />
                      )
                    }}
                  >
                    {msg.text}
                  </ReactMarkdown>
                </div>
              )}
              
              {msg.logId && (
                <button 
                  onClick={() => handleUndo(msg.logId!, i)}
                  className="mt-2.5 w-full bg-slate-950/80 border border-slate-800 hover:bg-rose-500/20 hover:text-rose-400 py-2 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5"
                >
                  Буцаах ↩️ (Undo)
                </button>
              )}
            </div>
          </div>
        ))}
        {isAiLoading && (
          <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold pl-2">
            <span className="h-2 w-2 rounded-full bg-blue-400 animate-ping"></span>
            AI хариулж байна...
          </div>
        )}
        
        {/* Scroll anchor */}
        <div ref={messagesEndRef} className="h-2" />
      </div>

      {/* 3. GOOGLE AI STUDIO PROMPT BOX (Anchored at bottom, floating rounded card) */}
      <div className="p-3 sm:p-4 bg-[#070b14]/95 border-t border-slate-800/80 shrink-0 z-10 backdrop-blur-md">
        <form 
          onSubmit={handleAiChatSubmit} 
          className="max-w-2xl mx-auto bg-[#131722] border border-slate-700/80 focus-within:border-blue-500/80 rounded-3xl p-2.5 shadow-2xl transition-all"
        >
          {/* Textarea */}
          <textarea 
            ref={textareaRef}
            rows={1}
            value={chatInput} 
            onChange={e => {
              setChatInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
            }} 
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleAiChatSubmit();
              }
            }}
            placeholder="Энд бичих..." 
            className="w-full bg-transparent border-none outline-none focus:ring-0 text-white placeholder-slate-500 text-sm sm:text-base leading-relaxed px-3 py-1.5 resize-none max-h-[120px] overflow-y-auto custom-scrollbar" 
          />

          {/* Bottom Action Bar (Inside the prompt container) */}
          <div className="flex justify-between items-center pt-2 px-1 border-t border-slate-800/40 mt-1">
            <div className="flex items-center gap-2">
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
                className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white cursor-pointer transition flex items-center gap-1.5 text-xs font-semibold"
                title="Баримтын зураг дарах"
              >
                <Camera className="h-4 w-4 text-emerald-400" />
                <span className="hidden sm:inline">Баримт зураг</span>
              </label>
            </div>

            <button 
              type="submit" 
              disabled={isAiLoading || !chatInput.trim()} 
              className="bg-blue-600 hover:bg-blue-500 active:scale-95 text-white px-4 py-2 rounded-full disabled:opacity-30 transition font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-md"
            >
              <span>Илгээх</span>
              <Send className="h-3.5 w-3.5"/>
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}

// =========================================================================
// 📱 ҮНДСЭН KIOSK ДЭЛГЭЦ (100% FIXED VIEWPORT LOCK)
// =========================================================================
function KioskPage() {
  const router = useRouter(); 
  const [step, setStep] = useState<'select_worker' | 'pin_code' | 'menu' | 'ai_chat' | 'tasks' | 'close_shift'>('select_worker');
  const [workers, setWorkers] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<any>(null);
  const [pin, setPin] = useState('');
  const [activeShift, setActiveShift] = useState<any>(null);
  const [msg, setMsg] = useState('');

  const [tasks, setTasks] = useState<any[]>([]);
  const [inventoryToCount, setInventoryToCount] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => { 
    fetchKioskData();
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('kiosk_device_locked', 'true');
    }
  }, []);

  const fetchKioskData = async () => {
    const { data: profiles } = await supabase.from('profiles').select('*').neq('role', 'owner');
    if (profiles) setWorkers(profiles);
    const { data: ingData } = await supabase.from('ingredients').select('id, name, unit, current_stock, is_critical, last_counted_at, client_id').order('name', { ascending: true });
    if (ingData) setIngredients(ingData);
  };

  const loadLiveTodayTasks = async (tenantId: string, worker: any) => {
    const { data: allTasks } = await supabase.from('tasks').select('*').ilike('client_id', tenantId).eq('is_active', true);

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
          if (item.done && item.name) {
            completedTasksToday.add(item.name.toLowerCase().trim());
          }
        });
      }
    });

    return matchedTemplateTasks.map(t => ({
      ...t,
      done: completedTasksToday.has(t.name.toLowerCase().trim())
    }));
  };

  const handleVerifyPin = async () => {
    if (!selectedWorker) return;
    const validPin = selectedWorker.pin_code || '1234';

    if (pin !== validPin) {
      setMsg("❌ Буруу PIN код! Та өөрийн PIN кодоо шалгана уу.");
      setPin('');
      return;
    }

    const workerName = selectedWorker.email.split('@')[0];
    const workerDisplayName = (selectedWorker.full_name || workerName).trim();
    const fullNameRole = `${selectedWorker.role} (${workerDisplayName})`;
    const tenantId = (selectedWorker.client_id || 'SF Coffee').trim();

    const liveTasks = await loadLiveTodayTasks(tenantId, selectedWorker);

    let { data: shift } = await supabase
      .from('shifts')
      .select('*')
      .eq('client_id', tenantId)
      .eq('is_active', true)
      .order('start_time', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!shift) {
      const { data: newShift, error: insertError } = await supabase.from('shifts').insert([{
        client_id: tenantId,
        character_role: fullNameRole,
        is_active: true,
        daily_tasks_checklist: liveTasks,
        telegram_chat_id: selectedWorker.telegram_chat_id || 0
      }]).select().single();

      if (insertError || !newShift) {
        setMsg(`❌ Алдаа: ${insertError?.message || 'Ээлж үүсгэж чадсангүй.'}`);
        setPin('');
        return;
      }
      shift = newShift;
    } else {
      await supabase.from('shifts').update({ daily_tasks_checklist: liveTasks }).eq('id', shift.id);
      shift.daily_tasks_checklist = liveTasks;
    }

    setActiveShift(shift);
    setTasks(liveTasks);
    setStep('menu');
    setPin('');
    setMsg('');
  };

  const openTasksScreen = async () => {
    if (!activeShift || !selectedWorker) {
      setStep('tasks');
      return;
    }
    const tenantId = (selectedWorker.client_id || 'SF Coffee').trim();
    const liveTasks = await loadLiveTodayTasks(tenantId, selectedWorker);
    setTasks(liveTasks);
    await supabase.from('shifts').update({ daily_tasks_checklist: liveTasks }).eq('id', activeShift.id);
    setStep('tasks');
  };

  const completeTask = async (index: number) => {
    const updatedTasks = [...tasks];
    if (updatedTasks[index].done) return;
    updatedTasks[index].done = true;
    setTasks(updatedTasks);
    await supabase.from('shifts').update({ daily_tasks_checklist: updatedTasks }).eq('id', activeShift.id);
  };

  const loadInventoryToCount = async () => {
    setMsg('');
    const tenantId = (selectedWorker.client_id || 'SF Coffee').trim();
    
    const { data: freshIngs } = await supabase
      .from('ingredients')
      .select('id, name, unit, current_stock, is_critical, last_counted_at, client_id')
      .ilike('client_id', tenantId)
      .order('name', { ascending: true });

    const ingsPool = freshIngs || ingredients;
    setIngredients(ingsPool);

    const twelveHoursAgo = new Date(Date.now() - (12 * 60 * 60 * 1000)).toISOString();
    
    const criticalItems = ingsPool.filter((i: any) => 
      i.is_critical === true && (!i.last_counted_at || i.last_counted_at < twelveHoursAgo)
    );
    
    const nonCriticalItems = ingsPool.filter((i: any) => i.is_critical !== true);
    const optimalCount = Math.max(3, Math.ceil(nonCriticalItems.length / 40));
    
    const sortedCycleItems = nonCriticalItems
      .sort((a: any, b: any) => new Date(a.last_counted_at || '2000-01-01').getTime() - new Date(b.last_counted_at || '2000-01-01').getTime())
      .slice(0, optimalCount);
    
    const finalItems = [...criticalItems, ...sortedCycleItems];
    setInventoryToCount(finalItems);
    setCounts({});
    setStep('close_shift');
  };

  const handleCloseShift = async () => {
    const uncountedItems = inventoryToCount.filter(i => counts[i.id] === undefined || counts[i.id].toString().trim() === '');
    
    if (uncountedItems.length > 0) {
      setMsg(`⚠️ Тооллого дутуу байна: ${uncountedItems.map(i => i.name).join(', ')}`);
      return;
    }

    setIsAiLoading(true);
    const endTime = new Date().toISOString();
    
    for (const item of inventoryToCount) {
      const countedQty = parseFloat(counts[item.id]) || 0;
      await supabase.from('inventory_logs').insert([{
        client_id: selectedWorker.client_id, 
        ingredient_id: item.id, 
        quantity: countedQty, 
        type: 'count',
        notes: 'Ээлж хаалтын тооллого (Kiosk)', 
        worker_name: activeShift.character_role, 
        date: endTime
      }]);
      await supabase.from('ingredients').update({ current_stock: countedQty, last_counted_at: endTime }).eq('id', item.id);
    }

    const completedTaskIds = tasks.filter((t: any) => t.done && t.id).map((t: any) => t.id);
    if (completedTaskIds.length > 0) {
      await supabase.from('tasks').update({ is_active: false }).in('id', completedTaskIds);
    }

    await supabase.from('shifts').update({ is_active: false, end_time: endTime }).eq('id', activeShift.id);

    setMsg("🌙 Ээлж амжилттай хаагдлаа. Сайхан амраарай!");
    setIsAiLoading(false);
    
    await fetchKioskData();

    setTimeout(() => { 
      setMsg(''); 
      setStep('select_worker'); 
      setSelectedWorker(null); 
      setActiveShift(null);
      setTasks([]);
      setCounts({});
    }, 2500);
  };

  return (
    // 🔒 100% FIXED VIEWPORT LOCK: Гадаад дэлгэц хэзээ ч scroll хийхгүй
    <div className="fixed inset-0 w-full h-[100dvh] bg-[#070b14] text-slate-100 flex flex-col overflow-hidden select-none touch-manipulation">
      
      {/* 🔝 HEADER (AI ЧАТААС БУСАД ҮЕД ХАРАГДАНА) */}
      {step !== 'ai_chat' && (
        <header className="w-full max-w-2xl mx-auto flex justify-between items-center border-b border-slate-800/80 p-3 sm:p-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
              <Coffee className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-black tracking-tight text-white uppercase">SF KITCHEN KIOSK</h1>
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
                className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 active:scale-95 transition"
              >
                <LogOut className="h-3.5 w-3.5" /> Гарах
              </button>
            )}
          </div>
        </header>
      )}

      {/* 🚀 MAIN CONTENT CONTAINER */}
      <main className="w-full h-full flex-1 flex flex-col min-h-0 overflow-hidden relative">
        
        {msg && step !== 'ai_chat' && (
          <div className="mx-4 mt-2 bg-rose-500/10 text-rose-400 p-3 rounded-2xl text-center font-bold text-xs border border-rose-500/20 flex items-center justify-center gap-2 shrink-0">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>{msg}</span>
          </div>
        )}

        {/* 1. SELECT WORKER */}
        {step === 'select_worker' && (
          <div className="w-full max-w-xl mx-auto flex-1 p-5 flex flex-col justify-between overflow-y-auto">
            <div className="text-center pt-2 shrink-0">
              <div className="bg-emerald-500/10 p-3.5 rounded-3xl border border-emerald-500/20 w-fit mx-auto mb-2.5">
                <Users className="text-emerald-400 h-8 w-8"/>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white">Ажилтнаа сонгоно уу</h2>
              <p className="text-xs text-slate-400 mt-0.5">Нэр дээрээ дарж ээлжиндээ нэвтэрнэ үү</p>
            </div>

            <div className="space-y-3 w-full my-auto py-4">
              {workers.map(w => (
                <button 
                  key={w.id} 
                  onClick={() => { setSelectedWorker(w); setStep('pin_code'); }} 
                  className="bg-[#0d1527] hover:bg-slate-800 active:scale-95 border-2 border-slate-800/80 hover:border-emerald-500/50 p-4 sm:p-5 rounded-2xl text-left transition-all shadow-lg flex justify-between items-center group w-full"
                >
                  <div>
                    <span className="text-lg sm:text-xl font-black text-white uppercase block group-hover:text-emerald-400 transition">
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
              ))}
            </div>

            <div className="text-center text-[10px] text-slate-500 pt-2 shrink-0">
              SF Kitchen Kiosk • Secure Operations
            </div>
          </div>
        )}

        {/* 2. PIN CODE */}
        {step === 'pin_code' && (
          <div className="w-full max-w-sm mx-auto flex-1 p-4 flex flex-col justify-between items-center overflow-y-auto">
            <div className="text-center pt-1 w-full shrink-0">
              <h2 className="text-xl sm:text-2xl font-black text-emerald-400">PIN код оруулна уу</h2>
              <p className="text-xs text-slate-300 mt-0.5 font-medium">
                👤 {selectedWorker?.full_name || selectedWorker?.email.split('@')[0]}
              </p>
            </div>

            {/* PIN Dots */}
            <div className="bg-[#0b1329] border border-slate-800 rounded-2xl py-3 px-8 flex justify-center items-center gap-5 my-2 shrink-0">
              {[0, 1, 2, 3].map((dotIndex) => (
                <div 
                  key={dotIndex} 
                  className={`h-4 w-4 rounded-full transition-all duration-150 ${
                    pin.length > dotIndex 
                      ? 'bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.9)] scale-125' 
                      : 'bg-slate-800'
                  }`}
                />
              ))}
            </div>

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-2.5 w-full my-auto">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                <button 
                  key={num} 
                  onClick={() => setPin(p => p.length < 4 ? p + num : p)} 
                  className="h-16 w-full bg-[#0d1527] hover:bg-slate-800 active:scale-95 border border-slate-800 rounded-2xl text-2xl font-black text-white transition-all shadow-md flex items-center justify-center"
                >
                  {num}
                </button>
              ))}
              
              <button 
                onClick={() => setPin('')} 
                className="h-16 w-full bg-rose-950/30 hover:bg-rose-900/40 active:scale-95 border border-rose-900/40 text-rose-400 rounded-2xl text-sm font-black transition-all flex items-center justify-center"
              >
                Clear
              </button>

              <button 
                onClick={() => setPin(p => p.length < 4 ? p + '0' : p)} 
                className="h-16 w-full bg-[#0d1527] hover:bg-slate-800 active:scale-95 border border-slate-800 rounded-2xl text-2xl font-black text-white transition-all shadow-md flex items-center justify-center"
              >
                0
              </button>

              <button 
                onClick={handleVerifyPin} 
                className="h-16 w-full bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-slate-950 rounded-2xl text-lg font-black transition-all shadow-lg flex items-center justify-center"
              >
                OK
              </button>
            </div>

            <div className="text-center w-full pt-1 shrink-0">
              <button 
                onClick={() => { setStep('select_worker'); setPin(''); setMsg(''); }} 
                className="text-xs text-slate-400 hover:text-white font-bold"
              >
                ← Ажилтан солих
              </button>
            </div>
          </div>
        )}

        {/* 3. MENU */}
        {step === 'menu' && (
          <div className="w-full max-w-xl mx-auto flex-1 p-5 flex flex-col justify-between overflow-y-auto">
            <div className="text-center pt-2 shrink-0">
              <h2 className="text-xl sm:text-2xl font-black text-white">Сайн байна уу?</h2>
              <p className="text-sm sm:text-base text-emerald-400 font-bold mt-0.5 uppercase">
                {selectedWorker?.full_name || selectedWorker?.email.split('@')[0]}
              </p>
            </div>
            
            <div className="space-y-3.5 w-full flex-1 flex flex-col justify-center my-4">
              <button 
                onClick={() => setStep('ai_chat')} 
                className="w-full p-5 bg-blue-500/10 hover:bg-blue-500/20 active:scale-95 rounded-3xl flex items-center gap-4 border border-blue-500/30 transition shadow-lg text-left"
              >
                <div className="bg-blue-500/20 p-3.5 rounded-2xl border border-blue-500/30 shrink-0">
                  <MessageSquare className="h-7 w-7 text-blue-400" />
                </div>
                <div>
                  <p className="font-black text-lg text-blue-400">Ухаалаг Туслах (AI Chat)</p>
                  <p className="text-xs text-slate-300 mt-0.5">Зарлага бичих & Баримтын зураг дарах</p>
                </div>
              </button>

              <button 
                onClick={openTasksScreen} 
                className="w-full p-5 bg-purple-500/10 hover:bg-purple-500/20 active:scale-95 rounded-3xl flex items-center gap-4 border border-purple-500/30 transition shadow-lg text-left"
              >
                <div className="bg-purple-500/20 p-3.5 rounded-2xl border border-purple-500/30 shrink-0">
                  <CheckSquare className="h-7 w-7 text-purple-400" />
                </div>
                <div>
                  <p className="font-black text-lg text-purple-400">Өнөөдрийн Даалгавар</p>
                  <p className="text-xs text-slate-300 mt-0.5">Цэвэрлэгээ, тохиргоо болон үүргүүд</p>
                </div>
              </button>

              <button 
                onClick={loadInventoryToCount} 
                className="w-full p-5 bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-95 rounded-3xl flex items-center gap-4 border border-emerald-500/30 transition shadow-lg text-left"
              >
                <div className="bg-emerald-500/20 p-3.5 rounded-2xl border border-emerald-500/30 shrink-0">
                  <ListOrdered className="h-7 w-7 text-emerald-400" />
                </div>
                <div>
                  <p className="font-black text-lg text-emerald-400">Ээлж хаах (Тооллого)</p>
                  <p className="text-xs text-slate-300 mt-0.5">Өдрийн төгсгөлд бараа тоолох</p>
                </div>
              </button>
            </div>

            <div className="text-center text-[10px] text-slate-500 pt-2 shrink-0">
              Ээлжийн үйл ажиллагаа идэвхтэй байна
            </div>
          </div>
        )}

        {/* 4. AI CHAT INTERFACE (GOOGLE AI STUDIO MOBILE VIEW) */}
        {step === 'ai_chat' && (
          <KioskAiChatSection 
            selectedWorker={selectedWorker} 
            activeShift={activeShift} 
            onBack={() => setStep('menu')} 
          />
        )}

        {/* 5. TASKS */}
        {step === 'tasks' && (
          <div className="w-full max-w-xl mx-auto flex-1 p-5 flex flex-col justify-between overflow-hidden">
            <div className="flex-1 flex flex-col overflow-hidden min-h-0">
              <h2 className="text-xl font-black text-purple-400 mb-3 flex items-center gap-2.5 shrink-0">
                <CheckSquare className="h-6 w-6" /> Өнөөдрийн Даалгавар
              </h2>

              {tasks.length === 0 ? (
                <p className="text-center text-slate-400 py-10 text-sm my-auto">Даалгавар алга байна.</p>
              ) : tasks.every(t => t.done) ? (
                <div className="text-center py-8 space-y-2 bg-slate-900/60 rounded-3xl border border-slate-800 p-5 my-auto">
                  <CheckCircle className="h-10 w-10 text-emerald-400 mx-auto" />
                  <p className="font-black text-lg text-white">Бүх даалгавар биелсэн!</p>
                  <p className="text-xs text-slate-400">Танд хийх үлдсэн ажил байхгүй байна.</p>
                </div>
              ) : (
                <div className="space-y-2.5 overflow-y-auto pr-1 flex-1 py-1 custom-scrollbar">
                  {tasks.map((t, idx) => (
                    <button
                      key={idx}
                      disabled={t.done}
                      onClick={() => completeTask(idx)}
                      className={`w-full p-4 rounded-2xl flex items-center justify-between border transition active:scale-95 ${
                        t.done 
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 opacity-60 cursor-not-allowed' 
                          : 'bg-slate-900 hover:bg-slate-800/80 border-slate-800 text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {t.done ? (
                          <CheckCircle className="h-6 w-6 text-emerald-400 shrink-0" />
                        ) : (
                          <div className="h-6 w-6 rounded-lg border border-slate-600 shrink-0" />
                        )}
                        <span className="font-bold text-sm text-left">{t.name}</span>
                      </div>
                      {t.done && <span className="text-xs font-black text-emerald-400 shrink-0">Хийсэн ✅</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button 
              onClick={() => setStep('menu')} 
              className="w-full mt-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white font-bold py-3.5 rounded-2xl text-sm transition shrink-0"
            >
              ← Буцах
            </button>
          </div>
        )}

        {/* 6. CLOSE SHIFT */}
        {step === 'close_shift' && (
          <div className="w-full max-w-xl mx-auto flex-1 p-5 flex flex-col justify-between overflow-hidden">
            <div className="flex-1 flex flex-col overflow-hidden min-h-0">
              <h2 className="text-xl font-black text-emerald-400 mb-1 flex items-center gap-2 shrink-0">
                <ListOrdered className="h-6 w-6" /> Ээлжийн Тооллого
              </h2>
              <p className="text-xs text-slate-400 mb-3 shrink-0">Бодит үлдэгдлийг тоолж бичнэ үү.</p>
              
              <div className="space-y-2.5 overflow-y-auto pr-1 flex-1 py-1 custom-scrollbar">
                {inventoryToCount.map(item => (
                  <div key={item.id} className="bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-800 flex justify-between items-center gap-3">
                    <div>
                      <p className="font-bold text-sm text-white">{item.name}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Системд: {Math.round((parseFloat(item.current_stock) || 0) * 10) / 10} {item.unit}
                      </p>
                    </div>
                    <input 
                      type="number" 
                      step="any" 
                      required 
                      placeholder="Тоо..." 
                      value={counts[item.id] !== undefined ? counts[item.id] : ''} 
                      onChange={e => setCounts({...counts, [item.id]: e.target.value})} 
                      className="w-28 sm:w-32 h-12 bg-slate-950 px-3 rounded-xl text-center text-white border border-slate-700 font-bold text-lg focus:border-emerald-500 outline-none" 
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2.5 mt-3 shrink-0">
              <button 
                type="button" 
                onClick={() => setStep('menu')} 
                className="flex-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold py-3.5 rounded-2xl text-sm transition"
              >
                Буцах
              </button>
              <button 
                onClick={handleCloseShift} 
                disabled={isAiLoading || inventoryToCount.some(i => !counts[i.id])} 
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black py-3.5 rounded-2xl text-sm transition disabled:opacity-50 shadow-lg"
              >
                {isAiLoading ? 'Хааж байна...' : 'Хаах & Илгээх'}
              </button>
            </div>
          </div>
        )}

      </main>

      {/* Global CSS for Custom Sleek Scrollbar (Hides ugly default scrollbars) */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1e293b;
          border-radius: 9999px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #334155;
        }
      `}</style>
    </div>
  );
}

const KioskPageExport = dynamic(() => Promise.resolve(KioskPage), {
  ssr: false,
});

export default KioskPageExport;