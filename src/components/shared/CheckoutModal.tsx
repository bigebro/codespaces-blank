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

// 🏛️ Үнийн нэгдсэн толь (Жилээр төлбөл 2 сар үнэгүй буюу 10 сараар бодогдоно)
const PLANS_CATALOG: Record<string, { monthly: number; yearly: number }> = {
  starter: { monthly: 149000, yearly: 1490000 },
  professional: { monthly: 299000, yearly: 2990000 },
  enterprise: { monthly: 0, yearly: 0 },
};

export default function CheckoutModal({
  isOpen,
  onClose,
  clientId,
  userPhone,
  initialPlan = "professional",
  initialCycle = "yearly",
  currentPlan = "trial",
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
  const [daysRemaining, setDaysRemaining] = useState<number>(0);
  // 1. Одоогийн идэвхтэй багц болон Pending хүсэлт байгаа эсэхийг баталгаажуулах
  useEffect(() => {
    if (isOpen && clientId) {
      setIsSubmitted(false);
      setCheckingPending(true);
      Promise.all([
        supabase
          .from("tenants")
          .select("plan, subscription_end_date")
          .ilike("client_id", clientId.trim())
          .maybeSingle(),
        supabase
          .from("payment_requests")
          .select("*")
          .ilike("client_id", clientId.trim())
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]).then(([{ data: tenantData }, { data: reqData }]) => {
        if (tenantData?.plan) setActivePlan(tenantData.plan);
        // ⚡ Үлдсэн хоногийг динамикаар бодох:
        if (tenantData?.subscription_end_date) {
          const diffTime =
            new Date(tenantData.subscription_end_date).getTime() - Date.now();
          setDaysRemaining(
            Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24))),
          );
        }
        if (reqData) setHasPendingRequest(reqData);
        else setHasPendingRequest(null);
        setCheckingPending(false);
      });
    }
  }, [isOpen, clientId]);

  if (!isOpen) return null;

  // ⚡ 2. ДИНАМИК ҮНЭ БА ЗӨРҮҮ БОДОХ (PRORATION ENGINE):
  const targetConfig = PLANS_CATALOG[plan] || PLANS_CATALOG.professional;
  // Сар эсвэл Жилийн (2 сар үнэгүй) үнийг авах
  const baseTargetAmount =
    cycle === "yearly" ? targetConfig.yearly : targetConfig.monthly;

  // Starter-аас Pro руу шилжих үед (хоног үлдсэн байвал):
  const isUpgrading =
    activePlan === "starter" && plan === "professional" && daysRemaining > 0;

  let totalAmount = baseTargetAmount;
  let creditAmount = 0;

  if (plan === "enterprise") {
    totalAmount = 0;
  } else if (isUpgrading) {
    // Starter-ийн 1 өдрийн үнэ: 149k / 30 хоног = ~4,966₮
    const starterDailyRate = 149000 / 30;
    creditAmount = Math.min(
      Math.round(daysRemaining * starterDailyRate),
      149000,
    );

    // Шинэ үнээс үлдсэн хоногийн мөнгийг хасаж, 1,000₮-өөр тэгшитгэх
    const diff = Math.max(0, baseTargetAmount - creditAmount);
    totalAmount = Math.ceil(diff / 1000) * 1000;
  }

  // ⚡ Автомат Гүйлгээний утга:
  const transferNote = `${clientId} ${userPhone || ""}`.trim();

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
          billing_cycle: isUpgrading ? "upgrade" : cycle,
          amount: totalAmount,
          phone_number: userPhone || "Бүртгэлтэй утас",
          status: "pending",
          notes: isUpgrading
            ? `Starter -> Pro ахиулалт (${daysRemaining} хоног тооцсон: -${creditAmount.toLocaleString()}₮)`
            : `${plan} (${cycle})`,
        },
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
          notes: "Enterprise захиалгат уулзалтын хүсэлт",
        },
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
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-md w-full p-4 sm:p-6 shadow-2xl flex flex-col max-h-[92dvh] overflow-hidden">
        {/* Толгой хэсэг */}
        <div className="flex justify-between items-center border-b border-zinc-800 pb-2.5 shrink-0">
          <div>
            <h3 className="text-base font-black text-white">
              Үйлчилгээний эрх баталгаажуулах
            </h3>
            <p className="text-xs text-zinc-400">
              Одоогийн багц:{" "}
              <strong className="text-zinc-200 uppercase">{activePlan}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 text-sm font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Шалгаж байх үед */}
        {checkingPending ? (
          <div className="py-12 text-center text-zinc-500 text-xs">
            <div className="h-6 w-6 border-2 border-zinc-700 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span>Төлөв шалгаж байна...</span>
          </div>
        ) : hasPendingRequest && !isSubmitted ? (
          /* ТӨЛБӨР ХҮЛЭЭГДЭЖ БАЙГАА БОЛ F5 ХИЙСЭН Ч ЭНД ТҮГЖИНЭ */
          <div className="py-8 text-center space-y-4 my-auto">
            <div className="h-14 w-14 bg-zinc-800/60 border border-zinc-700 rounded-full flex items-center justify-center mx-auto ">
              <Clock className="h-7 w-7 text-zinc-300" />
            </div>
            <div>
              <h4 className="text-base font-black text-white">
                Төлбөрийн хүсэлт хянагдаж байна
              </h4>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed max-w-xs mx-auto">
                Та{" "}
                <strong className="text-zinc-200">
                  {hasPendingRequest.plan?.toUpperCase()}
                </strong>{" "}
                багцын хүсэлт илгээсэн байна. Админ дансны хуулгыг шалгаад 1-5
                минутад эрхийг тань нээнэ. Давхар гүйлгээ хийх шаардлагагүй.
              </p>
            </div>
            <button
              onClick={onClose}
              className="bg-zinc-900 border border-zinc-800 text-zinc-300 px-6 py-2.5 rounded-xl text-xs font-bold hover:bg-zinc-800 transition cursor-pointer"
            >
              Хаах
            </button>
          </div>
        ) : !isSubmitted ? (
          <>
            {/* 📜 ДУНД ТАЛЫН ГҮЙДЭГ ХЭСЭГ */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-3.5 my-2 overscroll-contain">
              {/* 💡 БАГЦ АХИУЛАХ ЭСВЭЛ 3 АЛХАМТ ЗААВАР */}
              {isUpgrading ? (
                <div className="bg-zinc-800/60 border border-zinc-800 p-3 rounded-2xl text-xs text-zinc-300 flex items-center gap-2">
                  <Zap className="h-5 w-5 text-zinc-300 shrink-0" />
                  <div>
                    <span className="font-bold block text-white">
                      Starter ➔ Pro ахиулах ({daysRemaining} хоног үлдсэн):
                    </span>
                    Starter-аас ашиглаагүй үлдсэн{" "}
                    {creditAmount.toLocaleString()}₮ хасагдаж, зөрүү{" "}
                    <strong>{totalAmount.toLocaleString()} ₮</strong> боллоо.
                  </div>
                </div>
              ) : (
                plan !== "enterprise" && (
                  <div className="bg-zinc-950/80 border border-zinc-800 p-2.5 rounded-2xl text-xs text-zinc-300 space-y-0.5">
                    <p>1. Дүн болон Дансны дугаарыг хуулж шилжүүлнэ.</p>
                    <p>
                      2. Гүйлгээний утгаа{" "}
                      <strong className="text-zinc-300">
                        заавал хуулж илгээнэ үү
                      </strong>{" "}
                      үү.
                    </p>
                    <p>
                      3. Шилжүүлсний дараа <strong>"Би шилжүүлсэн"</strong> товч
                      дарж баталгаажуулна.
                    </p>
                  </div>
                )
              )}

              {/* 1. БАГЦ СОНГОГЧ */}
              <div className="space-y-1">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block px-1">
                  Багц сонгох:
                </span>
                <div className="grid grid-cols-3 gap-1.5 bg-zinc-950 p-1 rounded-2xl border border-zinc-800 text-xs font-bold shrink-0">
                  <button
                    type="button"
                    onClick={() => setPlan("starter")}
                    className={`py-2 rounded-xl transition cursor-pointer flex flex-col items-center ${
                      plan === "starter"
                        ? "bg-white text-zinc-950 font-black shadow"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    <span>Starter</span>
                    <span className="text-xs opacity-80">149k</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPlan("professional")}
                    className={`py-2 rounded-xl transition cursor-pointer flex flex-col items-center ${
                      plan === "professional"
                        ? "bg-white text-zinc-950 font-black shadow"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    <span>Pro</span>
                    <span className="text-xs opacity-80">299k</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPlan("enterprise")}
                    className={`py-2 rounded-xl transition cursor-pointer flex flex-col items-center ${
                      plan === "enterprise"
                        ? "bg-white text-zinc-950 font-black shadow"
                        : "text-zinc-400 hover:text-white"
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
                <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-700/40 space-y-3 text-xs leading-relaxed">
                  <div className="flex items-center gap-2">
                    <span className="text-xl"></span>
                    <h4 className="font-black text-white text-sm">
                      Enterprise Түншлэл & Гэрээ
                    </h4>
                  </div>

                  <p className="text-zinc-300">
                    Сүлжээ салбар болон тусгай ERP хөгжүүлэлтийн багц нь
                    байгууллагын салбарын тоо, бодит хэрэгцээнээс хамаарч{" "}
                    <strong>албан ёсны гэрээгээр</strong> шийдэгддэг.
                  </p>

                  <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800 text-xs space-y-1 font-mono">
                    <p className="text-zinc-400">
                      Байгууллага:{" "}
                      <strong className="text-white">{clientId}</strong>
                    </p>
                    <p className="text-zinc-400">
                      Холбогдох утас:{" "}
                      <strong className="text-zinc-200">
                        {userPhone || "Бүртгэлтэй утас"}
                      </strong>
                    </p>
                  </div>

                  <p className="text-xs text-zinc-500">
                    Та доорх товчийг дармагц манай удирдлагын багт мэдэгдэл
                    очиж, 15-30 минутад эргэж холбогдон уулзалт товлох болно.
                  </p>
                </div>
              ) : (
                /* ========================================================= */
                /* Б. ХЭРЭВ STARTER ЭСВЭЛ PRO БОЛ: БАНКНЫ ДАНС БА NDA ГАРНА   */
                /* ========================================================= */
                <>
                  {/* ЗАССАН ХУВИЛБАР: Сар ба Жилийн сонголт үргэлж ил харагдана */}

                  <div className="grid grid-cols-2 gap-2 bg-zinc-950 p-1 rounded-2xl border border-zinc-800 text-xs font-bold shrink-0">
                    <button
                      type="button"
                      onClick={() => setCycle("monthly")}
                      className={`py-2 rounded-xl transition cursor-pointer ${cycle === "monthly" ? "bg-zinc-800 text-white font-black shadow" : "text-zinc-400"}`}
                    >
                      Сар бүр төлөх
                    </button>
                    <button
                      type="button"
                      onClick={() => setCycle("yearly")}
                      className={`py-2 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer ${cycle === "yearly" ? "bg-zinc-800 text-zinc-200 font-black shadow" : "text-zinc-400"}`}
                    >
                      <span>Жилээр</span>
                      <span className="text-xs bg-zinc-200/20 text-zinc-300 px-1.5 py-0.5 rounded-full border border-zinc-700/30 font-black">
                        2 сар үнэгүй
                      </span>
                    </button>
                  </div>

                  {/* Дансны мэдээлэл */}
                  <div className="space-y-2.5 bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">Хүлээн авах банк:</span>
                      <span className="font-bold text-white">Хаан Банк</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">Дансны дугаар:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-black text-white text-sm">
                          5000 123 456
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy("5000123456", "acc")}
                          className="p-1 bg-zinc-900 border border-zinc-700 rounded text-zinc-300 hover:text-white cursor-pointer"
                        >
                          {copied === "acc" ? (
                            <Check className="h-3 w-3 text-zinc-200" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">
                        Хүлээн авагчийн нэр:
                      </span>
                      <span className="font-bold text-white">Оперлинк ХХК</span>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-zinc-900">
                      <span className="text-zinc-400 font-bold">
                        {isUpgrading
                          ? "Шилжүүлэх зөрүү дүн:"
                          : "Шилжүүлэх дүн:"}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-black text-zinc-200 text-base">
                          {totalAmount.toLocaleString()} ₮
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopy(totalAmount.toString(), "amount")
                          }
                          className="p-1 bg-zinc-900 border border-zinc-700 rounded text-zinc-300 hover:text-white cursor-pointer"
                        >
                          {copied === "amount" ? (
                            <Check className="h-3 w-3 text-zinc-200" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* ⚖️ ГЭРЭЭНИЙ ӨРГӨН ХАЙРЦАГ (БҮХ 3 ЗААЛТ БҮРЭН СЭРГЭЭГДСЭН) */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                      Мэдээллийн Нууцлалын Баталгаа (NDA):
                    </span>

                    <div className="max-h-36 overflow-y-auto bg-zinc-950 p-3 rounded-2xl border border-zinc-800 text-xs text-zinc-300 space-y-2.5 leading-relaxed font-sans shadow-inner">
                      <div className="bg-zinc-950 p-2 rounded-xl border border-zinc-800/80">
                        <strong className="text-zinc-200 block mb-0.5">
                          1. Мэдээллийн өмчлөл:
                        </strong>
                        Системд оруулсан Технологийн карт (Жор), Орц болон
                        Борлуулалтын орлогын бүх мэдээлэл нь зөвхөн Харилцагчийн
                        хувийн өмч байна.
                      </div>
                      <div className="bg-zinc-950 p-2 rounded-xl border border-zinc-800/80">
                        <strong className="text-zinc-200 block mb-0.5">
                          2. Нууцлал хамгаалалт:
                        </strong>
                        Operlink нь харилцагчийн мэдээллийг гуравдагч этгээдэд
                        задруулах, худалдах, өөрсдийн хувийн бизнест ашиглахыг
                        хатуу хориглоно. Бүх өгөгдөл Amazon Web Services (AWS)
                        шифрлэлтээр хамгаалагдана.
                      </div>
                      <div className="bg-zinc-950 p-2 rounded-xl border border-zinc-800/80">
                        <strong className="text-zinc-200 block mb-0.5">
                          3. Устгах эрх:
                        </strong>
                        Үйлчилгээ цуцлагдсан тохиолдолд харилцагч шаардсан бол
                        систем дэх бүх датаг 72 цагийн дотор бүрмөсөн устгах
                        үүрэгтэй.
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
                      <span className="text-xs text-zinc-300 font-bold leading-snug">
                        Бид шилжүүлэг хийсэн бөгөөд дээрх нууцлалын нөхцөлийг
                        зөвшөөрч байна.
                      </span>
                    </label>
                  </div>

                  {/* ГҮЙЛГЭЭНИЙ УТГА (Автомат) */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center px-1">
                      <span className="text-xs text-zinc-300 font-bold uppercase tracking-wider">
                        Гүйлгээний утга (Автомат):
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(transferNote, "note")}
                        className="text-xs bg-zinc-800 text-zinc-300 border border-zinc-700 px-2 py-0.5 rounded flex items-center gap-1 hover:bg-amber-500/30 font-bold cursor-pointer"
                      >
                        {copied === "note" ? (
                          <Check className="h-2.5 w-2.5" />
                        ) : (
                          <Copy className="h-2.5 w-2.5" />
                        )}
                        <span>Хуулах</span>
                      </button>
                    </div>
                    <div className="bg-zinc-950 p-2.5 rounded-xl border border-amber-500/40 text-center font-mono font-black text-white text-sm select-all tracking-wider">
                      {transferNote}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* 🔒 4. ДООД ТОВЧ */}
            <div className="shrink-0 pt-2 border-t border-zinc-800">
              {plan === "enterprise" ? (
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleEnterpriseRequest}
                  className="w-full bg-white hover:bg-zinc-200 disabled:opacity-40 text-white font-black py-3.5 rounded-2xl text-xs sm:text-sm transition shadow-lg active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                >
                  {loading
                    ? "Илгээж байна..."
                    : "📞 УУЛЗАЛТ ТОВЛОХ ХҮСЭЛТ ИЛГЭЭХ"}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={loading || !ndaAccepted}
                  onClick={handleConfirmTransfer}
                  className="w-full bg-white hover:bg-zinc-200 disabled:opacity-40 text-zinc-950 font-black py-3.5 rounded-2xl text-xs sm:text-sm transition shadow-lg active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                >
                  {loading ? "Илгээж байна..." : " БИ ШИЛЖҮҮЛСЭН (Шалгуулах)"}
                </button>
              )}
            </div>
          </>
        ) : (
          /* ХҮЛЭЭХ ДЭЛГЭЦ */
          <div className="text-center py-8 space-y-4 my-auto">
            <div className="h-14 w-14 bg-zinc-800/60 border border-zinc-800 rounded-full flex items-center justify-center mx-auto ">
              <ShieldCheck className="h-7 w-7 text-zinc-200" />
            </div>
            <div>
              <h4 className="text-base font-black text-white">
                Хүсэлтийг хүлээн авлаа
              </h4>
              <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed max-w-xs mx-auto">
                {plan === "enterprise"
                  ? "Таны Enterprise уулзалтын хүсэлтийг хүлээн авлаа. Манай зөвлөх тун удахгүй тантай утсаар холбогдох болно."
                  : "Бид дансны хуулгыг шалгаад 1-3 минутын дотор эрхийг тань нээнэ."}
              </p>
            </div>
            <button
              onClick={onClose}
              className="bg-zinc-900 border border-zinc-800 text-zinc-300 px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-zinc-800 transition cursor-pointer"
            >
              Хаах
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
