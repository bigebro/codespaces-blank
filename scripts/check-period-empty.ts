import assert from "node:assert/strict";
import { isAnalyticsEmpty, periodDataState, PERIOD_EMPTY_TITLE } from "../src/lib/periodDataState";

assert.equal(PERIOD_EMPTY_TITLE, "Энэ хугацаанд өгөгдөл алга");
assert.equal(periodDataState({ loading: true, analytics: null }), "loading");
assert.equal(periodDataState({ loading: false, analytics: null }), "loading");
assert.equal(periodDataState({ loading: false, analytics: {} }), "empty");
assert.equal(isAnalyticsEmpty({ financial_ladder: { revenue: 0 }, grades: [] }), true);
assert.equal(isAnalyticsEmpty({ financial_ladder: { revenue: 0 }, grades: [{ name: "Сүү" }] }), false);
assert.equal(periodDataState({ loading: false, analytics: { grades: [{ name: "Сүү" }] } }), "ready");
assert.equal(
  periodDataState({ loading: false, analytics: {}, rangeKey: "a", appliedRangeKey: "b" }),
  "loading",
);
console.log("period empty-state checks passed");
