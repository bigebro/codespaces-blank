"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { ubDay } from "@/lib/ubDate";
import { COMPLETE_PERIOD, INCOMPLETE_PERIOD, STATUS_LABEL, SURPLUS_NOTE, topFixActions, unlockLine, dashboardTrust, trustConfirmedLine } from "@/lib/honestDashboard";
import { gradeGuide } from "@/lib/gradeGuide";

type Grade = {
  ingredient_id: string;
  name: string;
  unit: string;
  status: "Verified" | "Check" | "Missing";
  reasons: string[];
  action: "count" | "price" | "duplicate" | "date" | null;
  fixable?: boolean;
  gap_qty?: number | null;
  theo_money?: number;
  purchase_value: number;
  gap_money: number | null;
  actual_money?: number;
  measured_from?: string | null;
  measured_until?: string | null;
  price_log_id?: string | null;
  future_log_id?: string | null;
  duplicate?: { a: LogRow; b: LogRow } | null;
  has_start?: boolean;
  has_end?: boolean;
  start_qty?: number | null;
  end_qty?: number | null;
  purchased_qty?: number | null;
  theoretical_qty?: number | null;
  actual_qty?: number | null;
  partial?: boolean;
  waste_spoilage?: number | null;
  waste_spill?: number | null;
  waste_testing?: number | null;
  waste_staff_meal?: number | null;
  waste_other?: number | null;
  unexplained_event_qty?: number | null;
  unexplained_event_money?: number | null;
};

type LogRow = { id: string; qty: number; cost: number; date: string; notes?: string };

const COLOR: Record<Grade["status"], string> = {
  Verified: "bg-emerald-500/15 text-emerald-300",
  Check: "bg-amber-500/15 text-amber-300",
  Missing: "bg-rose-500/15 text-rose-300",
};

const ACTION: Record<Exclude<Grade["action"], null>, string> = {
  count: "Тоолох даалгавар үүсгэх",
  price: "Үнэ оруулах",
  duplicate: "Шалгах",
  date: "Огноо засах",
};

function monthDay(day: string) {
  const iso = /^\d{4}-\d{2}-\d{2}/.test(day) ? day.slice(0, 10) : ubDay(day);
  return iso.slice(5);
}

