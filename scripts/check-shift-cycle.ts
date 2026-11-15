import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  RECOUNT_MIN_MONEY,
  RECOUNT_MIN_UNIT,
  RECOUNT_USAGE_FRACTION,
  UNEXPLAINED_LABEL,
  WASTE_QUESTION,
  advanceDue,
  buildCountLog,
  countGap,
  countStreak,
  nightDifference,
  newestCount,
  pickCloseItems,
  reviewEnteredCount,
  splitWaste,
  streakText,
  type CycleCandidate,
  type CycleItem,
} from "../src/lib/shiftCycle";

assert.equal(RECOUNT_USAGE_FRACTION, 0.05);
assert.equal(RECOUNT_MIN_UNIT, 1);
assert.equal(RECOUNT_MIN_MONEY, 5000);

function same(a: string[], b: string[]) {
  return a.length === b.length && a.every((id) => b.includes(id));
}

let items: CycleCandidate[] = Array.from({ length: 12 }, (_, index) => ({
  id: `i${String(index).padStart(2, "0")}`,
  purchaseValue30d: (12 - index) * 1000,
  shiftsSinceCount: 3,
}));
const seen: string[][] = [];
let previous: string[] = [];
for (let shift = 0; shift < 3; shift += 1) {
  const picked = pickCloseItems(items, previous);
  assert.equal(picked.length, 5);
  if (previous.length) assert.equal(same(picked, previous), false);
  seen.push(picked);
  items = advanceDue(items, picked);
  previous = picked;
}
assert.equal(new Set(seen.map((row) => row.slice().sort().join(","))).size, 3);

const tallies = new Map<string, number>();
items = Array.from({ length: 12 }, (_, index) => ({
  id: `i${String(index).padStart(2, "0")}`,
  purchaseValue30d: (12 - index) * 1000,
  shiftsSinceCount: 1,
}));
previous = [];
for (let shift = 0; shift < 24; shift += 1) {
  const picked = pickCloseItems(items, previous);
  if (previous.length >= 5) assert.equal(same(picked, previous), false);
  for (const id of picked) tallies.set(id, (tallies.get(id) || 0) + 1);
  items = advanceDue(items, picked);
  previous = picked;
}
assert.ok((tallies.get("i00") || 0) > (tallies.get("i11") || 0), "high-value items should be counted more often");

const few = pickCloseItems(
  [
    { id: "a", purchaseValue30d: 10, shiftsSinceCount: 1 },
    { id: "b", purchaseValue30d: 1, shiftsSinceCount: 4 },
  ],
  ["a", "b"],
);
assert.deepEqual(few.sort(), ["a", "b"]);

const night = nightDifference(10, 8);
assert.equal(night.changed, true);
assert.equal(night.diff, 2);
assert.equal(night.label, "Шөнийн зөрүү");
assert.equal(night.closeQty, 10);
assert.equal(night.openQty, 8);

const item: CycleItem = {
  id: "milk",
  name: "Сүү",
  unit: "л",
  unitPrice: 1000,
  previousQty: 100,
  previousAt: "2026-11-01T00:00:00.000Z",
  previousStaff: "Хаалт",
  purchasesSince: 0,
  recipeUsageSince: 10,
};
const big = countGap({ previousQty: 100, purchasesBetween: 0, thisQty: 80, recipeUsage: 10, unitPrice: 1000 });
assert.equal(big.gapQty, 10);
assert.equal(big.needsRecount, true);
const first = reviewEnteredCount(item, 80, false);
assert.equal(first.needsRecount, true);
assert.equal(first.needsWaste, false);
const second = reviewEnteredCount(item, 80, true);
assert.equal(second.needsRecount, false);
assert.equal(second.needsWaste, true);
assert.equal(WASTE_QUESTION, "Энэ хаягдал байсан уу?");
const left = splitWaste(second.gapQty || 0, 4, 1000);
assert.equal(left.remaining, 6);
assert.equal(left.show, true);
assert.equal(left.label, UNEXPLAINED_LABEL);

const small = countGap({ previousQty: 10, purchasesBetween: 0, thisQty: 8, recipeUsage: 0, unitPrice: 100 });
assert.equal(small.gapQty, 2);
assert.equal(small.needsRecount, false);
assert.equal(reviewEnteredCount({ ...item, previousQty: 10, recipeUsageSince: 0, unitPrice: 100 }, 8, false).needsRecount, false);

const noPrice = countGap({ previousQty: 100, purchasesBetween: 0, thisQty: 80, recipeUsage: 10, unitPrice: null });
assert.equal(noPrice.money, null);
assert.equal(noPrice.needsRecount, false);

const newest = newestCount([
  { id: "old", date: "2026-11-02T00:00:00.000Z", created_at: "2026-11-02T00:00:00.000Z", qty: 5 },
  { id: "tie-early", date: "2026-11-03T00:00:00.000Z", created_at: "2026-11-03T01:00:00.000Z", qty: 8 },
  { id: "tie-late", date: "2026-11-03T00:00:00.000Z", created_at: "2026-11-03T02:00:00.000Z", qty: 9 },
]);
assert.equal(newest?.id, "tie-late");
assert.equal(newest?.qty, 9);

assert.equal(countStreak([
  { closed: true, hadCount: true },
  { closed: true, hadCount: true },
  { closed: false, hadCount: false },
  { closed: true, hadCount: false },
]), 2);
assert.equal(streakText(2), "2 ээлж дараалан тоолсон");

const saved = buildCountLog({
  clientId: "c",
  ingredientId: "milk",
  quantity: 8,
  now: "2026-11-16T02:00:00.000Z",
  workerName: "Бариста (Билгүүн)",
  workerId: "staff-1",
  shiftId: "shift-1",
  incidentType: "daily_cycle_count",
  notes: "Ээлж хаалтын тооллого",
});
assert.equal(saved.type, "count");
assert.equal(saved.shift_id, "shift-1");
assert.equal(saved.staff_id, "staff-1");
assert.equal(saved.date, "2026-11-16T02:00:00.000Z");

function walk(dir: string, out: string[] = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (name.endsWith(".ts") || name.endsWith(".tsx")) out.push(path);
  }
  return out;
}
const files = [...walk("src/app/kiosk"), ...walk("src/features/kiosk"), "src/lib/kioskClient.ts"];
for (const file of files) {
  const source = readFileSync(file, "utf8");
  assert.equal(source.includes("window.prompt"), false, file);
  assert.equal(source.includes("window.alert"), false, file);
  assert.equal(source.includes("window.confirm"), false, file);
  assert.equal(/\balert\(/.test(source), false, file);
  assert.equal(/\bprompt\(/.test(source), false, file);
}

console.log("shift cycle checks passed");
