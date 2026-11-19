import assert from "node:assert/strict";
import { analyticsPeriod, ubDayEndIso, ubDayStartIso } from "../src/lib/ubDate";

const now = new Date("2026-11-20T07:15:00+08:00");
const fromDayOnly = analyticsPeriod("2026-11-20", "2026-11-20", now);
const fromIso = analyticsPeriod(ubDayStartIso("2026-11-20"), ubDayEndIso("2026-11-20"), now);
assert.equal(fromDayOnly.startDay, "2026-11-20");
assert.equal(fromDayOnly.endDay, "2026-11-20");
assert.equal(fromDayOnly.finalStartDate, ubDayStartIso("2026-11-20"));
assert.equal(fromDayOnly.finalEndDate, ubDayEndIso("2026-11-20"));
assert.deepEqual(fromDayOnly, fromIso);

const month = analyticsPeriod("2026-11-01", "2026-11-30", now);
assert.equal(month.startDay, "2026-11-01");
assert.equal(month.endDay, "2026-11-30");
assert.equal(month.countEndDay, "2026-11-20");
assert.equal(month.finalStartDate, ubDayStartIso("2026-11-01"));
assert.equal(month.finalEndDate, ubDayEndIso("2026-11-30"));

console.log("analytics period checks passed");
