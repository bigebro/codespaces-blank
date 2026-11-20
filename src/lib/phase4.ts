import { countStreak, UNEXPLAINED_GAP_HINT } from "@/lib/shiftCycle";
import { ubDay } from "@/lib/ubDate";

export const CAUSE_PURCHASE = "Худалдан авалт бүртгээгүй байж магадгүй";
export const CAUSE_RECIPE = "Жор буруу байж магадгүй";
export const CAUSE_WASTE = "Жороос илүү зарцуулсан, жор буруу, эсвэл борлуулалт бүртгэгдээгүй байж магадгүй";
export const CAUSE_COUNT = "Тооллогын алдаа байж магадгүй";
export const CAUSE_MISSING = "Мэдээлэл дутуу";
export const CUP_LINE = (cups: number, drinks: number) =>
  `Аяга ${formatQty(cups)} ширхэг ашигласан, ундаа ${formatQty(drinks)} зарагдсан`;
export const TEAM_GOAL_LINE = (current: string, limit: string) =>
  `Багийн зорилт: Тайлбаргүй зөрүү ${current} / ${limit}`;
export const PRICE_MISSING = "Үнэ алга";
export const NIGHT_MATCH_MAX = 0.05;
export const CUP_UNIT_LIMIT = 2;
export const CUP_FRACTION = 0.03;

export type PhasePeriod = "day" | "week" | "month";

type CountPoint = { at: string; qty: number };
type GapPoint = { at: string; qty: number };

export function formatQty(value: number) {
  const rounded = Math.round((Number(value) || 0) * 1000) / 1000;
  if (Math.abs(rounded - Math.round(rounded)) < 1e-9) return String(Math.round(rounded));
  return String(rounded);
}

export function formatMoney(value: number) {
  return `${Math.round(Number(value) || 0).toLocaleString("en-US")}₮`;
}

function qtyClose(a: number, b: number) {
  return Math.abs(a - b) <= Math.max(0.05, Math.abs(a) * 0.02);
}

