"use client";

import { UNEXPLAINED_LABEL, staffDisplayName } from "@/lib/shiftCycle";

type Gap = {
  id: string;
  name: string;
  unit: string;
  qty: number;
  money: number | null;
  staff: string;
  shift: string;
  cause?: { title: string; why: string };
};

export default function UnexplainedGaps({ rows }: { rows?: Gap[] | null }) {
  if (!rows) return null;
  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
      <h3 className="text-base font-black text-white">{UNEXPLAINED_LABEL}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-300">Энэ хугацаанд тайлбаргүй зөрүү алга.</p>
      ) : (
        rows.map((row) => (
          <div key={row.id} className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
            <p className="font-bold text-white">{row.name}</p>
            <p className="text-sm text-zinc-200 mt-1">
              {row.qty} {row.unit}
              {row.money != null ? ` / ${Math.round(row.money).toLocaleString()}₮` : " / Үнэ алга"}
            </p>
            <p className="text-xs text-zinc-400 mt-1">Ажилтан: {staffDisplayName(row.staff)}</p>
            <p className="text-xs text-zinc-400">Ээлж: {row.shift}</p>
            <p className="text-sm text-amber-100 mt-2">{row.cause?.title || "Мэдээлэл дутуу"}</p>
            <p className="text-xs text-zinc-400 mt-1">{row.cause?.why || "Шалтгааныг тогтоогоогүй."}</p>
          </div>
        ))
      )}
    </section>
  );
}
