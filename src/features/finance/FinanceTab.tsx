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
} from "lucide-react";
// 2. САНГУУД:
import { exportAuditExcel } from "@/lib/exportAudit";
import { supabase } from "@/lib/supabase";

// 3. ТУСЛАХ ФУНКЦҮҮД (Огноо ба текстийн цэвэрлэгээ):
function cleanString(str: string) {
  return String(str || "")
    .replace(/[\u00a0\s]+/g, " ")
    .trim();
}

function getLocalDateStr(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
  tenantInfo: { isExpired: boolean; endDate: string | null } | null;
  setShowWasteGuideModal: (v: boolean) => void;
  setActiveTab: (tab: any) => void;
  setCatalogTab: (tab: any) => void;
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
  setActiveTab,
  setCatalogTab,
}: FinanceTabProps) {
  // 5. ДОТООД ХАЙЛТ БА ҮНИЙН ТӨЛӨВҮҮД (Эндээсээ ажиллана):
  const [spikeSearch, setSpikeSearch] = useState("");
  const [isSpikesExpanded, setIsSpikesExpanded] = useState(false);
  const [marginSearch, setMarginSearch] = useState("");
  const [customMarginPrices, setCustomMarginPrices] = useState<
    Record<string, number>
  >({});

  return (
    <>
      <div className="space-y-6">
        {/* 💳 ТӨЛБӨРИЙН САНУУЛГА / БАНКНЫ ДАНСНЫ БАННЕР */}
        {tenantInfo?.isExpired && (
          <div className="bg-gradient-to-r from-amber-500/20 via-slate-900 to-slate-900 border-2 border-amber-500/50 p-5 rounded-2xl shadow-2xl ">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div>
                <h4 className="text-base font-black text-zinc-300 flex items-center gap-2">
                  ⚠️ Үйлчилгээний эрхийн хугацаа дууссан байна
                </h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Та системээ тасралтгүй ашиглахын тулд сарын төлбөрөө доорх
                  дансанд шилжүүлнэ үү. Шилжүүлснээс хойш 15-30 минутад эрх
                  сунгагдана.
                </p>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs font-mono text-left lg:text-right shrink-0">
                <p className="text-slate-400">
                  Хаан банк:{" "}
                  <strong className="text-white text-sm">5000 000 000</strong>
                </p>
                <p className="text-slate-400">
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
                      <p className="text-xs text-slate-400 mt-0.5">
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
                      className="bg-slate-900 border border-rose-500/30 text-rose-300 p-1.5 rounded-xl hover:bg-slate-800 transition"
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
                      <span className="text-xs font-bold text-slate-400">
                        Өссөн бараануудын задаргаа:
                      </span>
                      <input
                        type="text"
                        value={spikeSearch}
                        onChange={(e) => setSpikeSearch(e.target.value)}
                        placeholder="🔍 Бараа хайх..."
                        className="bg-slate-950 border border-rose-500/40 focus:border-rose-400 rounded-xl px-3 py-1.5 text-sm text-white placeholder:text-slate-500 outline-none w-48 font-bold"
                      />
                    </div>

                    {/* Картуудын гүйдэг хайрцаг */}
                    <div className="max-h-56 overflow-y-auto pr-1">
                      {filteredSpikes.length === 0 ? (
                        <p className="text-xs text-slate-500 italic py-3 text-center">
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

                              <p className="text-xs text-slate-400 font-mono flex items-center gap-1">
                                <span>{alert.oldPrice.toLocaleString()} ₮</span>
                                <span className="text-slate-600">➔</span>
                                <strong className="text-rose-300 font-bold">
                                  {alert.newPrice.toLocaleString()} ₮
                                </strong>
                                <span className="text-slate-500 font-sans">
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
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 bg-zinc-900] p-4 rounded-2xl border border-slate-700/50 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="bg-zinc-800/60 p-2.5 rounded-xl border border-zinc-700/20 shrink-0">
              <Activity className="h-5 w-5 text-zinc-200" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">Тайлант Хугацаа</h3>
              <p className="text-sm text-slate-400">
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
                      className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
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
                      `🟢 ${score.toFixed(1)}% НИЙЦЭЛТЭЙ • Зөрчилгүй (Хэвийн)`}
                    {isWarning &&
                      `🟡 ${score.toFixed(1)}% НИЙЦЭЛТЭЙ • Бага зэргийн зөрүүтэй (Хянах)`}
                    {!isHealthy &&
                      !isWarning &&
                      `🔴 ${score.toFixed(1)}% НИЙЦЭЛТЭЙ • Өндөр зөрүүтэй (Алдагдал)`}
                  </span>
                </div>
              );
            })()}

          {/* Огнооны товчнууд + Excel татах */}
          <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto justify-end">
            <button
              type="button"
              onClick={() => {
                const today = getLocalDateStr(new Date());
                setStartDate(today);
                setEndDate(today);
                fetchDatabaseData(activeClient, today, today);
              }}
              className="bg-slate-950 hover:bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white transition"
            >
              ☀️ Өнөөдөр
            </button>
            {/* 2. 7 ХОНОГ (Буцааж нэмсэн) */}
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                const past7 = getLocalDateStr(
                  new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
                );
                const today = getLocalDateStr(now);
                setStartDate(past7);
                setEndDate(today);
                fetchDatabaseData(activeClient, past7, today);
              }}
              className="bg-slate-950 hover:bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white transition"
            >
              📅 7 хоног
            </button>

            <select
              value={startDate.substring(0, 7)}
              onChange={(e) => handleMonthChange(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-zinc-200 font-black text-sm rounded-xl px-3 py-2 outline-none cursor-pointer"
            >
              {availableMonths.map((ym) => {
                const [year, month] = ym.split("-");
                return (
                  <option
                    key={ym}
                    value={ym}
                    className="bg-slate-950 text-white font-bold"
                  >
                    📅 {year} оны {month}-р сар
                  </option>
                );
              })}
            </select>

            <button
              onClick={() =>
                exportAuditExcel(
                  liveAnalytics,
                  activeClient,
                  startDate,
                  endDate,
                )
              }
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
                <span className="text-xl">🔒</span>
                <h4 className="text-base font-black text-zinc-300">
                  Санхүүгийн ашиг ба өртгийн тооцоолол түгжигдсэн
                </h4>
              </div>
              <p className="text-xs text-slate-300">
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
            <div className="bg-zinc-900] p-5 rounded-2xl border border-slate-700/50 shadow-lg">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
                Нийт Орлого (Revenue)
              </p>
              {loading || !liveAnalytics ? (
                <div className="h-8 w-32 bg-slate-800  rounded-xl my-1" />
              ) : (
                <p className="text-2xl sm:text-3xl font-black text-white font-mono animate-in fade-in duration-150">
                  {Math.round(
                    liveAnalytics.financial_ladder?.revenue || 0,
                  ).toLocaleString()}{" "}
                  ₮
                </p>
              )}
              <span className="text-xs text-zinc-200 mt-2 block font-semibold">
                ✓ ПОС-оор баталгаажсан бодит дүн
              </span>
            </div>

            {/* 2. ӨРТӨГ (FOOD COST) */}
            <div className="bg-zinc-900] p-5 rounded-2xl border border-slate-700/50 shadow-lg">
              <div className="flex justify-between items-center mb-1">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                  Өртөг (Food Cost)
                </p>
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded border ${
                    liveAnalytics?.financial_ladder?.is_theoretical_mode
                      ? "bg-zinc-800/60 text-zinc-300 border-zinc-700"
                      : "bg-zinc-800/60 text-zinc-200 border-zinc-800"
                  }`}
                >
                  {liveAnalytics?.financial_ladder?.is_theoretical_mode
                    ? "📐 Жорын онолоор"
                    : "✓ Бодит тооллогоор"}
                </span>
              </div>
              {loading || !liveAnalytics ? (
                <div className="h-8 w-32 bg-slate-800  rounded-xl my-1" />
              ) : (
                <p className="text-2xl sm:text-3xl font-black text-white font-mono animate-in fade-in duration-150">
                  {Math.round(
                    liveAnalytics.financial_ladder?.actual_cogs || 0,
                  ).toLocaleString()}{" "}
                  ₮
                </p>
              )}
              <span className="text-xs text-slate-400 mt-2 block">
                {liveAnalytics?.financial_ladder?.is_theoretical_mode
                  ? "Тооллого хийгдээгүй тул жороор бодов"
                  : `Онолын өртөг: ${Math.round(liveAnalytics?.financial_ladder?.theo_cogs || 0).toLocaleString()}₮`}
              </span>
            </div>

            {/* 3. БОХИР АШИГ (GROSS MARGIN) */}
            <div className="bg-zinc-900] p-5 rounded-2xl border border-slate-700/50 shadow-lg">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
                Бохир Ашиг (Gross Margin)
              </p>
              {loading || !liveAnalytics ? (
                <div className="h-8 w-20 bg-slate-800  rounded-xl my-1" />
              ) : (
                <p className="text-2xl sm:text-3xl font-black text-zinc-200 font-mono animate-in fade-in duration-150">
                  {liveAnalytics.financial_ladder?.gross_margin || "0%"}
                </p>
              )}
              <span className="text-xs text-slate-400 mt-2 block">
                Дүн:{" "}
                <strong className="text-slate-200 font-mono">
                  {liveAnalytics
                    ? `${Math.round((liveAnalytics.financial_ladder?.revenue || 0) - (liveAnalytics.financial_ladder?.actual_cogs || 0)).toLocaleString()}₮`
                    : "-"}
                </strong>
              </span>
            </div>

            {/* 4. ЦЭВЭР АШИГ (NET PROFIT) */}
            <div className="bg-zinc-900] p-5 rounded-2xl border border-slate-700/50 shadow-lg">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
                Цэвэр Ашиг (Net Profit)
              </p>
              {loading || !liveAnalytics ? (
                <div className="h-8 w-32 bg-slate-800  rounded-xl my-1" />
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
              <span className="text-xs text-slate-400 mt-2 block">
                Цэвэр маржин:{" "}
                <strong className="text-white font-mono">
                  {liveAnalytics?.financial_ladder?.net_margin || "0%"}
                </strong>
              </span>
            </div>
          </div>
        )}
        {/* ========================================================================= */}
        {/* БҮС 3: ДЭЛГЭРЭНГҮЙ ДҮН ШИНЖИЛГЭЭ (P&L LADDER + LIVE FEED БҮТЭЦ)             */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ЗҮҮН ТАЛ (2/3): P&L ШАТАЛСАН ТАЙЛАН & ӨРТГИЙН ОНОШИЛГОО */}
          <div className="bg-zinc-900] p-6 rounded-2xl border border-slate-700/50 shadow-lg lg:col-span-2 space-y-6">
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2 mb-1">
                <TrendingUp className="h-5 w-5 text-zinc-200" />
                Бизнес Моделийн Шаталсан Тайлан (P&L Ladder)
              </h3>
              <p className="text-sm text-slate-400">
                Борлуулалтын орлогоос цэвэр ашиг хүртэлх зардлын урсгал
              </p>
            </div>

            <div className="space-y-3.5 text-sm divide-y divide-slate-800/80">
              <div className="flex justify-between pt-2">
                <span className="text-slate-400">
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
                  <span className="text-slate-400 block">
                    2. Борлуулсан Бүтээгдэхүүний Өртөг (COGS)
                  </span>
                  <span className="text-xs text-slate-500">
                    Онолын өртөг (
                    {Math.round(
                      liveAnalytics?.financial_ladder?.theo_cogs || 0,
                    ).toLocaleString()}
                    ₮)
                  </span>
                </div>
                <span className="font-bold text-rose-400 font-mono">
                  -
                  {liveAnalytics
                    ? `${Math.round(liveAnalytics.financial_ladder?.actual_cogs || 0).toLocaleString()} ₮`
                    : "-"}
                </span>
              </div>

              <div className="flex justify-between pt-3">
                <span className="text-slate-300 font-bold">
                  3. БОХИР АШИГ (Gross Profit)
                </span>
                <span className="font-black text-zinc-200 font-mono">
                  {liveAnalytics
                    ? `${Math.round((liveAnalytics.financial_ladder?.revenue || 0) - (liveAnalytics.financial_ladder?.actual_cogs || 0)).toLocaleString()} ₮`
                    : "-"}
                </span>
              </div>

              <div className="flex justify-between pt-3">
                <div>
                  <span className="text-slate-400 block">
                    4. Үйл Ажиллагааны Зардал (OPEX)
                  </span>
                  <span className="text-xs text-slate-500">
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
                <span className="text-slate-400">
                  5. Татварын Өмнөх Ашиг (EBIT)
                </span>
                <span className="font-bold text-white font-mono">
                  {liveAnalytics
                    ? `${Math.round(liveAnalytics.financial_ladder?.ebit || 0).toLocaleString()} ₮`
                    : "-"}
                </span>
              </div>

              <div className="flex justify-between pt-3.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
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
            <div className="bg-zinc-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-xm">
                <span className="text-slate-400 font-bold uppercase tracking-wider">
                  Шалтгаангүй Зөрүү (Бүртгэлгүй Зарлага):
                </span>
                <span
                  className={`font-mono font-black text-sm ${
                    (liveAnalytics?.total_unexplained_waste || 0) > 1000
                      ? "text-rose-400"
                      : "text-zinc-200"
                  }`}
                >
                  {(liveAnalytics?.total_unexplained_waste || 0) > 1000
                    ? `-${Math.round(liveAnalytics.total_unexplained_waste).toLocaleString()} ₮`
                    : "0 ₮ (Бүх зардал тайлбарлагдсан ✅)"}
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Kiosk-д бүртгэсэн хаягдал болон ПОС-ын борлуулалтыг эцсийн
                тооллоготой тулгахад
                {(liveAnalytics?.total_unexplained_waste || 0) > 1000
                  ? " дээрх хэмжээний түүхий эд тайлбаргүй байна."
                  : " ямар нэг тайлбаргүй дутагдал илрээгүй, бүх зарлага баримттай байна."}
              </p>
            </div>
          </div>

          {/* БАРУУН ТАЛ (1/3): 2. LIVE ACTIVITY FEED (АМЬД УРСГАЛ) & ХАЯГДАЛ */}
          <div className="bg-zinc-900] p-6 rounded-2xl border border-slate-700/50 shadow-lg flex flex-col">
            <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-rose-400 flex items-center gap-2">
                  <Trash2 className="h-5 w-5" /> Хаягдал & Үйлдэл
                </h3>
                <p className="text-xm text-slate-400 mt-0.5">
                  Гал тогооны өдөр тутмын амьд бүртгэл
                </p>
              </div>
              <button
                onClick={() => setShowWasteGuideModal(true)}
                className="text-xs font-bold text-zinc-300 bg-zinc-800/60 hover:bg-zinc-200/20 px-2 py-1 rounded-lg transition"
              >
                💡 Заавар
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6 max-h-[500px] pr-1">
              {/* ХАМГИЙН ИХ АЛДАГДАЛТАЙ БАРААНУУД (TOP 3) */}
              <div>
                <p className="text-xs font-black uppercase text-slate-500 mb-2.5 tracking-widest">
                  Топ 3 Алдагдалтай Бараа
                </p>
                {liveAnalytics?.top_wasters?.length > 0 ? (
                  <div className="space-y-2">
                    {liveAnalytics.top_wasters.map((w: any, idx: number) => (
                      <div
                        key={idx}
                        className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 flex justify-between items-center text-xm"
                      >
                        <div>
                          <p className="font-bold text-white">{w.name}</p>
                          <p className="text-xs text-slate-500 font-mono">
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
                  <p className="text-xm text-slate-500 italic">
                    Бүртгэгдсэн алдагдалгүй.
                  </p>
                )}
              </div>

              {/* ⚡ ӨДРИЙН БҮРТГЭГДСЭН ЗАРЛАГУУДЫН УРСГАЛ (LIVE FEED) */}
              <div>
                <p className="text-xs font-black uppercase text-slate-500 mb-3 tracking-widest">
                  Ажилтнуудын Сүүлийн Бүртгэлүүд
                </p>

                {liveAnalytics?.all_timeline_logs?.filter(
                  (l: any) => l.type !== "count" && l.type !== "purchase",
                ).length > 0 ? (
                  <div className="space-y-3 border-l-2 border-slate-800 pl-3 ml-1">
                    {liveAnalytics.all_timeline_logs
                      .filter(
                        (l: any) => l.type !== "count" && l.type !== "purchase",
                      )
                      .slice(0, 8)
                      .map((log: any, idx: number) => (
                        <div key={idx} className="relative">
                          <span className="absolute -left-[17px] top-1.5 w-2 h-2 rounded-full bg-slate-600 ring-4 ring-[#1E293B]" />
                          <p className="text-xs font-bold text-slate-300">
                            {log.worker}{" "}
                            <span className="text-slate-500 font-normal">
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
                          <p className="text-xs text-slate-500 mt-0.5 flex gap-2">
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
                  <p className="text-xm text-slate-500 italic">
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
              <div className="bg-zinc-900] p-5 sm:p-6 rounded-2xl border border-amber-500/40 shadow-xl space-y-4 animate-in fade-in duration-200">
                {/* ТОЛГОЙ ХЭСЭГ */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="bg-zinc-800/60 p-2 rounded-xl border border-amber-500/20 shrink-0">
                      <AlertTriangle className="h-5 w-5 text-zinc-300" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-zinc-300">
                        Маржин Хамгаалагч (Үнэ шинэчлэх шаардлагатай)
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
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
                      placeholder="🔍 Цэс хайх..."
                      className="bg-slate-950 border border-amber-500/40 focus:border-amber-400 rounded-xl px-3 py-1.5 text-sm text-white placeholder:text-slate-500 outline-none w-36 sm:w-48 font-bold"
                    />
                    <span className="text-xs font-black text-zinc-300 bg-zinc-800/60 border border-zinc-700 px-3 py-1.5 rounded-xl shrink-0 font-mono">
                      {liveAnalytics.margin_guard_alerts.length} цэс
                    </span>
                  </div>
                </div>

                {/* КАРТУУДЫН ХЭСЭГ */}
                <div className="max-h-80 overflow-y-auto pr-1">
                  {filteredMargins.length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-4 text-center">
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
                            className="bg-zinc-950 p-4 rounded-xl border border-amber-500/20 shadow-sm flex flex-col justify-between"
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

                              <div className="text-xs text-slate-400 space-y-1 font-mono flex justify-between">
                                <div>
                                  <span className="block text-[10px] text-slate-500">
                                    Орцын өртөг:
                                  </span>
                                  <strong className="text-slate-200">
                                    {marginItem.cost_price.toLocaleString()} ₮
                                  </strong>
                                </div>
                                <div className="text-right">
                                  <span className="block text-[10px] text-slate-500">
                                    Одоогийн үнэ:
                                  </span>
                                  <span className="text-slate-300 line-through">
                                    {marginItem.selling_price.toLocaleString()}{" "}
                                    ₮
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* 🎛️ ИНТЕРАКТИВ ҮНЭ ӨӨРЧЛӨХ ХЭСЭГ */}
                            <div className="mt-3 pt-3 border-t border-slate-800/80">
                              <label className="flex justify-between text-[10px] text-slate-400 font-bold mb-1.5 uppercase">
                                <span>Шинэ зарах үнэ (Тохируулах):</span>
                                <span className="text-zinc-300">
                                  Систем{" "}
                                  {marginItem.suggested_price.toLocaleString()}{" "}
                                  ₮ зөвлөв
                                </span>
                              </label>

                              <div className="flex flex-wrap items-center gap-2">
                                {/* Үнэ бичих талбар */}
                                <div className="flex items-center bg-slate-900 border border-slate-700 focus-within:border-zinc-700 rounded-lg overflow-hidden w-28 shrink-0">
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
                                    currentEditingPrice <= marginItem.cost_price
                                  }
                                  onClick={async () => {
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
                                        `✅ "${targetProd.name}"-ийн зарах үнэ ${currentEditingPrice.toLocaleString()} ₮ болж шинэчлэгдлээ!`,
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
                                  className="bg-white hover:bg-zinc-200 disabled:opacity-40 text-slate-950 font-black px-3 py-1.5 rounded-lg text-xs transition shadow shrink-0"
                                >
                                  ✓ Батлах
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
      </div>
    </>
  );
}
