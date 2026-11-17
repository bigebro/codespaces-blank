export const RECOUNT_USAGE_FRACTION = 0.05;
export const RECOUNT_MIN_UNIT = 1;
export const RECOUNT_MIN_MONEY = 5000;

export const NIGHT_LABEL = "Шөнийн зөрүү";
export const UNEXPLAINED_LABEL = "Тайлбаргүй зөрүү";
export const WASTE_QUESTION = "Энэ хаягдал байсан уу?";

export const WASTE_REASONS: { label: string; type: "spoilage" | "testing" | "staff_meal" | "other" }[] = [
  { label: "Муудсан", type: "spoilage" },
  { label: "Туршилт", type: "testing" },
  { label: "Ажилтны хоол", type: "staff_meal" },
  { label: "Асгарсан", type: "other" },
  { label: "Бусад", type: "other" },
];

const TYPE_LABEL: Record<string, string> = {
  spoilage: "Хаягдал",
  staff_meal: "Ажилтны хоол",
  testing: "Туршилт",
  purchase: "Орлого",
  count: "Тооллого",
  sale: "Борлуулалт",
  other: "Бусад",
};

export function logTypeLabel(type: string) {
  return TYPE_LABEL[type] || "Бүртгэл";
}

export function displayUnit(unit: string) {
  const key = String(unit || "").trim().toLowerCase();
  if (key === "ш" || key === "ширхэг" || key === "pc") return "ширхэг";
  if (key === "гр" || key === "г" || key === "g") return "гр";
  if (key === "мл" || key === "ml") return "мл";
  if (key === "кг" || key === "kg") return "кг";
  if (key === "л" || key === "l" || key === "литр") return "л";
  return String(unit || "").trim();
}

export function streakText(count: number) {
  return `${Math.max(0, Math.floor(count))} ээлж дараалан тоолсон`;
}

export type CycleCandidate = {
  id: string;
  purchaseValue30d: number;
  shiftsSinceCount: number;
  active?: boolean;
};

function sameSet(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const other = new Set(b);
  return a.every((id) => other.has(id));
}

