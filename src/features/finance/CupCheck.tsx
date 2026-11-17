"use client";

export default function CupCheck({
  data,
}: {
  data?: { enabled?: boolean; rows?: { id: string; name: string; status?: string; title?: string; line?: string }[] } | null;
}) {
  if (!data?.enabled) return null;
  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
      <h3 className="text-base font-black text-white">Аяга шалгах</h3>
      {(data.rows || []).map((row) => (
        <div key={row.id} className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
          <p className="font-bold text-white">{row.name}</p>
          {row.status === "check" ? (
            <p className="text-sm font-bold text-amber-200 mt-1">Шалгах</p>
          ) : row.status === "insufficient" ? (
            <p className="text-sm font-bold text-rose-300 mt-1">Мэдээлэл дутуу</p>
          ) : null}
          <p className="text-sm text-zinc-200 mt-1">{row.line}</p>
        </div>
      ))}
    </section>
  );
}
