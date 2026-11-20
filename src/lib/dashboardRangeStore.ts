import {
  addDaysStr,
  currentWeekBounds,
  mondayOf,
  monthEndDay,
  monthStartDay,
  ubDay,
  type RangeMode,
} from "./ubDate";

export const DASHBOARD_RANGE_STORAGE_KEY = "operlink.dashboard.range";

export type StoredDashboardRange = {
  mode: RangeMode;
  startDay: string;
  endDay: string;
  asOfDay: string;
};

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDay(value: unknown): value is string {
  if (typeof value !== "string" || !DAY_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() + 1 === m && dt.getUTCDate() === d;
}

export function defaultMonthRange(now = new Date()) {
  const today = ubDay(now);
  return { mode: "month" as const, startDay: monthStartDay(today), endDay: monthEndDay(today) };
}

/** mode-оос UB өдөр тооцоолно. «Одоогийн» өдөр/7 хоног/сарыг asOf-той нь харьцуулаад өнөөдрөөр шинэчилнэ. */
export function boundsForMode(
  mode: RangeMode,
  today: string,
  custom?: { startDay?: string; endDay?: string; asOfDay?: string },
): { startDay: string; endDay: string } {
  if (mode === "day") {
    const start = custom?.startDay;
    const asOf = custom?.asOfDay;
    if (start && isValidDay(start) && start <= today && (!custom?.endDay || custom.endDay === start)) {
      if (!asOf || start === asOf) return { startDay: today, endDay: today };
      return { startDay: start, endDay: start };
    }
    return { startDay: today, endDay: today };
  }

  if (mode === "week") {
    const week = currentWeekBounds(today);
    const current = { startDay: week.start, endDay: week.end };
    const start = custom?.startDay;
    if (start && isValidDay(start) && start === mondayOf(start) && start <= today) {
      const asOf = custom?.asOfDay;
      if (asOf && isValidDay(asOf) && start === mondayOf(asOf)) return current;
      const sunday = addDaysStr(start, 6);
      const capped = sunday > today ? today : sunday;
      const end = custom?.endDay && isValidDay(custom.endDay) && custom.endDay >= start && custom.endDay <= capped
        ? custom.endDay
        : capped;
      return { startDay: start, endDay: end };
    }
    return current;
  }

  const start = custom?.startDay;
  if (start && isValidDay(start) && start === monthStartDay(start) && start <= today) {
    const asOf = custom?.asOfDay;
    if (asOf && isValidDay(asOf) && start === monthStartDay(asOf)) {
      return { startDay: monthStartDay(today), endDay: monthEndDay(today) };
    }
    return { startDay: monthStartDay(start), endDay: monthEndDay(start) };
  }
  return { startDay: monthStartDay(today), endDay: monthEndDay(today) };
}

export function restoreDashboardRange(raw: unknown, now = new Date()) {
  const fallback = defaultMonthRange(now);
  if (!raw || typeof raw !== "object") return fallback;
  const rec = raw as Record<string, unknown>;
  const mode: RangeMode = rec.mode === "day" || rec.mode === "week" || rec.mode === "month" ? rec.mode : "month";
  const bounds = boundsForMode(mode, ubDay(now), {
    startDay: typeof rec.startDay === "string" ? rec.startDay : undefined,
    endDay: typeof rec.endDay === "string" ? rec.endDay : undefined,
    asOfDay: typeof rec.asOfDay === "string" ? rec.asOfDay : undefined,
  });
  return { mode, ...bounds };
}

export function parseStoredDashboardRange(json: string | null | undefined, now = new Date()) {
  if (!json) return restoreDashboardRange(null, now);
  try {
    return restoreDashboardRange(JSON.parse(json), now);
  } catch {
    return restoreDashboardRange(null, now);
  }
}

type ReadableStorage = { getItem(key: string): string | null };
type WritableStorage = { setItem(key: string, value: string): void };

/** SSR дээр null. Анхны render-д month default-ыг ашиглана (hydration зөрөхгүй). */
export function readDashboardRangeStorage(
  now = new Date(),
  storage?: ReadableStorage | null,
) {
  const store = storage ?? (typeof window === "undefined" ? null : window.localStorage);
  if (!store) return null;
  try {
    return parseStoredDashboardRange(store.getItem(DASHBOARD_RANGE_STORAGE_KEY), now);
  } catch {
    return restoreDashboardRange(null, now);
  }
}

export function writeDashboardRangeStorage(
  range: { mode: RangeMode; startDay: string; endDay: string },
  now = new Date(),
  storage?: WritableStorage | null,
) {
  const store = storage ?? (typeof window === "undefined" ? null : window.localStorage);
  if (!store) return;
  const payload: StoredDashboardRange = {
    mode: range.mode,
    startDay: range.startDay,
    endDay: range.endDay,
    asOfDay: ubDay(now),
  };
  try {
    store.setItem(DASHBOARD_RANGE_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Quota / private mode: ignore.
  }
}
