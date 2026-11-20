import {
  addDaysStr,
  currentWeekBounds,
  detectRangeMode,
  monthEndDay,
  monthStartDay,
  ubDay,
} from "./ubDate";

export type OverviewPeriod = {
  startDay: string;
  endDay: string;
  label: string;
  source: "named" | "dashboard" | "today";
};

function period(startDay: string, endDay: string, label: string, source: OverviewPeriod["source"]): OverviewPeriod {
  return { startDay, endDay, label, source };
}

function todayPeriod(today: string, source: OverviewPeriod["source"] = "named"): OverviewPeriod {
  return period(today, today, `Өнөөдөр (${today})`, source);
}

function yesterdayPeriod(today: string): OverviewPeriod {
  const day = addDaysStr(today, -1);
  return period(day, day, `Өчигдөр (${day})`, "named");
}

function weekPeriod(today: string): OverviewPeriod {
  const { start, end } = currentWeekBounds(today);
  return period(start, end, `Энэ долоо хоног (${start} – ${end})`, "named");
}

function monthPeriod(today: string): OverviewPeriod {
  const start = monthStartDay(today);
  const end = monthEndDay(today);
  return period(start, end, `Энэ сар (${start} – ${end})`, "named");
}

function labelForRange(start: string, end: string, today: string): string {
  const kind = detectRangeMode(start, end);
  if (kind === "day") {
    if (start === today) return `Өнөөдөр (${start})`;
    if (start === addDaysStr(today, -1)) return `Өчигдөр (${start})`;
    return `Өдөр (${start})`;
  }
  if (kind === "week") {
    const current = currentWeekBounds(today);
    const title = start === current.start && end === current.end ? "Энэ долоо хоног" : "7 хоног";
    return `${title} (${start} – ${end})`;
  }
  const title =
    start === monthStartDay(today) && end === monthEndDay(today) ? "Энэ сар" : "Сар";
  return `${title} (${start} – ${end})`;
}

const NAMED_PERIODS: Array<{ re: RegExp; make: (today: string) => OverviewPeriod }> = [
  { re: /өчигдөр|өчигдрийн|yesterday/, make: yesterdayPeriod },
  { re: /энэ\s*долоо\s*хоног|энэ\s*7\s*хоног|this\s*week/, make: weekPeriod },
  { re: /энэ\s*сар|this\s*month/, make: monthPeriod },
  { re: /өнөөдөр|өнөөдрийн|\btoday\b/, make: (today) => todayPeriod(today, "named") },
];

/** Асуултад нэрлэсэн хугацаа байвал тэрийг, үгүй бол самбарын сонгосон хүрээг, тэр ч байхгүй бол өнөөдрийг авна. */
export function resolveOverviewPeriod(
  text: string,
  dashboardStart?: string | null,
  dashboardEnd?: string | null,
  now = new Date(),
): OverviewPeriod {
  const today = ubDay(now);
  const t = String(text || "").toLowerCase();
  let named: { index: number; period: OverviewPeriod } | null = null;
  for (const item of NAMED_PERIODS) {
    const match = t.match(item.re);
    if (match && match.index != null && (!named || match.index < named.index)) {
      named = { index: match.index, period: item.make(today) };
    }
  }
  if (named) return named.period;

  const startRaw = String(dashboardStart || "").trim();
  const endRaw = String(dashboardEnd || "").trim();
  if (startRaw && endRaw) {
    const start = ubDay(startRaw);
    const end = ubDay(endRaw);
    return period(start, end, labelForRange(start, end, today), "dashboard");
  }
  if (startRaw) {
    const start = ubDay(startRaw);
    return period(start, start, labelForRange(start, start, today), "dashboard");
  }
  return todayPeriod(today, "today");
}

export function overviewDateLine(value: OverviewPeriod | string) {
  return typeof value === "string" ? `Өнөөдөр (${value})` : value.label;
}


