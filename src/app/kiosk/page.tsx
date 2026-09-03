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
// 🚀 KIOSK AI ЧАТ (УТАС БА IPAD-Д ТОХИРОМЖТОЙ, DESKTOP ДЭЭР ХУУЧНААРАА)
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
    <div className="w-full max-w-4xl mx-auto bg-slate-900/40 rounded-3xl border border-slate-900 flex flex-col h-[82dvh] md:h-[78vh] overflow-hidden">
      <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900 rounded-t-3xl">
        <h2 className="font-bold text-blue-400 flex items-center gap-2 text-sm md:text-base">
          <MessageSquare className="h-5 w-5"/> AI Бүртгэл
        </h2>
        <button onClick={onBack} className="bg-slate-950 px-3 py-1 rounded-lg text-xs md:text-sm font-bold border border-slate-800 hover:bg-slate-800 text-slate-300">
          Буцах
        </button>
      </div>
      
      {/* Chat History */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {chatHistory.length === 0 && (
          <p className="text-center text-slate-500 text-xs md:text-sm mt-8 md:mt-10 px-4 leading-relaxed">
            Энд энгийн үгээр бичих эсвэл баримтын зураг илгээж бүртгүүлнэ үү.<br/><br/>
            Жнь: "Сүү 500 мл асгарсан"
          </p>
        )}

        {chatHistory.map((msg, i) => (
          <div key={i} className={`flex ${msg.sender === 'worker' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[90%] md:max-w-[85%] p-3.5 md:p-4 rounded-2xl text-xs md:text-sm leading-relaxed ${
              msg.sender === 'worker' 
                ? 'bg-blue-600 text-white rounded-tr-none shadow-md font-medium' 
                : 'bg-slate-900 text-slate-200 rounded-tl-none border border-slate-800 shadow-xl overflow-x-auto'
            }`}>
              {msg.sender === 'worker' ? (
                msg.text
              ) : (
                <div className="prose prose-invert max-w-none text-xs md:text-sm leading-relaxed">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      table: ({ node, ...props }) => (
                        <table className="w-full my-2 border-collapse border border-slate-800 text-[11px] md:text-xs rounded-lg overflow-hidden" {...props} />
                      ),
                      thead: ({ node, ...props }) => (
                        <thead className="bg-slate-950 text-emerald-400 border-b border-slate-800 font-bold" {...props} />
                      ),
                      th: ({ node, ...props }) => (
                        <th className="border border-slate-800 px-2.5 py-1.5 text-left font-black" {...props} />
                      ),
                      td: ({ node, ...props }) => (
                        <td className="border border-slate-800/80 px-2.5 py-1.5 text-slate-300 font-medium" {...props} />
                      ),
                      h3: ({ node, ...props }) => (
                        <h3 className="text-xs md:text-sm font-black text-white mt-2 mb-1" {...props} />
                      ),
                      ul: ({ node, ...props }) => (
                        <ul className="list-disc list-inside space-y-1 my-1" {...props} />
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
                  className="mt-3 w-full bg-slate-950 border border-slate-700 hover:bg-rose-500/20 hover:text-rose-400 py-2 rounded-lg font-bold text-xs transition"
                >
                  Буцаах ↩️ (Undo)
                </button>
              )}
            </div>
          </div>
        ))}
        {isAiLoading && <div className="text-slate-500 text-xs md:text-sm animate-pulse">AI бодож байна...</div>}
      </div>

      {/* Input Area */}
      <div className="p-3 md:p-4 bg-slate-900 rounded-b-3xl border-t border-slate-800 flex gap-2 items-center">
        <input 
          type="file" 
          accept="image/*" 
          capture="environment" 
          id="kiosk-ai-camera" 
          className="hidden" 
          onChange={(e) => { if(e.target.files && e.target.files[0]) handleAiChatSubmit(undefined, e.target.files[0]); }}
        />
        <label htmlFor="kiosk-ai-camera" className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-3 rounded-xl cursor-pointer transition shrink-0">
          <Camera className="h-5 w-5" />
        </label>

        <form onSubmit={handleAiChatSubmit} className="flex-1 flex gap-2">
          <input 
            type="text" 
            value={chatInput} 
            onChange={e => setChatInput(e.target.value)} 
            placeholder="Бичих..." 
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 text-sm font-medium" 
          />
          <button 
            type="submit" 
            disabled={isAiLoading || !chatInput.trim()} 
            className="bg-blue-500 text-white p-3 rounded-xl disabled:opacity-50 transition shrink-0"
          >
            <Send className="h-4 w-4"/>
          </button>
        </form>
      </div>
    </div>
  );
}

