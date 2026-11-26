import { calculateMatchScore } from "./autoReconcile";
import { addWasteLog, emptyWasteBuckets, wasteLoggedTotal, type WasteBuckets } from "./shiftCycle";

/**
 * Тооллого хоорондын бодит зарцуулалт: бараа бүрийн сүүлийн хоёр тооллогын хооронд
 * (сарын эхэн, сүүлээс үл хамааран) бодит зарцуулалт, жороор хүлээгдэх зарцуулалт,
 * бүртгэсэн хаягдал, тайлбаргүй зөрүүг тооцно. Сарын харагдацыг орлохгүй, нэмэлт.
 * Цэвэр функц: өгөгдлийн сангаас уншихгүй, бичихгүй.
 */

export const BETWEEN_COUNTS_TITLE = "Тооллого хоорондын бодит зарцуулалт";
export const BETWEEN_COUNTS_NOTE =
  "Бараа бүрийн сүүлийн хоёр тооллогоор тооцсон. Хуанлийн сарын өртөг биш, огноо нь бараа бүрт өөр.";

/** Нэг ээлжийн дахин тоолол, шөнийн нээлтийн тооллого эхлэл болохгүй: хоёр тооллого дор хаяж ийм зайтай байна. */
export const MIN_COUNT_GAP_HOURS = 12;
/** Сарын харагдацын «30%-иас их зөрсөн» дүрэмтэй ижил. */
export const FAR_GAP_FRACTION = 0.3;

export type BetweenStatus = "Verified" | "Check";

export const BETWEEN_STATUS_LABEL: Record<BetweenStatus, string> = {
  Verified: "Баталгаажсан",
  Check: "Шалгах",
};

export type BetweenIngredient = { id: string; name: string; unit: string; unitPrice: number | null };
export type BetweenCount = { ingredient_id: string; qty: number; date: string; created_at?: string | null };
export type BetweenQty = { ingredient_id: string; qty: number; date: string };
export type BetweenWasteLog = {
  ingredient_id: string;
  type?: string | null;
  notes?: string | null;
  incident_type?: string | null;
  quantity?: number | string | null;
  date: string;
};

export type BetweenRow = {
  ingredientId: string;
  name: string;
  unit: string;
  unitPrice: number | null;
  countsAvailable: number;
  fromDate: string | null;
  toDate: string | null;
  startQty: number | null;
  endQty: number | null;
  purchasedQty: number | null;
  actualUsage: number | null;
  expectedUsage: number | null;
  loggedWaste: number | null;
  waste: WasteBuckets | null;
  unexplainedGap: number | null;
  actualMoney: number | null;
  gapMoney: number | null;
  status: BetweenStatus | null;
  /** «Баталгаажсан», «Шалгах», эсвэл тооллого хүрэлцэхгүй бол «—». */
  statusLabel: string;
  reasons: string[];
};

export type BetweenSummary = {
  totalItems: number;
  measuredItems: number;
  pricedItems: number;
  noPriceItems: number;
  actualMoney: number;
  gapMoney: number;
  lossMoney: number;
  surplusMoney: number;
};

function time(value: string | null | undefined) {
  const t = new Date(String(value || "")).getTime();
  return Number.isFinite(t) ? t : NaN;
}

function validPrice(price: number | null | undefined) {
  const n = Number(price);
  return price != null && Number.isFinite(n) && n > 0 ? n : null;
}

function inWindow(date: string, from: number, to: number) {
  const at = time(date);
  return Number.isFinite(at) && at > from && at <= to;
}

function round(value: number) {
  return Math.round(value * 1000) / 1000;
}

/** Сүүлийн хоёр тооллого: эцэс нь хамгийн шинэ, эхлэл нь түүнээс дор хаяж MIN_COUNT_GAP_HOURS өмнөх хамгийн шинэ тооллого. */
export function lastTwoCounts<T extends { date: string; created_at?: string | null }>(rows: T[]) {
  const sorted = (rows || [])
    .filter((row) => row && Number.isFinite(time(row.date)))
    .sort((a, b) => time(b.date) - time(a.date) || (time(b.created_at) || 0) - (time(a.created_at) || 0));
  const end = sorted[0] || null;
  if (!end) return { start: null, end: null, available: 0 };
  const limit = time(end.date) - MIN_COUNT_GAP_HOURS * 3600000;
  const start = sorted.find((row) => time(row.date) <= limit) || null;
  return { start, end, available: start ? 2 : 1 };
}

function clean(value: string) {
  return String(value || "").replace(/[\u00a0\s]+/g, " ").trim().toLowerCase();
}