function at(value: string) {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

export function likelyCause(input: {
  counts: CountPoint[];
  purchases: { at: string; qty: number }[];
  gaps: GapPoint[];
  gap: GapPoint;
  unit: string;
}) {
  const counts = [...(input.counts || [])].filter((row) => row.at).sort((a, b) => at(a.at) - at(b.at));
  const unit = input.unit || "";
  if (counts.length < 2) {
    return {
      title: CAUSE_MISSING,
      why: `Тооллого ${counts.length} байна. 2-оос цөөн тул шалтгааныг тогтоогоогүй.`,
    };
  }
  const gapAt = at(input.gap.at);
  let index = -1;
  counts.forEach((row, i) => {
    if (at(row.at) <= gapAt + 1000) index = i;
  });
  if (index < 1) {
    return { title: CAUSE_MISSING, why: "Энэ зөрүүний өмнөх тооллого алга. Шалтгааныг тогтоогоогүй." };
  }
  const prev = counts[index - 1];
  const current = counts[index];
  const next = counts[index + 1];
  const bought = (input.purchases || []).reduce((sum, row) => {
    const time = at(row.at);
    if (time > at(prev.at) && time <= at(current.at)) return sum + (Number(row.qty) || 0);
    return sum;
  }, 0);

  if (next && qtyClose(next.qty, prev.qty) && !qtyClose(current.qty, prev.qty)) {
    return {
      title: CAUSE_COUNT,
      why: `Өмнөх тооллого ${formatQty(prev.qty)}, энэ тооллого ${formatQty(current.qty)}, дараагийн тооллого ${formatQty(next.qty)}. Дараагийн тооллого өмнөхтэй таарсан тул тооллогын алдаа байж магадгүй.`,
    };
  }
  if (current.qty > prev.qty + 0.05 && bought <= 0.0001) {
    return {
      title: CAUSE_PURCHASE,
      why: `Тооллого ${formatQty(prev.qty)}-аас ${formatQty(current.qty)} болж өссөн, худалдан авалт 0. Худалдан авалт бүртгээгүй байж магадгүй.`,
    };
  }

  const gaps = [...(input.gaps || [])].filter((row) => row.at).sort((a, b) => at(a.at) - at(b.at));
  let run = 1;
  let best = 1;
  for (let i = 1; i < gaps.length; i += 1) {
    run = qtyClose(gaps[i].qty, gaps[i - 1].qty) && Math.sign(gaps[i].qty) === Math.sign(gaps[i - 1].qty) && gaps[i].qty !== 0
      ? run + 1
      : 1;
    if (at(gaps[i].at) <= gapAt + 1000) best = Math.max(best, run);
  }
  if (best >= 3) {
    return {
      title: CAUSE_RECIPE,
      why: `${best} ээлж дараалан ${formatQty(input.gap.qty)} ${unit} зөрүүтэй. Жор буруу байж магадгүй.`.replace(/\s+/g, " ").trim(),
    };
  }
  if (input.gap.qty >= 1) {
    const earlier = gaps.filter((row) => at(row.at) < gapAt - 1000);
    const prior = earlier.length ? earlier[earlier.length - 1] : null;
    const sudden = !prior || input.gap.qty > Math.abs(prior.qty) * 2 + 0.05;
    if (sudden) {
      const priorText = prior ? `${formatQty(prior.qty)} ${unit}` : "алга";
      return {
        title: CAUSE_WASTE,
        why: `Энэ ээлжинд ${formatQty(input.gap.qty)} ${unit} тайлбаргүй дутсан. Өмнөх зөрүү ${priorText}. ${UNEXPLAINED_GAP_HINT}`.replace(/\s+/g, " ").trim(),
      };
    }
  }
  return { title: CAUSE_MISSING, why: "Энэ зөрүү дээрх дүрэмд таарсангүй. Шалтгааныг тогтоогоогүй." };
}

export function cupCompare(input: {
  enabled: boolean;
  previousQty: number | null;
  currentQty: number | null;
  purchasesBetween: number;
  drinksSold: number | null;
}) {
  if (!input.enabled) return { enabled: false as const };
  if (input.previousQty == null || input.currentQty == null || input.drinksSold == null) {
    return { enabled: true as const, status: "insufficient" as const, title: CAUSE_MISSING, line: "Хоёр тооллого эсвэл ундааны борлуулалт алга." };
  }
  const cupsUsed = input.previousQty + (Number(input.purchasesBetween) || 0) - input.currentQty;
  const drinks = input.drinksSold;
  const limit = Math.max(CUP_UNIT_LIMIT, Math.abs(drinks) * CUP_FRACTION);
  const status = Math.abs(cupsUsed - drinks) > limit ? "check" as const : "ok" as const;
  return { enabled: true as const, status, cupsUsed, drinksSold: drinks, line: CUP_LINE(cupsUsed, drinks) };
}

export function periodIncludes(day: string, period: PhasePeriod, endDay: string) {
  if (!day || !endDay) return false;
  if (period === "day") return day === endDay;
  if (period === "month") return day.slice(0, 7) === endDay.slice(0, 7);
  const end = Date.parse(`${endDay}T00:00:00Z`);
  const start = end - 6 * 86400000;
  const atDay = Date.parse(`${day}T00:00:00Z`);
  return atDay >= start && atDay <= end;
}

export function monthHasEnded(endDay: string, today: string) {
  const [year, month] = endDay.slice(0, 7).split("-").map(Number);
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const next = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
  return today >= next;
}

export function readGoal(raw: unknown) {
  const goal = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const num = (value: unknown) => {
    if (value == null || value === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };
  return {
    unexplainedLimit: num(goal.unexplained_limit),
    streakShifts: num(goal.streak_shifts),
    reward: num(goal.reward_amount),
  };
}

export type StaffScore = {
  id: string;
  name: string;
  countedShifts: number;
  streak: number;
  matchPct: number | null;
  matchLabel: string;
  wasteCount: number;
  unexplainedKnown: number | null;
  missingPrices: number;
};

export function scoreStaff(input: {
  id: string;
  name: string;
  shifts: { day: string; closed: boolean; hadCount: boolean; nightDiff: number | null }[];
  wasteDays: string[];
  gaps: { day: string; money: number | null }[];
  period: PhasePeriod;
  endDay: string;
}): StaffScore {
  const shifts = input.shifts || [];
  const closedNewest = [...shifts].filter((row) => row.closed).sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : 0));
  const streak = countStreak(closedNewest.map((row) => ({ closed: true, hadCount: row.hadCount })));
  const inWindow = shifts.filter((row) => row.closed && row.hadCount && periodIncludes(row.day, input.period, input.endDay));
  const compared = inWindow.filter((row) => row.nightDiff != null);
  const matched = compared.filter((row) => (row.nightDiff as number) <= NIGHT_MATCH_MAX);
  const matchPct = compared.length ? Math.round((matched.length / compared.length) * 100) : null;
  const gaps = (input.gaps || []).filter((row) => periodIncludes(row.day, input.period, input.endDay));
  const missingPrices = gaps.filter((row) => row.money == null).length;
  const priced = gaps.filter((row) => row.money != null);
  return {
    id: input.id,
    name: input.name,
    countedShifts: inWindow.length,
    streak,
    matchPct,
    matchLabel: matchPct == null ? CAUSE_MISSING : `${matchPct}%`,
    wasteCount: (input.wasteDays || []).filter((day) => periodIncludes(day, input.period, input.endDay)).length,
    unexplainedKnown: gaps.length === 0 ? 0 : priced.length ? priced.reduce((sum, row) => sum + (row.money || 0), 0) : null,
    missingPrices,
  };
}