function money(value: number) {
  const rounded = Math.round(value);
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded.toLocaleString()}₮`;
}

export default function DataGradePanel({
  liveAnalytics,
  onChanged,
  variant = "full",
}: {
  liveAnalytics: any;
  onChanged: () => Promise<void> | void;
  variant?: "full" | "actions";
}) {
  const board = dashboardTrust(liveAnalytics);
  const trust = board.summary;
  const gap = Number(liveAnalytics?.verified_gap ?? liveAnalytics?.financial_ladder?.verified_gap ?? 0);
  const actual = Number(liveAnalytics?.financial_ladder?.actual_cogs || 0);
  const theo = Number(liveAnalytics?.financial_ladder?.theo_cogs || 0);
  const allRows: Grade[] = liveAnalytics?.fix_list || [];
  const rows = allRows.filter((row) => row.fixable !== false);
  const lockedRows = allRows.filter((row) => row.fixable === false);
  const gradedTotal = Number(trust?.total ?? (liveAnalytics?.grades || []).length ?? 0);
  const losses = Number(liveAnalytics?.total_waste_loss || 0);
  const surpluses = Number(liveAnalytics?.total_surplus_savings || 0);
  const topRows = topFixActions(rows, 3);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(""); const [sent, setSent] = useState<string[]>([]);
  const [priceFor, setPriceFor] = useState<Grade | null>(null);
  const [price, setPrice] = useState("");
  const [dateFor, setDateFor] = useState<Grade | null>(null);
  const [date, setDate] = useState("");
  const [pairFor, setPairFor] = useState<Grade | null>(null);

  async function callFix(body: Record<string, unknown>) {
    setError("");
    const { data: sessionData } = await supabase.auth.getSession();
    const res = await fetch("/api/inventory/fix", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionData.session?.access_token || ""}`,
      },
      body: JSON.stringify(body),
    });
      const json = await res.json().catch(() => ({}));
    if (!res.ok || json.ok === false) throw new Error(json.message || "Засвар хадгалагдсангүй.");
    void onChanged();
  }

  async function run(key: string, body: Record<string, unknown>) {
    setBusy(key);
    try {
      await callFix(body);
      if (body.action === "count_task") { setNotice("Тоолох даалгавар таблет руу илгээгдлээ."); setSent((s) => [...s, ...((body.ingredientIds as string[]) || [])]); }
      setPriceFor(null);
      setDateFor(null);
      setPairFor(null);
    } catch (err: any) {
      setError(err.message || "Засвар хадгалагдсангүй.");
    } finally {
      setBusy(null);
    }
  }

  if (!trust && variant === "full") return null;

  const actionButton = (row: Grade) => {
    const guide = gradeGuide(row);
    if (!row.action) return null;
    if (row.action === "count" && !guide.countTask) return null;
    return (
    <button
      type="button"
      disabled={busy === row.ingredient_id || (row.action === "count" && sent.includes(row.ingredient_id))}
      onClick={() => {
        if (row.action === "count") {
          run(row.ingredient_id, { action: "count_task", ingredientIds: [row.ingredient_id] });
        } else if (row.action === "price") {
          setPriceFor(row);
          setPrice("");
        } else if (row.action === "date") {
          setDateFor(row);
          setDate(ubDay(new Date()));
        } else if (row.action === "duplicate") {
          setPairFor(row);
        }
      }}
      className="shrink-0 bg-white text-zinc-950 font-bold text-xs px-3 py-2 rounded-xl disabled:opacity-50"
    >
      {busy === row.ingredient_id ? "Хадгалж байна" : row.action === "count" && sent.includes(row.ingredient_id) ? "Илгээсэн" : ACTION[row.action]}
    </button>
    );
  };

  const guideBlock = (row: Grade) => {
    const guide = gradeGuide(row);
    return (
      <div className="mt-2 space-y-1">
        {guide.facts.map((fact, index) => (
          <p key={`${row.ingredient_id}-fact-${index}`} className="text-xs text-zinc-300">{fact}</p>
        ))}
        <ol className="list-decimal pl-4 text-xs text-zinc-200 space-y-1">
          {guide.steps.map((step, index) => (
            <li key={`${row.ingredient_id}-step-${index}`}>{step}</li>
          ))}
        </ol>
      </div>
    );
  };

  const dialogs = (
    <>
      {priceFor && (
        <form
          className="bg-zinc-950 border border-zinc-700 rounded-xl p-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!priceFor.price_log_id) {
              setError("Үнэгүй орлогын мөр олдсонгүй.");
              return;
            }
            run(priceFor.ingredient_id, { action: "set_price", logId: priceFor.price_log_id, totalCost: Number(price) });
          }}
        >
          <p className="text-sm font-bold text-white">{priceFor.name}: нийт үнэ</p>
          <input
            type="number"
            min="0"
            required
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white"
          />
          <div className="flex gap-2">
            <button type="submit" className="bg-white text-zinc-950 font-bold text-xs px-3 py-2 rounded-xl">Хадгалах</button>
            <button type="button" onClick={() => setPriceFor(null)} className="text-zinc-300 text-xs px-3 py-2">Болих</button>
          </div>
        </form>
      )}
      {dateFor && (
        <form
          className="bg-zinc-950 border border-zinc-700 rounded-xl p-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!dateFor.future_log_id) return;
            run(dateFor.ingredient_id, { action: "set_date", logId: dateFor.future_log_id, date });
          }}
        >
          <p className="text-sm font-bold text-white">{dateFor.name}: огноо засах</p>
          <input
            type="date"
            required
            value={date}
            max={ubDay(new Date())}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white"
          />
          <div className="flex gap-2">
            <button type="submit" className="bg-white text-zinc-950 font-bold text-xs px-3 py-2 rounded-xl">Хадгалах</button>
            <button type="button" onClick={() => setDateFor(null)} className="text-zinc-300 text-xs px-3 py-2">Болих</button>
          </div>
        </form>
      )}
      {pairFor?.duplicate && (
        <div className="bg-zinc-950 border border-zinc-700 rounded-xl p-4 space-y-3">
          <p className="text-sm font-bold text-white">{pairFor.name}: аль мөрийг үлдээх вэ</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[pairFor.duplicate.a, pairFor.duplicate.b].map((row) => (
              <div key={row.id} className="border border-zinc-800 rounded-xl p-3 text-sm text-zinc-200">
                <p>{ubDay(row.date)}</p>
                <p>{row.qty} {pairFor.unit} / {Math.round(row.cost || 0).toLocaleString()}₮</p>
                <p className="text-zinc-500 text-xs">{row.notes || "Тайлбаргүй"}</p>
                <button
                  type="button"
                  className="mt-2 bg-white text-zinc-950 font-bold text-xs px-3 py-2 rounded-xl"
                  onClick={() => {
                    if (!window.confirm("Нөгөө мөрийг устгах уу?")) return;
                    const drop = row.id === pairFor.duplicate?.a.id ? pairFor.duplicate?.b.id : pairFor.duplicate?.a.id;
                    run(pairFor.ingredient_id, { action: "delete_log", logId: drop });
                  }}
                >
                  Үүнийг үлдээх
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setPairFor(null)} className="text-zinc-300 text-xs">Болих</button>
        </div>
      )}
    </>
  );

  if (variant === "actions") {
    return (
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
        <h3 className="text-base font-black text-white">Эхлээд хийх 3 ажил</h3>
        {topRows.length === 0 ? (
          <p className="text-sm text-zinc-300">{trust.total > 0 && trust.verified === trust.total ? COMPLETE_PERIOD : INCOMPLETE_PERIOD}</p>
        ) : (
          topRows.map((row) => (
            <div key={row.ingredient_id} className="flex flex-col sm:flex-row sm:items-center gap-3 bg-zinc-950 border border-zinc-800 rounded-xl p-3">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-zinc-100">{row.name}</p>
                <p className="text-xs text-zinc-400 mt-1">
                  {Number(row.purchase_value) > 0
                    ? unlockLine(row.purchase_value, row.theo_money)
                    : gradeGuide(row).facts[0]}
                </p>
                <p className="text-xs text-zinc-300 mt-1">{gradeGuide(row).steps[0]}</p>
              </div>
              {actionButton(row)}
            </div>
          ))
        )}
        {error && <p className="text-sm text-rose-300">{error}</p>}
        {notice && <p className="text-sm text-emerald-300">{notice}</p>}
        {dialogs}
      </section>
    );
  }

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
      <div>
        <h3 className="text-base font-black text-white">Өгөгдлийн итгэл</h3>
        <p className="text-sm text-zinc-300 mt-1">
          {trustConfirmedLine(trust)}
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-sm">
        <div className="bg-zinc-950 rounded-xl p-3 border border-zinc-800">
          <p className="text-zinc-400">Бодит өртөг, баталгаажсан</p>
          <p className="text-lg font-black text-white font-mono">{Math.round(actual).toLocaleString()}₮</p>
        </div>
        <div className="bg-zinc-950 rounded-xl p-3 border border-zinc-800">
          <p className="text-zinc-400">Онолын өртөг, адил бараа</p>
          <p className="text-lg font-black text-white font-mono">{Math.round(theo).toLocaleString()}₮</p>
        </div>
        <div className="bg-zinc-950 rounded-xl p-3 border border-zinc-800 sm:col-span-1">
          <p className="text-zinc-400">Цэвэр зөрүү</p>
          <p className={`text-lg font-black font-mono ${gap < 0 ? "text-emerald-300" : gap > 0 ? "text-rose-300" : "text-white"}`}>
            {money(gap)}
          </p>
        </div>
        <div className="bg-zinc-950 rounded-xl p-3 border border-zinc-800">
          <p className="text-zinc-400">Алдагдал</p>
          <p className="text-lg font-black text-rose-300 font-mono">{Math.round(losses).toLocaleString()}₮</p>
        </div>
        <div className="bg-zinc-950 rounded-xl p-3 border border-zinc-800">
          <p className="text-zinc-400">Илүүдэл</p>
          <p className="text-lg font-black text-amber-200 font-mono">{Math.round(surpluses).toLocaleString()}₮</p>
          <p className="text-xs text-zinc-400 mt-1">{SURPLUS_NOTE}</p>
        </div>
      </div>
      {error && <p className="text-sm text-rose-300">{error}</p>}
      {notice && <p className="text-sm text-emerald-300">{notice}</p>}
      <div className="space-y-2">
        {rows.length === 0 ? (
          <p className="text-sm text-zinc-400">{lockedRows.length
            ? "Одоо засах зүйл алга."
            : gradedTotal > 0
              ? "Засах зүйл алга. Бүх идэвхтэй бараа баталгаажсан."
              : "Энэ хугацаанд хэмжсэн бараа алга. Каталог, эхний болон эцсийн тооллого оруулсны дараа энд гарна."}</p>
        ) : (
          rows.map((row) => (
            <div key={row.ingredient_id} className="flex flex-col sm:flex-row sm:items-center gap-3 bg-zinc-950 border border-zinc-800 rounded-xl p-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-black px-2 py-1 rounded-lg ${COLOR[row.status] || COLOR.Check}`}>
                    {STATUS_LABEL[row.status] || row.status}
                  </span>
                  <span className="font-bold text-zinc-100 truncate">{row.name}</span>
                </div>
                     <p className="text-xs text-zinc-400 mt-1">{(row.reasons || []).filter((r) => !(row.measured_from && r.startsWith("Хэмжсэн:"))).join(". ")}</p>
                {row.measured_from && (
                  <p className="text-xs text-amber-200/90 mt-1">
                    Хэмжсэн: {monthDay(row.measured_from)} – {monthDay(row.measured_until || row.measured_from)}
                  </p>
                )}
                <p className="text-xs text-zinc-500 mt-1">
                  Худалдан авалт {Math.round(row.purchase_value || 0).toLocaleString()}₮
                  {row.measured_from
                    ? `. Хэмжсэн хугацааны бодит өртөг ${Math.round(row.actual_money || 0).toLocaleString()}₮.`
                    : row.gap_money == null
                      ? ". Өртөгт оруулаагүй."
                      : `. Зөрүү ${money(row.gap_money)}.`}
                </p>
                {guideBlock(row)}
              </div>
              {actionButton(row)}
            </div>
          ))
        )}
      </div>

      {lockedRows.length > 0 && (
        <details className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
          <summary className="text-sm font-bold text-zinc-300 cursor-pointer">
            Зөвхөн хуучин тооллогоор засна ({lockedRows.length})
          </summary>
          <p className="text-xs text-zinc-400 mt-2">
            Тооллогын өдөр өнгөрсөн тул одоо тоолох нь энэ сарыг засахгүй. Цаас эсвэл Excel дээр тухайн өдрийн тооллого байвал "Бөөнөөр Импортлох" хэсгийн "Агуулахын Босоо Тооллого"-оор тэр огноогоор оруулна уу.
          </p>
          <div className="space-y-2 mt-2">
            {lockedRows.map((row) => (
              <div key={row.ingredient_id} className="border border-zinc-800 rounded-xl p-3">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-black px-2 py-1 rounded-lg ${COLOR[row.status] || COLOR.Check}`}>
                    {STATUS_LABEL[row.status] || row.status}
                  </span>
                  <span className="font-bold text-zinc-100 truncate">{row.name}</span>
                </div>
                <p className="text-xs text-zinc-400 mt-1">{(row.reasons || []).join(". ")}</p>
                {guideBlock(row)}
                <p className="text-xs text-zinc-500 mt-1">Худалдан авалт {Math.round(row.purchase_value || 0).toLocaleString()}₮. Өртөгт оруулаагүй.</p>
              </div>
            ))}
          </div>
        </details>
      )}

      {dialogs}
    </section>
  );
}