/**
 * Борлуулалтыг жороор орцын зарцуулалт болгоно. Яг ижил нэр эхэлж, үгүй бол 0.8-аас дээш таарсан жор.
 * Барааны нэр бүрийг нэг удаа л тааруулна (олон мөртэй үед хурдан).
 */
export function recipeUsageEvents(
  sales: { product_name?: string | null; quantity_sold?: number | string | null; date?: string | null }[],
  recipes: { product_name?: string | null; ingredient_id?: string | null; amount?: number | string | null }[],
): BetweenQty[] {
  const byProduct = new Map<string, { product_name: string; ingredient_id: string; amount: number }[]>();
  for (const recipe of recipes || []) {
    if (!recipe?.ingredient_id || !recipe.product_name) continue;
    const key = clean(recipe.product_name);
    const list = byProduct.get(key) || [];
    list.push({ product_name: String(recipe.product_name), ingredient_id: recipe.ingredient_id, amount: Number(recipe.amount) || 0 });
    byProduct.set(key, list);
  }
  const ingredientIds = [...new Set((recipes || []).map((r) => r?.ingredient_id).filter((id): id is string => Boolean(id)))];
  const cache = new Map<string, Map<string, number>>();

  function amountsFor(productName: string) {
    const key = clean(productName);
    const hit = cache.get(key);
    if (hit) return hit;
    const result = new Map<string, number>();
    const exact = byProduct.get(key) || [];
    for (const recipe of exact) if (!result.has(recipe.ingredient_id)) result.set(recipe.ingredient_id, recipe.amount);
    const missing = ingredientIds.filter((id) => !result.has(id));
    if (missing.length) {
      const best = new Map<string, { score: number; amount: number }>();
      for (const list of byProduct.values()) {
        for (const recipe of list) {
          if (result.has(recipe.ingredient_id)) continue;
          const score = calculateMatchScore(String(productName || ""), recipe.product_name);
          const current = best.get(recipe.ingredient_id);
          if (score >= 0.8 && (!current || score > current.score)) best.set(recipe.ingredient_id, { score, amount: recipe.amount });
        }
      }
      for (const [id, row] of best) result.set(id, row.amount);
    }
    cache.set(key, result);
    return result;
  }

  const events: BetweenQty[] = [];
  for (const sale of sales || []) {
    if (!sale?.date || !sale.product_name) continue;
    const sold = Number(sale.quantity_sold) || 0;
    if (!sold) continue;
    for (const [ingredientId, amount] of amountsFor(String(sale.product_name))) {
      if (!amount) continue;
      events.push({ ingredient_id: ingredientId, qty: sold * amount, date: sale.date });
    }
  }
  return events;
}

function groupBy<T extends { ingredient_id: string }>(rows: T[]) {
  const map = new Map<string, T[]>();
  for (const row of rows || []) {
    if (!row?.ingredient_id) continue;
    const list = map.get(row.ingredient_id) || [];
    list.push(row);
    map.set(row.ingredient_id, list);
  }
  return map;
}

function emptyRow(ing: BetweenIngredient, available: number, endDate: string | null, endQty: number | null): BetweenRow {
  return {
    ingredientId: ing.id,
    name: ing.name,
    unit: ing.unit,
    unitPrice: validPrice(ing.unitPrice),
    countsAvailable: available,
    fromDate: null,
    toDate: endDate,
    startQty: null,
    endQty,
    purchasedQty: null,
    actualUsage: null,
    expectedUsage: null,
    loggedWaste: null,
    waste: null,
    unexplainedGap: null,
    actualMoney: null,
    gapMoney: null,
    status: null,
    statusLabel: "—",
    reasons: [available === 0 ? "Тооллого алга" : "Хоёр дахь тооллого хүлээгдэж байна"],
  };
}

