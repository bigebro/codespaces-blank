"use client";

import { trustTone } from "@/lib/honestDashboard";

const FILL = {
  red: "bg-rose-500",
  yellow: "bg-amber-400",
  green: "bg-emerald-500",
};

const TEXT = {
  red: "text-rose-300",
  yellow: "text-amber-200",
  green: "text-emerald-300",
};

export default function TruthMeter({
  pct,
  missing,
  check,
}: {
  pct: number;
  missing: number;
  check: number;
}) {
  const tone = trustTone(pct);
  const width = Math.max(0, Math.min(100, pct));
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
      <div className="flex items-center justify-between gap-3">
        <p className={`text-sm font-black ${TEXT[tone]}`}>Үнэн зөв байдал: {Math.round(pct)}%</p>
      </div>
      <div className="mt-2 h-2 rounded-full bg-zinc-800 overflow-hidden">
        <div className={`h-full ${FILL[tone]}`} style={{ width: `${width}%` }} />
      </div>
      <p className="text-xs text-zinc-400 mt-2">{missing} бараа дутуу, {check} бараа шалгах</p>
    </div>
  );
}
