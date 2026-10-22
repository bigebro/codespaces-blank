"use client";

import React, { useState, useEffect } from "react";
import { Check, Copy, ShieldCheck, Clock, Zap } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  userPhone: string;
  initialPlan?: string;
  initialCycle?: string;
  currentPlan?: string; // Dashboard-аас одоогийн багцыг шууд авна
}

export default function CheckoutModal({
  isOpen,
  onClose,
  clientId,
  userPhone,
  initialPlan = "professional",
  initialCycle = "yearly",
  currentPlan = "trial"
}: CheckoutModalProps) {
  const [activePlan, setActivePlan] = useState<string>(currentPlan);
  const [plan, setPlan] = useState(initialPlan);
  const [cycle, setCycle] = useState(initialCycle);
  const [copied, setCopied] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingPending, setCheckingPending] = useState(true);
  const [ndaAccepted, setNdaAccepted] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState<any | null>(null);

  // 1. Одоогийн идэвхтэй багц болон Pending хүсэлт байгаа эсэхийг баталгаажуулах
  useEffect(() => {
    if (isOpen && clientId) {
      setCheckingPending(true);
      Promise.all([
        supabase.from("tenants").select("plan").ilike("client_id", clientId.trim()).maybeSingle(),
        supabase.from("payment_requests").select("*").ilike("client_id", clientId.trim()).eq("status", "pending").order("created_at", { ascending: false }).limit(1).maybeSingle()
      ]).then(([{ data: tenantData }, { data: reqData }]) => {
        if (tenantData?.plan) setActivePlan(tenantData.plan);
        if (reqData) setHasPendingRequest(reqData);
        else setHasPendingRequest(null);
        setCheckingPending(false);
      });
    }
  }, [isOpen, clientId]);

  if (!isOpen) return null;

  // ⚡ 2. БАГЦ АХИУЛАХ ЭСВЭЛ ЭНГИЙН СУНГАЛТЫН ДҮНГ БОДОХ:
  // Хэрэв одоо Starter багцтай бөгөөд Pro руу сараар шилжих гэж байгаа бол 150,000₮ зөрүү бодно
  const isUpgradingStarterToPro = activePlan === "starter" && plan === "professional" && cycle === "monthly";

  let totalAmount = 0;
  if (isUpgradingStarterToPro) {
    totalAmount = 150000; // Багцын зөрүү (299k - 149k)
  } else {
    const baseMonthly = plan === "starter" ? 149000 : 299000;
    totalAmount = cycle === "yearly" ? baseMonthly * 10 : baseMonthly;
  }

  // ⚡ Автомат Гүйлгээний утга:
  const transferNote = `${clientId} ${userPhone || ''}`.trim();

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  // Төлбөр илгээх (Starter & Pro)
  const handleConfirmTransfer = async () => {
    if (!ndaAccepted) {
      alert("Та үйлчилгээний нууцлалын нөхцөлийг зөвшөөрнө үү.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from("payment_requests").insert([
        {
          client_id: clientId,
          plan: plan,
          billing_cycle: isUpgradingStarterToPro ? "upgrade" : cycle,
          amount: totalAmount,
          phone_number: userPhone || "Бүртгэлтэй утас",
          status: "pending",
          notes: isUpgradingStarterToPro ? "Starter -> Pro багц ахиулах зөрүү" : `${plan} (${cycle})`
        }
      ]);

      if (error) throw error;
      setIsSubmitted(true);
    } catch (err: any) {
      alert("Алдаа гарлаа: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Enterprise уулзалт товлох хүсэлт илгээх
  const handleEnterpriseRequest = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.from("payment_requests").insert([
        {
          client_id: clientId,
          plan: "enterprise",
          billing_cycle: "custom",
          amount: 0,
          phone_number: userPhone || "Бүртгэлтэй утас",
          status: "pending",
          notes: "Enterprise захиалгат уулзалтын хүсэлт"
        }
      ]);

      if (error) throw error;
      setIsSubmitted(true);
    } catch (err: any) {
      alert("Алдаа гарлаа: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150">
      
      {/* 📱 УТАС БА КОМПЬЮТЕРТ 100% ТОХИРСОН БҮТЭЦ: max-h-[92dvh] flex flex-col */}
      <div className="bg-[#0B1120] border border-slate-800 rounded-3xl max-w-md w-full p-4 sm:p-6 shadow-2xl flex flex-col max-h-[92dvh] overflow-hidden">
        
        {/* Толгой хэсэг */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-2.5 shrink-0">
          <div>
            <h3 className="text-base font-black text-white">Үйлчилгээний эрх баталгаажуулах</h3>
            <p className="text-xs text-slate-400">
              Одоогийн багц: <strong className="text-emerald-400 uppercase">{activePlan}</strong>
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 text-sm font-bold cursor-pointer">✕</button>
        </div>

        {/* Шалгаж байх үед */}
        {checkingPending ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            <div className="h-6 w-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span>Төлөв шалгаж байна...</span>
          </div>
        ) : hasPendingRequest && !isSubmitted ? (
          /* ⚠️ ТӨЛБӨР ХҮЛЭЭГДЭЖ БАЙГАА БОЛ F5 ХИЙСЭН Ч ЭНД ТҮГЖИНЭ */
          <div className="py-8 text-center space-y-4 my-auto">
            <div className="h-14 w-14 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto animate-pulse">
              <Clock className="h-7 w-7 text-amber-400" />
            </div>
            <div>
              <h4 className="text-base font-black text-white">Төлбөрийн хүсэлт хянагдаж байна</h4>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed max-w-xs mx-auto">
                Та <strong className="text-emerald-400">{hasPendingRequest.plan?.toUpperCase()}</strong> багцын хүсэлт илгээсэн байна. Админ дансны хуулгыг шалгаад 1-5 минутад эрхийг тань нээнэ. Давхар гүйлгээ хийх шаардлагагүй.
              </p>
            </div>
            <button onClick={onClose} className="bg-slate-900 border border-slate-800 text-slate-300 px-6 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-800 transition cursor-pointer">
              Ойлголоо, Хаах
            </button>
          </div>
        ) : !isSubmitted ? (
          <>
            {/* 📜 ДУНД ТАЛЫН ГҮЙДЭГ ХЭСЭГ */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-3.5 my-2 overscroll-contain">
              
              {/* 💡 БАГЦ АХИУЛАХ ЭСВЭЛ 3 АЛХАМТ ЗААВАР */}
              {isUpgradingStarterToPro ? (
                <div className="bg-blue-500/10 border border-blue-500/30 p-3 rounded-2xl text-xs text-blue-300 flex items-center gap-2">
                  <Zap className="h-5 w-5 text-blue-400 shrink-0" />
                  <div>
                    <span className="font-bold block text-white">Starter ➔ Pro багц ахиулах:</span>
                    Та бүтэн 299,000₮ биш, зөвхөн багцын зөрүү <strong>150,000 ₮</strong> шилжүүлээд Pro эрхээ нээнэ.
                  </div>
                </div>
              ) : plan !== "enterprise" && (
                <div className="bg-slate-950/80 border border-slate-800 p-2.5 rounded-2xl text-xs text-slate-300 space-y-0.5">
                  <p>1. Дүн болон Дансны дугаарыг хуулж шилжүүлнэ.</p>
                  <p>2. Гүйлгээний утгаа <strong className="text-amber-400">заавал хуулж бичнэ</strong> үү.</p>
                  <p>3. Шилжүүлсний дараа <strong>"Би шилжүүлсэн"</strong> товч дарж баталгаажуулна.</p>
                </div>
              )}

              {/* 1. БАГЦ СОНГОГЧ */}
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block px-1">
                  Багц сонгох:
                </span>
                <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs font-bold shrink-0">
                  <button
                    type="button"
                    onClick={() => setPlan("starter")}
                    className={`py-2 rounded-xl transition cursor-pointer flex flex-col items-center ${
                      plan === "starter" ? "bg-white text-slate-950 font-black shadow" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <span>Starter</span>
                    <span className="text-xs opacity-80">149k</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPlan("professional")}
                    className={`py-2 rounded-xl transition cursor-pointer flex flex-col items-center ${
                      plan === "professional" ? "bg-emerald-500 text-slate-950 font-black shadow" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <span>Pro</span>
                    <span className="text-xs opacity-80">299k</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPlan("enterprise")}
                    className={`py-2 rounded-xl transition cursor-pointer flex flex-col items-center ${
                      plan === "enterprise" ? "bg-blue-600 text-white font-black shadow" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <span>Enterprise</span>
                    <span className="text-xs opacity-80">Гэрээгээр</span>
                  </button>
                </div>
              </div>

              {/* ========================================================= */}
              {/* А. ХЭРЭВ ENTERPRISE БОЛ: БАНК ГАРАХГҮЙ, ЗӨВХӨН УУЛЗАЛТ ГАРНА */}
              {/* ========================================================= */}
              {plan === "enterprise" ? (
                <div className="bg-slate-950 p-4 rounded-2xl border border-blue-500/40 space-y-3 text-xs leading-relaxed">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🏢</span>
                    <h4 className="font-black text-white text-sm">Enterprise Түншлэл & Гэрээ</h4>
                  </div>
                  
                  <p className="text-slate-300">
                    Сүлжээ салбар болон тусгай ERP хөгжүүлэлтийн багц нь байгууллагын салбарын тоо, бодит хэрэгцээнээс хамаарч <strong>албан ёсны гэрээгээр</strong> шийдэгддэг.
                  </p>

                  <div className="bg-[#0B1120] p-2.5 rounded-xl border border-slate-800 text-xs space-y-1 font-mono">
                    <p className="text-slate-400">Байгууллага: <strong className="text-white">{clientId}</strong></p>
                    <p className="text-slate-400">Холбогдох утас: <strong className="text-emerald-400">{userPhone || "Бүртгэлтэй утас"}</strong></p>
                  </div>

                  <p className="text-xs text-slate-500">
                    Та доорх товчийг дармагц манай удирдлагын багт мэдэгдэл очиж, 15-30 минутад эргэж холбогдон уулзалт товлох болно.
                  </p>
                </div>
              ) : (
                /* ========================================================= */
                /* Б. ХЭРЭВ STARTER ЭСВЭЛ PRO БОЛ: БАНКНЫ ДАНС БА NDA ГАРНА   */
                /* ========================================================= */
                <>
                  {/* Сар / Жил сонгогч (Starter-аас Pro руу сараар шилжих үед харагдахгүй) */}
                  {!isUpgradingStarterToPro && (
                    <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs font-bold shrink-0">
                      <button
                        type="button"
                        onClick={() => setCycle("monthly")}
                        className={`py-2 rounded-xl transition cursor-pointer ${cycle === "monthly" ? "bg-slate-800 text-white font-black shadow" : "text-slate-400"}`}
                      >
                        Сар бүр төлөх
                      </button>
                      <button
                        type="button"
                        onClick={() => setCycle("yearly")}
                        className={`py-2 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer ${cycle === "yearly" ? "bg-slate-800 text-emerald-400 font-black shadow" : "text-slate-400"}`}
                      >
                        <span>Жилээр</span>
                        <span className="text-xs bg-emerald-400/20 text-emerald-300 px-1.5 py-0.5 rounded-full border border-emerald-400/30 font-black">🎁 2 сар үнэгүй</span>
                      </button>
                    </div>
                  )}

                  {/* Дансны мэдээлэл */}
                  <div className="space-y-2.5 bg-slate-950 p-3.5 rounded-2xl border border-slate-800 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Хүлээн авах банк:</span>
                      <span className="font-bold text-white">Хаан Банк</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Дансны дугаар:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-black text-white text-sm">5000 123 456</span>
                        <button
                          type="button"
                          onClick={() => handleCopy("5000123456", "acc")}
                          className="p-1 bg-slate-900 border border-slate-700 rounded text-slate-300 hover:text-white cursor-pointer"
                        >
                          {copied === "acc" ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Хүлээн авагчийн нэр:</span>
                      <span className="font-bold text-white">Оперлинк ХХК</span>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-slate-900">
                      <span className="text-slate-400 font-bold">
                        {isUpgradingStarterToPro ? "Шилжүүлэх зөрүү дүн:" : "Шилжүүлэх дүн:"}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-black text-emerald-400 text-base">
                          {totalAmount.toLocaleString()} ₮
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(totalAmount.toString(), "amount")}
                          className="p-1 bg-slate-900 border border-slate-700 rounded text-slate-300 hover:text-white cursor-pointer"
                        >
                          {copied === "amount" ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* ⚖️ ГЭРЭЭНИЙ ӨРГӨН ХАЙРЦАГ (БҮХ 3 ЗААЛТ БҮРЭН СЭРГЭЭГДСЭН) */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                      Мэдээллийн Нууцлалын Баталгаа (NDA):
                    </span>
                    
                    <div className="max-h-36 overflow-y-auto bg-slate-950 p-3 rounded-2xl border border-slate-800 text-xs text-slate-300 space-y-2.5 leading-relaxed font-sans shadow-inner">
                      <div className="bg-[#0B1120] p-2 rounded-xl border border-slate-800/80">
                        <strong className="text-emerald-400 block mb-0.5">1. Мэдээллийн өмчлөл:</strong>
                        Системд оруулсан Технологийн карт (Жор), Орц болон Борлуулалтын орлогын бүх мэдээлэл нь зөвхөн Харилцагчийн хувийн өмч байна.
                      </div>
                      <div className="bg-[#0B1120] p-2 rounded-xl border border-slate-800/80">
                        <strong className="text-emerald-400 block mb-0.5">2. Нууцлал хамгаалалт:</strong>
                        Operlink нь харилцагчийн мэдээллийг гуравдагч этгээдэд задруулах, худалдах, өөрсдийн хувийн бизнест ашиглахыг хатуу хориглоно. Бүх өгөгдөл Amazon Web Services (AWS) шифрлэлтээр хамгаалагдана.
                      </div>
                      <div className="bg-[#0B1120] p-2 rounded-xl border border-slate-800/80">
                        <strong className="text-emerald-400 block mb-0.5">3. Устгах эрх:</strong>
                        Үйлчилгээ цуцлагдсан тохиолдолд харилцагч шаардсан бол систем дэх бүх датаг 72 цагийн дотор бүрмөсөн устгах үүрэгтэй.
                      </div>
                    </div>

                    {/* Чагтлах Checkbox */}
                    <label className="flex items-start gap-2.5 cursor-pointer pt-1 px-1">
                      <input 
                        type="checkbox"
                        checked={ndaAccepted}
                        onChange={(e) => setNdaAccepted(e.target.checked)}
                        className="mt-0.5 w-4 h-4 accent-emerald-500 rounded cursor-pointer shrink-0"
                      />
                      <span className="text-xs text-slate-300 font-bold leading-snug">
                        Бид шилжүүлэг хийсэн бөгөөд дээрх нууцлалын нөхцөлийг зөвшөөрч байна.
                      </span>
                    </label>
                  </div>

                  {/* ГҮЙЛГЭЭНИЙ УТГА (Автомат) */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center px-1">
                      <span className="text-xs text-amber-400 font-bold uppercase tracking-wider">
                        Гүйлгээний утга (Автомат):
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(transferNote, "note")}
                        className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded flex items-center gap-1 hover:bg-amber-500/30 font-bold cursor-pointer"
                      >
                        {copied === "note" ? <Check className="h-2.5 w-2.5" /> : <Copy className="h-2.5 w-2.5" />}
                        <span>Хуулах</span>
                      </button>
                    </div>
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-amber-500/40 text-center font-mono font-black text-white text-sm select-all tracking-wider">
                      {transferNote}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* 🔒 4. ДООД ТОВЧ */}
            <div className="shrink-0 pt-2 border-t border-slate-800">
              {plan === "enterprise" ? (
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleEnterpriseRequest}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-black py-3.5 rounded-2xl text-xs sm:text-sm transition shadow-lg active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                >
                  {loading ? "Илгээж байна..." : "📞 УУЛЗАЛТ ТОВЛОХ ХҮСЭЛТ ИЛГЭЭХ"}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={loading || !ndaAccepted}
                  onClick={handleConfirmTransfer}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-black py-3.5 rounded-2xl text-xs sm:text-sm transition shadow-lg active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                >
                  {loading ? "Илгээж байна..." : "✅ БИ ШИЛЖҮҮЛСЭН (Шалгуулах)"}
                </button>
              )}
            </div>
          </>
        ) : (
          /* ХҮЛЭЭХ ДЭЛГЭЦ */
          <div className="text-center py-8 space-y-4 my-auto">
            <div className="h-14 w-14 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto animate-pulse">
              <ShieldCheck className="h-7 w-7 text-emerald-400" />
            </div>
            <div>
              <h4 className="text-base font-black text-white">Хүсэлтийг хүлээн авлаа</h4>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed max-w-xs mx-auto">
                {plan === "enterprise" 
                  ? "Таны Enterprise уулзалтын хүсэлтийг хүлээн авлаа. Манай зөвлөх тун удахгүй тантай утсаар холбогдох болно." 
                  : "Бид дансны хуулгыг шалгаад 1-3 минутын дотор эрхийг тань нээнэ."}
              </p>
            </div>
            <button onClick={onClose} className="bg-slate-900 border border-slate-800 text-slate-300 px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-800 transition cursor-pointer">
              Хаах
            </button>
          </div>
        )}
      </div>
    </div>
  );
}