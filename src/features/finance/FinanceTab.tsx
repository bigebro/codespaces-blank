// src/features/finance/FinanceTab.tsx
"use client";

import React, { useState } from "react";
// 1. ХЭРЭГТЭЙ ДҮРСҮҮД:
import {
  AlertTriangle,
  TrendingUp,
  Trash2,
  Download,
  Activity,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { ubDay } from "@/lib/ubDate";
// 2. САНГУУД:
import { exportAuditExcel } from "@/lib/exportAudit";
import { supabase } from "@/lib/supabase";
import DataGradePanel from "./DataGradePanel";
import UnexplainedGaps from "./UnexplainedGaps";
import CupCheck from "./CupCheck";
import TeamBoard from "./TeamBoard";
import TruthMeter from "./TruthMeter";
import { IMPOSSIBLE_TITLE, impossibleReasons, parsePct, summarizeTrust } from "@/lib/honestDashboard";

// 3. ТУСЛАХ ФУНКЦҮҮД (Огноо ба текстийн цэвэрлэгээ):
function cleanString(str: string) {
  return String(str || "")
    .replace(/[\u00a0\s]+/g, " ")
    .trim();
}

// "YYYY-MM-DD" огноон дээр өдөр нэмэх (цагийн бүсээс хамаарахгүй).
function addDaysStr(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Тухайн өдрийн долоо хоногийн Даваа гараг.
function mondayOf(day: string): string {
  const dow = (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7;
  return addDaysStr(day, -dow);
}

type RangeMode = "day" | "week" | "month";

function detectRangeMode(start: string, end: string): RangeMode {
  if (start === end) return "day";
  if (start === mondayOf(start) && end > start && end <= addDaysStr(start, 6)) return "week";
  return "month";
}

// 4. ОРОХ ӨГӨГДЛИЙН ГЭРЭЭ (PROPS):
interface FinanceTabProps {
  isLive?: boolean;
  activeClient: string;
  startDate: string;
  endDate: string;
  setStartDate: (d: string) => void;
  setEndDate: (d: string) => void;
  availableMonths: string[];
  handleMonthChange: (ym: string) => void;
  priceSpikeAlerts: any[];
  liveAnalytics: any;
  setLoading?: (v: boolean) => void;
  loading: boolean;
  productsList: any[];
  fetchDatabaseData: (
    client?: string,
    start?: string,
    end?: string,
    includeAnalytics?: boolean,
    targetTab?: string,
  ) => Promise<void>;
  tenantInfo: { isExpired: boolean; endDate: string | null;  plan: string; } | null;
  setShowWasteGuideModal: (v: boolean) => void;
   setShowCheckoutModal?: (v: boolean) => void;
  setActiveTab: (tab: any) => void;
  setCatalogTab: (tab: any) => void;
  setUpsellFeature?: (v: string | null) => void;
}

export default function FinanceTab({
  isLive = true,
  activeClient,
  startDate,
  endDate,
  setStartDate,
  setEndDate,
  availableMonths,
  handleMonthChange,
  priceSpikeAlerts,
  liveAnalytics,
  setLoading = () => {},
  loading,
  productsList,
  fetchDatabaseData,
  tenantInfo,
  setShowWasteGuideModal,
  setShowCheckoutModal,
  setActiveTab,
  setCatalogTab,
  setUpsellFeature,
}: FinanceTabProps) {
  // Огнооны горим: Өдөр / 7 хоног (Даваа-Ням) / Сар. Огноо бүгд Улаанбаатарын цагаар.
  const todayUb = ubDay(new Date());
  const [rangeMode, setRangeMode] = useState<RangeMode>(() => detectRangeMode(startDate, endDate));

  const goDay = (day: string) => {
    const target = day > todayUb ? todayUb : day;
    setRangeMode("day");
    setStartDate(target);
    setEndDate(target);
    fetchDatabaseData(activeClient, target, target);
  };

  // Сар эсвэл өнгөрсөн 7 хоног харж байхад Өдөр/7 хоног дарвал тэр хугацааны сүүлийн өдрөөс эхэлнэ.
  const anchorDay = endDate && endDate < todayUb ? endDate : todayUb;

  const goWeek = (monday: string) => {
    const start = monday > mondayOf(todayUb) ? mondayOf(todayUb) : monday;
    const sunday = addDaysStr(start, 6);
    // Одоогийн долоо хоногийн төгсгөл өнөөдрөөр хязгаарлагдана.
    const end = sunday > todayUb ? todayUb : sunday;
    setRangeMode("week");
    setStartDate(start);
    setEndDate(end);
    fetchDatabaseData(activeClient, start, end);
  };

  // 5. ДОТООД ХАЙЛТ БА ҮНИЙН ТӨЛӨВҮҮД (Эндээсээ ажиллана):
  const [financeView, setFinanceView] = useState<"report" | "team">("report");
  const [spikeSearch, setSpikeSearch] = useState("");
  const [isSpikesExpanded, setIsSpikesExpanded] = useState(false);
  const [marginSearch, setMarginSearch] = useState("");
  const [customMarginPrices, setCustomMarginPrices] = useState<
    Record<string, number>
  >({});

  const trustSummary = summarizeTrust({
    grades: liveAnalytics?.grades,
    data_trust: liveAnalytics?.data_trust,
  });
  const verifiedActual = Number(liveAnalytics?.financial_ladder?.actual_cogs || 0);
  const verifiedTheo = Number(liveAnalytics?.financial_ladder?.theo_cogs || 0);
  const unverifiedTheo = Number(
    liveAnalytics?.financial_ladder?.unverified_theo ?? trustSummary.unverified_theo,
  );
  const impossible = liveAnalytics
    ? impossibleReasons(
        verifiedActual,
        verifiedTheo,
        parsePct(liveAnalytics?.financial_ladder?.gross_margin),
      )
    : [];

  return (
    <>
      <div className="space-y-6">
        {liveAnalytics && (
          <TruthMeter
            pct={trustSummary.verified_pct}
            tone={trustSummary.tone}
            missing={trustSummary.missing}
            check={trustSummary.check}
            total={trustSummary.total}
            verified={trustSummary.verified}
          />
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setFinanceView("report")}
            className={`px-3 py-2 rounded-xl text-xs font-bold ${financeView === "report" ? "bg-white text-zinc-950" : "bg-zinc-900 text-zinc-300 border border-zinc-800"}`}
          >
            Тайлан
          </button>
          <button
            type="button"
            onClick={() => setFinanceView("team")}
            className={`px-3 py-2 rounded-xl text-xs font-bold ${financeView === "team" ? "bg-white text-zinc-950" : "bg-zinc-900 text-zinc-300 border border-zinc-800"}`}
          >
            Баг
          </button>
        </div>
        {financeView === "team" ? (
          <TeamBoard scorecard={liveAnalytics?.scorecard} team={liveAnalytics?.team_goal} />
        ) : (
        <>
        {/* 💳 ТӨЛБӨРИЙН САНУУЛГА / БАНКНЫ ДАНСНЫ БАННЕР */}
        {tenantInfo?.isExpired && (
          <div className="bg-gradient-to-r from-amber-500/20 via-zinc-900 to-zinc-900 border-2 border-amber-500/50 p-5 rounded-2xl shadow-2xl ">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div>
                <h4 className="text-base font-black text-zinc-300 flex items-center gap-2">
                  Үйлчилгээний эрхийн хугацаа дууссан байна
                </h4>
                <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                  Та системээ тасралтгүй ашиглахын тулд сарын төлбөрөө доорх
                  дансанд шилжүүлнэ үү. Шилжүүлснээс хойш 15-30 минутад эрх
                  сунгагдана.
                </p>
              </div>

              <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 text-xs font-mono text-left lg:text-right shrink-0">
                <p className="text-zinc-400">
                  Хаан банк:{" "}
                  <strong className="text-white text-sm">5000 000 000</strong>
                </p>
                <p className="text-zinc-400">
                  Хүлээн авагч:{" "}
                  <strong className="text-white">Оперлинк ХХК</strong>
                </p>
                <p className="text-zinc-300 font-bold">
                  Утга:{" "}
                  <strong className="text-zinc-200">
                    {activeClient} утасны дугаар
                  </strong>
                </p>
              </div>
            </div>
          </div>
        )}
        {/* 🚨 ТҮҮХИЙ ЭДИЙН ҮНИЙН ӨСӨЛТ (АНХНААСАА ХУМИГДСАН, ДАРАХАД ДЭЛГЭГДДЭГ) */}
        {priceSpikeAlerts.length > 0 &&
          (() => {
            const filteredSpikes = priceSpikeAlerts.filter((item: any) =>
              item.name
                .toLowerCase()
                .includes(spikeSearch.toLowerCase().trim()),
            );

            return (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl overflow-hidden transition-all duration-200 shadow-md">
                {/* 1. ХУМИГДСАН ҮЕД ХАРАГДАХ ЦЭВЭРХЭН 1 МӨР ТУУЗ */}
                <div
                  onClick={() => setIsSpikesExpanded(!isSpikesExpanded)}
                  className="p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3 cursor-pointer hover:bg-rose-500/15 transition select-none"
                >
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="h-5 w-5 text-rose-400  shrink-0" />
                    <div>
                      <h4 className="text-sm font-black text-rose-300">
                        Түүхий эдийн үнэ зах зээл дээр өссөн байна!
                      </h4>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Сүүлийн татан авалтаар нэгжийн үнэ 3%-иас дээш өссөн{" "}
                        {priceSpikeAlerts.length} бараа илэрлээ.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-black text-rose-400 bg-rose-500/20 border border-rose-500/30 px-3 py-1 rounded-xl font-mono">
                      {priceSpikeAlerts.length} бараа өссөн
                    </span>

                    {/* ⌵ Дэлгэх / Хумих товч */}
                    <button
                      type="button"
                      className="bg-zinc-900 border border-rose-500/30 text-rose-300 p-1.5 rounded-xl hover:bg-zinc-800 transition"
                    >
                      {isSpikesExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* 2. ДЭЛГЭГДСЭН ҮЕД ХАРАГДАХ ХАЙЛТ БА КАРТУУД */}
                {isSpikesExpanded && (
                  <div className="p-4 pt-0 border-t border-rose-500/20 space-y-3 animate-in fade-in duration-150">
                    {/* Дэлгэгдсэн үеийн Хайлтын талбар */}
                    <div className="pt-3 flex justify-between items-center gap-2">
                      <span className="text-xs font-bold text-zinc-400">
                        Өссөн бараануудын задаргаа:
                      </span>
                      <input
                        type="text"
                        value={spikeSearch}
                        onChange={(e) => setSpikeSearch(e.target.value)}
                        placeholder="Бараа хайх..."
                        className="bg-zinc-950 border border-rose-500/40 focus:border-rose-400 rounded-xl px-3 py-1.5 text-sm text-white placeholder:text-zinc-500 outline-none w-48 font-bold"
                      />
                    </div>

                    {/* Картуудын гүйдэг хайрцаг */}
                    <div className="max-h-56 overflow-y-auto pr-1">
                      {filteredSpikes.length === 0 ? (
                        <p className="text-xs text-zinc-500 italic py-3 text-center">
                          "{spikeSearch}" нэртэй бараа олдсонгүй.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                          {filteredSpikes.map((alert: any) => (
                            <div
                              key={alert.id}
                              className="bg-zinc-950 p-3 rounded-xl border border-rose-500/20 space-y-1 shadow-sm"
                            >
                              <div className="flex justify-between items-start gap-1">
                                <span
                                  className="text-sm font-bold text-white truncate"
                                  title={alert.name}
                                >
                                  {alert.name}
                                </span>
                                <span className="text-xs font-black text-rose-400 font-mono shrink-0">
                                  ▲ +{alert.percent}%
                                </span>
                              </div>

                              <p className="text-xs text-zinc-400 font-mono flex items-center gap-1">
                                <span>{alert.oldPrice.toLocaleString()} ₮</span>
                                <span className="text-zinc-600">➔</span>
                                <strong className="text-rose-300 font-bold">
                                  {alert.newPrice.toLocaleString()} ₮
                                </strong>
                                <span className="text-zinc-500 font-sans">
                                  / {alert.unit}
                                </span>
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        {/* ========================================================================= */}
        {/* БҮС 1: ОГНООНЫ КОНТРОЛ + 🚦 ӨРТГИЙН НИЙЦЛИЙН ЗААГУУР (HERO STATUS)         */}
        {/* ========================================================================= */}
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 bg-zinc-900 p-4 rounded-2xl border border-zinc-700/50 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="bg-zinc-800/60 p-2.5 rounded-xl border border-zinc-700/20 shrink-0">
              <Activity className="h-5 w-5 text-zinc-200" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">Тайлант Хугацаа</h3>
              <p className="text-sm text-zinc-400">
                Сонгосон хугацааны орлого, өртөг бодитоор бодогдож байна
              </p>
            </div>
          </div>

          {/* 🚦 1. COGS ALIGNMENT INDICATOR (ЭЗНИЙ ХАРАХ ГОЛ ДОХИО) */}
          {isLive &&
            liveAnalytics &&
            (() => {
              const theo = liveAnalytics.financial_ladder?.theo_cogs || 0;
              const unexplained = liveAnalytics.total_unexplained_waste || 0;
              const gapPct = theo > 0 ? (unexplained / theo) * 100 : 0;
              const score = Math.max(0, 100 - gapPct);

              const isHealthy = score >= 95;
              const isWarning = score >= 88 && score < 95;
              const verifiedCount = Number(
                liveAnalytics.data_trust?.verified ?? liveAnalytics.financial_ladder?.verified_count ?? 0,
              );

              if (verifiedCount === 0) {
                return (
                  <div className="px-4 py-2 rounded-xl border flex items-center gap-2.5 shadow-md bg-zinc-800/60 border-zinc-700 text-zinc-300">
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-zinc-500 shrink-0" />
                    <span className="text-xs font-black tracking-wide">
                      Хэмжих боломжгүй • Баталгаажсан бараа алга
                    </span>
                  </div>
                );
              }

              return (
                <div
                  className={`px-4 py-2 rounded-xl border flex items-center gap-2.5 shadow-md ${
                    isHealthy
                      ? "bg-zinc-800/60 border-zinc-800 text-zinc-200"
                      : isWarning
                        ? "bg-zinc-800/60 border-zinc-700 text-zinc-300"
                        : "bg-rose-500/10 border-rose-500/30 text-rose-400 "
                  }`}
                >
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span
                      className={` absolute inline-flex h-full w-full rounded-full opacity-75 ${
                        isHealthy
                          ? "bg-zinc-200"
                          : isWarning
                            ? "bg-amber-400"
                            : "bg-rose-400"
                      }`}
                    />
                    <span
                      className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                        isHealthy
                          ? "bg-white"
                          : isWarning
                            ? "bg-amber-500"
                            : "bg-rose-500"
                      }`}
                    />
                  </span>
                  <span className="text-xs font-black tracking-wide">
                    {isHealthy &&
                      ` ${score.toFixed(1)}% НИЙЦЭЛТЭЙ • Зөрчилгүй (Хэвийн)`}
                    {isWarning &&
                      ` ${score.toFixed(1)}% НИЙЦЭЛТЭЙ • Бага зэргийн зөрүүтэй (Хянах)`}
                    {!isHealthy &&
                      !isWarning &&
                      ` ${score.toFixed(1)}% НИЙЦЭЛТЭЙ • Өндөр зөрүүтэй (Алдагдал)`}
                  </span>
                </div>
              );
            })()}

          {/* Огнооны товчнууд + Excel татах */}
          <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto justify-end">
            {/* Өдөр: өмнөх / дараагийн өдөр */}
            {rangeMode === "day" ? (
              <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 rounded-xl px-1 py-1">
                <button
                  type="button"
                  aria-label="Өмнөх өдөр"
                  onClick={() => goDay(addDaysStr(startDate, -1))}
                  className="p-1 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 transition"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs font-bold text-zinc-200 px-1 font-mono">
                  {startDate === todayUb ? "Өнөөдөр" : startDate.slice(5)}
                </span>
                <button
                  type="button"
                  aria-label="Дараагийн өдөр"
                  disabled={startDate >= todayUb}
                  onClick={() => goDay(addDaysStr(startDate, 1))}
                  className="p-1 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 transition disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => goDay(anchorDay)}
                className="bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-xl text-xs font-bold text-zinc-300 hover:text-white transition"
              >
                Өдөр
              </button>
            )}
            {/* 7 хоног: Даваа - Ням, өмнөх / дараагийн долоо хоног */}
            {rangeMode === "week" ? (
              <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 rounded-xl px-1 py-1">
                <button
                  type="button"
                  aria-label="Өмнөх 7 хоног"
                  onClick={() => goWeek(addDaysStr(startDate, -7))}
                  className="p-1 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 transition"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs font-bold text-zinc-200 px-1 font-mono">
                  {startDate.slice(5)} – {addDaysStr(startDate, 6).slice(5)}
                  {endDate < addDaysStr(startDate, 6) ? " (өнөөдрийг хүртэл)" : ""}
                </span>
                <button
                  type="button"
                  aria-label="Дараагийн 7 хоног"
                  disabled={startDate >= mondayOf(todayUb)}
                  onClick={() => goWeek(addDaysStr(startDate, 7))}
                  className="p-1 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 transition disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => goWeek(mondayOf(anchorDay))}
                className="bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-xl text-xs font-bold text-zinc-300 hover:text-white transition"
              >
                7 хоног
              </button>
            )}

            <select
              value={rangeMode === "month" ? startDate.substring(0, 7) : ""}
              onChange={(e) => {
                setRangeMode("month");
                handleMonthChange(e.target.value);
              }}
              className="bg-zinc-950 border border-zinc-800 text-zinc-200 font-black text-sm rounded-xl px-3 py-2 outline-none cursor-pointer"
            >
              {rangeMode !== "month" && (
                <option value="" disabled className="bg-zinc-950 text-zinc-500">
                  Сар
                </option>
              )}
              {availableMonths.map((ym) => {
                const [year, month] = ym.split("-");
                return (
                  <option
                    key={ym}
                    value={ym}
                    className="bg-zinc-950 text-white font-bold"
                  >
                     {year} оны {month}-р сар
                  </option>
                );
              })}
            </select>

            <button
                      onClick={() => {
            if (tenantInfo?.plan === "starter") {
               setUpsellFeature?.("E-Tax СТ-2 татварын тайлан экспортлох");
              setShowCheckoutModal?.(true); 
              return;
            }
              exportAuditExcel(liveAnalytics, activeClient, startDate, endDate);
            }}
              className="bg-white hover:bg-zinc-200 text-zinc-950 font-black px-4 py-2 rounded-xl text-xs transition flex items-center gap-1.5 shadow-md active:scale-95 shrink-0"
            >
              <Download className="h-3.5 w-3.5" /> E-Tax Экспорт
            </button>
          </div>
        </div>

        {/* 🚨 ТОХИОЛДОЛ 1: ХЭРЭВ БОРЛУУЛСАН ЦЭС ДҮНД ЖОРГҮЙ БАРАА БАЙВАЛ ШУУД ТҮГЖИНЭ */}
        {liveAnalytics?.financial_ladder?.has_unmapped_recipes ? (
          <div className="bg-zinc-800/60 border-2 border-zinc-700 p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
             
                <h4 className="text-base font-black text-zinc-300">
                  Санхүүгийн ашиг ба өртгийн тооцоолол түгжигдсэн
                </h4>
              </div>
              <p className="text-xs text-zinc-300">
                Борлуулалт хийгдсэн{" "}
                <strong>
                  {liveAnalytics.financial_ladder.unmapped_recipes_count}
                </strong>{" "}
                цэс жоргүй (технологийн картгүй) байна. Хуурамч 100% ашиг
                харуулахаас сэргийлж өртөг ба ашгийн тооцоог түр түгжив.
              </p>
            </div>
            <button
              onClick={() => {
                setActiveTab("settings");
                setCatalogTab("recipes");
              }}
              className="bg-white hover:bg-zinc-200 text-zinc-950 font-black px-4 py-2.5 rounded-xl text-xs transition active:scale-95 shrink-0 shadow-md cursor-pointer"
            >
              🔗 Жоргүй цэсийг холбох ➔
            </button>
          </div>
        ) : (
          /* 🟢 ТОХИОЛДОЛ 2: ЖОР БҮРЭН ҮЕД ХАРУУЛАХ БОДИТ КАРТУУД */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. НИЙТ ОРЛОГО */}
            <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-700/50 shadow-lg">
              <p className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-1">
                Нийт Орлого (Revenue)
              </p>
              {loading || !liveAnalytics ? (
                <div className="h-8 w-32 bg-zinc-800  rounded-xl my-1" />
              ) : (
                <p className="text-2xl sm:text-3xl font-black text-white font-mono animate-in fade-in duration-150">
                  {Math.round(
                    liveAnalytics.financial_ladder?.revenue || 0,
                  ).toLocaleString()}{" "}
                  ₮
                </p>
              )}
              <span className="text-xs text-zinc-200 mt-2 block font-semibold">
                ПОС-оор баталгаажсан бодит дүн
              </span>
            </div>

            {/* 2. ӨРТӨГ (FOOD COST) */}
            <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-700/50 shadow-lg">
              <div className="flex justify-between items-center mb-1">
                <p className="text-zinc-400 text-xs font-bold uppercase tracking-wider">
                  Өртөг (Food Cost)
                </p>
                {(() => {
                  const verified = Number(liveAnalytics?.data_trust?.verified ?? 0);
                  const total = Number(liveAnalytics?.data_trust?.total ?? 0);
                  const label =
                    verified === 0
                      ? "Жорын онолоор"
                      : verified < total
                        ? "Хэсэгчлэн тооллогоор"
                        : "Бодит тооллогоор";
                  const tone =
                    verified === 0
                      ? "bg-zinc-800/60 text-zinc-300 border-zinc-700"
                      : verified < total
                        ? "bg-amber-500/10 text-amber-200 border-amber-500/30"
                        : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30";
                  return (
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${tone}`}>
                      {label}
                    </span>
                  );
                })()}
              </div>
              {loading || !liveAnalytics ? (
                <div className="h-8 w-32 bg-zinc-800  rounded-xl my-1" />
              ) : (
                <p className="text-2xl sm:text-3xl font-black text-white font-mono animate-in fade-in duration-150">
                  {Math.round(
                    liveAnalytics.financial_ladder?.actual_cogs || 0,
                  ).toLocaleString()}{" "}
                  ₮
                </p>
              )}
              <span className="text-xs text-zinc-400 mt-2 block">
                Онолын өртөг, зөвхөн баталгаажсан бараа:{" "}
                {Math.round(liveAnalytics?.financial_ladder?.theo_cogs || 0).toLocaleString()}₮
              </span>
              <span className="text-xs text-zinc-300 mt-1 block">
                {liveAnalytics?.data_trust
                  ? `${liveAnalytics.data_trust.total} бараанаас ${liveAnalytics.data_trust.verified} нь баталгаажсан (худалдан авалтын үнийн дүнгийн ${liveAnalytics.data_trust.purchase_pct}%)`
                  : "Баталгаажсан барааны бодит өртөг"}
              </span>
              <span className="text-xs text-amber-200 mt-1 block">
                Дутуу, шалгах барааны онолын өртөг: {Math.round(unverifiedTheo).toLocaleString()}₮
              </span>
              <span className="text-xs text-zinc-400 mt-1 block">{trustSummary.estimate}</span>
            </div>

            {/* 3. БОХИР АШИГ (GROSS MARGIN) */}
            <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-700/50 shadow-lg">
              <p className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-1">
                Бохир Ашиг (Gross Margin)
              </p>
              {loading || !liveAnalytics ? (
                <div className="h-8 w-20 bg-zinc-800  rounded-xl my-1" />
              ) : (
                <p className="text-2xl sm:text-3xl font-black text-zinc-200 font-mono animate-in fade-in duration-150">
                  {liveAnalytics.financial_ladder?.gross_margin || "0%"}
                </p>
              )}
              <span className="text-xs text-zinc-400 mt-2 block">
                Дүн:{" "}
                <strong className="text-zinc-200 font-mono">
                  {liveAnalytics
                    ? `${Math.round(liveAnalytics.financial_ladder?.gross_profit || 0).toLocaleString()}₮`
                    : "-"}
                </strong>
              </span>
            </div>

            {/* 4. ЦЭВЭР АШИГ (NET PROFIT) */}
            <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-700/50 shadow-lg">
              <p className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-1">
                Цэвэр Ашиг (Net Profit)
              </p>
              {loading || !liveAnalytics ? (
                <div className="h-8 w-32 bg-zinc-800  rounded-xl my-1" />
              ) : (
                <p
                  className={`text-2xl sm:text-3xl font-black font-mono animate-in fade-in duration-150 ${
                    (liveAnalytics?.financial_ladder?.net_profit || 0) < 0
                      ? "text-rose-400"
                      : "text-zinc-200"
                  }`}
                >
                  {Math.round(
                    liveAnalytics.financial_ladder?.net_profit || 0,
                  ).toLocaleString()}{" "}
                  ₮
                </p>
              )}
              <span className="text-xs text-zinc-400 mt-2 block">
                Цэвэр маржин:{" "}
                <strong className="text-white font-mono">
                  {liveAnalytics?.financial_ladder?.net_margin || "0%"}
                </strong>
              </span>
            </div>
          </div>
        )}
        {impossible.length > 0 && (
          <div className="bg-rose-950/50 border border-rose-500/50 rounded-2xl p-4">
            <p className="text-sm font-black text-rose-200">{IMPOSSIBLE_TITLE}</p>
            {impossible.map((reason) => (
              <p key={reason} className="text-sm text-rose-100 mt-1">{reason}</p>
            ))}
          </div>
        )}
        <DataGradePanel
          liveAnalytics={liveAnalytics}
          onChanged={() => fetchDatabaseData(activeClient, startDate, endDate, true)}
        />
        <UnexplainedGaps rows={liveAnalytics?.unexplained_gaps} />
        <CupCheck data={liveAnalytics?.cup_check} />
        {/* ========================================================================= */}
        {/* БҮС 3: ДЭЛГЭРЭНГҮЙ ДҮН ШИНЖИЛГЭЭ (P&L LADDER + LIVE FEED БҮТЭЦ)             */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ЗҮҮН ТАЛ (2/3): P&L ШАТАЛСАН ТАЙЛАН & ӨРТГИЙН ОНОШИЛГОО */}
          <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-700/50 shadow-lg lg:col-span-2 space-y-6">
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2 mb-1">
                <TrendingUp className="h-5 w-5 text-zinc-200" />
                Бизнес Моделийн Шаталсан Тайлан (P&L Ladder)
              </h3>
              <p className="text-sm text-zinc-400">
                Борлуулалтын орлогоос цэвэр ашиг хүртэлх зардлын урсгал
              </p>
            </div>

            <div className="space-y-3.5 text-sm divide-y divide-slate-800/80">
              <div className="flex justify-between pt-2">
                <span className="text-zinc-400">
                  1. Нийт Борлуулалтын Орлого (ПОС)
                </span>
                <span className="font-bold text-white font-mono">
                  {liveAnalytics
                    ? `${Math.round(liveAnalytics.financial_ladder?.revenue || 0).toLocaleString()} ₮`
                    : "-"}
                </span>
              </div>

              <div className="flex justify-between pt-3">
                <div>
                  <span className="text-zinc-400 block">
                    2. Борлуулсан Бүтээгдэхүүний Өртөг (COGS)
                  </span>
                  <span className="text-xs text-zinc-500">
                    Баталгаажсан бодит {Math.round(verifiedActual).toLocaleString()}₮ + дутуу, шалгах барааны онолын {Math.round(unverifiedTheo).toLocaleString()}₮
                  </span>
                </div>
                <span className="font-bold text-rose-400 font-mono">
                  -
                  {liveAnalytics
                    ? `${Math.round(liveAnalytics.financial_ladder?.est_cogs || 0).toLocaleString()} ₮`
                    : "-"}
                </span>
              </div>

              <div className="flex justify-between pt-3">
                <div>
                  <span className="text-zinc-400 block">
                    Дутуу, шалгах барааны онолын өртөг
                  </span>
                  <span className="text-xs text-zinc-500">{trustSummary.estimate}</span>
                </div>
                <span className="font-bold text-amber-200 font-mono">
                  {Math.round(unverifiedTheo).toLocaleString()} ₮
                </span>
              </div>

              <div className="flex justify-between pt-3">
                <div>
                  <span className="text-zinc-300 font-bold block">
                    3. БОХИР АШИГ (Gross Profit)
                  </span>
                  <span className="text-xs text-zinc-500">
                    НӨАТ хассан орлогоос{unverifiedTheo > 0 ? ", онолын өртөг орсон тул тооцоолсон дүн" : ""}
                  </span>
                </div>
                <span className="font-black text-zinc-200 font-mono">
                  {liveAnalytics
                    ? `${Math.round(liveAnalytics.financial_ladder?.gross_profit || 0).toLocaleString()} ₮`
                    : "-"}
                </span>
              </div>

              <div className="flex justify-between pt-3">
                <div>
                  <span className="text-zinc-400 block">
                    4. Үйл Ажиллагааны Зардал (OPEX)
                  </span>
                  <span className="text-xs text-zinc-500">
                    Түрээс, Цалин, Хүнсний бус, Ажилчдын хоол, Туршилт
                  </span>
                </div>
                <span className="font-bold text-zinc-300 font-mono">
                  -
                  {liveAnalytics
                    ? `${Math.round(liveAnalytics.financial_ladder?.opex || 0).toLocaleString()} ₮`
                    : "-"}
                </span>
              </div>

              <div className="flex justify-between pt-3">
                <span className="text-zinc-400">
                  5. Татварын Өмнөх Ашиг (EBIT)
                </span>
                <span className="font-bold text-white font-mono">
                  {liveAnalytics
                    ? `${Math.round(liveAnalytics.financial_ladder?.ebit || 0).toLocaleString()} ₮`
                    : "-"}
                </span>
              </div>

              <div className="flex justify-between pt-3.5 bg-zinc-950/60 p-3 rounded-xl border border-zinc-800">
                <span className="text-white font-black text-base">
                  6. ЦЭВЭР АШИГ (Net Profit)
                </span>
                <span
                  className={`font-black text-lg font-mono ${
                    liveAnalytics &&
                    liveAnalytics.financial_ladder?.net_profit < 0
                      ? "text-rose-400"
                      : "text-zinc-200"
                  }`}
                >
                  {liveAnalytics
                    ? `${Math.round(liveAnalytics.financial_ladder?.net_profit || 0).toLocaleString()} ₮`
                    : "-"}
                </span>
              </div>
            </div>

            {/* 🔍 ШАЛТГААНГҮЙ АЛДАГДЛЫН ДҮГНЭЛТ (ЭЗЭНД ӨГӨХ AI ОНОШ) */}
            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-2">
              <div className="flex justify-between items-center text-xm">
                <span className="text-zinc-400 font-bold uppercase tracking-wider">
                  Шалтгаангүй Зөрүү (Бүртгэлгүй Зарлага):
                </span>
                <span
                  className={`font-mono font-black text-sm ${
                    (liveAnalytics?.total_unexplained_waste || 0) > 1000
                      ? "text-rose-400"
                      : "text-zinc-200"
                  }`}
                >
                  {!liveAnalytics?.financial_ladder?.verified_count
                    ? "Хэмжих боломжгүй"
                    : (liveAnalytics?.total_unexplained_waste || 0) > 1000
                    ? `-${Math.round(liveAnalytics.total_unexplained_waste).toLocaleString()} ₮`
                    : "0 ₮"}
                </span>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed">
                {!liveAnalytics?.financial_ladder?.verified_count
                  ? "Баталгаажсан бараа алга. Эхлэл, эцсийн тооллоготой бараа гарсны дараа зөрүүг хэмжинэ."
                  : (liveAnalytics?.total_unexplained_waste || 0) > 1000
                  ? `Зөвхөн баталгаажсан ${liveAnalytics.financial_ladder.verified_count} бараагаар: хаягдал, борлуулалтыг тооллоготой тулгахад дээрх хэмжээний түүхий эд тайлбаргүй байна.`
                  : `Зөвхөн баталгаажсан ${liveAnalytics.financial_ladder.verified_count} бараагаар: тайлбаргүй дутагдал илрээгүй.`}
              </p>
            </div>
          </div>

          {/* БАРУУН ТАЛ (1/3): 2. LIVE ACTIVITY FEED (АМЬД УРСГАЛ) & ХАЯГДАЛ */}
          <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-700/50 shadow-lg flex flex-col">
            <div className="flex justify-between items-center mb-4 border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-base font-black text-rose-400 flex items-center gap-2">
                  <Trash2 className="h-5 w-5" /> Хаягдал & Үйлдэл
                </h3>
                <p className="text-xm text-zinc-400 mt-0.5">
                  Гал тогооны өдөр тутмын амьд бүртгэл
                </p>
              </div>
              <button
                onClick={() => setShowWasteGuideModal(true)}
                className="text-xs font-bold text-zinc-300 bg-zinc-800/60 hover:bg-zinc-200/20 px-2 py-1 rounded-lg transition"
              >
                Заавар
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6 max-h-[500px] pr-1">
              {/* ХАМГИЙН ИХ АЛДАГДАЛТАЙ БАРААНУУД (TOP 3) */}
              <div>
                <p className="text-xs font-black uppercase text-zinc-500 mb-2.5 tracking-widest">
                  Топ 3 Алдагдалтай Бараа
                </p>
                {liveAnalytics?.top_wasters?.length > 0 ? (
                  <div className="space-y-2">
                    {liveAnalytics.top_wasters.map((w: any, idx: number) => (
                      <div
                        key={idx}
                        className="bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800/80 flex justify-between items-center text-xm"
                      >
                        <div>
                          <p className="font-bold text-white">{w.name}</p>
                          <p className="text-xs text-zinc-500 font-mono">
                            Зөрүү: {w.gap.toLocaleString()} {w.unit}
                          </p>
                        </div>
                        <span className="font-mono font-black text-rose-400">
                          -{w.impact.toLocaleString()}₮
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xm text-zinc-500 italic">
                    Тооллогоор илэрсэн алдагдал алга.
                  </p>
                )}
              </div>

              {/* ⚡ ӨДРИЙН БҮРТГЭГДСЭН ЗАРЛАГУУДЫН УРСГАЛ (LIVE FEED) */}
              <div>
                <p className="text-xs font-black uppercase text-zinc-500 mb-3 tracking-widest">
                  Ажилтнуудын Сүүлийн Бүртгэлүүд
                </p>

                {liveAnalytics?.all_timeline_logs?.filter(
                  (l: any) => l.type !== "count" && l.type !== "purchase",
                ).length > 0 ? (
                  <div className="space-y-3 border-l-2 border-zinc-800 pl-3 ml-1">
                    {liveAnalytics.all_timeline_logs
                      .filter(
                        (l: any) => l.type !== "count" && l.type !== "purchase",
                      )
                      .slice(0, 8)
                      .map((log: any, idx: number) => (
                        <div key={idx} className="relative">
                          <span className="absolute -left-[17px] top-1.5 w-2 h-2 rounded-full bg-zinc-600 ring-4 ring-[#1E293B]" />
                          <p className="text-xs font-bold text-zinc-300">
                            {log.worker}{" "}
                            <span className="text-zinc-500 font-normal">
                              бүртгэсэн:
                            </span>
                          </p>
                          <p className="text-xm font-black text-white mt-0.5">
                            {log.item}{" "}
                            <span className="text-rose-400">
                              (-{Math.abs(log.qty)}
                              {log.unit})
                            </span>
                          </p>
                          <p className="text-xs text-zinc-500 mt-0.5 flex gap-2">
                            <span
                              className={`uppercase font-bold ${
                                log.type === "spoilage"
                                  ? "text-rose-400"
                                  : log.type === "staff_meal"
                                    ? "text-zinc-300"
                                    : "text-zinc-300"
                              }`}
                            >
                              {log.type}
                            </span>
                            <span>• {log.notes}</span>
                          </p>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-xm text-zinc-500 italic">
                    Өнөөдөр бүртгэгдсэн хаягдал алга байна.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
        {/* 🛡️ МАРЖИН ХАМГААЛАГЧ (УЯН ХАТАН ТОХИРУУЛГАТАЙ) */}
        {liveAnalytics?.margin_guard_alerts?.length > 0 &&
          (() => {
            const filteredMargins = liveAnalytics.margin_guard_alerts.filter(
              (item: any) =>
                item.product_name
                  .toLowerCase()
                  .includes(marginSearch.toLowerCase().trim()),
            );

            return (
              <div className="bg-zinc-900 p-5 sm:p-6 rounded-2xl border border-zinc-700/50 shadow-xl space-y-4 animate-in fade-in duration-200">
                {/* ТОЛГОЙ ХЭСЭГ */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="bg-zinc-800/60 p-2 rounded-xl border border-zinc-700 shrink-0">
                      <AlertTriangle className="h-5 w-5 text-zinc-300" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-zinc-300">
                        Маржин Хамгаалагч (Үнэ шинэчлэх шаардлагатай)
                      </h3>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Түүхий эдийн өртөг өссөнөөс болж ашиг буурсан цэсүүд. Та
                        өөрийн хүссэн үнээр тохируулж батална уу.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                    <input
                      type="text"
                      value={marginSearch}
                      onChange={(e) => setMarginSearch(e.target.value)}
                      placeholder="Цэс хайх..."
                      className="bg-zinc-950 border border-zinc-700 focus:border-amber-400 rounded-xl px-3 py-1.5 text-sm text-white placeholder:text-zinc-500 outline-none w-36 sm:w-48 font-bold"
                    />
                    <span className="text-xs font-black text-zinc-300 bg-zinc-800/60 border border-zinc-700 px-3 py-1.5 rounded-xl shrink-0 font-mono">
                      {liveAnalytics.margin_guard_alerts.length} цэс
                    </span>
                  </div>
                </div>

                {/* КАРТУУДЫН ХЭСЭГ */}
                <div className="max-h-80 overflow-y-auto pr-1">
                  {filteredMargins.length === 0 ? (
                    <p className="text-xs text-zinc-500 italic py-4 text-center">
                      "{marginSearch}" нэртэй цэс олдсонгүй.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {filteredMargins.map((marginItem: any, idx: number) => {
                        // ⚡ 1. Эзэн гараар үнэ бичсэн бол тэрийг авна, үгүй бол Системийн зөвлөсөн үнийг харуулна
                        const currentEditingPrice =
                          customMarginPrices[marginItem.product_name] !==
                          undefined
                            ? customMarginPrices[marginItem.product_name]
                            : marginItem.suggested_price;

                        // ⚡ 2. Тухайн бичиж байгаа үнээс хамаарч Бохир ашиг хэдэн % болохыг ШУУД бодож харуулна
                        const dynamicMarginPct =
                          currentEditingPrice > 0
                            ? ((currentEditingPrice - marginItem.cost_price) /
                                currentEditingPrice) *
                              100
                            : 0;

                        // ⚡ 3. Зорилтот %-даа хүрсэн үү үгүй юу гэдгийг шалгах
                        const targetPct = parseFloat(
                          marginItem.target_margin_pct,
                        );
                        const isMarginHealthy = dynamicMarginPct >= targetPct;

                        return (
                          <div
                            key={idx}
                            className="bg-zinc-950 p-4 rounded-xl border border-zinc-700 shadow-sm flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex justify-between items-start gap-1 mb-2">
                                <span
                                  className="text-sm font-bold text-white truncate"
                                  title={marginItem.product_name}
                                >
                                  {marginItem.product_name}
                                </span>
                                <span className="text-[10px] font-black text-rose-400 font-mono shrink-0 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                                  Одоогийн маржин:{" "}
                                  {marginItem.current_margin_pct}
                                </span>
                              </div>

                              <div className="text-xs text-zinc-400 space-y-1 font-mono flex justify-between">
                                <div>
                                  <span className="block text-[10px] text-zinc-500">
                                    Орцын өртөг:
                                  </span>
                                  <strong className="text-zinc-200">
                                    {marginItem.cost_price.toLocaleString()} ₮
                                  </strong>
                                </div>
                                <div className="text-right">
                                  <span className="block text-[10px] text-zinc-500">
                                    Одоогийн үнэ:
                                  </span>
                                  <span className="text-zinc-300 line-through">
                                    {marginItem.selling_price.toLocaleString()}{" "}
                                    ₮
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* 🎛️ ИНТЕРАКТИВ ҮНЭ ӨӨРЧЛӨХ ХЭСЭГ */}
                            <div className="mt-3 pt-3 border-t border-zinc-800/80">
                              <label className="flex justify-between text-[10px] text-zinc-400 font-bold mb-1.5 uppercase">
                                <span>Шинэ зарах үнэ (Тохируулах):</span>
                                <span className="text-zinc-300">
                                  Систем{" "}
                                  {marginItem.suggested_price.toLocaleString()}{" "}
                                  ₮ зөвлөв
                                </span>
                              </label>

                              <div className="flex flex-wrap items-center gap-2">
                                {/* Үнэ бичих талбар */}
                                <div className="flex items-center bg-zinc-900 border border-zinc-700 focus-within:border-zinc-700 rounded-lg overflow-hidden w-28 shrink-0">
                                  <input
                                    type="number"
                                    value={currentEditingPrice || ""}
                                    onChange={(e) =>
                                      setCustomMarginPrices((prev) => ({
                                        ...prev,
                                        [marginItem.product_name]:
                                          parseFloat(e.target.value) || 0,
                                      }))
                                    }
                                    className="w-full bg-transparent px-2.5 py-1.5 text-sm text-zinc-200 font-mono font-black outline-none text-right"
                                  />
                                </div>

                                {/* Шууд бодогдох Маржин */}
                                <span
                                  className={`text-xs font-black px-2.5 py-1.5 rounded-lg border flex-1 text-center font-mono ${
                                    isMarginHealthy
                                      ? "bg-zinc-800/60 text-zinc-200 border-zinc-800"
                                      : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                                  }`}
                                >
                                  {dynamicMarginPct.toFixed(1)}% ашиг
                                </span>

                                {/* БАТЛАХ ТОВЧ */}
                                <button
                                  type="button"
                                  disabled={
                                    currentEditingPrice <= marginItem.cost_price || loading
                                  }
                                  onClick={async () => {
                                      if (tenantInfo?.plan === "starter") {
                                         setUpsellFeature?.("Маржин хамгаалагч (Үнэ автоматаар тохируулах)");
                                        setShowCheckoutModal?.(true);
                                        return;
                                }
                                    const targetProd = productsList.find(
                                      (p) =>
                                        cleanString(p.name).toLowerCase() ===
                                        cleanString(
                                          marginItem.product_name,
                                        ).toLowerCase(),
                                    );
                                    if (!targetProd) return;

                                    if (
                                      !confirm(
                                        `"${targetProd.name}"-ийн зарах үнийг ${currentEditingPrice.toLocaleString()} ₮ болгож батлах уу?\n(Шинэ маржин: ${dynamicMarginPct.toFixed(1)}%)`,
                                      )
                                    )
                                      return;

                                    setLoading(true);
                                    const { error } = await supabase
                                      .from("products")
                                      .update({
                                        selling_price: currentEditingPrice,
                                      })
                                      .eq("id", targetProd.id);

                                    if (error) {
                                      alert(
                                        "Үнэ шинэчлэхэд алдаа: " +
                                          error.message,
                                      );
                                    } else {
                                      alert(
                                        ` "${targetProd.name}"-ийн зарах үнэ ${currentEditingPrice.toLocaleString()} ₮ болж шинэчлэгдлээ!`,
                                      );

                                      // Санах ойноос устгах
                                      setCustomMarginPrices((prev) => {
                                        const newObj = { ...prev };
                                        delete newObj[marginItem.product_name];
                                        return newObj;
                                      });

                                      await fetchDatabaseData(
                                        activeClient,
                                        startDate,
                                        endDate,
                                        true,
                                      );
                                    }
                                    setLoading(false);
                                  }}
                                  className="bg-white hover:bg-zinc-200 disabled:opacity-40 text-zinc-950 font-black px-3 py-1.5 rounded-lg text-xs transition shadow shrink-0"
                                >
                                  Батлах
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        {liveAnalytics && (
          <DataGradePanel
            variant="actions"
            liveAnalytics={liveAnalytics}
            onChanged={() => fetchDatabaseData(activeClient, startDate, endDate, true)}
          />
        )}
        </>
        )}
      </div>
    </>
  );
}
