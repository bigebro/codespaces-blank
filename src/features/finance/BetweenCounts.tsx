"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ubDay } from "@/lib/ubDate";
import { displayUnit } from "@/lib/shiftCycle";
import { BETWEEN_COUNTS_NOTE, BETWEEN_COUNTS_TITLE, type BetweenRow, type BetweenSummary } from "@/lib/betweenCounts";

const COLOR: Record<string, string> = {
  Verified: "bg-emerald-500/15 text-emerald-300",
  Check: "bg-amber-500/15 text-amber-300",
};

function monthDay(value: string | null) {
  if (!value) return "—";
  return ubDay(value).slice(5);
}

function qty(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "—";
  return (Math.round(value * 100) / 100).toLocaleString();
}

function signedQty(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "—";
  const rounded = Math.round(value * 100) / 100;
  return `${rounded > 0 ? "+" : ""}${rounded.toLocaleString()}`;
}

function money(value: number | null, signed = false) {
  if (value == null || !Number.isFinite(value)) return "—";
  const rounded = Math.round(value);
  return `${signed && rounded > 0 ? "+" : ""}${rounded.toLocaleString()}₮`;
}

export default function BetweenCounts({ refreshKey }: { refreshKey?: unknown }) {
  const [data, setData] = useState<{ rows: BetweenRow[]; summary: BetweenSummary } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const res = await fetch("/api/inventory/between-counts", {
          headers: { Authorization: `Bearer ${sessionData.session?.access_token || ""}` },
          cache: "no-store",
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !Array.isArray(json.rows)) throw new Error(json.error || "Тооцоо ачааллагдсангүй.");
        if (alive) {
          setData({ rows: json.rows, summary: json.summary });
          setError("");
        }
      } catch (e: any) {
        if (alive) setError(e?.message || "Тооцоо ачааллагдсангүй.");
      }
    })();
    return () => {
      alive = false;
    };
  }, [refreshKey]);

  const measured = (data?.rows || []).filter((row) => row.countsAvailable >= 2);
  const waiting = (data?.rows || []).filter((row) => row.countsAvailable < 2);
  const summary = data?.summary;

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
      <div>
        <h3 className="text-base font-black text-white">{BETWEEN_COUNTS_TITLE}</h3>
        <p className="text-sm text-zinc-400 mt-1">{BETWEEN_COUNTS_NOTE}</p>
      </div>
      {error && <p className="text-sm text-rose-300">{error}</p>}
      {!data && !error && <p className="text-sm text-zinc-400">Ачааллаж байна...</p>}
      {data && summary && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
            <div className="bg-zinc-950 rounded-xl p-3 border border-zinc-800">
              <p className="text-zinc-400">Хоёр тооллоготой бараа</p>
              <p className="text-lg font-black text-white font-mono">{summary.measuredItems} / {summary.totalItems}</p>
            </div>
            <div className="bg-zinc-950 rounded-xl p-3 border border-zinc-800">
              <p className="text-zinc-400">Бодит зарцуулалт, үнэтэй бараа</p>
              <p className="text-lg font-black text-white font-mono">{summary.pricedItems ? money(summary.actualMoney) : "—"}</p>
            </div>
            <div className="bg-zinc-950 rounded-xl p-3 border border-zinc-800">
              <p className="text-zinc-400">Тайлбаргүй зөрүү, цэвэр</p>
              <p className={`text-lg font-black font-mono ${summary.gapMoney > 0 ? "text-rose-300" : summary.gapMoney < 0 ? "text-emerald-300" : "text-white"}`}>
                {summary.pricedItems ? money(summary.gapMoney, true) : "—"}
              </p>
              {summary.pricedItems > 0 && (
                <p className="text-xs text-zinc-400 mt-1">
                  Дутсан {money(summary.lossMoney)} · Илүүдсэн {money(Math.abs(summary.surplusMoney))}
                </p>
              )}
            </div>
            <div className="bg-zinc-950 rounded-xl p-3 border border-zinc-800">
              <p className="text-zinc-400">Үнэ алга, дүнд ороогүй</p>
              <p className="text-lg font-black text-white font-mono">{summary.noPriceItems}</p>
            </div>
          </div>

          {measured.length === 0 ? (
            <p className="text-sm text-zinc-400">Хоёр тооллоготой бараа алга. Бараа хоёр дахь удаагаа тоологдсоны дараа энд гарна.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-zinc-400 border-b border-zinc-800">
                    <th className="py-2 pr-3">Бараа</th>
                    <th className="py-2 px-2">Тооллого</th>
                    <th className="py-2 px-2 text-right">Эхний</th>
                    <th className="py-2 px-2 text-right">Орлого</th>
                    <th className="py-2 px-2 text-right">Эцсийн</th>
                    <th className="py-2 px-2 text-right">Бодит зарцуулалт</th>
                    <th className="py-2 px-2 text-right">Жороор</th>
                    <th className="py-2 px-2 text-right">Бүртгэсэн хаягдал</th>
                    <th className="py-2 px-2 text-right">Тайлбаргүй зөрүү</th>
                    <th className="py-2 px-2 text-right">Дүн</th>
                    <th className="py-2 pl-2">Төлөв</th>
                  </tr>
                </thead>
                <tbody>
                  {measured.map((row) => (
                    <tr key={row.ingredientId} className="border-b border-zinc-800/60 align-top">
                      <td className="py-2 pr-3">
                        <p className="font-bold text-zinc-100">{row.name}</p>
                        {row.reasons.length > 0 && <p className="text-xs text-zinc-400 mt-0.5">{row.reasons.join(". ")}</p>}
                      </td>
                      <td className="py-2 px-2 font-mono text-zinc-300 whitespace-nowrap">
                        {monthDay(row.fromDate)} – {monthDay(row.toDate)}
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-zinc-200">{qty(row.startQty)}</td>
                      <td className="py-2 px-2 text-right font-mono text-zinc-200">{qty(row.purchasedQty)}</td>
                      <td className="py-2 px-2 text-right font-mono text-zinc-200">{qty(row.endQty)}</td>
                      <td className="py-2 px-2 text-right font-mono text-white font-bold whitespace-nowrap">
                        {qty(row.actualUsage)} {displayUnit(row.unit)}
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-zinc-200">{qty(row.expectedUsage)}</td>
                      <td className="py-2 px-2 text-right font-mono text-zinc-200">{qty(row.loggedWaste)}</td>
                      <td className={`py-2 px-2 text-right font-mono font-bold ${(row.unexplainedGap || 0) > 0 ? "text-rose-300" : (row.unexplainedGap || 0) < 0 ? "text-emerald-300" : "text-zinc-200"}`}>
                        {signedQty(row.unexplainedGap)}
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-zinc-200 whitespace-nowrap">{money(row.gapMoney, true)}</td>
                      <td className="py-2 pl-2">
                        <span className={`text-xs font-black px-2 py-1 rounded-lg whitespace-nowrap ${row.status ? COLOR[row.status] : "text-zinc-400"}`}>
                          {row.statusLabel}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {waiting.length > 0 && (
            <details className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
              <summary className="text-sm font-bold text-zinc-300 cursor-pointer">
                Хоёр тооллого хүрээгүй ({waiting.length})
              </summary>
              <div className="space-y-1 mt-2">
                {waiting.map((row) => (
                  <p key={row.ingredientId} className="text-xs text-zinc-400">
                    <span className="text-zinc-200 font-bold">{row.name}</span>
                    {" · "}
                    {row.toDate ? `Сүүлд тоолсон ${monthDay(row.toDate)}` : "Тооллого алга"}
                    {" · Зарцуулалт: —"}
                  </p>
                ))}
              </div>
            </details>
          )}
        </>
      )}
    </section>
  );
}