function escapeRe(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Зөвхөн тусдаа гарчгийн мөр: «Өнөөдөр (YYYY-MM-DD)». Өгүүлбэр доторх «өнөөдөр»-ийг үл эмчилнэ. */
export const TODAY_HEADING_RE = /^Өнөөдөр \(\d{4}-\d{2}-\d{2}\)$/;

export function isTodayHeading(line: string) {
  return TODAY_HEADING_RE.test(String(line || "").trim());
}

/** Сонгосон хугацаа өнөөдөр биш үед моделийн давхар «Өнөөдөр (...)» гарчгийг хасна. */
export function stripStrayTodayHeadings(text: string, allowedLabel: string): string {
  const allowed = String(allowedLabel || "").trim();
  if (isTodayHeading(allowed)) return String(text ?? "");
  return String(text ?? "")
    .split("\n")
    .filter((row) => !isTodayHeading(row))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
}

function maybeTodayHeading(row: string) {
  const t = row.trim();
  if (!t) return false;
  if (isTodayHeading(t)) return true;
  return "Өнөөдөр".startsWith(t) || /^Өнөөдөр( \((\d{0,4}(-(\d{0,2}(-(\d{0,2}\)?)?)?)?)?)?)?$/.test(t);
}

function createTodayHeadingFilter(allowedLabel: string) {
  const keepToday = isTodayHeading(allowedLabel);
  let pending = "";
  return {
    push(chunk: string): string {
      if (keepToday) return chunk;
      pending += chunk;
      const nl = pending.lastIndexOf("\n");
      if (nl === -1) {
        if (isTodayHeading(pending)) {
          pending = "";
          return "";
        }
        if (!maybeTodayHeading(pending)) {
          const out = pending;
          pending = "";
          return out;
        }
        return "";
      }
      const complete = pending.slice(0, nl + 1);
      pending = pending.slice(nl + 1);
      let cleaned = stripStrayTodayHeadings(complete, allowedLabel);
      if (isTodayHeading(pending)) pending = "";
      else if (pending && !maybeTodayHeading(pending)) {
        cleaned += pending;
        pending = "";
      }
      return cleaned;
    },
    flush(): string {
      if (keepToday) {
        const out = pending;
        pending = "";
        return out;
      }
      const out = isTodayHeading(pending) ? "" : pending;
      pending = "";
      return out;
    },
  };
}

/** Хариултын эхэнд хугацааны мөрийг нэг л удаа үлдээнэ (систем эсвэл модель давхар бичсэн ч). */
export function ensureSinglePeriodPrefix(text: string, label: string): string {
  const line = String(label || "").trim();
  const body = String(text ?? "");
  if (!line) return stripStrayTodayHeadings(body, "");
  const leading = new RegExp(`^(?:\\s*${escapeRe(line)}\\s*)+`);
  let rest = body.replace(leading, "").replace(/^\s+/, "");
  rest = stripStrayTodayHeadings(rest, line).replace(/^\s+/, "");
  return rest ? `${line}\n\n${rest}` : `${line}\n\n`;
}

/** Стрим дээр хугацааны мөрийг нэг удаа нэмж, модель давхар бичвэл хасна. */
export function createPeriodPrefixGate(label: string) {
  const line = String(label || "").trim();
  const todayFilter = createTodayHeadingFilter(line);
  let buf = "";
  let done = false;

  return {
    push(chunk: string): string {
      if (!line) return todayFilter.push(chunk);
      if (done) return todayFilter.push(chunk);
      buf += chunk;
      const trimmed = buf.replace(/^\s+/, "");
      if (!trimmed) return "";
      if (trimmed.length < line.length && line.startsWith(trimmed)) return "";
      const out = ensureSinglePeriodPrefix(buf, line);
      buf = "";
      done = true;
      return out;
    },
    flush(): string {
      if (done) return todayFilter.flush();
      if (!line) {
        const out = todayFilter.push(buf) + todayFilter.flush();
        buf = "";
        done = true;
        return out;
      }
      const out = ensureSinglePeriodPrefix(buf, line);
      buf = "";
      done = true;
      return out;
    },
  };
}
