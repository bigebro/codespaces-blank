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

export function defaultAuditDate(now = new Date()) {
  return ubDay(now);
}

export function importFallbackIso(startDate: string, endDate: string, today: string) {
  const fallbackDay = !endDate ? startDate : endDate <= today ? endDate : today < startDate ? startDate : today;
  return `${fallbackDay}T12:00:00.000Z`;
}

/** Эхлэл/төгсгөлийг Asia/Ulaanbaatar өдрийн ISO хүрээ болгоно. Огноо-only («2026-11-20») ч, бүрэн ISO ч ижил хүрээ гаргана. */
export function analyticsPeriod(startDate?: string, endDate?: string, now = new Date()) {
  const startDay = ubDay(startDate || ubMonthStartIso(now));
  const endDay = ubDay(endDate || now);
  const todayDay = ubDay(now);
  return {
    startDay,
    endDay,
    todayDay,
    countEndDay: endDay > todayDay ? todayDay : endDay,
    finalStartDate: ubDayStartIso(startDay),
    finalEndDate: ubDayEndIso(endDay),
  };
}

/** "YYYY-MM-DD" дээр өдөр нэмэх (цагийн бүсээс хамаарахгүй). */
export function addDaysStr(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Тухайн өдрийн долоо хоногийн Даваа гараг (Asia/Ulaanbaatar өдөр). */
export function mondayOf(day: string): string {
  const dow = (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7;
  return addDaysStr(day, -dow);
}

export function monthStartDay(day: string): string {
  return `${ubDay(day).slice(0, 8)}01`;
}

export function monthEndDay(day: string): string {
  const [y, m] = ubDay(day).split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

/** Одоогийн 7 хоног: Даваагаас өнөөдөр эсвэл Ням хүртэл (самбарын 7 хоногийн горимтой ижил). */
export function currentWeekBounds(today: string): { start: string; end: string } {
  const start = mondayOf(today);
  const sunday = addDaysStr(start, 6);
  return { start, end: sunday > today ? today : sunday };
}

export type RangeMode = "day" | "week" | "month";

export function detectRangeMode(start: string, end: string): RangeMode {
  if (start === end) return "day";
  if (start === mondayOf(start) && end > start && end <= addDaysStr(start, 6)) return "week";
  return "month";
}
