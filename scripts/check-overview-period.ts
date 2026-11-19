import assert from "node:assert/strict";
import { resolveOverviewPeriod } from "../src/lib/overviewPeriod";
import { currentWeekBounds, monthEndDay, monthStartDay, ubDayEndIso, ubDayStartIso } from "../src/lib/ubDate";

const now = new Date("2026-11-20T07:15:00+08:00");
const today = "2026-11-20";
const week = currentWeekBounds(today);
assert.equal(week.start, "2026-11-16");
assert.equal(week.end, "2026-11-20");
assert.equal(monthStartDay(today), "2026-11-01");
assert.equal(monthEndDay(today), "2026-11-30");

const namedToday = resolveOverviewPeriod("Өнөөдөр бизнес ямар байна?", "2026-11-01", "2026-11-30", now);
assert.equal(namedToday.source, "named");
assert.equal(namedToday.startDay, today);
assert.equal(namedToday.endDay, today);
assert.equal(namedToday.label, "Өнөөдөр (2026-11-20)");

const namedYesterday = resolveOverviewPeriod("өчигдөр ямар байсан", "2026-11-01", "2026-11-30", now);
assert.equal(namedYesterday.startDay, "2026-11-19");
assert.equal(namedYesterday.endDay, "2026-11-19");
assert.equal(namedYesterday.label, "Өчигдөр (2026-11-19)");

const namedWeek = resolveOverviewPeriod("энэ долоо хоног ямар байна", "2026-11-01", "2026-11-30", now);
assert.equal(namedWeek.startDay, "2026-11-16");
assert.equal(namedWeek.endDay, "2026-11-20");
assert.equal(namedWeek.label, "Энэ долоо хоног (2026-11-16 – 2026-11-20)");

const namedMonth = resolveOverviewPeriod("энэ сарын байдал ямар байна", "2026-11-20", "2026-11-20", now);
assert.equal(namedMonth.startDay, "2026-11-01");
assert.equal(namedMonth.endDay, "2026-11-30");
assert.equal(namedMonth.label, "Энэ сар (2026-11-01 – 2026-11-30)");

const dashboardMonth = resolveOverviewPeriod(
  "Бизнес ямар байна?",
  ubDayStartIso("2026-11-01"),
  ubDayEndIso("2026-11-30"),
  now,
);
assert.equal(dashboardMonth.source, "dashboard");
assert.equal(dashboardMonth.startDay, "2026-11-01");
assert.equal(dashboardMonth.endDay, "2026-11-30");
assert.equal(dashboardMonth.label, "Энэ сар (2026-11-01 – 2026-11-30)");

const dashboardToday = resolveOverviewPeriod("ямар байна", "2026-11-20", "2026-11-20", now);
assert.equal(dashboardToday.label, "Өнөөдөр (2026-11-20)");

const dashboardDay = resolveOverviewPeriod("тойм", "2026-11-18", "2026-11-18", now);
assert.equal(dashboardDay.label, "Өдөр (2026-11-18)");

const fallback = resolveOverviewPeriod("Бизнес ямар байна?", null, null, now);
assert.equal(fallback.source, "today");
assert.equal(fallback.label, "Өнөөдөр (2026-11-20)");

const englishWeek = resolveOverviewPeriod("how is this week", "2026-11-01", "2026-11-30", now);
assert.equal(englishWeek.label, "Энэ долоо хоног (2026-11-16 – 2026-11-20)");

console.log("overview period checks passed");
