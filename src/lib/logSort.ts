function stamp(value: unknown): number {
  if (value == null || value === "") return 0;
  const n = Date.parse(String(value));
  return Number.isFinite(n) ? n : 0;
}

/** Newest first: created_at desc, then date desc. */
export function sortLogsNewestFirst<T extends { created_at?: unknown; date?: unknown }>(
  logs: T[] | null | undefined,
): T[] {
  return [...(logs || [])].sort((a, b) => {
    const created = stamp(b.created_at) - stamp(a.created_at);
    if (created !== 0) return created;
    return stamp(b.date) - stamp(a.date);
  });
}
