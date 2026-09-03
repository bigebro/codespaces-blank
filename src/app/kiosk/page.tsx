"use client";
import dynamic from 'next/dynamic';
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Coffee, CheckCircle, Users, LogOut, Camera, 
  MessageSquare, CheckSquare, ListOrdered, Send, ShieldAlert,
  ChevronRight
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useRouter } from 'next/navigation';

// =========================================================================
// 🚀 1. KIOSK AI ЧАТ (ТОМОРСОН ТЕКСТ & ТОД УНШИГДАХ ЧАТ)
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isAiLoading]);

  const handleAiChatSubmit = async (e?: React.FormEvent | React.KeyboardEvent, file?: File) => {
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
            resolve(canvas.toDataURL('image/jpeg', 0.7).split(',')[1]);
          };
        };
      });
    } else {
      setChatHistory(prev => [...prev, { sender: 'worker', text: chatInput }]);
    }

    const payloadText = chatInput;
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
          accumulatedText += decoder.decode(value, { stream: true });
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
    <div className="w-full h-full flex flex-col bg-[#0d1527] rounded-3xl border border-slate-800/80 shadow-2xl p-4 sm:p-5 overflow-hidden">
      {/* 🔝 Чатны Дэд Толгой (ТОМ ХЭМЖЭЭТЭЙ) */}
      <div className="flex justify-between items-center pb-3 border-b border-slate-800 shrink-0 px-1">
        <h2 className="font-black text-blue-400 flex items-center gap-2.5 text-lg sm:text-xl">
          <MessageSquare className="h-7 w-7"/> AI Туслах & Бүртгэл
        </h2>
        <button onClick={onBack} className="bg-slate-900 px-6 py-6 rounded-xl text-xl sm:text-3xl font-bold border border-slate-800 hover:bg-slate-800 text-slate-200 active:scale-95">
          ← Буцах
        </button>
      </div>
      
      {/* Чатны мессежүүд: ТОМ ҮСЭГТЭЙ (text-lg / text-xl) */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-4 py-4 overscroll-contain px-1">
        {chatHistory.length === 0 && (
          <div className="text-center text-slate-400 text-base sm:text-lg mt-8 space-y-3">
            <div className="bg-blue-500/10 p-5 rounded-3xl border border-blue-500/20 w-fit mx-auto">
              <Camera className="h-12 w-12 text-blue-400" />
            </div>
            <p className="font-black text-white text-xl sm:text-2xl">Гал тогооны ухаалаг туслах</p>
            <p className="text-sm sm:text-base text-slate-300 max-w-sm mx-auto leading-relaxed">
              Баримтын зураг дарж оруулах эсвэл хаягдлаа бичнэ үү.<br />(Жишээ: "500 мл сүү асгарсан")
            </p>
          </div>
        )}

        {chatHistory.map((msg, i) => (
          <div key={i} className={`flex ${msg.sender === 'worker' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 sm:p-5 rounded-3xl text-base sm:text-lg leading-relaxed ${
              msg.sender === 'worker' 
                ? 'bg-blue-600 text-white rounded-tr-none font-bold shadow-lg' 
                : 'bg-slate-900 text-slate-100 rounded-tl-none border border-slate-800/90 shadow-lg'
            }`}>
              {msg.sender === 'worker' ? (
                msg.text
              ) : (
                <div className="prose prose-invert max-w-none text-base sm:text-lg leading-relaxed font-medium">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.text}
                  </ReactMarkdown>
                </div>
              )}
              
              {msg.logId && (
                <button 
                  onClick={() => handleUndo(msg.logId!, i)}
                  className="mt-3 w-full bg-slate-950 border border-slate-700 hover:bg-rose-500/20 hover:text-rose-400 py-2.5 rounded-xl font-black text-sm transition"
                >
                  Буцаах ↩️ (Undo)
                </button>
              )}
            </div>
          </div>
        ))}
        {isAiLoading && <div className="text-blue-400 text-base animate-pulse font-bold px-2">AI бодож байна...</div>}
        <div ref={messagesEndRef} />
      </div>

      {/* 🎯 Prompt Input: ТОМ ТЕКСТТЭЙ (text-[18px] sm:text-[20px]) */}
      <div className="pt-2 shrink-0 w-full">
        <form 
          onSubmit={handleAiChatSubmit} 
          className="bg-[#1e293b] border border-slate-700 rounded-3xl p-3 sm:p-4 flex flex-col gap-3 shadow-2xl focus-within:border-blue-500 w-full"
        >
          <textarea 
            ref={textareaRef}
            rows={2}
            value={chatInput} 
            onChange={e => {
              setChatInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
            }} 
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (chatInput.trim()) handleAiChatSubmit();
              }
            }}
            placeholder="Start typing a prompt..." 
            className="w-full bg-transparent text-white leading-relaxed resize-none outline-none placeholder:text-slate-500 text-[18px] sm:text-[20px] px-1 font-semibold" 
            style={{ minHeight: '54px', maxHeight: '140px' }}
          />

          <div className="flex justify-between items-center pt-2.5 border-t border-slate-800/80 shrink-0">
            <div className="flex items-center">
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
                className="h-22 w-22 bg-slate-800 hover:bg-slate-700 active:scale-95 rounded-full flex items-center justify-center cursor-pointer transition-colors shadow-md"
              >
                <Camera className="h-22 px-2 w-22 text-emerald-400 " />
              </label>
            </div>

            <button 
              type="submit" 
              disabled={isAiLoading || !chatInput.trim()} 
              className={`h-22 px-7 rounded-full font-black text-3xl flex items-center gap-2 transition-all ${
                chatInput.trim() && !isAiLoading 
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-xl active:scale-95' 
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <span>{isAiLoading ? "Running..." : "Run"}</span>
              <Send className="h-13 w-13" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =========================================================================
// 📱 2. ҮНДСЭН KIOSK ДЭЛГЭЦ (ТОМ ТЕКСТ & ТОМ КАРТУУД)
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

  const handleKeypadPress = (digit: string) => {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(10);
    }
    setPin(p => p.length < 4 ? p + digit : p);
  };

  const handleKeypadClear = () => {
    setPin('');
  };

  const handleVerifyPin = async () => {
    if (!selectedWorker) return;
    const validPin = selectedWorker.pin_code || '1234';

    if (pin !== validPin) {
      setMsg("❌ Буруу PIN код! Мартсан бол утсаараа Dashboard руу орж харна уу.");
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
    <div className="h-[100dvh] w-full bg-[#070b14] text-slate-100 flex flex-col p-3 sm:p-5 select-none overflow-hidden touch-none">
      
      <style jsx global>{`
        input, textarea, select {
          font-size: 33px !important;
        }
      `}</style>

      {/* 🔝 ТОМОРСОН HEADER (ТОД ТЕКСТ & ТОМ ТОВЧ) */}
      <header className="w-full flex justify-between items-center border-b border-slate-800/80 pb-3 mb-3 shrink-0 px-2">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/10 p-2.5 rounded-2xl border border-emerald-500/20">
            <Coffee className="h-7 w-7 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-black tracking-tight text-white uppercase">SF KITCHEN KIOSK</h1>
            <p className="text-xs sm:text-sm text-emerald-400 font-extrabold uppercase">Smart Operations</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button 
            onClick={() => router.push('/dashboard')} 
            className="text-slate-200 hover:text-white text-xl sm:text-3xl font-black bg-slate-900 px-4 py-2 rounded-xl border border-slate-800 active:scale-95 transition"
          >
            🔒 Dashboard
          </button>

          {selectedWorker && (
            <button 
              onClick={() => { setSelectedWorker(null); setStep('select_worker'); setMsg(''); }} 
              className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 px-3.5 py-2 rounded-xl text-xl sm:text-3xl font-black active:scale-95 transition flex items-center gap-1.5"
            >
              <LogOut className="h-6 w-8" />
              <span>Гарах</span>
            </button>
          )}
        </div>
      </header>

      {/* 🚀 ҮНДСЭН ХЭСЭГ */}
      <main className="w-full flex-1 min-h-0 flex flex-col overflow-hidden">
        
        {msg && (
          <div className="bg-rose-500/10 text-rose-400 p-3.5 rounded-2xl mb-2.5 w-full text-center font-black text-sm border border-rose-500/20 animate-pulse flex items-center justify-center gap-2 shrink-0">
            <ShieldAlert className="h-5 w-5 shrink-0" />
            <span>{msg}</span>
          </div>
        )}

        {/* 1. SELECT WORKER */}
        {step === 'select_worker' && (
          <div className="w-full h-full bg-[#0d1527] p-5 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl flex flex-col justify-between overflow-hidden">
            <div className="text-center pt-3 shrink-0">
              <div className="bg-emerald-500/10 p-5 rounded-3xl border border-emerald-500/20 w-fit mx-auto mb-3">
                <Users className="text-emerald-400 h-10 w-10"/>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white">Ажилтнаа сонгоно уу</h2>
              <p className="text-sm sm:text-base text-slate-400 mt-1 font-medium">Өөрийн нэр дээр товшиж ээлжиндээ нэвтэрнэ үү</p>
            </div>

            <div className="space-y-4 w-full my-auto overflow-y-auto max-h-[60vh] px-1">
              {workers.map(w => (
                <button 
                  key={w.id} 
                  onClick={() => { setSelectedWorker(w); setStep('pin_code'); }} 
                  className="bg-[#0b1329] hover:bg-slate-800 active:scale-95 border-2 border-slate-800 hover:border-emerald-500/50 p-5 rounded-2xl text-left transition-all shadow-lg flex justify-between items-center group w-full"
                >
                  <div>
                    <span className="text-xl sm:text-2xl font-black text-white uppercase block group-hover:text-emerald-400 transition">
                      {w.full_name || w.email.split('@')[0]}
                    </span>
                    <span className="text-sm font-black text-emerald-400 uppercase mt-1 block">
                      🏷️ {w.role}
                    </span>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl text-slate-500 group-hover:text-emerald-400 font-black text-sm">
                    ➔
                  </div>
                </button>
              ))}
            </div>

            <div className="text-center text-xs text-slate-500 pb-1 shrink-0">
              SF Kitchen Kiosk • Secure Operations
            </div>
          </div>
        )}

        {/* 2. PIN ДЭЛГЭЦ */}
        {step === 'pin_code' && (
          <div className="w-full h-full bg-[#0d1527] p-5 sm:p-7 rounded-3xl border border-slate-800 shadow-2xl flex flex-col justify-between items-center overflow-hidden touch-none">
            
            <div className="text-center w-full shrink-0 pt-2">
              <h2 className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight">PIN код оруулна уу</h2>
              <p className="text-sm sm:text-base text-slate-300 font-bold mt-1">Өөрийн хувийн нууц кодыг хийнэ үү</p>
              <div className="mt-2.5 inline-block bg-slate-950 px-5 py-2 rounded-2xl border border-slate-800">
                <span className="text-2xl text-emerald-300 font-black">
                  👤 {selectedWorker?.full_name || selectedWorker?.email.split('@')[0]} ({selectedWorker?.role})
                </span>
              </div>
            </div>

            {/* PIN Цэгүүд */}
            <div className="bg-[#060b17] border border-slate-800 rounded-2xl py-3.5 px-8 flex justify-center items-center gap-6 w-full max-w-[280px] my-2 shrink-0">
              {[0, 1, 2, 3].map((dotIndex) => (
                <div 
                  key={dotIndex} 
                  className={`h-5 w-5 rounded-full transition-all duration-75 ${
                    pin.length > dotIndex ? 'bg-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.9)] scale-125' : 'bg-slate-800'
                  }`}
                />
              ))}
            </div>

            {/* ⚡ АВАРГА ТОМ ТОД ТОВЧЛУУРУУД (text-5xl) */}
            <div className="grid grid-cols-3 gap-3.5 sm:gap-4 w-full flex-1 max-h-[58vh] my-2 px-1">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                <button 
                  key={num} 
                  type="button"
                  onPointerDown={(e) => { e.preventDefault(); handleKeypadPress(num); }}
                  className="w-full h-full min-h-[64px] bg-[#0b1329] hover:bg-slate-800 active:bg-slate-700 active:scale-95 border-2 border-slate-800/90 rounded-2xl text-4xl sm:text-8xl font-black text-white shadow-xl flex items-center justify-center select-none"
                >
                  {num}
                </button>
              ))}
              
              <button 
                type="button"
                onPointerDown={(e) => { e.preventDefault(); handleKeypadClear(); }}
                className="w-full h-full min-h-[64px] bg-[#2a0e1c] hover:bg-[#3d1429] active:scale-95 border-2 border-rose-900/40 text-rose-400 rounded-2xl text-xl sm:text-5xl font-black shadow-xl flex items-center justify-center select-none"
              >
                Clear
              </button>

              <button 
                type="button"
                onPointerDown={(e) => { e.preventDefault(); handleKeypadPress('0'); }}
                className="w-full h-full min-h-[64px] bg-[#0b1329] hover:bg-slate-800 active:bg-slate-700 active:scale-95 border-2 border-slate-800/90 rounded-2xl text-4xl sm:text-8xl font-black text-white shadow-xl flex items-center justify-center select-none"
              >
                0
              </button>

              <button 
                type="button"
                onPointerDown={(e) => { e.preventDefault(); handleVerifyPin(); }}
                className="w-full h-full min-h-[64px] bg-[#059669] hover:bg-emerald-500 active:scale-95 text-slate-950 rounded-2xl text-2xl sm:text-5xl font-black shadow-[0_0_25px_rgba(16,185,129,0.5)] flex items-center justify-center select-none"
              >
                OK
              </button>
            </div>

            {/* Доод заавар */}
            <div className="text-center space-y-1.5 w-full pt-1 shrink-0">
              <p className="text-xs sm:text-sm text-slate-400">💡 Анхдагч PIN: <strong className="text-white font-black">1234</strong></p>
              <button 
                onClick={() => { setStep('select_worker'); setPin(''); setMsg(''); }} 
                className="text-xl sm:text-xl text-slate-400 hover:text-white font-bold"
              >
                ← Буцах (Ажилтан солих)
              </button>
            </div>
          </div>
        )}

        {/* 3. MENU: ТОМ АГУУЛГАТАЙ БҮРЭН ДҮҮРЭН 3 КАРТ (ТОМОРСОН ТЕКСТТЭЙ) */}
        {step === 'menu' && (
          <div className="w-full h-full bg-[#0d1527] p-5 sm:p-7 rounded-3xl border border-slate-800 shadow-2xl flex flex-col justify-between overflow-hidden touch-none">
            
            <div className="text-center pt-2 shrink-0">
              <h2 className="text-2xl sm:text-3xl font-black text-white">Сайн байна уу?</h2>
              <p className="text-xl sm:text-2xl text-emerald-400 font-black mt-1 uppercase tracking-wide">
                {selectedWorker?.full_name || selectedWorker?.email.split('@')[0]}
              </p>
            </div>
            
            {/* 🌟 3 ТОМ КАРТ: text-2xl/text-3xl гарчигтай, text-base тайлбартай */}
            <div className="flex-1 flex flex-col justify-between gap-4 my-5 w-full">
              
              <button 
                onClick={() => setStep('ai_chat')} 
                className="flex-1 w-full min-h-[105px] p-5 sm:p-6 bg-blue-500/10 hover:bg-blue-500/20 active:scale-95 rounded-3xl flex items-center justify-between border-2 border-blue-500/30 transition shadow-xl text-left group"
              >
                <div className="flex items-center gap-5">
                  <div className="bg-blue-500/20 p-4 rounded-2xl border border-blue-500/30 shrink-0">
                    <MessageSquare className="h-10 w-10 sm:h-12 sm:w-12 text-blue-400" />
                  </div>
                  <div>
                    <p className="font-black text-2xl sm:text-3xl text-blue-400">Ухаалаг Туслах (AI)</p>
                    <p className="text-base sm:text-lg text-slate-200 mt-1 font-semibold leading-relaxed">
                      Хаягдал, орлого бичих & Баримтын зураг дарах
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-9 w-9 text-blue-400/50 group-hover:text-blue-400 transition shrink-0" />
              </button>

              <button 
                onClick={openTasksScreen} 
                className="flex-1 w-full min-h-[105px] p-5 sm:p-6 bg-purple-500/10 hover:bg-purple-500/20 active:scale-95 rounded-3xl flex items-center justify-between border-2 border-purple-500/30 transition shadow-xl text-left group"
              >
                <div className="flex items-center gap-5">
                  <div className="bg-purple-500/20 p-4 rounded-2xl border border-purple-500/30 shrink-0">
                    <CheckSquare className="h-10 w-10 sm:h-12 sm:w-12 text-purple-400" />
                  </div>
                  <div>
                    <p className="font-black text-2xl sm:text-3xl text-purple-400">Өнөөдрийн Даалгавар</p>
                    <p className="text-base sm:text-lg text-slate-200 mt-1 font-semibold leading-relaxed">
                      Цэвэрлэгээ болон ээлжийн үүргүүд
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-9 w-9 text-purple-400/50 group-hover:text-purple-400 transition shrink-0" />
              </button>

              <button 
                onClick={loadInventoryToCount} 
                className="flex-1 w-full min-h-[105px] p-5 sm:p-6 bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-95 rounded-3xl flex items-center justify-between border-2 border-emerald-500/30 transition shadow-xl text-left group"
              >
                <div className="flex items-center gap-5">
                  <div className="bg-emerald-500/20 p-4 rounded-2xl border border-emerald-500/30 shrink-0">
                    <ListOrdered className="h-10 w-10 sm:h-12 sm:w-12 text-emerald-400" />
                  </div>
                  <div>
                    <p className="font-black text-2xl sm:text-3xl text-emerald-400">Ээлж хаах (Тооллого)</p>
                    <p className="text-base sm:text-lg text-slate-200 mt-1 font-semibold leading-relaxed">
                      Өдрийн төгсгөлд бараа тоолж ээлж хаах
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-9 w-9 text-emerald-400/50 group-hover:text-emerald-400 transition shrink-0" />
              </button>

            </div>

            <div className="text-center text-xs text-slate-500 shrink-0 pb-1">
              Ээлжийн үйл ажиллагаа идэвхтэй байна
            </div>
          </div>
        )}

        {/* 4. AI CHAT INTERFACE */}
        {step === 'ai_chat' && (
          <KioskAiChatSection 
            selectedWorker={selectedWorker} 
            activeShift={activeShift} 
            onBack={() => setStep('menu')} 
          />
        )}

        {/* 5. TASKS */}
        {step === 'tasks' && (
          <div className="w-full h-full bg-[#0d1527] p-5 sm:p-7 rounded-3xl border border-slate-800 shadow-2xl flex flex-col justify-between overflow-hidden">
            <h2 className="text-2xl font-black text-purple-400 mb-3 flex items-center gap-2.5 shrink-0">
              <CheckSquare className="h-7 w-7" /> Өнөөдрийн Даалгавар
            </h2>

            {tasks.length === 0 ? (
              <p className="text-center text-slate-400 py-8 text-lg font-bold my-auto">Даалгавар алга байна.</p>
            ) : (
              <div className="space-y-3 py-2 flex-1 overflow-y-auto overscroll-contain pr-1">
                {tasks.map((t, idx) => (
                  <button
                    key={idx}
                    disabled={t.done}
                    onClick={() => completeTask(idx)}
                    className={`w-full p-5 rounded-2xl flex items-center justify-between border-2 transition active:scale-95 ${
                      t.done 
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 opacity-60' 
                        : 'bg-slate-950 hover:bg-slate-900 border-slate-800 text-white'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {t.done ? (
                        <CheckCircle className="h-7 w-7 text-emerald-400 shrink-0" />
                      ) : (
                        <div className="h-7 w-7 rounded-lg border-2 border-slate-600 shrink-0" />
                      )}
                      <span className="font-black text-base sm:text-lg text-left">{t.name}</span>
                    </div>
                    {t.done && <span className="text-sm font-black text-emerald-400 shrink-0">Хийсэн ✅</span>}
                  </button>
                ))}
              </div>
            )}

            <button 
              onClick={() => setStep('menu')} 
              className="w-full mt-3 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-white font-black py-12 rounded-2xl text-3xl transition shrink-0 active:scale-95"
            >
              ← Буцах
            </button>
          </div>
        )}

        {/* 6. CLOSE SHIFT / ТООЛЛОГО (ТОМОРСОН ТЕКСТ & ТОМ INPUT) */}
        {step === 'close_shift' && (
          <div className="w-full h-full bg-[#0d1527] p-5 sm:p-7 rounded-3xl border border-slate-800 shadow-2xl flex flex-col justify-between overflow-hidden">
            <div className="shrink-0 pb-2">
              <h2 className="text-2xl font-black text-emerald-400 mb-1 flex items-center gap-2.5">
                <ListOrdered className="h-7 w-7" /> Ээлжийн Тооллого
              </h2>
              <p className="text-sm text-slate-300 font-semibold">Хөргөгч/лангуун дахь бодит үлдэгдлийг тоолж бичнэ үү.</p>
            </div>
            
            <div className="space-y-3.5 py-2 flex-1 overflow-y-auto overscroll-contain pr-1">
              {inventoryToCount.map(item => (
                <div key={item.id} className="bg-slate-950 p-4 sm:p-5 rounded-2xl border border-slate-800 flex justify-between items-center gap-4">
                  <div>
                    <p className="font-black text-base sm:text-xl text-white">{item.name}</p>
                    <p className="text-xs sm:text-sm text-slate-400 mt-1 font-bold">
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
                    className="w-28 sm:w-36 h-14 bg-slate-900 px-4 rounded-2xl text-center text-white border-2 border-slate-700 font-black text-xl sm:text-2xl focus:border-emerald-500 outline-none shadow-inner" 
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-3 shrink-0">
              <button 
                type="button" 
                onClick={() => setStep('menu')} 
                className="flex-1 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 font-black py-12 rounded-2xl text-xl sm:text-3xl transition active:scale-95"
              >
                Буцах
              </button>
              <button 
                onClick={handleCloseShift} 
                disabled={isAiLoading || inventoryToCount.some(i => !counts[i.id])} 
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black py-12 rounded-2xl text-xl sm:text-3xl transition disabled:opacity-50 shadow-xl"
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