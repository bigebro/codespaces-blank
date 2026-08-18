"use client";
import dynamic from 'next/dynamic';
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Coffee, CheckCircle, Users, LogOut, Camera, Trash2, Key, MessageSquare, CheckSquare, ListOrdered, Send } from 'lucide-react';

const SUPABASE_URL = "https://fcpwvualdbuakrwmqgmg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjcHd2dWFsZGJ1YWtyd21xZ21nIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDE4MDQzOCwiZXhwIjoyMDk5NzU2NDM4fQ.iDX_3sL-Sk1Z5oK2zSvW32saZBoY5f5f4XBu_dTQA-U";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

 function KioskPage() {
  const [step, setStep] = useState<'select_worker' | 'pin_code' | 'menu' | 'ai_chat' | 'tasks' | 'close_shift'>('select_worker');
  const [workers, setWorkers] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<any>(null);
  const [pin, setPin] = useState('');
  const [activeShift, setActiveShift] = useState<any>(null);
  const [msg, setMsg] = useState('');

  // States for AI Chat
  const [chatInput, setChatInput] = useState('');
// Replace your current chatHistory state with this:
  const [chatHistory, setChatHistory] = useState<{sender: 'worker'|'ai', text: string, logId?: string}[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // States for Tasks & Inventory
  const [tasks, setTasks] = useState<any[]>([]);
  const [inventoryToCount, setInventoryToCount] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, string>>({});

  useEffect(() => { fetchKioskData(); }, []);

  const fetchKioskData = async () => {
    const { data: profiles } = await supabase.from('profiles').select('*').neq('role', 'owner');
    if (profiles) setWorkers(profiles);
    const { data: ingData } = await supabase.from('ingredients').select('*').order('name', { ascending: true });
    if (ingData) setIngredients(ingData);
  };

 const handleVerifyPin = async () => {
    if (pin === '1234' || pin === '1111') {
      const workerName = selectedWorker.email.split('@')[0];
      const fullNameRole = `${selectedWorker.role} (${workerName})`;

      // 1. Check if shift exists
      let { data: shift } = await supabase.from('shifts').select('*').eq('client_id', selectedWorker.client_id).eq('character_role', fullNameRole).eq('is_active', true).maybeSingle();
      
      // 2. If no shift, start one and load tasks!
      if (!shift) {
        const { data: roleTasks } = await supabase.from('tasks').select('*').eq('client_id', selectedWorker.client_id).eq('role', selectedWorker.role).eq('is_active', true);
        const taskChecklist = roleTasks?.map(t => ({ id: t.id, name: t.task_name, weight: t.weight, done: false })) || [];
        
        // CATCH ERRORS HERE
  // CATCH ERRORS HERE
        const { data: newShift, error: insertError } = await supabase.from('shifts').insert([{
          client_id: selectedWorker.client_id,
          character_role: fullNameRole,
          is_active: true,
          daily_tasks_checklist: taskChecklist,
          telegram_chat_id: selectedWorker.telegram_chat_id || 0 // <--- ЭНЭ МӨРИЙГ НЭМНЭ (Bypasses the strict DB rule!)
        }]).select().single();

        if (insertError || !newShift) {
          setMsg(`❌ Датабэйс алдаа: ${insertError?.message || 'RLS эсвэл хандалтын алдаа гарлаа.'}`);
          setPin('');
          return; // STOP CRASHING
        }

        shift = newShift;
      }

      setActiveShift(shift);
      setTasks(typeof shift?.daily_tasks_checklist === 'string' ? JSON.parse(shift.daily_tasks_checklist) : (shift?.daily_tasks_checklist || []));
      setStep('menu');
      setPin('');
    } else {
      setMsg("Буруу PIN код!");
      setPin('');
    }
  };
  // ==========================================
  // AI CHAT SUBMIT (TEXT OR PHOTO)
  // ==========================================
  const handleAiChatSubmit = async (e?: React.FormEvent, file?: File) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() && !file) return;

    setIsAiLoading(true);
    let base64Data = null;

    // Add to UI immediately
    if (file) {
      setChatHistory(prev => [...prev, { sender: 'worker', text: '📸 Зураг илгээлээ (Баримт/Бараа)' }]);
      base64Data = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
      });
    } else {
      setChatHistory(prev => [...prev, { sender: 'worker', text: chatInput }]);
    }

    const payloadText = chatInput;
    setChatInput(''); // Clear input

    try {
      const res = await fetch('/api/kiosk-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantClientId: selectedWorker.client_id,
          workerName: activeShift.character_role, // Tracks exactly who did this!
          text: payloadText,
          imageBase64: base64Data
        })
      });

