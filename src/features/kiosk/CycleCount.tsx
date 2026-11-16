"use client";

import { useState } from "react";
import CountPad from "@/features/kiosk/CountPad";
import {
  displayUnit,
  nightDifference,
  reviewEnteredCount,
  splitWaste,
  UNEXPLAINED_LABEL,
  WASTE_QUESTION,
  WASTE_REASONS,
  type CycleItem,
} from "@/lib/shiftCycle";

export type CycleWaste = { ingredientId: string; name: string; qty: number; type: string; reason: string };
export type CycleUnexplained = { ingredientId: string; name: string; unit: string; qty: number; money: number | null };
export type CycleResult = {
  counts: { ingredientId: string; name: string; unit: string; quantity: number }[];
  waste: CycleWaste[];
  unexplained: CycleUnexplained[];
};

export default function CycleCount({
  items,
  title,
  openerName,
  showNight,
  allowCancel = true,
  onCancel,
  onDone,
}: {
  items: CycleItem[];
  title: string;
  openerName?: string;
  showNight?: boolean;
  allowCancel?: boolean;
  onCancel: () => void;
  onDone: (result: CycleResult) => void;
}) {
  const [index, setIndex] = useState(0);
  const [recounting, setRecounting] = useState(false);
  const [value, setValue] = useState("");
  const [phase, setPhase] = useState<"count" | "waste" | "wasteQty" | "night">("count");
  const [reason, setReason] = useState<{ label: string; type: string } | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [waste, setWaste] = useState<CycleWaste[]>([]);
  const [unexplained, setUnexplained] = useState<CycleUnexplained[]>([]);
  const [error, setError] = useState("");

  const item = items[index];
  if (!item) {
    return (
      <div className="bg-zinc-900 rounded-3xl p-5">
        <p className="text-sm text-zinc-300">Тоолох бараа алга.</p>
        <button type="button" onClick={onCancel} className="mt-4 text-sm text-zinc-300">Буцах</button>
      </div>
    );
  }

  function remember(qty: number, extraWaste?: CycleWaste, extraGap?: CycleUnexplained) {
    const nextCounts = { ...counts, [item.id]: qty };
    const nextWaste = extraWaste ? [...waste, extraWaste] : waste;
    const nextGaps = extraGap ? [...unexplained, extraGap] : unexplained;
    setCounts(nextCounts);
    setWaste(nextWaste);
    setUnexplained(nextGaps);
    setValue("");
    setRecounting(false);
    setReason(null);
    setError("");
    if (index + 1 < items.length) {
      setIndex(index + 1);
      setPhase("count");
      return;
    }
    if (showNight) {
      setPhase("night");
      return;
    }
    finish(nextCounts, nextWaste, nextGaps);
  }

  function finish(nextCounts: Record<string, number>, nextWaste: CycleWaste[], nextGaps: CycleUnexplained[]) {
    onDone({
      counts: items.map((row) => ({
        ingredientId: row.id,
        name: row.name,
        unit: row.unit,
        quantity: nextCounts[row.id],
      })),
      waste: nextWaste,
      unexplained: nextGaps,
    });
  }

  function submitCount() {
    if (value.trim() === "" || !Number.isFinite(Number(value)) || Number(value) < 0) {
      setError("Тоо оруулна уу.");
      return;
    }
    const qty = Number(value);
    const review = reviewEnteredCount(item, qty, recounting);
    if (review.needsRecount) {
      setRecounting(true);
      setValue("");
      setError("");
      return;
    }
    if (review.needsWaste) {
      setCounts({ ...counts, [item.id]: qty });
      setPhase("waste");
      setError("");
      return;
    }
    if (review.unexplainedQty != null && Math.abs(review.unexplainedQty) > 0.0001) {
      remember(qty, undefined, {
        ingredientId: item.id,
        name: item.name,
        unit: item.unit,
        qty: review.unexplainedQty,
        money: review.money,
      });
      return;
    }
    remember(qty);
  }

  function acceptWaste(wasteQty: number) {
    const gapQty = reviewEnteredCount(item, counts[item.id], true).gapQty || 0;
    if (wasteQty < 0 || wasteQty - gapQty > 0.0001) {
      setError("Хаягдлын тоо зөрүүгээс их байж болохгүй.");
      return;
    }
    const split = splitWaste(gapQty, wasteQty, item.unitPrice);
    const chosen = reason;
    remember(
      counts[item.id],
      wasteQty > 0 && chosen
        ? { ingredientId: item.id, name: item.name, qty: wasteQty, type: chosen.type, reason: chosen.label }
        : undefined,
      split.show
        ? { ingredientId: item.id, name: item.name, unit: item.unit, qty: split.remaining, money: split.money }
        : undefined,
    );
  }

  const gapNow = phase === "waste" || phase === "wasteQty"
    ? reviewEnteredCount(item, counts[item.id], true)
    : null;

  return (
    <div className="flex flex-col gap-3 h-full min-h-0">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-white">{title}</h2>
          <p className="text-xs text-zinc-400">{phase === "night" ? "Хаалт ба нээлт" : `${index + 1} / ${items.length}`}</p>
        </div>
        {allowCancel ? (
          <button type="button" onClick={onCancel} className="text-sm font-bold text-zinc-300 px-3 py-2">Буцах</button>
        ) : (
          <span />
        )}
      </div>

      {phase === "count" && (
        <>
          <CountPad
            name={item.name}
            unit={item.unit}
            value={value}
            onChange={setValue}
            hint={recounting ? "Дахин тоолно уу" : "Ойролцоогоор 2 минут"}
          />
          {item.unitPrice == null ? <p className="text-sm text-zinc-400">Үнэ алга</p> : null}
          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
          <button type="button" onClick={submitCount} className="h-14 rounded-2xl bg-white text-zinc-950 font-black">
            {index + 1 === items.length ? "Дуусгах" : "Дараах"}
          </button>
        </>
      )}

      {phase === "waste" && gapNow && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-4 space-y-3">
          <p className="text-lg font-black text-white">{item.name}</p>
          <p className="text-sm text-zinc-200">{WASTE_QUESTION}</p>
          <p className="text-sm text-zinc-400">
            Зөрүү {Math.round((gapNow.gapQty || 0) * 1000) / 1000} {displayUnit(item.unit)}
            {gapNow.money != null ? ` / ${gapNow.money.toLocaleString()}₮` : " / Үнэ алга"}
          </p>
          <div className="grid grid-cols-1 gap-2">
            {WASTE_REASONS.map((row) => (
              <button
                key={row.label}
                type="button"
                onClick={() => {
                  setReason(row);
                  setValue(String(Math.round((gapNow.gapQty || 0) * 1000) / 1000));
                  setPhase("wasteQty");
                  setError("");
                }}
                className="h-14 rounded-2xl bg-zinc-800 text-white font-bold"
              >
                {row.label}
              </button>
            ))}
            <button type="button" onClick={() => acceptWaste(0)} className="h-14 rounded-2xl border border-zinc-700 text-zinc-200 font-bold">
              Үгүй
            </button>
          </div>
        </div>
      )}

      {phase === "wasteQty" && reason && gapNow && (
        <>
          <CountPad
            name={item.name}
            unit={item.unit}
            value={value}
            onChange={setValue}
            hint={`${reason.label}. Хаягдлын тоо`}
          />
          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
          <button
            type="button"
            onClick={() => acceptWaste(Number(value))}
            className="h-14 rounded-2xl bg-white text-zinc-950 font-black"
          >
            Хадгалах
          </button>
        </>
      )}

      {phase === "night" && (
        <div className="space-y-3 overflow-y-auto">
          {items.map((row) => {
            const openQty = counts[row.id];
            const closeQty = row.closeQty;
            const night = closeQty == null || openQty == null ? null : nightDifference(closeQty, openQty);
            return (
              <div key={row.id} className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
                <p className="font-black text-white">{row.name}</p>
                <p className="text-sm text-zinc-300 mt-1">Хаалт: {closeQty ?? "алга"} {displayUnit(row.unit)} / {row.closeStaff || "ажилтан алга"}</p>
                <p className="text-sm text-zinc-300">Нээлт: {openQty} {displayUnit(row.unit)} / {openerName || "ажилтан алга"}</p>
                {night?.changed ? (
                  <p className="text-sm font-black text-amber-200 mt-2">{night.label} {night.diff}</p>
                ) : (
                  <p className="text-sm text-zinc-500 mt-2">Зөрүүгүй</p>
                )}
              </div>
            );
          })}
          <button
            type="button"
            onClick={() => finish(counts, waste, unexplained)}
            className="h-14 w-full rounded-2xl bg-white text-zinc-950 font-black"
          >
            Хадгалах
          </button>
          {unexplained.length > 0 ? (
            <p className="text-xs text-zinc-400">{UNEXPLAINED_LABEL}: {unexplained.length}</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