// =========================================================================
// 📱 ҮНДСЭН KIOSK ДЭЛГЭЦ (DESKTOP ДЭЭР ХУУЧНААРАА, УТСАН ДЭЭР ӨРГӨН ТОМ)
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
      .slice(0, 5);
    
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

    const ownerMsg = `👑 **ЭЗЭНД ЗОРИУЛСАН ТАЙЛАН (Kiosk)**\n\n🏢 **Салбар:** ${selectedWorker.client_id}\n👤 **Ажилтан:** ${activeShift.character_role}\n📦 **Тоолсон бараа:** ${inventoryToCount.length} ш\n\n✅ Kiosk-оос ээлжээ амжилттай хаалаа.`;
    
    await fetch('/api/notify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantClientId: selectedWorker.client_id, message: ownerMsg })
    });

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
    <div className="min-h-[100dvh] bg-slate-950 text-slate-100 flex flex-col p-3 md:p-6 select-none touch-manipulation">
      
      {/* 🔝 HEADER */}
      <header className="flex justify-between items-center border-b border-slate-900 pb-3 md:pb-4 mb-3 md:mb-6 w-full max-w-4xl mx-auto shrink-0">
        <div className="flex items-center gap-2.5 md:gap-3">
          <Coffee className="h-6 w-6 md:h-8 md:w-8 text-emerald-400" />
          <div>
            <h1 className="text-sm md:text-xl font-black">SF KITCHEN KIOSK</h1>
            <p className="text-[10px] md:text-xs text-slate-500 uppercase font-bold">Smart AI Mode</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => router.push('/dashboard')} 
            className="text-slate-400 hover:text-white text-xs md:text-sm font-bold bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 active:scale-95 transition"
          >
            🔒 Dashboard
          </button>

          {selectedWorker && (
            <button 
              onClick={() => { setSelectedWorker(null); setStep('select_worker'); setMsg(''); }} 
              className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 px-3 md:px-4 py-1.5 md:py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 active:scale-95 transition"
            >
              <LogOut className="h-3.5 w-3.5 md:h-4 md:w-4" /> Гарах
            </button>
          )}
        </div>
      </header>

      {/* 🚀 ҮНДСЭН ДЭЛГЭЦ */}
      <main className="flex-1 flex flex-col items-center justify-center w-full max-w-4xl mx-auto px-1">
        
        {msg && (
          <div className="bg-rose-500/10 text-rose-400 p-3.5 md:p-4 rounded-2xl mb-4 w-full max-w-md text-center font-bold text-xs md:text-sm border border-rose-500/20 animate-pulse flex items-center justify-center gap-2">
            <ShieldAlert className="h-5 w-5 shrink-0" />
            <span>{msg}</span>
          </div>
        )}

        {/* 1. SELECT WORKER (DESKTOP: max-w-2xl 2-cols хуучнаараа | MOBILE: Өргөн) */}
        {step === 'select_worker' && (
          <div className="w-full max-w-xl md:max-w-2xl text-center my-auto">
            <h2 className="text-xl md:text-2xl font-black mb-6 md:mb-8 flex items-center justify-center gap-2 text-white">
              <Users className="text-emerald-400"/> Ажилтнаа сонгоно уу
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 w-full">
              {workers.map(w => (
                <button 
                  key={w.id} 
                  onClick={() => { setSelectedWorker(w); setStep('pin_code'); }} 
                  className="bg-slate-900/50 hover:bg-slate-900 active:scale-95 border border-slate-900 p-5 md:p-6 rounded-2xl text-left transition-all shadow-md flex justify-between items-center"
                >
                  <div>
                    <span className="text-base md:text-lg font-bold uppercase block text-white">
                      {w.full_name || w.email.split('@')[0]}
                    </span>
                    <span className="text-xs text-emerald-400 font-bold uppercase mt-0.5 block">
                      {w.role}
                    </span>
                  </div>
                  <span className="text-slate-600 font-bold text-xs md:hidden">➔</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 2. PIN ДЭЛГЭЦ (DESKTOP: max-w-sm p-8 хуучнаараа | MOBILE: Өргөн) */}
        {step === 'pin_code' && (
          <div className="w-full max-w-xs md:max-w-sm bg-slate-900/40 p-5 md:p-8 rounded-3xl text-center border border-slate-900 my-auto shadow-2xl">
            <h2 className="text-base md:text-lg font-bold mb-1 text-emerald-400">
              {selectedWorker?.pin_code ? "PIN код оруулна уу" : "✨ Шинэ 4 оронтой PIN зохионо уу"}
            </h2>
            <p className="text-xs text-slate-500 mb-4 md:mb-6">
              {selectedWorker?.pin_code ? "Өөрийн хувийн нууц кодыг хийнэ үү" : "Энэ код цаашид таны ээлжинд нэвтрэх нууц код болно"}
            </p>

            <div className="bg-slate-950 p-3.5 md:p-4 rounded-2xl text-2xl md:text-3xl tracking-widest font-black mb-5 md:mb-6">
              {pin ? pin.replace(/./g, '•') : <span className="text-slate-700">••••</span>}
            </div>

            <div className="grid grid-cols-3 gap-2.5 md:gap-4 w-full">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                <button 
                  key={num} 
                  onClick={() => setPin(p => p.length < 4 ? p + num : p)} 
                  className="h-14 md:h-auto md:py-4 bg-slate-950 hover:bg-slate-900 active:bg-slate-800 active:scale-95 rounded-xl text-xl md:text-xl font-black text-white transition flex items-center justify-center border border-slate-900"
                >
                  {num}
                </button>
              ))}
              <button 
                onClick={() => setPin('')} 
                className="h-14 md:h-auto md:py-4 bg-rose-500/10 hover:bg-rose-500/20 active:scale-95 text-rose-400 rounded-xl text-xs md:text-xs font-bold transition flex items-center justify-center border border-rose-500/20"
              >
                Clear
              </button>
              <button 
                onClick={() => setPin(p => p.length < 4 ? p + '0' : p)} 
                className="h-14 md:h-auto md:py-4 bg-slate-950 hover:bg-slate-900 active:bg-slate-800 active:scale-95 rounded-xl text-xl md:text-xl font-black text-white transition flex items-center justify-center border border-slate-900"
              >
                0
              </button>
              <button 
                onClick={handleVerifyPin} 
                className="h-14 md:h-auto md:py-4 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 rounded-xl text-sm md:text-sm font-black transition shadow-lg flex items-center justify-center"
              >
                ОК
              </button>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-900/80 flex flex-col gap-1.5">
              {selectedWorker?.pin_code && (
                <p className="text-[11px] text-slate-500">
                  💡 Кодоо мартсан бол өөрийн Dashboard руу орж харна уу.
                </p>
              )}
              <button onClick={() => { setStep('select_worker'); setPin(''); setMsg(''); }} className="text-xs text-slate-400 hover:text-white font-bold py-1">
                ← Буцах (Ажилтан солих)
              </button>
            </div>
          </div>
        )}

        {/* 3. MENU (DESKTOP: max-w-md p-6 хуучнаараа) */}
        {step === 'menu' && (
          <div className="w-full max-w-md space-y-3.5 md:space-y-4 my-auto">
            <h2 className="text-xl md:text-2xl font-black mb-5 md:mb-6 text-white text-center">
              Сайн байна уу, {selectedWorker?.full_name || selectedWorker?.email.split('@')[0]}?
            </h2>
            
            <button 
              onClick={() => setStep('ai_chat')} 
              className="w-full bg-blue-500/10 p-5 md:p-6 rounded-2xl flex items-center gap-4 hover:bg-blue-500/20 active:scale-95 border border-blue-500/30 transition text-left"
            >
              <MessageSquare className="h-7 w-7 md:h-8 md:w-8 text-blue-400 shrink-0" />
              <div>
                <p className="font-bold text-base md:text-lg text-blue-400">Ухаалаг Туслах (AI)</p>
                <p className="text-xs text-blue-500/70 mt-0.5">Хаягдал, орлого бичих & Зураг дарах</p>
              </div>
            </button>

            <button 
              onClick={openTasksScreen} 
              className="w-full bg-slate-900/80 p-5 md:p-6 rounded-2xl flex items-center gap-4 hover:bg-slate-900 active:scale-95 border border-slate-800 transition text-left"
            >
              <CheckSquare className="h-7 w-7 md:h-8 md:w-8 text-purple-400 shrink-0" />
              <div>
                <p className="font-bold text-base md:text-lg text-white">Өнөөдрийн Даалгавар</p>
                <p className="text-xs text-slate-400 mt-0.5">Цэвэрлэгээ болон бусад үүрэг</p>
              </div>
            </button>

            <button 
              onClick={loadInventoryToCount} 
              className="w-full bg-emerald-500/10 border border-emerald-500/20 p-5 md:p-6 rounded-2xl flex items-center gap-4 hover:bg-emerald-500/20 active:scale-95 transition text-left"
            >
              <ListOrdered className="h-7 w-7 md:h-8 md:w-8 text-emerald-400 shrink-0" />
              <div>
                <p className="font-bold text-base md:text-lg text-emerald-400">Ээлж хаах (Тооллого)</p>
                <p className="text-xs text-emerald-500/70 mt-0.5">Өдрийн төгсгөлд хийнэ</p>
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

        {/* 5. TASKS (DESKTOP: max-w-md p-6 хуучнаараа) */}
        {step === 'tasks' && (
          <div className="w-full max-w-md bg-slate-900/40 p-4 md:p-6 rounded-3xl border border-slate-900 my-auto">
            <h2 className="font-bold text-purple-400 mb-4 md:mb-6 flex items-center gap-2 text-base md:text-lg">
              <CheckSquare className="h-5 w-5"/> Өнөөдрийн Даалгавар
            </h2>

            {tasks.length === 0 ? (
              <p className="text-center text-slate-500 py-6 text-sm">Даалгавар алга байна.</p>
            ) : tasks.every(t => t.done) ? (
              <div className="text-center py-6 md:py-8 space-y-2.5 bg-slate-950/60 rounded-2xl border border-slate-800 p-5">
                <CheckCircle className="h-10 w-10 md:h-12 md:w-12 text-emerald-400 mx-auto" />
                <p className="font-black text-base md:text-lg text-white">Бүх даалгавар биелсэн!</p>
                <p className="text-xs text-slate-400">Танд одоогоор хийх үлдсэн ажил байхгүй байна.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                {tasks.map((t, idx) => (
                  <button
                    key={idx}
                    disabled={t.done}
                    onClick={() => completeTask(idx)}
                    className={`w-full p-3.5 md:p-4 rounded-xl flex items-center justify-between border transition active:scale-95 ${
                      t.done 
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 opacity-60 cursor-not-allowed' 
                        : 'bg-slate-950 hover:bg-slate-900 border-slate-800 text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {t.done ? <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" /> : <div className="h-5 w-5 rounded border-2 border-slate-600 shrink-0" />}
                      <span className="font-bold text-xs md:text-sm text-left">{t.name}</span>
                    </div>
                    {t.done && <span className="text-[11px] font-bold text-emerald-400 shrink-0">Хийгдсэн ✅</span>}
                  </button>
                ))}
              </div>
            )}

            <button onClick={() => setStep('menu')} className="w-full mt-5 bg-slate-950 hover:bg-slate-900 py-3 rounded-xl font-bold border border-slate-800 text-white text-xs md:text-sm transition">
              Буцах
            </button>
          </div>
        )}

        {/* 6. CLOSE SHIFT (DESKTOP: max-w-md p-6 хуучнаараа) */}
        {step === 'close_shift' && (
          <div className="w-full max-w-md bg-slate-900/40 p-4 md:p-6 rounded-3xl border border-slate-900 my-auto">
            <h2 className="font-bold text-emerald-400 mb-1 flex items-center gap-2 text-base md:text-lg">
              <ListOrdered className="h-5 w-5"/> Ээлжийн Тооллого
            </h2>
            <p className="text-xs text-slate-500 mb-4 md:mb-5">Доорх барааны бодит үлдэгдлийг тоолж бичнэ үү.</p>
            
            <div className="space-y-2.5 max-h-[48vh] overflow-y-auto pr-1">
              {inventoryToCount.map(item => (
                <div key={item.id} className="bg-slate-950 p-3.5 md:p-4 rounded-xl border border-slate-800 flex justify-between items-center gap-3">
                  <div>
                    <p className="font-bold text-xs md:text-sm text-white">{item.name}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
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
                    className="w-24 md:w-24 bg-slate-900 p-2 rounded-lg text-center text-white border border-slate-700 outline-none font-bold text-sm md:text-sm" 
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-2.5 mt-5">
              <button type="button" onClick={() => setStep('menu')} className="flex-1 bg-slate-950 py-3 rounded-xl font-bold border border-slate-800 text-xs md:text-sm">Буцах</button>
              <button onClick={handleCloseShift} disabled={isAiLoading || inventoryToCount.some(i => !counts[i.id])} className="flex-1 bg-emerald-500 text-slate-950 font-bold py-3 rounded-xl disabled:opacity-50 text-xs md:text-sm">
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