"use client";

type Score = {
  countedShifts: number;
  streak: number;
  matchLabel: string;
  wasteCount: number;
  unexplainedKnown: number | null;
  missingPrices: number;
};

function money(value: number) {
  return `${Math.round(value).toLocaleString("en-US")}₮`;
}

function Block({ title, row }: { title: string; row?: Score | null }) {
  if (!row) return null;
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
      <p className="text-xs font-black text-zinc-400">{title}</p>
      <p className="text-sm text-zinc-100 mt-1">Тоолсон ээлж: {row.countedShifts}</p>
      <p className="text-sm text-zinc-100">{row.streak} ээлж дараалан тоолсон</p>
      <p className="text-sm text-zinc-100">Тооллого таарсан: {row.matchLabel}</p>
      <p className="text-sm text-zinc-100">Бүртгэсэн хаягдал: {row.wasteCount}</p>
      <p className="text-sm text-zinc-100">
        Тайлбаргүй зөрүү: {row.unexplainedKnown == null ? "Мэдээлэл дутуу" : money(row.unexplainedKnown)}
      </p>
      {row.missingPrices > 0 ? <p className="text-xs text-amber-200">Үнэ алга</p> : null}
    </div>
  );
}

export default function OwnScore({
  me,
}: {
  me?: { day?: Score; week?: Score; month?: Score } | null;
}) {
  if (!me) return null;
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-black text-white px-1">Миний тоо</h3>
      <Block title="Өдөр" row={me.day} />
      <Block title="7 хоног" row={me.week} />
      <Block title="Сар" row={me.month} />
    </section>
  );
}
