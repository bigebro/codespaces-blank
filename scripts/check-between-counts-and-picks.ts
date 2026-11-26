import assert from "node:assert/strict";
import { advanceDue, pickCloseItems, type CycleCandidate } from "../src/lib/shiftCycle";
import {
  BETWEEN_COUNTS_TITLE,
  computeBetweenCounts,
  lastTwoCounts,
  movedSinceLastCount,
  recipeUsageEvents,
} from "../src/lib/betweenCounts";

// 1. pickCloseItems: moved items first.
const base: CycleCandidate[] = Array.from({ length: 10 }, (_, i) => ({
  id: `s${i}`,
  purchaseValue30d: 1000,
  shiftsSinceCount: 2,
}));
const moved: CycleCandidate[] = ["m1", "m2", "m3"].map((id) => ({ id, purchaseValue30d: 0, shiftsSinceCount: 0, movedSinceCount: true }));
const picked = pickCloseItems([...base, ...moved], []);
assert.equal(picked.length, 5);
for (const id of ["m1", "m2", "m3"]) assert.ok(picked.includes(id), `moved ${id} should be picked`);

// A still item uncounted for a long time still surfaces ahead of a moved item counted last shift.
const stale = pickCloseItems(
  [
    ...Array.from({ length: 6 }, (_, i) => ({ id: `mv${i}`, purchaseValue30d: 0, shiftsSinceCount: 0, movedSinceCount: true })),
    { id: "still-old", purchaseValue30d: 0, shiftsSinceCount: 14 },
    { id: "still-new", purchaseValue30d: 0, shiftsSinceCount: 1 },
  ],
  [],
);
assert.ok(stale.includes("still-old"), "long-uncounted still item must surface");
assert.ok(!stale.includes("still-new"), "recently counted still item waits behind moved items");

// Never-counted items are treated like moved ones.
const fresh = pickCloseItems(
  [...base, { id: "new1", purchaseValue30d: 0, shiftsSinceCount: 0, neverCounted: true }],
  [],
);
assert.ok(fresh.includes("new1"));

// Deterministic.
const input = [...base, ...moved];
assert.deepEqual(pickCloseItems(input, []), pickCloseItems([...input].reverse(), []));

// No exact repeat of previousIds.
const again = pickCloseItems(input, picked);
assert.equal(again.length, 5);
assert.notDeepEqual([...again].sort(), [...picked].sort());

// Still items keep getting counted within roughly two weeks when everything else moves each shift.
let rotation: CycleCandidate[] = [
  ...Array.from({ length: 20 }, (_, i) => ({ id: `hot${String(i).padStart(2, "0")}`, purchaseValue30d: 500, shiftsSinceCount: 1, movedSinceCount: true })),
  ...Array.from({ length: 5 }, (_, i) => ({ id: `cold${i}`, purchaseValue30d: 0, shiftsSinceCount: 1 })),
];
const coldSeen = new Set<string>();
let prev: string[] = [];
for (let shift = 0; shift < 28; shift += 1) {
  const p = pickCloseItems(rotation, prev);
  for (const id of p) if (id.startsWith("cold")) coldSeen.add(id);
  rotation = advanceDue(rotation, p).map((row) => ({ ...row, movedSinceCount: row.id.startsWith("hot") }));
  prev = p;
}
assert.equal(coldSeen.size, 5, "every still item counted within 28 shifts");

// Legacy candidates (no new fields) behave as before: score unchanged.
const legacy = pickCloseItems(base, []);
assert.deepEqual(legacy, ["s0", "s1", "s2", "s3", "s4"]);

// movedSinceLastCount
const movedSet = movedSinceLastCount({
  lastCountAt: new Map([
    ["a", "2026-11-10T10:00:00Z"],
    ["b", "2026-11-10T10:00:00Z"],
    ["c", "2026-11-10T10:00:00Z"],
    ["d", "2026-11-10T10:00:00Z"],
  ]),
  purchases: [
    { ingredient_id: "a", qty: 5, date: "2026-11-11T00:00:00Z" },
    { ingredient_id: "d", qty: 5, date: "2026-11-09T00:00:00Z" },
  ],
  usage: [{ ingredient_id: "b", qty: 1, date: "2026-11-12T00:00:00Z" }],
  wasteLogs: [
    { ingredient_id: "c", type: "spoilage", quantity: 2, date: "2026-11-12T00:00:00Z" },
    { ingredient_id: "d", type: "count", quantity: 2, date: "2026-11-12T00:00:00Z" },
    { ingredient_id: "d", type: "spoilage", quantity: 2, incident_type: "unexplained_gap", date: "2026-11-12T00:00:00Z" },
  ],
  now: "2026-11-20T00:00:00Z",
});
assert.deepEqual([...movedSet].sort(), ["a", "b", "c"]);

// recipeUsageEvents
const events = recipeUsageEvents(
  [
    { product_name: "Latte", quantity_sold: 2, date: "2026-11-12T00:00:00Z" },
    { product_name: "Unknown thing", quantity_sold: 3, date: "2026-11-12T00:00:00Z" },
  ],
  [{ product_name: "latte", ingredient_id: "milk", amount: 0.2 }],
);
assert.equal(events.length, 1);
assert.equal(events[0].ingredient_id, "milk");
assert.ok(Math.abs(events[0].qty - 0.4) < 1e-9);