export function computeBetweenCounts(input: {
  ingredients: BetweenIngredient[];
  counts: BetweenCount[];
  purchases: BetweenQty[];
  usage: BetweenQty[];
  wasteLogs: BetweenWasteLog[];
}): { rows: BetweenRow[]; summary: BetweenSummary } {
  const counts = groupBy(input.counts || []);
  const purchases = groupBy(input.purchases || []);
  const usage = groupBy(input.usage || []);
  const waste = groupBy(input.wasteLogs || []);

  const rows: BetweenRow[] = (input.ingredients || []).filter((ing) => ing?.id).map((ing) => {
    const pair = lastTwoCounts(counts.get(ing.id) || []);
    if (!pair.end || !pair.start) {
      return emptyRow(ing, pair.available, pair.end?.date || null, pair.end ? Number(pair.end.qty) || 0 : null);
    }
    const from = time(pair.start.date);
    const to = time(pair.end.date);
    const sum = (list: BetweenQty[] | undefined) =>
      (list || []).reduce((total, row) => (inWindow(row.date, from, to) ? total + (Number(row.qty) || 0) : total), 0);

    const startQty = Number(pair.start.qty) || 0;
    const endQty = Number(pair.end.qty) || 0;
    const purchasedQty = round(sum(purchases.get(ing.id)));
    const expectedUsage = round(sum(usage.get(ing.id)));
    const buckets = emptyWasteBuckets();
    for (const log of waste.get(ing.id) || []) {
      if (inWindow(log.date, from, to)) addWasteLog(buckets, log, ing.id);
    }
    const loggedWaste = round(wasteLoggedTotal(buckets));
    const actualUsage = round(startQty + purchasedQty - endQty);
    const unexplainedGap = round(actualUsage - expectedUsage - loggedWaste);
    const price = validPrice(ing.unitPrice);

    const reasons: string[] = [];
    const explained = expectedUsage + loggedWaste;
    const scale = Math.max(Math.abs(explained), Math.abs(actualUsage));
    const far = scale > 0.5 && Math.abs(unexplainedGap) / scale > FAR_GAP_FRACTION;
    if (far) reasons.push("Тооллого хүлээгдэж байснаас 30%-иас их зөрсөн");
    if (price == null) reasons.push("Нэгжийн үнэ алга");
    const status: BetweenStatus = reasons.length ? "Check" : "Verified";

    return {
      ingredientId: ing.id,
      name: ing.name,
      unit: ing.unit,
      unitPrice: price,
      countsAvailable: 2,
      fromDate: pair.start.date,
      toDate: pair.end.date,
      startQty,
      endQty,
      purchasedQty,
      actualUsage,
      expectedUsage,
      loggedWaste,
      waste: buckets,
      unexplainedGap,
      actualMoney: price == null ? null : Math.round(actualUsage * price),
      gapMoney: price == null ? null : Math.round(unexplainedGap * price),
      status,
      statusLabel: BETWEEN_STATUS_LABEL[status],
      reasons,
    };
  });

  const measured = rows.filter((row) => row.countsAvailable >= 2);
  const priced = measured.filter((row) => row.gapMoney != null);
  const summary: BetweenSummary = {
    totalItems: rows.length,
    measuredItems: measured.length,
    pricedItems: priced.length,
    noPriceItems: measured.length - priced.length,
    actualMoney: priced.reduce((sum, row) => sum + (row.actualMoney || 0), 0),
    gapMoney: priced.reduce((sum, row) => sum + (row.gapMoney || 0), 0),
    lossMoney: priced.reduce((sum, row) => sum + Math.max(0, row.gapMoney || 0), 0),
    surplusMoney: priced.reduce((sum, row) => sum + Math.min(0, row.gapMoney || 0), 0),
  };

  const order = (row: BetweenRow) => (row.status === "Check" ? 0 : row.status === "Verified" ? 1 : 2);
  rows.sort((a, b) => order(a) - order(b) || Math.abs(b.gapMoney || 0) - Math.abs(a.gapMoney || 0) || a.name.localeCompare(b.name));
  return { rows, summary };
}

/**
 * Хаалтын тооллогын сонголтод: сүүлийн тооллогоос хойш хөдөлсөн эсэх.
 * Хөдөлгөөн = жороор зарцуулалт, жинхэнэ хаягдал, эсвэл орлого. Тооллогогүй бараа хөдөлсөн гэж тооцогдохгүй.
 */
export function movedSinceLastCount(input: {
  lastCountAt: Map<string, string>;
  purchases: BetweenQty[];
  usage: BetweenQty[];
  wasteLogs: BetweenWasteLog[];
  now: string;
}) {
  const moved = new Set<string>();
  const end = time(input.now);
  const mark = (id: string, date: string, qty: number) => {
    if (!id || moved.has(id) || !(Math.abs(qty) > 0)) return;
    const last = input.lastCountAt.get(id);
    if (!last) return;
    if (inWindow(date, time(last), end)) moved.add(id);
  };
  for (const row of input.purchases || []) mark(row.ingredient_id, row.date, Number(row.qty) || 0);
  for (const row of input.usage || []) mark(row.ingredient_id, row.date, Number(row.qty) || 0);
  for (const log of input.wasteLogs || []) {
    const buckets = emptyWasteBuckets();
    addWasteLog(buckets, log, log.ingredient_id);
    mark(log.ingredient_id, log.date, wasteLoggedTotal(buckets));
  }
  return moved;
}
