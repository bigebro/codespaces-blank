import assert from "node:assert/strict";
import { isImplausibleIncrease, reviewEnteredCount, type CycleItem } from "../src/lib/shiftCycle";

const coffee: CycleItem = {
  id: "1",
  name: "Кофе үр",
  unit: "гр",
  unitPrice: 85,
  previousQty: 1750,
  previousAt: "2026-11-20T00:00:00+08:00",
  previousStaff: "Ажилтан",
  purchasesSince: 0,
  recipeUsageSince: 0,
};

assert.equal(isImplausibleIncrease(coffee, 1750), false);
assert.equal(isImplausibleIncrease(coffee, 1800), false);
assert.equal(isImplausibleIncrease(coffee, 9999), true);
const first = reviewEnteredCount(coffee, 9999, false);
assert.equal(first.needsRecount, true);
const second = reviewEnteredCount(coffee, 9999, true);
assert.equal(second.needsConfirm, true);
assert.equal(second.needsWaste, false);
console.log("implausible count checks passed");