// 2. Between counts.
assert.equal(BETWEEN_COUNTS_TITLE, "Тооллого хоорондын бодит зарцуулалт");
const from = "2026-11-12T14:00:00Z";
const to = "2026-11-19T14:00:00Z";
const result = computeBetweenCounts({
  ingredients: [
    { id: "milk", name: "Сүү", unit: "л", unitPrice: 4000 },
    { id: "beans", name: "Кофе", unit: "гр", unitPrice: null },
    { id: "cups", name: "Аяга", unit: "ш", unitPrice: 200 },
    { id: "none", name: "Сироп", unit: "мл", unitPrice: 50 },
  ],
  counts: [
    { ingredient_id: "milk", qty: 7, date: "2026-11-01T14:00:00Z" },
    { ingredient_id: "milk", qty: 10, date: from },
    { ingredient_id: "milk", qty: 8, date: to },
    { ingredient_id: "beans", qty: 1000, date: from },
    { ingredient_id: "beans", qty: 400, date: to },
    { ingredient_id: "cups", qty: 100, date: to },
  ],
  purchases: [
    { ingredient_id: "milk", qty: 40, date: "2026-11-15T00:00:00Z" },
    { ingredient_id: "milk", qty: 99, date: from },
    { ingredient_id: "milk", qty: 99, date: "2026-11-20T00:00:00Z" },
    { ingredient_id: "milk", qty: 5, date: to },
    { ingredient_id: "beans", qty: 500, date: "2026-11-15T00:00:00Z" },
  ],
  usage: [
    { ingredient_id: "milk", qty: 38, date: "2026-11-16T00:00:00Z" },
    { ingredient_id: "milk", qty: 50, date: "2026-11-11T00:00:00Z" },
    { ingredient_id: "beans", qty: 1100, date: "2026-11-16T00:00:00Z" },
  ],
  wasteLogs: [
    { ingredient_id: "milk", type: "spoilage", notes: "Асгарсан/Алдаа", quantity: 1, date: "2026-11-17T00:00:00Z" },
    { ingredient_id: "milk", type: "spoilage", quantity: 9, date: "2026-11-21T00:00:00Z" },
    { ingredient_id: "milk", type: "purchase", quantity: 9, date: "2026-11-17T00:00:00Z" },
    { ingredient_id: "milk", type: "spoilage", incident_type: "unexplained_gap", quantity: 9, date: "2026-11-17T00:00:00Z" },
  ],
});
const milk = result.rows.find((row) => row.ingredientId === "milk")!;
assert.equal(milk.fromDate, from);
assert.equal(milk.toDate, to);
assert.equal(milk.startQty, 10);
assert.equal(milk.endQty, 8);
assert.equal(milk.purchasedQty, 45); // 40 inside, plus the 5 exactly at `to`; `from` and after `to` excluded
assert.equal(milk.actualUsage, 47);
assert.equal(milk.expectedUsage, 38);
assert.equal(milk.loggedWaste, 1);
assert.equal(milk.waste?.spill, 1);
assert.equal(milk.unexplainedGap, 8);
assert.equal(milk.gapMoney, 32000);
assert.equal(milk.actualMoney, 188000);
assert.equal(milk.statusLabel, "Баталгаажсан");

const beans = result.rows.find((row) => row.ingredientId === "beans")!;
assert.equal(beans.actualUsage, 1100);
assert.equal(beans.unexplainedGap, 0);
assert.equal(beans.gapMoney, null);
assert.equal(beans.actualMoney, null);
assert.equal(beans.status, "Check");
assert.ok(beans.reasons.includes("Нэгжийн үнэ алга"));

const cups = result.rows.find((row) => row.ingredientId === "cups")!;
assert.equal(cups.countsAvailable, 1);
assert.equal(cups.actualUsage, null);
assert.equal(cups.unexplainedGap, null);
assert.equal(cups.gapMoney, null);
assert.equal(cups.statusLabel, "—");
const none = result.rows.find((row) => row.ingredientId === "none")!;
assert.equal(none.countsAvailable, 0);
assert.equal(none.statusLabel, "—");

assert.equal(result.summary.totalItems, 4);
assert.equal(result.summary.measuredItems, 2);
assert.equal(result.summary.pricedItems, 1);
assert.equal(result.summary.noPriceItems, 1);
assert.equal(result.summary.gapMoney, 32000);
assert.equal(result.summary.actualMoney, 188000);

// Far gap -> Шалгах.
const far = computeBetweenCounts({
  ingredients: [{ id: "x", name: "X", unit: "л", unitPrice: 1000 }],
  counts: [
    { ingredient_id: "x", qty: 20, date: from },
    { ingredient_id: "x", qty: 0, date: to },
  ],
  purchases: [],
  usage: [{ ingredient_id: "x", qty: 10, date: "2026-11-15T00:00:00Z" }],
  wasteLogs: [],
}).rows[0];
assert.equal(far.unexplainedGap, 10);
assert.equal(far.statusLabel, "Шалгах");

// Overnight opening recount (< 12h) is not used as the start.
const pair = lastTwoCounts([
  { date: "2026-11-10T14:00:00Z" },
  { date: "2026-11-18T14:00:00Z" },
  { date: "2026-11-19T00:30:00Z" },
]);
assert.equal(pair.start?.date, "2026-11-10T14:00:00Z");
assert.equal(pair.end?.date, "2026-11-19T00:30:00Z");

console.log("check-between-counts-and-picks: ok");