export function teamGoalView(input: {
  unexplainedKnown: number | null;
  missingPrices: number;
  teamStreak: number;
  longestStaffStreak: number;
  limit: number | null;
  streakTarget: number | null;
  reward: number | null;
  monthEnded: boolean;
}) {
  const priced = input.missingPrices === 0 && input.unexplainedKnown != null;
  const current = priced ? formatMoney(input.unexplainedKnown as number) : PRICE_MISSING;
  const limitText = input.limit == null ? CAUSE_MISSING : formatMoney(input.limit);
  const line = TEAM_GOAL_LINE(current, limitText);
  const barPct = priced && input.limit != null && input.limit > 0
    ? Math.max(0, Math.min(100, ((input.unexplainedKnown as number) / input.limit) * 100))
    : null;
  let metText = "Сар дуусаагүй.";
  if (input.monthEnded) {
    if (input.limit == null && input.streakTarget == null) metText = CAUSE_MISSING;
    else if (input.limit != null && !priced) metText = CAUSE_MISSING;
    else {
      const moneyOk = input.limit == null || ((input.unexplainedKnown as number) < input.limit);
      const streakOk = input.streakTarget == null || input.teamStreak >= input.streakTarget;
      metText = moneyOk && streakOk
        ? "Зорилт биелсэн. Цалинд автоматаар ороогүй."
        : "Зорилт биелээгүй. Цалинд автоматаар ороогүй.";
    }
  }
  return {
    line,
    barPct,
    priceNote: input.missingPrices > 0 || input.unexplainedKnown == null ? PRICE_MISSING : null,
    metText,
    rewardText: input.reward == null ? null : `Урамшуулал ${formatMoney(input.reward)}. Цалинд автоматаар ороогүй.`,
    teamStreak: input.teamStreak,
    longestStaffStreak: input.longestStaffStreak,
  };
}

type LogRow = {
  id?: string;
  date?: string;
  type?: string;
  quantity?: number;
  total_cost?: number | null;
  ingredient_id?: string | null;
  worker_name?: string | null;
  staff_id?: string | null;
  shift_id?: string | null;
  incident_type?: string | null;
};

type ShiftRow = {
  id: string;
  start_time?: string;
  end_time?: string | null;
  is_active?: boolean;
  character_role?: string | null;
};

export type GapView = {
  id: string;
  name: string;
  unit: string;
  qty: number;
  money: number | null;
  staff: string;
  shift: string;
  ingredientId?: string | null;
  staffId?: string | null;
  at?: string;
  cause?: { title: string; why: string };
};

