"use client";

import { displayUnit } from "@/lib/shiftCycle";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "del"];

export default function CountPad({
  name,
  unit,
  value,
  onChange,
  hint,
}: {
  name: string;
  unit: string;
  value: string;
  onChange: (next: string) => void;
  hint?: string;
}) {
  function press(key: string) {
    if (key === "del") {
      onChange(value.slice(0, -1));
      return;
    }
    if (key === "." && value.includes(".")) return;
    if (value.replace(".", "").length >= 8) return;
    if (value === "0" && key !== ".") onChange(key);
    else onChange(`${value}${key}`);
  }

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-4 space-y-4">
      <div>
        <p className="text-lg font-black text-white">{name}</p>
        {hint ? <p className="text-sm text-zinc-400 mt-1">{hint}</p> : null}
      </div>
      <div className="bg-zinc-900 rounded-2xl px-4 py-5 flex items-end justify-between gap-3">
        <p className="text-4xl font-black text-white font-mono min-h-[48px]">{value || "0"}</p>
        <p className="text-lg font-bold text-zinc-300 pb-1">{displayUnit(unit)}</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => press(key)}
            className={`h-16 rounded-2xl bg-zinc-800 text-white font-black active:bg-zinc-700 ${key === "del" ? "text-sm" : "text-2xl"}`}
          >
            {key === "del" ? "Устгах" : key}
          </button>
        ))}
      </div>
    </div>
  );
}
