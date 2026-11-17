"use client";

import { useState } from "react";
import TeamGoalBar from "@/features/finance/TeamGoalBar";

type Score = {
  id: string;
  name: string;
  countedShifts: number;
  streak: number;
  matchLabel: string;
  wasteCount: number;
  unexplainedKnown: number | null;
  missingPrices: number;
};

const PERIODS = [
  { id: "day", label: "Өдөр" },
  { id: "week", label: "7 хоног" },
  { id: "month", label: "Сар" },
] as const;

function money(value: number) {
  return `${Math.round(value).toLocaleString("en-US")}₮`;
}

export default function TeamBoard({
  scorecard,
  team,
}: {
  scorecard?: { day?: Score[]; week?: Score[]; month?: Score[] } | null;
  team?: {
    line?: string;
    barPct?: number | null;
    priceNote?: string | null;
    metText?: string;
    rewardText?: string | null;
  } | null;
}) {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]["id"]>("month");
  const rows = scorecard?.[period] || [];
  return (
    <div className="space-y-4">
      <TeamGoalBar team={team} />
      <div className="flex gap-2">
        {PERIODS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setPeriod(item.id)}
            className={`px-3 py-2 rounded-xl text-xs font-bold ${period === item.id ? "bg-white text-zinc-950" : "bg-zinc-900 text-zinc-300 border border-zinc-800"}`}
          >
            {item.label}
          </button>
        ))}
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-300">Мэдээлэл дутуу</p>
      ) : (
        rows.map((row) => (
          <section key={row.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-1">
            <h3 className="font-black text-white">{row.name}</h3>
            <p className="text-sm text-zinc-200">Тоолсон ээлж: {row.countedShifts}</p>
            <p className="text-sm text-zinc-200">{row.streak} ээлж дараалан тоолсон</p>
            <p className="text-sm text-zinc-200">Тооллого таарсан: {row.matchLabel}</p>
            <p className="text-sm text-zinc-200">Бүртгэсэн хаягдал: {row.wasteCount}</p>
            <p className="text-sm text-zinc-200">
              Тайлбаргүй зөрүү: {row.unexplainedKnown == null ? "Мэдээлэл дутуу" : money(row.unexplainedKnown)}
            </p>
            {row.missingPrices > 0 ? <p className="text-xs text-amber-200">Үнэ алга</p> : null}
          </section>
        ))
      )}
    </div>
  );
}