function clean(value: string) {
  return String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function moneyOf(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null;
}

export function assemblePhase4(input: {
  settings?: { cup_check_enabled?: boolean | null; cup_ingredient_ids?: string[] | null; team_goal?: unknown } | null;
  ingredients?: { id: string; name?: string; unit?: string }[];
  recipes?: { product_name?: string; ingredient_id?: string | null }[];
  logs?: LogRow[];
  sales?: { date?: string; product_name?: string; quantity_sold?: number }[];
  shifts?: ShiftRow[];
  profiles?: { id?: string; full_name?: string | null; email?: string | null }[];
  gaps?: GapView[];
  endDay: string;
  today: string;
  salesCoverFrom?: string | null;
}) {
  const logs = input.logs || [];
  const names = new Map((input.ingredients || []).map((row) => [row.id, row]));
  const gaps = (input.gaps || []).map((gap) => {
    const ingredientId = gap.ingredientId || "";
    const mine = logs.filter((row) => row.ingredient_id === ingredientId);
    const cause = likelyCause({
      counts: mine.filter((row) => row.type === "count" && row.date).map((row) => ({ at: row.date as string, qty: Number(row.quantity) || 0 })),
      purchases: mine.filter((row) => row.type === "purchase" && row.date).map((row) => ({ at: row.date as string, qty: Number(row.quantity) || 0 })),
      gaps: logs
        .filter((row) => row.ingredient_id === ingredientId && row.incident_type === "unexplained_gap" && row.date)
        .map((row) => ({ at: row.date as string, qty: Number(row.quantity) || 0 })),
      gap: { at: gap.at || "", qty: gap.qty },
      unit: gap.unit,
    });
    return { ...gap, cause };
  });

  const cupEnabled = input.settings?.cup_check_enabled === true;
  const cupIds = cupEnabled ? (input.settings?.cup_ingredient_ids || []).filter(Boolean) : [];
  const cupRows = !cupEnabled
    ? []
    : cupIds.length === 0
      ? [{ id: "none", name: "Аяга", status: "insufficient" as const, title: CAUSE_MISSING, line: "Аяга гэж сонгосон бараа алга." }]
      : cupIds.map((id) => {
          const counts = logs
            .filter((row) => row.ingredient_id === id && row.type === "count" && row.date)
            .sort((a, b) => at(a.date as string) - at(b.date as string));
          const name = names.get(id)?.name || "Аяга";
          if (counts.length < 2) {
            return { id, name, status: "insufficient" as const, title: CAUSE_MISSING, line: "Хоёр тооллого эсвэл ундааны борлуулалт алга." };
          }
          const prev = counts[counts.length - 2];
          const current = counts[counts.length - 1];
          const covered = !input.salesCoverFrom || at(prev.date as string) >= at(input.salesCoverFrom);
          const productNames = new Set(
            (input.recipes || []).filter((row) => row.ingredient_id === id).map((row) => clean(row.product_name || "")),
          );
          const drinks = !covered || productNames.size === 0
            ? null
            : (input.sales || []).reduce((sum, sale) => {
                const time = at(sale.date || "");
                if (time <= at(prev.date as string) || time > at(current.date as string)) return sum;
                if (!productNames.has(clean(sale.product_name || ""))) return sum;
                return sum + (Number(sale.quantity_sold) || 0);
              }, 0);
          const purchases = logs.reduce((sum, row) => {
            if (row.ingredient_id !== id || row.type !== "purchase" || !row.date) return sum;
            const time = at(row.date);
            if (time > at(prev.date as string) && time <= at(current.date as string)) return sum + (Number(row.quantity) || 0);
            return sum;
          }, 0);
          const compared = cupCompare({
            enabled: true,
            previousQty: Number(prev.quantity) || 0,
            currentQty: Number(current.quantity) || 0,
            purchasesBetween: purchases,
            drinksSold: drinks,
          });
          return { id, name, ...compared };
        });

  const staff = new Map<string, { id: string; name: string }>();
  for (const profile of input.profiles || []) {
    if (!profile.id) continue;
    staff.set(profile.id, { id: profile.id, name: profile.full_name || profile.email || "Ажилтан" });
  }
  for (const log of logs) {
    if (log.staff_id && !staff.has(log.staff_id)) staff.set(log.staff_id, { id: log.staff_id, name: log.worker_name || "Ажилтан" });
  }
  const people = [...staff.values()].sort((a, b) => a.name.localeCompare(b.name, "mn"));
  const shifts = input.shifts || [];

  function personalShifts(person: { id: string; name: string }) {
    return shifts.map((shift) => {
      const mine = logs.filter((row) => row.shift_id === shift.id && row.staff_id === person.id);
      const named = String(shift.character_role || "").toLowerCase().includes(person.name.toLowerCase()) && person.name.length > 1;
      const hadCount = mine.some((row) => row.type === "count");
      const openings = mine.filter((row) => row.incident_type === "opening_recount" && row.ingredient_id && row.date);
      const diffs = openings.map((row) => {
        const earlier = logs
          .filter((log) => log.ingredient_id === row.ingredient_id && log.type === "count" && log.date && at(log.date) < at(row.date as string))
          .sort((a, b) => at(b.date as string) - at(a.date as string));
        if (!earlier[0]) return null;
        return Math.abs((Number(row.quantity) || 0) - (Number(earlier[0].quantity) || 0));
      }).filter((value): value is number => value != null);
      return {
        day: ubDay(shift.end_time || shift.start_time || ""),
        closed: shift.is_active === false || Boolean(shift.end_time),
        hadCount,
        nightDiff: diffs.length ? Math.max(...diffs) : null,
        onShift: named || mine.length > 0,
      };
    }).filter((row) => row.onShift);
  }

  const periods: PhasePeriod[] = ["day", "week", "month"];
  const scorecard = {
    day: [] as StaffScore[],
    week: [] as StaffScore[],
    month: [] as StaffScore[],
  };
  const longestByStaff: number[] = [];
  for (const person of people) {
    const rows = personalShifts(person);
    longestByStaff.push(scoreStaff({
      id: person.id,
      name: person.name,
      shifts: rows,
      wasteDays: [],
      gaps: [],
      period: "month",
      endDay: input.endDay,
    }).streak);
    for (const period of periods) {
      scorecard[period].push(scoreStaff({
        id: person.id,
        name: person.name,
        shifts: rows,
        wasteDays: logs
          .filter((row) => row.staff_id === person.id && row.date && (row.type === "spoilage" || row.type === "testing" || row.type === "staff_meal" || row.incident_type === "shift_waste"))
          .map((row) => ubDay(row.date as string)),
        gaps: logs
          .filter((row) => row.staff_id === person.id && row.incident_type === "unexplained_gap" && row.date)
          .map((row) => ({ day: ubDay(row.date as string), money: moneyOf(row.total_cost) })),
        period,
        endDay: input.endDay,
      }));
    }
  }

  const closed = [...shifts]
    .filter((shift) => shift.is_active === false || shift.end_time)
    .sort((a, b) => at(b.end_time || b.start_time || "") - at(a.end_time || a.start_time || ""));
  const teamStreak = countStreak(closed.map((shift) => ({
    closed: true,
    hadCount: logs.some((row) => row.shift_id === shift.id && row.type === "count"),
  })));
  const monthGaps = logs.filter((row) => row.incident_type === "unexplained_gap" && row.date && ubDay(row.date).slice(0, 7) === input.endDay.slice(0, 7));
  const missingPrices = monthGaps.filter((row) => moneyOf(row.total_cost) == null).length;
  const priced = monthGaps.map((row) => moneyOf(row.total_cost)).filter((value): value is number => value != null);
  const goal = readGoal(input.settings?.team_goal);
  const team = teamGoalView({
    unexplainedKnown: monthGaps.length === 0 ? 0 : priced.length ? priced.reduce((sum, value) => sum + value, 0) : null,
    missingPrices,
    teamStreak,
    longestStaffStreak: longestByStaff.length ? Math.max(...longestByStaff) : 0,
    limit: goal.unexplainedLimit,
    streakTarget: goal.streakShifts,
    reward: goal.reward,
    monthEnded: monthHasEnded(input.endDay, input.today),
  });

  return {
    gaps,
    cup: cupEnabled ? { enabled: true as const, rows: cupRows } : { enabled: false as const },
    scorecard,
    team,
  };
}

export function kioskPhase4Payload(view: ReturnType<typeof assemblePhase4>, staffId: string) {
  const pick = (rows: StaffScore[]) => rows.find((row) => row.id === staffId) || {
    id: staffId,
    name: "Ажилтан",
    countedShifts: 0,
    streak: 0,
    matchPct: null,
    matchLabel: CAUSE_MISSING,
    wasteCount: 0,
    unexplainedKnown: 0,
    missingPrices: 0,
  };
  const month = pick(view.scorecard.month);
  return {
    me: { day: pick(view.scorecard.day), week: pick(view.scorecard.week), month },
    myStreak: month.streak,
    teamLongest: view.team.longestStaffStreak,
    team: {
      line: view.team.line,
      barPct: view.team.barPct,
      priceNote: view.team.priceNote,
      metText: view.team.metText,
      rewardText: view.team.rewardText,
    },
    cup: view.cup,
  };
}
