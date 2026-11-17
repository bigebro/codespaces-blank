"use client";

export default function TeamGoalBar({
  team,
}: {
  team?: {
    line?: string;
    barPct?: number | null;
    priceNote?: string | null;
    metText?: string;
    rewardText?: string | null;
  } | null;
}) {
  if (!team?.line) return null;
  const width = team.barPct == null ? 0 : Math.max(0, Math.min(100, team.barPct));
  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-2">
      <p className="text-sm font-black text-white">{team.line}</p>
      {team.barPct == null ? null : (
        <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
          <div className="h-full bg-amber-400" style={{ width: `${width}%` }} />
        </div>
      )}
      {team.priceNote ? <p className="text-xs text-amber-200">{team.priceNote}</p> : null}
      <p className="text-xs text-zinc-300">{team.metText}</p>
      {team.rewardText ? <p className="text-xs text-zinc-400">{team.rewardText}</p> : null}
    </section>
  );
}
