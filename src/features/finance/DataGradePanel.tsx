"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { ubDay } from "@/lib/ubDate";

type Grade = {
  ingredient_id: string;
  name: string;
  unit: string;
  status: "Verified" | "Check" | "Missing";
  reasons: string[];
  action: "count" | "price" | "duplicate" | "date" | null;
  purchase_value: number;
  gap_money: number | null;
  price_log_id?: string | null;
  future_log_id?: string | null;
  duplicate?: { a: LogRow; b: LogRow } | null;
};

type LogRow = { id: string; qty: number; cost: number; date: string; notes?: string };

const LABEL: Record<Grade["status"], string> = {
  Verified: "Баталгаажсан",
  Check: "Шалгах",
  Missing: "Дутуу",
};

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

function money(value: number) {
  const rounded = Math.round(value);
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded.toLocaleString()}₮`;
}

export default function DataGradePanel({
  liveAnalytics,
  onChanged,
}: {
  liveAnalytics: any;
  onChanged: () => Promise<void> | void;
}) {
  const trust = liveAnalytics?.data_trust || liveAnalytics?.financial_ladder?.data_trust;
  const gap = Number(liveAnalytics?.verified_gap ?? liveAnalytics?.financial_ladder?.verified_gap ?? 0);
  const actual = Number(liveAnalytics?.financial_ladder?.actual_cogs || 0);
  const theo = Number(liveAnalytics?.financial_ladder?.theo_cogs || 0);
  const rows: Grade[] = liveAnalytics?.fix_list || [];
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [priceFor, setPriceFor] = useState<Grade | null>(null);
  const [price, setPrice] = useState("");
  const [dateFor, setDateFor] = useState<Grade | null>(null);
  const [date, setDate] = useState("");
  const [pairFor, setPairFor] = useState<Grade | null>(null);

  if (!trust) return null;

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
    await onChanged();
  }

  async function run(key: string, body: Record<string, unknown>) {
    setBusy(key);
    try {
      await callFix(body);
      setPriceFor(null);
      setDateFor(null);
      setPairFor(null);
    } catch (err: any) {
      setError(err.message || "Засвар хадгалагдсангүй.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
      <div>
        <h3 className="text-base font-black text-white">Өгөгдлийн итгэл</h3>
        <p className="text-sm text-zinc-300 mt-1">
          {trust.total} бараанаас {trust.verified} нь баталгаажсан (худалдан авалтын үнийн дүнгийн {trust.purchase_pct}%)
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        <div className="bg-zinc-950 rounded-xl p-3 border border-zinc-800">
          <p className="text-zinc-400">Бодит өртөг, баталгаажсан</p>
          <p className="text-lg font-black text-white font-mono">{Math.round(actual).toLocaleString()}₮</p>
        </div>
        <div className="bg-zinc-950 rounded-xl p-3 border border-zinc-800">
          <p className="text-zinc-400">Онолын өртөг, адил бараа</p>
          <p className="text-lg font-black text-white font-mono">{Math.round(theo).toLocaleString()}₮</p>
        </div>
        <div className="bg-zinc-950 rounded-xl p-3 border border-zinc-800">
          <p className="text-zinc-400">Зөрүү (бодит - онол)</p>
          <p className={`text-lg font-black font-mono ${gap < 0 ? "text-emerald-300" : gap > 0 ? "text-rose-300" : "text-white"}`}>
            {money(gap)}
          </p>
        </div>
      </div>
      {error && <p className="text-sm text-rose-300">{error}</p>}
      <div className="space-y-2">
        {rows.length === 0 ? (
          <p className="text-sm text-zinc-400">Засах зүйл алга. Бүх идэвхтэй бараа баталгаажсан.</p>
        ) : (
          rows.map((row) => (
            <div key={row.ingredient_id} className="flex flex-col sm:flex-row sm:items-center gap-3 bg-zinc-950 border border-zinc-800 rounded-xl p-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-black px-2 py-1 rounded-lg ${COLOR[row.status] || COLOR.Check}`}>
                    {LABEL[row.status] || row.status}
                  </span>
                  <span className="font-bold text-zinc-100 truncate">{row.name}</span>
                </div>
                <p className="text-xs text-zinc-400 mt-1">{(row.reasons || []).join(". ")}</p>
                <p className="text-xs text-zinc-500 mt-1">
                  Худалдан авалт {Math.round(row.purchase_value || 0).toLocaleString()}₮
                  {row.gap_money == null ? ". Өртөгт оруулаагүй." : `. Зөрүү ${money(row.gap_money)}.`}
                </p>
              </div>
              {row.action && (
                <button
                  type="button"
                  disabled={busy === row.ingredient_id}
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
                  {busy === row.ingredient_id ? "Хадгалж байна" : ACTION[row.action]}
                </button>
              )}
            </div>
          ))
        )}
      </div>

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
    </section>
  );
}
