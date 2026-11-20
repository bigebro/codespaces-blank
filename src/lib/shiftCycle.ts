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
  spoilage: "Асгарсан/Муудсан",
  staff_meal: "Ажилтны хоол",
  staffmeal: "Ажилтны хоол",
  testing: "Туршилт",
  test: "Туршилт",
  purchase: "Орлого",
  count: "Тооллого",
  sale: "Борлуулалт",
  sales: "Борлуулалт",
  other: "Бусад",
  waste: "Хаягдал",
  spill: "Асгарсан",
  spilled: "Асгарсан",
};

function normalizeLogType(type: string) {
  return String(type || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

// Хадгалагдсан төрөл (spoilage гэх мэт) өөрчлөгдөхгүй, зөвхөн харуулах нэр.
// Код том/жижиг үсэг үл харгалзана. spoilage: бичвэрт «асга»/«мууд» байвал ялгана, үгүй бол «Асгарсан/Муудсан».
export function logTypeLabel(type: string, text?: string | null) {
  const key = normalizeLogType(type);
  if (key === "spoilage" || key === "spoil") {
    const t = String(text || "").toLowerCase();
    if (t.includes("асга") && !t.includes("мууд")) return "Асгарсан";
    if (t.includes("мууд") && !t.includes("асга")) return "Муудсан";
    return "Асгарсан/Муудсан";
  }
  return TYPE_LABEL[key] || "Бусад";
}

const ROLE_PREFIX = /^(staff|barista|worker|менежер|ажилтан|тогооч|бариста)$/i;

/** «staff (Нэр)» -> «Ажилтан: Нэр». «Kiosk (Хаягдал)» -> «Таблет (Хаягдал)». */
export function staffDisplayName(raw: string | null | undefined): string {
  let s = String(raw || "").trim();
  if (!s) return "Ажилтан";
  s = s.replace(/^ажилтан\s*:\s*/i, "").trim();
  if (!s) return "Ажилтан";
  // Төхөөрөмжийн нэр: Kiosk / kiosk -> Таблет (өгөгдлийн хуучин бичлэгт үлдсэн).
  s = s.replace(/\bkiosk\b/gi, "Таблет");
  const wrapped = s.match(/^\s*(staff|barista|worker|менежер|ажилтан|тогооч|бариста)\s*\((.+)\)\s*$/i);
  if (wrapped) {
    const inner = staffDisplayName(wrapped[2].trim());
    const name = inner.replace(/^Ажилтан:\s*/i, "").trim();
    return name ? `Ажилтан: ${name}` : "Ажилтан";
  }
  if (ROLE_PREFIX.test(s)) return "Ажилтан";
  return s;
}

export function displayUnit(unit: string) {
  const key = String(unit || "").trim().toLowerCase();
  if (key === "ш" || key === "ширхэг" || key === "pc" || key === "piece" || key === "item") return "ширхэг";
  if (key === "гр" || key === "г" || key === "g" || key === "gram") return "гр";
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
  const empty = { needsRecount: false, needsWaste: false, needsConfirm: false, unexplainedQty: null as number | null, gapQty: null as number | null, money: null as number | null };
  if (item.previousQty == null || !Number.isFinite(item.previousQty)) {
    return empty;
  }
  const gap = countGap({
    previousQty: item.previousQty,
    purchasesBetween: Number(item.purchasesSince) || 0,
    thisQty: qty,
    recipeUsage: Number(item.recipeUsageSince) || 0,
    unitPrice: item.unitPrice,
  });
  const implausible = isImplausibleIncrease(item, qty);
  if (!alreadyRecounted && (gap.needsRecount || implausible)) {
    return { needsRecount: true, needsWaste: false, needsConfirm: false, unexplainedQty: null, gapQty: gap.gapQty, money: gap.money };
  }
  if (alreadyRecounted && implausible) {
    return { needsRecount: false, needsWaste: false, needsConfirm: true, unexplainedQty: null, gapQty: gap.gapQty, money: gap.money };
  }
  if (alreadyRecounted && gap.needsRecount && gap.gapQty > 0) {
    return { needsRecount: false, needsWaste: true, needsConfirm: false, unexplainedQty: null, gapQty: gap.gapQty, money: gap.money };
  }
  if (alreadyRecounted && gap.needsRecount && gap.gapQty < 0) {
    return { needsRecount: false, needsWaste: false, needsConfirm: false, unexplainedQty: gap.gapQty, gapQty: gap.gapQty, money: gap.money };
  }
  if (gap.money == null && Math.abs(gap.gapQty) > gap.threshold) {
    return { needsRecount: false, needsWaste: false, needsConfirm: false, unexplainedQty: gap.gapQty, gapQty: gap.gapQty, money: null };
  }
  return { needsRecount: false, needsWaste: false, needsConfirm: false, unexplainedQty: null, gapQty: gap.gapQty, money: gap.money };
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

/** Хаалтын/нээлтийн тооллого: орлогогүйгээр өмнөх үлдэгдлээс хэт өндөр үсрэлт. */
export function expectedOnHand(item: Pick<CycleItem, "previousQty" | "purchasesSince">): number | null {
  if (item.previousQty == null || !Number.isFinite(item.previousQty)) return null;
  return Number(item.previousQty) + (Number(item.purchasesSince) || 0);
}

/**
 * Консерватив дүрэм: тоолсон тоо (өмнөх + орлого)-оос 2 дахин их
 * бөгөөд зөрүү нь дор хаяж 100 нэгж (эсвэл өмнөх үлдэгдлийн 50%) бол хэт үсрэлт.
 * Орлого бүртгэгдээгүй том тоог дуугүй хүлээн авахгүй.
 */
export function isImplausibleIncrease(item: CycleItem, qty: number): boolean {
  const expected = expectedOnHand(item);
  if (expected == null || !Number.isFinite(qty) || qty < 0) return false;
  const jump = qty - expected;
  const minJump = Math.max(100, Math.abs(expected) * 0.5);
  return qty > expected * 2 && jump >= minJump;
}

export const IMPLAUSIBLE_COUNT_MESSAGE =
  "Энэ тоо өмнөх тооллого болон бүртгэгдсэн орлогоос хэт өндөр байна. Орлого бүртгэгдээгүй байж магадгүй. Зөв гэдгээ батална уу, эсвэл тоогоо дахин оруулна уу.";

export const KIOSK_WASTE_REASONS: { label: string; type: "spoilage" | "other"; notes: string }[] = [
  { label: "Асгарсан", type: "spoilage", notes: "Асгарсан" },
  { label: "Муудсан", type: "spoilage", notes: "Муудсан" },
  { label: "Хугацаа дууссан", type: "spoilage", notes: "Хугацаа дууссан" },
  { label: "Бусад", type: "other", notes: "Бусад" },
];
