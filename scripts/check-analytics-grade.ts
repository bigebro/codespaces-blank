import assert from "node:assert/strict";
import { applyCountPick, gradeIngredient } from "../src/lib/analytics";

const START = "2026-11-01";
const END = "2026-11-30";
const LIMIT = "2026-12-20T00:00:00+08:00";
const MEASURED = "Хэмжсэн: 11-15 – 11-30";

function blank(extra: Record<string, unknown> = {}) {
  return {
    id: "ing-1",
    name: "Кофе",
    unit: "кг",
    purchased: 0,
    purchase_value: 0,
    purchases: [],
    purchases_after: [],
    theoretical: 0,
    in_period_log: false,
    no_price: false,
    future_log_id: null,
    has_start: false,
    has_end: false,
    start: null,
    end: null,
    ...extra,
  };
}

function grade(history: Array<{ date: string; qty: number; id: string }>, extra: Record<string, unknown> = {}) {
  const item = blank(extra);
  applyCountPick(item, history, START, END, LIMIT);
  return gradeIngredient(item, START, END, 1000);
}

const green = grade(
  [
    { id: "a", date: "2026-10-31T21:00:00+08:00", qty: 10 },
    { id: "b", date: "2026-12-01T10:00:00+08:00", qty: 12 },
  ],
  { purchased: 5, theoretical: 3, purchase_value: 5000 },
);
assert.equal(green?.status, "Verified", `full month should be green, got ${green?.status} ${green?.reasons}`);
assert.equal(green?.partial, false);
assert.equal(green?.actual_qty, 3);

const yellow = grade(
  [
    { id: "mid", date: "2026-11-15T09:00:00+08:00", qty: 20 },
    { id: "close", date: "2026-11-30T21:00:00+08:00", qty: 14 },
  ],
  {
    purchased: 154,
    theoretical: 40,
    purchase_value: 8000,
    purchases: [
      { id: "early", qty: 100, cost: 1000, date: "2026-11-10T12:00:00+08:00", notes: "" },
      { id: "mid-buy", qty: 4, cost: 40, date: "2026-11-20T12:00:00+08:00", notes: "" },
    ],
    purchases_after: [
      { qty: 50, date: "2026-12-01T12:00:00+08:00" },
    ],
  },
);
assert.equal(yellow?.status, "Check", `partial month should be yellow, got ${yellow?.status}`);
assert.equal(yellow?.reasons[0], MEASURED);
assert.equal(yellow?.measured_from, "2026-11-15");
assert.equal(yellow?.measured_until, "2026-11-30");
assert.equal(yellow?.actual_qty, 10, "only the purchase after 11-15 counts");
assert.equal(yellow?.theoretical_qty, 40, "theoretical stays the full period");
assert.equal(yellow?.gap_money, null);
assert.equal(MEASURED.includes("–"), true);

const red = grade([], { purchased: 2, purchase_value: 2000, in_period_log: true });
assert.equal(red?.status, "Missing");
assert.equal(red?.action, "count");
assert.deepEqual(red?.reasons, [
  "2026-11-01-нд эсвэл түүнээс өмнө тооллого алга",
  "2026-11-30-нд эсвэл түүнээс хойш тооллого алга",
]);

const todayItem = blank({ in_period_log: true, theoretical: 1 });
applyCountPick(
  todayItem,
  [{ id: "only", date: "2026-11-15T18:00:00+08:00", qty: 7 }],
  "2026-11-15",
  "2026-11-15",
  LIMIT,
);
const today = gradeIngredient(todayItem, "2026-11-15", "2026-11-15", 1000);
assert.notEqual(today?.status, "Verified");
assert.equal(today?.status, "Missing");
assert.equal(todayItem.has_start, true);
assert.equal(todayItem.has_end, false);

console.log("analytics grade checks passed");
