import { detectRangeMode, ubDay, type RangeMode } from "./ubDate";

export type DashboardRange = {
  startDay: string;
  endDay: string;
  mode: RangeMode;
};

export function normalizeDashboardRange(
  start?: string | null,
  end?: string | null,
  mode?: string | null,
): DashboardRange | null {
  const startRaw = String(start || "").trim();
  const endRaw = String(end || "").trim();
  if (!startRaw && !endRaw) return null;
  const startDay = ubDay(startRaw || endRaw);
  const endDay = ubDay(endRaw || startRaw);
  const allowed: RangeMode[] = ["day", "week", "month"];
  const given = allowed.includes(mode as RangeMode) ? (mode as RangeMode) : detectRangeMode(startDay, endDay);
  return { startDay, endDay, mode: given };
}

export function rangeKey(client: string, startDay: string, endDay: string) {
  return `${String(client || "").trim()}|${ubDay(startDay)}|${ubDay(endDay)}`;
}

/** Зөвхөн хамгийн сүүлийн, одоо сонгосон хүрээний хариу самбар дээр тогтоно. */
export function shouldApplyAnalytics(args: {
  reqId: number;
  currentReqId: number;
  requestedKey: string;
  selectedKey: string;
}) {
  return args.reqId === args.currentReqId && args.requestedKey === args.selectedKey;
}

/** Өөр хүрээний (хуучин сар гэх мэт) payload-ийг одоогийн Өдөр/7 хоног/Сар дээр харуулахгүй. */
export function displayAnalytics<T>(
  data: T | null | undefined,
  dataKey: string | null | undefined,
  selectedKey: string,
): T | null {
  if (!data || !dataKey || dataKey !== selectedKey) return null;
  return data;
}

export function readRequestRange(body: {
  startDate?: string | null;
  endDate?: string | null;
  startDay?: string | null;
  endDay?: string | null;
  rangeMode?: string | null;
} | null | undefined) {
  return normalizeDashboardRange(
    body?.startDay || body?.startDate,
    body?.endDay || body?.endDate,
    body?.rangeMode,
  );
}
