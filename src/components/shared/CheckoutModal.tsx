"use client";

import React, { useState, useEffect } from "react";
import { Check, Copy, ShieldCheck, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  userPhone: string;
  initialPlan?: string;
  initialCycle?: string;
}

export default function CheckoutModal({
  isOpen,
  onClose,
  clientId,
  userPhone,
  initialPlan = "professional",
  initialCycle = "yearly"
}: CheckoutModalProps) {
  const [plan, setPlan] = useState(initialPlan);
  const [cycle, setCycle] = useState(initialCycle);
  const [copied, setCopied] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ndaAccepted, setNdaAccepted] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState<any | null>(null);

  // ⚡ 1. Энэ байгууллага дээр өмнө нь хүлээгдэж буй (pending) төлбөр байгаа эсэхийг шалгах
  useEffect(() => {
    if (isOpen && clientId) {
      supabase
        .from("payment_requests")
        .select("*")
        .eq("client_id", clientId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setHasPendingRequest(data);
          else setHasPendingRequest(null);
        });
    }
  }, [isOpen, clientId]);

  if (!isOpen) return null;

  const baseMonthly = plan === "starter" ? 149000 : 299000;
  const totalAmount = cycle === "yearly" ? baseMonthly * 10 : baseMonthly;
  const transferNote = `${clientId} ${userPhone || ''}`.trim();

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

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
          billing_cycle: cycle,
          amount: totalAmount,
          phone_number: userPhone || "Бүртгэлтэй утас",
          status: "pending"
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
      <div className="bg-[#0B1120] border border-slate-800 rounded-3xl max-w-md w-full p-4 sm:p-6 shadow-2xl flex flex-col max-h-[92dvh] overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-2.5 shrink-0">
          <div>
            <h3 className="text-base font-black text-white">Үйлчилгээний эрх баталгаажуулах</h3>
            <p className="text-xs text-slate-400">Хаан банкны шилжүүлгээр сунгах</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 text-sm font-bold cursor-pointer">✕</button>
        </div>

        {/* ⚠️ ХЭРЭВ ХҮЛЭЭГДЭЖ БУЙ ТӨЛБӨР БАЙГАА БОЛ ДАВХАР ТӨЛӨЛТИЙГ ХААНА */}
        {hasPendingRequest && !isSubmitted ? (
          <div className="py-8 text-center space-y-4 my-auto">
            <div className="h-14 w-14 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto animate-pulse">
              <Clock className="h-7 w-7 text-amber-400" />
            </div>
            <div>
              <h4 className="text-base font-black text-white">Таны төлбөрийн хүсэлт хянагдаж байна</h4>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed max-w-xs mx-auto">
                Та <strong className="text-emerald-400">{hasPendingRequest.plan.toUpperCase()}</strong> багцын төлбөрийг илгээсэн байна. Админ дансаа шалгаад 1-5 минутад баталгаажуулна. Давхар гүйлгээ хийх шаардлагагүй.
              </p>
            </div>
            <button onClick={onClose} className="bg-slate-900 border border-slate-800 text-slate-300 px-6 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-800 transition cursor-pointer">
              Ойлголоо, Хаах
            </button>
          </div>
        ) : !isSubmitted ? (
          <>
            <div className="flex-1 overflow-y-auto pr-1 space-y-3.5 my-2 overscroll-contain">
              {/* Багц сонгох */}
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block px-1">
                  Багц сонгох:
                </span>
                <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs font-bold">
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

              {/* Сар / Жил */}
              <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs font-bold">
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
                  <span className="text-xs bg-emerald-400/20 text-emerald-300 px-1.5 py-0.5 rounded-full font-black">🎁 2 сар үнэгүй</span>
                </button>
              </div>

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
                      className="p-1 bg-slate-900 border border-slate-700 rounded text-slate-300 hover:text-white"
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
                  <span className="text-slate-400 font-bold">Шилжүүлэх дүн:</span>
                  <span className="font-mono font-black text-emerald-400 text-base">{totalAmount.toLocaleString()} ₮</span>
                </div>
              </div>

              {/* NDA */}
              <div className="space-y-1.5">
                <label className="flex items-start gap-2.5 cursor-pointer pt-1 px-1">
                  <input 
                    type="checkbox"
                    checked={ndaAccepted}
                    onChange={(e) => setNdaAccepted(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-emerald-500 rounded cursor-pointer shrink-0"
                  />
                  <span className="text-xs text-slate-300 font-bold leading-snug">
                    Бид шилжүүлэг хийсэн бөгөөд нууцлалын нөхцөлийг зөвшөөрч байна.
                  </span>
                </label>
              </div>

              {/* Гүйлгээний утга */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center px-1">
                  <span className="text-xs text-amber-400 font-bold uppercase tracking-wider">
                    Гүйлгээний утга:
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(transferNote, "note")}
                    className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded flex items-center gap-1 font-bold"
                  >
                    {copied === "note" ? <Check className="h-2.5 w-2.5" /> : <Copy className="h-2.5 w-2.5" />}
                    <span>Хуулах</span>
                  </button>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-amber-500/40 text-center font-mono font-black text-white text-sm">
                  {transferNote}
                </div>
              </div>
            </div>

            <div className="shrink-0 pt-2 border-t border-slate-800">
              <button
                type="button"
                disabled={loading || !ndaAccepted}
                onClick={handleConfirmTransfer}
                className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-black py-3.5 rounded-2xl text-xs sm:text-sm transition shadow-lg active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? "Илгээж байна..." : "✅ БИ ШИЛЖҮҮЛСЭН (Шалгуулах)"}
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-8 space-y-4 my-auto">
            <div className="h-14 w-14 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto animate-pulse">
              <ShieldCheck className="h-7 w-7 text-emerald-400" />
            </div>
            <div>
              <h4 className="text-base font-black text-white">Хүсэлтийг хүлээн авлаа</h4>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed max-w-xs mx-auto">
                Бид дансны хуулгыг шалгаад 1-3 минутын дотор эрхийг тань нээнэ.
              </p>
            </div>
            <button onClick={onClose} className="bg-slate-900 border border-slate-800 text-slate-300 px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-800 transition">
              Хаах
            </button>
          </div>
        )}
      </div>
    </div>
  );
}