// Replace the data assignment part of handleAiChatSubmit with this:
      const data = await res.json();
      setChatHistory(prev => [...prev, { sender: 'ai', text: data.message, logId: data.log_id }]);
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
      
      // Update the message in chat history to show it was cancelled
      const newHistory = [...chatHistory];
      newHistory[index] = { sender: 'ai', text: data.message };
      setChatHistory(newHistory);
    } catch (err) {
      setMsg("Буцаах үйлдэл амжилтгүй.");
    } finally {
      setIsAiLoading(false);
    }
  };
  // ==========================================
  // TOGGLE TASK
  // ==========================================
  const toggleTask = async (index: number) => {
    const updatedTasks = [...tasks];
    updatedTasks[index].done = !updatedTasks[index].done;
    setTasks(updatedTasks);
    await supabase.from('shifts').update({ daily_tasks_checklist: updatedTasks }).eq('id', activeShift.id);
  };

  // ==========================================
  // LOAD INVENTORY FOR CLOSING
  // ==========================================
  const loadInventoryToCount = () => {
    const twelveHoursAgo = new Date(Date.now() - (12 * 60 * 60 * 1000)).toISOString();
    const criticalItems = ingredients.filter((i: any) => i.is_critical === true && (!i.last_counted_at || i.last_counted_at < twelveHoursAgo));
    const nonCriticalItems = ingredients.filter((i: any) => i.is_critical !== true);
    const sortedCycleItems = nonCriticalItems.sort((a: any, b: any) => new Date(a.last_counted_at || '2000-01-01').getTime() - new Date(b.last_counted_at || '2000-01-01').getTime());
    
    const finalItems = [...criticalItems, ...sortedCycleItems].slice(0, 5);
    setInventoryToCount(finalItems);
    setStep('close_shift');
  };

  // =========================================
  // SUBMIT COUNT & CLOSE SHIFT
  // ==========================================
 // ==========================================
  // SUBMIT COUNT & CLOSE SHIFT (100% IDENTICAL HONESTY AUDIT)
  // ==========================================
  const handleCloseShift = async () => {
    setIsAiLoading(true);
    const endTime = new Date().toISOString();
    
    // 1. Save all inventory counts to DB
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

    // 2. Fetch logs during this shift to run the Honesty Audit
    const { data: logs } = await supabase.from('inventory_logs')
      .select('quantity, type, ingredient_id, notes')
      .eq('client_id', selectedWorker.client_id)
      .gte('date', activeShift.start_time)
      .lte('date', endTime);

    const { data: allIngs } = await supabase.from('ingredients').select('id, unit_price').eq('client_id', selectedWorker.client_id);

    let totalWasteCost = 0;
    let totalPurchases = 0;
    let manualPurchases = 0;
    let loggedWasteEvents = 0;

    if (logs && allIngs) {
      logs.forEach((log: any) => {
        if (log.type === 'purchase') {
          totalPurchases++;
          const noteText = (log.notes || "").toLowerCase();
          if (!noteText.includes("scan") && !noteText.includes("e-barimt") && !noteText.includes("зураг")) {
            manualPurchases++;
          }
        } else if (['spoilage', 'testing', 'staff_meal', 'other'].includes(log.type)) {
          loggedWasteEvents++;
          const ing = allIngs.find((i: any) => i.id === log.ingredient_id);
          if (ing) totalWasteCost += Math.abs(log.quantity) * (parseFloat(ing.unit_price) || 0);
        }
      });
    }

    // 3. Mark Shift as closed
    await supabase.from('shifts').update({ is_active: false, end_time: endTime }).eq('id', activeShift.id);

    // 4. Build the Exact Same Honesty Audit Message for the Owner
    const durationMs = new Date(endTime).getTime() - new Date(activeShift.start_time).getTime();
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

    const auditAlerts: string[] = [];
    if (manualPurchases > 0) {
      auditAlerts.push(`⚠️ **${manualPurchases} татан авалт зураггүй гараар шивэгдсэн байна.** Баримтыг шалгана уу!`);
    } else if (totalPurchases > 0 && manualPurchases === 0) {
      auditAlerts.push(`✅ Бүх татан авалтууд зураг болон E-Barimt-аар баталгаажсан.`);
    }

    if (loggedWasteEvents === 0) {
      auditAlerts.push(`⚠️ Ээлжийн турш ямар ч хаягдал бүртгэгдсэнгүй.`);
    } else {
      auditAlerts.push(`✅ ${loggedWasteEvents} удаагийн хаягдал/хэрэглээг үнэн зөв бүртгэсэн.`);
    }

    const ownerMsg = `👑 **ЭЗЭНД ЗОРИУЛСАН ЭЭЛЖИЙН ХЯНАЛТЫН ТАЙЛАН (Kiosk)**\n\n` +
      `🏢 **Салбар:** ${selectedWorker.client_id}\n` +
      `👤 **Ажилтан:** ${activeShift.character_role}\n` +
      `⏱ **Ажилласан:** ${hours} цаг ${minutes} минут\n` +
      `📋 **Тоолсон бараа:** ${inventoryToCount.length} ш\n` +
      `🗑 **Бүртгэсэн хаягдал:** ${Math.round(totalWasteCost).toLocaleString()} ₮\n\n` +
      `🛡 **АЮУЛГҮЙ БАЙДЛЫН ҮНЭЛГЭЭ:**\n` +
      auditAlerts.map(alert => `• ${alert}`).join('\n');
    
    // Send to Owner's Telegram
    await fetch('/api/notify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantClientId: selectedWorker.client_id, message: ownerMsg })
    });

    setMsg("🌙 Ээлж амжилттай хаагдлаа. Сайхан амраарай!");
    setIsAiLoading(false);
    setTimeout(() => { setMsg(''); setStep('select_worker'); setSelectedWorker(null); setChatHistory([]); }, 4000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col p-6">
      <header className="flex justify-between items-center border-b border-slate-900 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <Coffee className="h-8 w-8 text-emerald-400" />
          <div><h1 className="text-xl font-black">SF KITCHEN KIOSK</h1><p className="text-xs text-slate-500 uppercase font-bold">Smart AI Mode</p></div>
        </div>
        {selectedWorker && (
          <button onClick={() => { setSelectedWorker(null); setStep('select_worker'); setChatHistory([]); }} className="bg-rose-500/10 text-rose-400 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
            <LogOut className="h-4 w-4" /> Гарах
          </button>
        )}
      </header>

      <main className="flex-1 flex flex-col items-center">
        {msg && <div className="bg-blue-500/10 text-blue-400 p-4 rounded-xl mb-6 w-full max-w-md text-center font-bold border border-blue-500/20">{msg}</div>}

        {/* 1. SELECT WORKER */}
        {step === 'select_worker' && (
          <div className="w-full max-w-2xl text-center">
            <h2 className="text-2xl font-black mb-8 flex items-center justify-center gap-2"><Users className="text-emerald-400"/> Ажилтнаа сонгоно уу</h2>
            <div className="grid grid-cols-2 gap-4">
              {workers.map(w => (
                <button key={w.id} onClick={() => { setSelectedWorker(w); setStep('pin_code'); }} className="bg-slate-900/50 hover:bg-slate-900 border border-slate-900 p-6 rounded-2xl text-left">
                  <span className="text-lg font-bold uppercase block">{w.email.split('@')[0]}</span>
                  <span className="text-xs text-emerald-400 font-bold uppercase">{w.role}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 2. PIN CODE */}
        {step === 'pin_code' && (
          <div className="bg-slate-900/40 p-8 rounded-3xl max-w-sm w-full text-center border border-slate-900">
            <h2 className="text-lg font-bold mb-4 text-emerald-400">PIN код оруулна уу</h2>
            <div className="bg-slate-950 p-4 rounded-2xl text-2xl tracking-widest font-black mb-6">{pin.replace(/./g, '•')}</div>
            <div className="grid grid-cols-3 gap-4">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                <button key={num} onClick={() => setPin(p=>p.length<4?p+num:p)} className="bg-slate-950 py-4 rounded-xl text-xl font-black">{num}</button>
              ))}
              <button onClick={() => setPin('')} className="bg-rose-500/10 text-rose-400 rounded-xl text-xs font-bold">Clear</button>
              <button onClick={() => setPin(p=>p.length<4?p+'0':p)} className="bg-slate-950 py-4 rounded-xl text-xl font-black">0</button>
              <button onClick={handleVerifyPin} className="bg-emerald-500 text-slate-950 rounded-xl text-sm font-black">ОК</button>
            </div>
          </div>
        )}

        {/* 3. MENU */}
        {step === 'menu' && (
          <div className="w-full max-w-md space-y-4">
            <h2 className="text-2xl font-black mb-6 text-white text-center">Сайн байна уу, {selectedWorker.email.split('@')[0]}?</h2>
            
            <button onClick={() => setStep('ai_chat')} className="w-full bg-blue-500/10 p-6 rounded-2xl flex items-center gap-4 hover:bg-blue-500/20 border border-blue-500/30 transition">
              <MessageSquare className="h-8 w-8 text-blue-400" />
              <div className="text-left"><p className="font-bold text-lg text-blue-400">Ухаалаг Туслах (AI)</p><p className="text-xs text-blue-500/70">Хаягдал, орлого бичих & Зураг дарах</p></div>
            </button>
            <button onClick={() => setStep('tasks')} className="w-full bg-slate-900/80 p-6 rounded-2xl flex items-center gap-4 hover:bg-slate-900 border border-slate-800 transition">
              <CheckSquare className="h-8 w-8 text-purple-400" />
              <div className="text-left"><p className="font-bold text-lg">Өнөөдрийн Даалгавар</p><p className="text-xs text-slate-400">Цэвэрлэгээ болон бусад үүрэг</p></div>
            </button>
            <button onClick={loadInventoryToCount} className="w-full bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-2xl flex items-center gap-4 hover:bg-emerald-500/20 mt-8 transition">
              <ListOrdered className="h-8 w-8 text-emerald-400" />
              <div className="text-left"><p className="font-bold text-lg text-emerald-400">Ээлж хаах (Тооллого)</p><p className="text-xs text-emerald-500/70">Өдрийн төгсгөлд хийнэ</p></div>
            </button>
          </div>
        )}

        {/* 4. AI CHAT INTERFACE */}
        {step === 'ai_chat' && (
          <div className="w-full max-w-lg bg-slate-900/40 rounded-3xl border border-slate-900 flex flex-col h-[60vh]">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900 rounded-t-3xl">
              <h2 className="font-bold text-blue-400 flex items-center gap-2"><MessageSquare className="h-5 w-5"/> AI Бүртгэл</h2>
              <button onClick={() => setStep('menu')} className="bg-slate-950 px-3 py-1 rounded-lg text-xs font-bold border border-slate-800">Буцах</button>
            </div>
            
            {/* Chat History */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {chatHistory.length === 0 && <p className="text-center text-slate-500 text-sm mt-10">Энд энгийн үгээр бичих эсвэл баримтын зураг илгээж хадгалуулна уу.<br/><br/>Жнь: "Сүү 500 мл асгарсан"</p>}
            {chatHistory.map((msg, i) => (
                <div key={i} className={`flex ${msg.sender === 'worker' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.sender === 'worker' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 rounded-tl-none whitespace-pre-wrap'}`}>
                    {msg.text}
                    {msg.logId && (
                      <button 
                        onClick={() => handleUndo(msg.logId!, i)}
                        className="mt-3 w-full bg-slate-900 border border-slate-700 hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/50 py-2 rounded-lg font-bold text-xs transition"
                      >
                        Буцаах ↩️ (Undo)
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {isAiLoading && <div className="text-slate-500 text-xs animate-pulse">AI бодож байна...</div>}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-slate-900 rounded-b-3xl border-t border-slate-800 flex gap-2 items-center">
              {/* Camera Button */}
              <input type="file" accept="image/*" capture="environment" id="kiosk-ai-camera" className="hidden" onChange={(e) => { if(e.target.files && e.target.files[0]) handleAiChatSubmit(undefined, e.target.files[0]); }}/>
              <label htmlFor="kiosk-ai-camera" className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-3 rounded-xl cursor-pointer transition">
                <Camera className="h-5 w-5" />
              </label>

              {/* Text Input */}
              <form onSubmit={handleAiChatSubmit} className="flex-1 flex gap-2">
                <input type="text" value={chatInput} onChange={e=>setChatInput(e.target.value)} placeholder="Бичих..." className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500 text-sm" />
                <button type="submit" disabled={isAiLoading || !chatInput.trim()} className="bg-blue-500 text-white p-3 rounded-xl disabled:opacity-50 transition"><Send className="h-4 w-4"/></button>
              </form>
            </div>
          </div>
        )}

        {/* 5. TASKS */}
        {step === 'tasks' && (
           <div className="w-full max-w-md bg-slate-900/40 p-6 rounded-3xl border border-slate-900">
             <h2 className="font-bold text-purple-400 mb-6 flex items-center gap-2"><CheckSquare/> Өнөөдрийн Даалгавар</h2>
             {tasks.length === 0 ? <p className="text-center text-slate-500">Даалгавар алга байна.</p> : (
               <div className="space-y-3">
                 {tasks.map((t, idx) => (
                   <button key={idx} onClick={() => toggleTask(idx)} className={`w-full p-4 rounded-xl flex items-center gap-3 border transition ${t.done ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-slate-950 border-slate-800 text-slate-300'}`}>
                     {t.done ? <CheckCircle className="h-5 w-5" /> : <div className="h-5 w-5 rounded border-2 border-slate-600" />}
                     <span className="font-bold">{t.name}</span>
                   </button>
                 ))}
               </div>
             )}
             <button onClick={() => setStep('menu')} className="w-full mt-6 bg-slate-950 py-3 rounded-xl font-bold border border-slate-800">Буцах</button>
           </div>
        )}

        {/* 6. CLOSE SHIFT */}
        {step === 'close_shift' && (
          <div className="w-full max-w-md bg-slate-900/40 p-6 rounded-3xl border border-slate-900">
            <h2 className="font-bold text-emerald-400 mb-2 flex items-center gap-2"><ListOrdered/> Ээлжийн Тооллого</h2>
            <p className="text-xs text-slate-500 mb-6">Доорх барааны бодит үлдэгдлийг тоолж бичнэ үү.</p>
            <div className="space-y-4">
              {inventoryToCount.map(item => (
                <div key={item.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex justify-between items-center">
                  <div><p className="font-bold text-sm text-white">{item.name}</p><p className="text-xs text-slate-500">Системд: {Math.round(item.live_stock*10)/10} {item.unit}</p></div>
                  <input type="number" step="any" required placeholder="Тоо..." value={counts[item.id] || ''} onChange={e => setCounts({...counts, [item.id]: e.target.value})} className="w-24 bg-slate-900 p-2 rounded-lg text-center text-white border border-slate-700 outline-none" />
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-6">
              <button type="button" onClick={() => setStep('menu')} className="flex-1 bg-slate-950 py-3 rounded-xl font-bold border border-slate-800">Буцах</button>
              <button onClick={handleCloseShift} disabled={isAiLoading || inventoryToCount.some(i => !counts[i.id])} className="flex-1 bg-emerald-500 text-slate-950 font-bold py-3 rounded-xl disabled:opacity-50">
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