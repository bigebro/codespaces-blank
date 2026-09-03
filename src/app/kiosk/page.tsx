"use client";
import dynamic from 'next/dynamic';
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Coffee, CheckCircle, Users, LogOut, Camera, 
  MessageSquare, CheckSquare, ListOrdered, Send, ArrowLeft, ShieldAlert
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useRouter } from 'next/navigation';

// =========================================================================
// 🚀 KIOSK AI ЧАТ (ТОМ ТОД ТЕКСТ, ТОМ INPUT, ТОМ КАМЕР БҮХИЙ ХЭСЭГ)
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
    setChatInput('');

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
    <div className="w-full max-w-2xl mx-auto h-[82vh] sm:h-[85vh] flex flex-col bg-[#0d1527] rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
      {/* Чат толгой */}
      <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900 shrink-0">
        <h2 className="font-black text-blue-400 flex items-center gap-2.5 text-lg sm:text-xl">
          <MessageSquare className="h-6 w-6 sm:h-7 sm:w-7"/> AI Туслах & Бүртгэл
        </h2>
        <button onClick={onBack} className="bg-slate-950 px-4 py-2 rounded-xl text-sm font-bold border border-slate-800 hover:bg-slate-800 text-slate-300 active:scale-95">
          ← Буцах
        </button>
      </div>
      
      {/* Мессежүүд (ТОМ, ТОД 16-18PX ТЕКСТ) */}
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
        {chatHistory.length === 0 && (
          <div className="text-center text-slate-400 text-base sm:text-lg mt-8 sm:mt-16 space-y-3 max-w-md mx-auto">
            <div className="bg-blue-500/10 p-4 rounded-2xl border border-blue-500/20 w-fit mx-auto">
              <Camera className="h-10 w-10 text-blue-400" />
            </div>
            <p className="font-black text-white text-lg sm:text-xl">Гал тогооны ухаалаг туслах</p>
            <p className="text-sm text-slate-400 leading-relaxed">
              Баримтын зураг дарж оруулах эсвэл хаягдал зарлагаа бичнэ үү.<br />
              (Жишээ: "500 мл сүү асгарсан", "Хоолонд 2 өндөг орлоо")
            </p>
          </div>
        )}

        {chatHistory.map((msg, i) => (
          <div key={i} className={`flex ${msg.sender === 'worker' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[88%] sm:max-w-[80%] p-4 sm:p-5 rounded-2xl text-base sm:text-lg leading-relaxed ${
              msg.sender === 'worker' 
                ? 'bg-blue-600 text-white rounded-tr-none shadow-md font-semibold' 
                : 'bg-slate-900 text-slate-100 rounded-tl-none border border-slate-800 shadow-xl overflow-x-auto'
            }`}>
              {msg.sender === 'worker' ? (
                msg.text
              ) : (
                <div className="prose prose-invert max-w-none text-base sm:text-lg leading-relaxed">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      table: ({ node, ...props }) => (
                        <table className="w-full my-3 border-collapse border border-slate-800 text-sm sm:text-base rounded-xl overflow-hidden" {...props} />
                      ),
                      thead: ({ node, ...props }) => (
                        <thead className="bg-slate-950 text-emerald-400 border-b border-slate-800 font-bold" {...props} />
                      ),
                      th: ({ node, ...props }) => (
                        <th className="border border-slate-800 px-3 py-2.5 text-left font-black" {...props} />
                      ),
                      td: ({ node, ...props }) => (
                        <td className="border border-slate-800/80 px-3 py-2 text-slate-200 font-medium" {...props} />
                      ),
                      h3: ({ node, ...props }) => (
                        <h3 className="text-lg sm:text-xl font-black text-white mt-3 mb-1.5" {...props} />
                      ),
                      ul: ({ node, ...props }) => (
                        <ul className="list-disc list-inside space-y-1.5 my-2" {...props} />
                      ),
                      li: ({ node, ...props }) => (
                        <li className="text-base sm:text-lg" {...props} />
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
                  className="mt-3 w-full bg-slate-950 border border-slate-700 hover:bg-rose-500/20 hover:text-rose-400 py-3 rounded-xl font-bold text-sm transition"
                >
                  Буцаах ↩️ (Undo)
                </button>
              )}
            </div>
          </div>
        ))}
        {isAiLoading && <div className="text-blue-400 text-base animate-pulse font-bold">AI бодож байна...</div>}
      </div>

      {/* Input хэсэг (ТОМ КАМЕР БА ӨРГӨН ТАЛБАР) */}
      <div className="p-4 bg-slate-900 border-t border-slate-800 flex gap-3 items-center shrink-0">
        <input 
          type="file" 
          accept="image/*" 
          capture="environment" 
          id="kiosk-ai-camera" 
          className="hidden" 
          onChange={(e) => { if(e.target.files && e.target.files[0]) handleAiChatSubmit(undefined, e.target.files[0]); }}
        />
        <label htmlFor="kiosk-ai-camera" className="h-14 w-14 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 rounded-2xl cursor-pointer transition flex items-center justify-center shrink-0 shadow-md">
          <Camera className="h-7 w-7 text-emerald-400" />
        </label>

        <form onSubmit={handleAiChatSubmit} className="flex-1 flex gap-2">
          <input 
            type="text" 
            value={chatInput} 
            onChange={e => setChatInput(e.target.value)} 
            placeholder="Энд бичих..." 
            className="flex-1 h-14 bg-slate-950 border border-slate-800 rounded-2xl px-5 text-white focus:outline-none focus:border-blue-500 text-base sm:text-lg font-medium" 
          />
          <button 
            type="submit" 
            disabled={isAiLoading || !chatInput.trim()} 
            className="h-14 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white px-6 rounded-2xl disabled:opacity-50 transition font-black flex items-center justify-center shrink-0"
          >
            <Send className="h-6 w-6"/>
          </button>
        </form>
      </div>
    </div>
  );
}

