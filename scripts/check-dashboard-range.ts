import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  displayAnalytics,
  normalizeDashboardRange,
  rangeKey,
  readRequestRange,
  shouldApplyAnalytics,
} from "../src/lib/analyticsRange";
import { resolveOverviewPeriod } from "../src/lib/overviewPeriod";
import { ubDayEndIso, ubDayStartIso } from "../src/lib/ubDate";

const now = new Date("2026-11-20T07:15:00+08:00");

// Cache keys differ by range so month data cannot be reused as today.
assert.equal(rangeKey("cafe", "2026-11-01", "2026-11-30"), "cafe|2026-11-01|2026-11-30");
assert.equal(rangeKey("cafe", "2026-11-20", "2026-11-20"), "cafe|2026-11-20|2026-11-20");
assert.notEqual(
  rangeKey("cafe", "2026-11-01", "2026-11-30"),
  rangeKey("cafe", "2026-11-20", "2026-11-20"),
);
assert.equal(
  rangeKey("cafe", ubDayStartIso("2026-11-20"), ubDayEndIso("2026-11-20")),
  rangeKey("cafe", "2026-11-20", "2026-11-20"),
);

// A slower month response must not overwrite a newer day request.
const monthKey = rangeKey("cafe", "2026-11-01", "2026-11-30");
const dayKey = rangeKey("cafe", "2026-11-20", "2026-11-20");
assert.equal(
  shouldApplyAnalytics({ reqId: 1, currentReqId: 2, requestedKey: monthKey, selectedKey: dayKey }),
  false,
);
assert.equal(
  shouldApplyAnalytics({ reqId: 2, currentReqId: 2, requestedKey: dayKey, selectedKey: monthKey }),
  false,
);
assert.equal(
  shouldApplyAnalytics({ reqId: 2, currentReqId: 2, requestedKey: dayKey, selectedKey: dayKey }),
  true,
);

const monthPayload = { estimate: "Тооцоолсон, 3 бараанаас 0 баталгаажсан, 3 ажил үлдсэн" };
assert.equal(displayAnalytics(monthPayload, monthKey, dayKey), null);
assert.deepEqual(displayAnalytics(monthPayload, monthKey, monthKey), monthPayload);
assert.equal(displayAnalytics(null, monthKey, monthKey), null);

// Chat / API pass-through: plain days and ISO both resolve to the dashboard month, not today.
const fromDays = readRequestRange({
  startDate: "2026-11-01",
  endDate: "2026-11-30",
  rangeMode: "month",
});
assert.deepEqual(fromDays, { startDay: "2026-11-01", endDay: "2026-11-30", mode: "month" });

const fromIso = readRequestRange({
  startDate: ubDayStartIso("2026-11-01"),
  endDate: ubDayEndIso("2026-11-30"),
});
assert.deepEqual(fromIso, { startDay: "2026-11-01", endDay: "2026-11-30", mode: "month" });

const general = resolveOverviewPeriod(
  "Бизнес ямар байна?",
  fromDays?.startDay,
  fromDays?.endDay,
  now,
);
assert.equal(general.source, "dashboard");
assert.equal(general.startDay, "2026-11-01");
assert.equal(general.endDay, "2026-11-30");
assert.equal(general.label, "Энэ сар (2026-11-01 – 2026-11-30)");
assert.notEqual(general.label, "Өнөөдөр (2026-11-20)");

const named = resolveOverviewPeriod(
  "өнөөдөр бизнес ямар байна?",
  fromDays?.startDay,
  fromDays?.endDay,
  now,
);
assert.equal(named.source, "named");
assert.equal(named.startDay, "2026-11-20");
assert.equal(named.endDay, "2026-11-20");

const daySelected = resolveOverviewPeriod(
  "Бизнес ямар байна?",
  "2026-11-20",
  "2026-11-20",
  now,
);
assert.equal(daySelected.label, "Өнөөдөр (2026-11-20)");
assert.equal(normalizeDashboardRange("2026-11-20", "2026-11-20")?.mode, "day");
assert.equal(readRequestRange({}), null);

const page = readFileSync("src/app/dashboard/page.tsx", "utf8");
assert.match(page, /selectedRangeRef/);
assert.match(page, /shouldApplyAnalytics/);
assert.match(page, /displayAnalytics\(liveAnalytics, liveAnalyticsKey/);
assert.match(page, /rangeMode=\{rangeMode\}/);
assert.match(page, /setRangeMode=\{setRangeMode\}/);
assert.match(page, /setLiveAnalytics\(null\)/);

const finance = readFileSync("src/features/finance/FinanceTab.tsx", "utf8");
assert.match(finance, /rangeMode: RangeMode;/);
assert.match(finance, /setRangeMode: \(m: RangeMode\) => void;/);
assert.equal(finance.includes("useState<RangeMode>"), false);

const chat = readFileSync("src/features/ai-cfo/AiCfoChat.tsx", "utf8");
assert.match(chat, /rangeMode\?: RangeMode/);
assert.match(chat, /startDate: ubDay\(startDate\)/);
assert.match(chat, /endDate: ubDay\(endDate\)/);
assert.match(chat, /rangeMode: rangeMode || detectRangeMode/);

const route = readFileSync("src/app/api/kiosk-ai/route.ts", "utf8");
assert.match(route, /readRequestRange\(body\)/);
assert.match(route, /activeStartDate: dashboardRange\?\.startDay/);
assert.match(route, /activeEndDate: dashboardRange\?\.endDay/);
assert.match(route, /rangeMode: dashboardRange\?\.mode/);

console.log("dashboard range checks passed");
