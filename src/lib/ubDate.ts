const UB = "Asia/Ulaanbaatar";

export function ubDay(input: string | Date): string {
  const raw = typeof input === "string" ? input : input.toISOString();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw.slice(0, 10);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: UB,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const y = parts.find((p) => p.type === "year")?.value || "1970";
  const m = parts.find((p) => p.type === "month")?.value || "01";
  const d = parts.find((p) => p.type === "day")?.value || "01";
  return `${y}-${m}-${d}`;
}

export function ubMonthStartIso(now = new Date()) {
  return `${ubDay(now).slice(0, 8)}01T00:00:00+08:00`;
}

export function ubDayStartIso(day: string) {
  return `${day}T00:00:00+08:00`;
}

export function ubDayEndIso(day: string) {
  return `${day}T23:59:59.999+08:00`;
}