// =========================================================================
// 📱 ҮНДСЭН KIOSK ДЭЛГЭЦ (ТОМ ТОВЧЛУУР, ТОД ҮСЭГ, САМСУНГ S20 БА IPAD-Д ТӨГС)
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
      setMsg("❌ Буруу PIN код! Мартсан бол өөрийн утсаар Dashboard руу орж одоогийн PIN-ээ харна уу.");
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
    <div className="min-h-[100dvh] bg-[#070b14] text-slate-100 flex flex-col justify-between p-3 sm:p-6 select-none touch-manipulation">
      
      {/* 🔝 HEADER */}
      <header className="flex justify-between items-center border-b border-slate-800/80 pb-3 mb-3 max-w-md sm:max-w-xl mx-auto w-full shrink-0">
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
            className="text-slate-400 hover:text-white text-xs sm:text-sm font-bold bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-800 active:scale-95 transition flex items-center gap-1"
          >
            🔒 Dashboard
          </button>

          {selectedWorker && (
            <button 
              onClick={() => { setSelectedWorker(null); setStep('select_worker'); setMsg(''); }} 
              className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1 active:scale-95 transition"
            >
              <LogOut className="h-4 w-4" /> Гарах
            </button>
          )}
        </div>
      </header>

      {/* 🚀 ҮНДСЭН ДЭЛГЭЦҮҮД (ТОМ ХУРУУНЫ ТОЧНОСТ БҮХИЙ КАРТУУД) */}
      <main className="flex-1 flex flex-col items-center justify-center w-full max-w-md sm:max-w-xl mx-auto py-1">
        
        {msg && (
          <div className="bg-rose-500/10 text-rose-400 p-4 rounded-2xl mb-3 w-full text-center font-bold text-sm border border-rose-500/20 animate-pulse flex items-center justify-center gap-2 shrink-0">
            <ShieldAlert className="h-5 w-5 shrink-0" />
            <span>{msg}</span>
          </div>
        )}

        {/* 1. SELECT WORKER */}
        {step === 'select_worker' && (
          <div className="w-full bg-[#0d1527]/95 p-6 sm:p-8 rounded-[2rem] border border-slate-800/80 shadow-2xl my-auto text-center">
            <div className="bg-emerald-500/10 p-3.5 rounded-2xl border border-emerald-500/20 w-fit mx-auto mb-3">
              <Users className="text-emerald-400 h-7 w-7"/>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white">Ажилтнаа сонгоно уу</h2>
            <p className="text-sm text-slate-400 mt-1 mb-6">Өөрийн нэр дээр товшиж ээлжиндээ нэвтэрнэ үү</p>

            <div className="space-y-3.5 w-full">
              {workers.map(w => (
                <button 
                  key={w.id} 
                  onClick={() => { setSelectedWorker(w); setStep('pin_code'); }} 
                  className="bg-[#0b1329] hover:bg-slate-800 active:scale-95 border border-slate-800 p-5 rounded-2xl text-left transition-all shadow-md flex justify-between items-center group w-full"
                >
                  <div>
                    <span className="text-lg sm:text-xl font-black text-white uppercase block group-hover:text-emerald-400 transition">
                      {w.full_name || w.email.split('@')[0]}
                    </span>
                    <span className="text-xs sm:text-sm text-emerald-400 font-bold uppercase mt-1 block">
                      🏷️ {w.role}
                    </span>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl text-slate-500 group-hover:text-emerald-400 font-black text-sm">
                    ➔
                  </div>
                </button>
              ))}
            </div>

            <div className="text-center text-xs text-slate-500 pt-6">
              SF Kitchen Kiosk • Secure Touch Interface
            </div>
          </div>
        )}

        {/* 2. PIN ДЭЛГЭЦ (ТОМ ТОВЧЛУУРУУД: 72PX ӨНДӨР, 36PX ҮСЭГ) */}
        {step === 'pin_code' && (
          <div className="w-full bg-[#0d1527]/95 p-6 sm:p-8 rounded-[2rem] border border-slate-800/80 shadow-2xl my-auto flex flex-col items-center">
            
            {/* Гарчиг */}
            <div className="text-center mb-4">
              <h2 className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight">PIN код оруулна уу</h2>
              <p className="text-sm text-slate-300 font-medium mt-1">
                Өөрийн хувийн нууц кодыг хийнэ үү
              </p>
              <div className="mt-2 inline-block bg-slate-950 px-4 py-1.5 rounded-xl border border-slate-800">
                <span className="text-sm text-emerald-300 font-bold">
                  👤 {selectedWorker?.full_name || selectedWorker?.email.split('@')[0]} ({selectedWorker?.role})
                </span>
              </div>
            </div>

            {/* PIN Dots (Том, тод ногоон цэгүүд) */}
            <div className="bg-[#060b17] border border-slate-800/90 rounded-2xl py-4 px-8 flex justify-center items-center gap-5 w-full max-w-[280px] mb-6">
              {[0, 1, 2, 3].map((dotIndex) => (
                <div 
                  key={dotIndex} 
                  className={`h-4.5 w-4.5 rounded-full transition-all duration-150 ${
                    pin.length > dotIndex 
                      ? 'bg-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.8)] scale-125' 
                      : 'bg-slate-800'
                  }`}
                />
              ))}
            </div>

            {/* Keypad Grid (ТОМ 72PX ӨНДӨРТЭЙ, 36PX ЦИФРҮҮД) */}
            <div className="grid grid-cols-3 gap-3.5 w-full max-w-[340px] mb-5">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                <button 
                  key={num} 
                  onClick={() => setPin(p => p.length < 4 ? p + num : p)} 
                  className="h-18 sm:h-20 bg-[#0b1329] hover:bg-slate-800 active:bg-slate-700 active:scale-95 border border-slate-800/80 rounded-2xl text-3xl sm:text-4xl font-black text-white transition-all shadow-lg flex items-center justify-center"
                >
                  {num}
                </button>
              ))}
              
              {/* CLEAR */}
              <button 
                onClick={() => setPin('')} 
                className="h-18 sm:h-20 bg-[#2a0e1c] hover:bg-[#3d1429] active:scale-95 border border-rose-900/40 text-rose-400 rounded-2xl text-base sm:text-lg font-black transition-all flex items-center justify-center"
              >
                Clear
              </button>

              {/* 0 */}
              <button 
                onClick={() => setPin(p => p.length < 4 ? p + '0' : p)} 
                className="h-18 sm:h-20 bg-[#0b1329] hover:bg-slate-800 active:bg-slate-700 active:scale-95 border border-slate-800/80 rounded-2xl text-3xl sm:text-4xl font-black text-white transition-all shadow-lg flex items-center justify-center"
              >
                0
              </button>

              {/* OK */}
              <button 
                onClick={handleVerifyPin} 
                className="h-18 sm:h-20 bg-[#059669] hover:bg-emerald-500 active:scale-95 text-slate-950 rounded-2xl text-lg sm:text-xl font-black transition-all shadow-[0_0_20px_rgba(16,185,129,0.5)] flex items-center justify-center"
              >
                OK
              </button>
            </div>

            {/* Доод заавар */}
            <div className="text-center space-y-2 w-full pt-1">
              <p className="text-xs text-slate-400 leading-relaxed">
                💡 Анхдагч PIN код: <strong className="text-white">1234</strong><br />
                (Хэрэв мартсан бол өөрийн Dashboard руу орж харна уу)
              </p>
              <button 
                onClick={() => { setStep('select_worker'); setPin(''); setMsg(''); }} 
                className="text-sm text-slate-400 hover:text-white font-bold flex items-center justify-center gap-1 mx-auto pt-1"
              >
                ← Буцах (Ажилтан солих)
              </button>
            </div>
          </div>
        )}

        {/* 3. MENU (ТОМ, ӨНГӨЛӨГ КАРТУУД) */}
        {step === 'menu' && (
          <div className="w-full bg-[#0d1527]/95 p-6 sm:p-8 rounded-[2rem] border border-slate-800/80 shadow-2xl my-auto space-y-4">
            <div className="text-center mb-5">
              <h2 className="text-2xl sm:text-3xl font-black text-white">Сайн байна уу?</h2>
              <p className="text-sm sm:text-base text-emerald-400 font-bold mt-0.5 uppercase">
                {selectedWorker?.full_name || selectedWorker?.email.split('@')[0]}
              </p>
            </div>
            
            <button 
              onClick={() => setStep('ai_chat')} 
              className="w-full bg-blue-500/10 hover:bg-blue-500/20 active:scale-95 p-5 sm:p-6 rounded-2xl flex items-center gap-4 sm:gap-5 border border-blue-500/30 transition shadow-lg text-left"
            >
              <div className="bg-blue-500/20 p-4 rounded-2xl border border-blue-500/30 shrink-0">
                <MessageSquare className="h-8 w-8 text-blue-400" />
              </div>
              <div>
                <p className="font-black text-lg sm:text-xl text-blue-400">Ухаалаг Туслах (AI)</p>
                <p className="text-xs sm:text-sm text-slate-300 mt-1">Зарлага бичих & Баримтын зураг дарах</p>
              </div>
            </button>

            <button 
              onClick={openTasksScreen} 
              className="w-full bg-purple-500/10 hover:bg-purple-500/20 active:scale-95 p-5 sm:p-6 rounded-2xl flex items-center gap-4 sm:gap-5 border border-purple-500/30 transition shadow-lg text-left"
            >
              <div className="bg-purple-500/20 p-4 rounded-2xl border border-purple-500/30 shrink-0">
                <CheckSquare className="h-8 w-8 text-purple-400" />
              </div>
              <div>
                <p className="font-black text-lg sm:text-xl text-purple-400">Өнөөдрийн Даалгавар</p>
                <p className="text-xs sm:text-sm text-slate-300 mt-1">Цэвэрлэгээ, тохиргоо болон үүргүүд</p>
              </div>
            </button>

            <button 
              onClick={loadInventoryToCount} 
              className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-95 p-5 sm:p-6 rounded-2xl flex items-center gap-4 sm:gap-5 border border-emerald-500/30 transition shadow-lg text-left"
            >
              <div className="bg-emerald-500/20 p-4 rounded-2xl border border-emerald-500/30 shrink-0">
                <ListOrdered className="h-8 w-8 text-emerald-400" />
              </div>
              <div>
                <p className="font-black text-lg sm:text-xl text-emerald-400">Ээлж хаах (Тооллого)</p>
                <p className="text-xs sm:text-sm text-slate-300 mt-1">Өдрийн төгсгөлд бараа тоолох</p>
              </div>
            </button>
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
          <div className="w-full bg-[#0d1527]/95 p-6 sm:p-8 rounded-[2rem] border border-slate-800/80 shadow-2xl my-auto">
            <h2 className="text-xl sm:text-2xl font-black text-purple-400 mb-4 flex items-center gap-2.5">
              <CheckSquare className="h-6 w-6" /> Өнөөдрийн Даалгавар
            </h2>

            {tasks.length === 0 ? (
              <p className="text-center text-slate-400 py-8 text-base">Даалгавар алга байна.</p>
            ) : tasks.every(t => t.done) ? (
              <div className="text-center py-8 space-y-2 bg-slate-950/60 rounded-2xl border border-slate-800 p-5">
                <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto" />
                <p className="font-black text-lg text-white">Бүх даалгавар биелсэн!</p>
                <p className="text-sm text-slate-400">Танд хийх үлдсэн ажил байхгүй байна.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                {tasks.map((t, idx) => (
                  <button
                    key={idx}
                    disabled={t.done}
                    onClick={() => completeTask(idx)}
                    className={`w-full p-4 sm:p-5 rounded-2xl flex items-center justify-between border transition active:scale-95 ${
                      t.done 
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 opacity-60 cursor-not-allowed' 
                        : 'bg-slate-950 hover:bg-slate-900 border-slate-800 text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      {t.done ? (
                        <CheckCircle className="h-6 w-6 text-emerald-400 shrink-0" />
                      ) : (
                        <div className="h-6 w-6 rounded-lg border-2 border-slate-600 shrink-0" />
                      )}
                      <span className="font-bold text-sm sm:text-base text-left">{t.name}</span>
                    </div>
                    {t.done && <span className="text-xs font-black text-emerald-400 shrink-0">Хийсэн ✅</span>}
                  </button>
                ))}
              </div>
            )}

            <button 
              onClick={() => setStep('menu')} 
              className="w-full mt-5 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-white font-bold py-3.5 rounded-xl text-sm transition"
            >
              ← Буцах
            </button>
          </div>
        )}

        {/* 6. CLOSE SHIFT */}
        {step === 'close_shift' && (
          <div className="w-full bg-[#0d1527]/95 p-6 sm:p-8 rounded-[2rem] border border-slate-800/80 shadow-2xl my-auto">
            <h2 className="text-xl sm:text-2xl font-black text-emerald-400 mb-1 flex items-center gap-2">
              <ListOrdered className="h-6 w-6" /> Ээлжийн Тооллого
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mb-4">Хөргөгч/лангуун дахь бодит үлдэгдлийг тоолж бичнэ үү.</p>
            
            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
              {inventoryToCount.map(item => (
                <div key={item.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex justify-between items-center gap-3">
                  <div>
                    <p className="font-black text-sm sm:text-base text-white">{item.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
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
                    className="w-28 bg-slate-900 px-3 py-2 rounded-lg text-center text-white border border-slate-700 font-black text-base focus:border-emerald-500 outline-none" 
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-5">
              <button 
                type="button" 
                onClick={() => setStep('menu')} 
                className="flex-1 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 font-bold py-3.5 rounded-xl text-sm transition"
              >
                Буцах
              </button>
              <button 
                onClick={handleCloseShift} 
                disabled={isAiLoading || inventoryToCount.some(i => !counts[i.id])} 
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black py-3.5 rounded-xl text-sm transition disabled:opacity-50 shadow-lg"
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