export function pickCloseItems(items: CycleCandidate[], previousIds: string[]) {
  const active = items.filter((item) => item.active !== false && item.id);
  if (active.length === 0) return [];
  if (active.length < 5) return active.map((item) => item.id).sort();

  const maxValue = Math.max(...active.map((item) => Number(item.purchaseValue30d) || 0), 0);
  const score = (item: CycleCandidate) => {
    const value = Number(item.purchaseValue30d) || 0;
    const boost = maxValue > 0 ? (value / maxValue) * 0.75 : 0;
    return (Number(item.shiftsSinceCount) || 0) + boost;
  };
  const ranked = [...active].sort((a, b) => {
    const diff = score(b) - score(a);
    if (Math.abs(diff) > 1e-9) return diff;
    const valueDiff = (Number(b.purchaseValue30d) || 0) - (Number(a.purchaseValue30d) || 0);
    if (valueDiff !== 0) return valueDiff;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  let chosen = ranked.slice(0, 5);
  if (sameSet(chosen.map((item) => item.id), previousIds)) {
    if (ranked[5]) chosen = [...chosen.slice(0, 4), ranked[5]];
    else chosen = ranked.slice(0, 4);
  }
  return chosen.map((item) => item.id);
}

export function advanceDue(items: CycleCandidate[], picked: string[]) {
  const chosen = new Set(picked);
  return items.map((item) => ({
    ...item,
    shiftsSinceCount: chosen.has(item.id) ? 0 : (Number(item.shiftsSinceCount) || 0) + 1,
  }));
}

export function countStreak(shifts: { closed: boolean; hadCount: boolean }[]) {
  let streak = 0;
  for (const shift of shifts) {
    if (!shift.closed) continue;
    if (!shift.hadCount) break;
    streak += 1;
  }
  return streak;
}

export type CountStamp = { date: string; created_at?: string | null; qty: number; id?: string };

export function newestCount<T extends CountStamp>(rows: T[]): T | null {
  const sorted = [...(rows || [])].filter((row) => row?.date).sort((a, b) => {
    const byDate = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (byDate !== 0) return byDate;
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  });
  return sorted[0] || null;
}

export function sumBetween(rows: { qty: number; date: string }[] | undefined, from: string, to: string) {
  if (!from || !to) return 0;
  const start = new Date(from).getTime();
  const end = new Date(to).getTime();
  return (rows || []).reduce((sum, row) => {
    if (!row?.date) return sum;
    const at = new Date(row.date).getTime();
    if (at > start && at <= end) return sum + (Number(row.qty) || 0);
    return sum;
  }, 0);
}

export function countGap(input: {
  previousQty: number;
  purchasesBetween: number;
  thisQty: number;
  recipeUsage: number;
  unitPrice: number | null;
}) {
  const physical = input.previousQty + input.purchasesBetween - input.thisQty;
  const gapQty = physical - input.recipeUsage;
  const price = input.unitPrice;
  const money = price != null && Number.isFinite(price) && price > 0 ? Math.round(Math.abs(gapQty) * price) : null;
  const threshold = Math.max(Math.abs(input.recipeUsage) * RECOUNT_USAGE_FRACTION, RECOUNT_MIN_UNIT);
  const needsRecount = Math.abs(gapQty) > threshold && money != null && money > RECOUNT_MIN_MONEY;
  return { physical, gapQty, money, threshold, needsRecount };
}

export type CycleItem = {
  id: string;
  name: string;
  unit: string;
  unitPrice: number | null;
  previousQty: number | null;
  previousAt: string | null;
  previousStaff: string | null;
  purchasesSince: number;
  recipeUsageSince: number;
  closeQty?: number | null;
  closeStaff?: string | null;
};

export function reviewEnteredCount(item: CycleItem, qty: number, alreadyRecounted: boolean) {
  if (item.previousQty == null || !Number.isFinite(item.previousQty)) {
    return { needsRecount: false, needsWaste: false, unexplainedQty: null as number | null, gapQty: null as number | null, money: null as number | null };
  }
  const gap = countGap({
    previousQty: item.previousQty,
    purchasesBetween: Number(item.purchasesSince) || 0,
    thisQty: qty,
    recipeUsage: Number(item.recipeUsageSince) || 0,
    unitPrice: item.unitPrice,
  });
  if (!alreadyRecounted && gap.needsRecount) {
    return { needsRecount: true, needsWaste: false, unexplainedQty: null, gapQty: gap.gapQty, money: gap.money };
  }
  if (alreadyRecounted && gap.needsRecount && gap.gapQty > 0) {
    return { needsRecount: false, needsWaste: true, unexplainedQty: null, gapQty: gap.gapQty, money: gap.money };
  }
  if (alreadyRecounted && gap.needsRecount && gap.gapQty < 0) {
    return { needsRecount: false, needsWaste: false, unexplainedQty: gap.gapQty, gapQty: gap.gapQty, money: gap.money };
  }
  if (gap.money == null && Math.abs(gap.gapQty) > gap.threshold) {
    return { needsRecount: false, needsWaste: false, unexplainedQty: gap.gapQty, gapQty: gap.gapQty, money: null };
  }
  return { needsRecount: false, needsWaste: false, unexplainedQty: null, gapQty: gap.gapQty, money: gap.money };
}

export function splitWaste(gapQty: number, wasteQty: number, unitPrice: number | null) {
  const remaining = gapQty - wasteQty;
  const money = unitPrice != null && unitPrice > 0 && Math.abs(remaining) > 0.0001
    ? Math.round(Math.abs(remaining) * unitPrice)
    : null;
  return {
    remaining,
    money,
    label: UNEXPLAINED_LABEL,
    show: Math.abs(remaining) > 0.0001,
  };
}

export function nightDifference(closeQty: number, openQty: number) {
  const diff = Math.abs(closeQty - openQty);
  return {
    label: NIGHT_LABEL,
    closeQty,
    openQty,
    diff,
    changed: diff > 0.0001,
  };
}

export function takeSaveLock(lock: { current: boolean }) {
  if (lock.current) return false;
  lock.current = true;
  return true;
}

export function releaseSaveLock(lock: { current: boolean }) {
  lock.current = false;
}

export function openingInsertDecision(input: {
  rows: { incident_type?: string | null }[];
  existingOpening: boolean;
}) {
  const wantsOpening = input.rows.some((row) => row.incident_type === "opening_recount");
  if (wantsOpening && input.existingOpening) return { write: false as const, ids: [] as string[] };
  return { write: true as const };
}

export function buildCountLog(input: {
  clientId: string;
  ingredientId: string;
  quantity: number;
  now: string;
  workerName: string;
  workerId: string;
  shiftId: string;
  incidentType: string;
  notes: string;
}) {
  return {
    client_id: input.clientId,
    ingredient_id: input.ingredientId,
    quantity: input.quantity,
    type: "count" as const,
    incident_type: input.incidentType,
    notes: String(input.notes || "").slice(0, 500),
    worker_name: input.workerName,
    created_by: input.workerId,
    staff_id: input.workerId,
    shift_id: input.shiftId,
    date: input.now,
  };
}
