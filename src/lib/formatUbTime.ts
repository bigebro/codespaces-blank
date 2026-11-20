const UB = "Asia/Ulaanbaatar";

/** UB цагийн 24 цагийн формат. AM/PM харуулахгүй. */
export function formatUbTime(input: string | Date | null | undefined): string {
  if (!input) return "—";
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return "—";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: UB,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const hour = parts.find((p) => p.type === "hour")?.value || "00";
  const minute = parts.find((p) => p.type === "minute")?.value || "00";
  return `${hour}:${minute}`;
}

export function formatUbDateTime(input: string | Date | null | undefined): string {
  if (!input) return "—";
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return "—";
  const dayParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: UB,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const y = dayParts.find((p) => p.type === "year")?.value || "1970";
  const m = dayParts.find((p) => p.type === "month")?.value || "01";
  const d = dayParts.find((p) => p.type === "day")?.value || "01";
  return `${y}-${m}-${d} ${formatUbTime(date)}`;
}
