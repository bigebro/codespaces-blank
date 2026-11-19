import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  COMPLETE_PERIOD,
  IMPOSSIBLE_TITLE,
  SURPLUS_NOTE,
  impossibleReasons,
  summarizeTrust,
  topFixActions,
  trustTone,
  unlockLine,
} from "../src/lib/honestDashboard";

const grades = [
  { name: "Сүү", status: "Verified", purchase_value: 700, theo_money: 40, ingredient_id: "v1" },
  { name: "Кофе", status: "Verified", purchase_value: 100, theo_money: 50, ingredient_id: "v2" },
  { name: "Гурил", status: "Missing", purchase_value: 100, theo_money: 20, action: "count", ingredient_id: "m1" },
  { name: "Элсэн сахар", status: "Missing", purchase_value: 50, theo_money: 10, action: "count", ingredient_id: "m2" },
  { name: "Өндөг", status: "Check", purchase_value: 50, theo_money: 8, action: "price", ingredient_id: "c1" },
];

const summary = summarizeTrust({ grades });
assert.equal(summary.purchase_pct, 80);
assert.equal(summary.meter, "Үнэн зөв байдал: 40%");
assert.equal(summary.counts, "2 бараа дутуу, 1 бараа шалгах");
assert.equal(summary.missing, 2);
assert.equal(summary.check, 1);
assert.equal(summary.estimate, "Тооцоолсон, 5 бараанаас 2 баталгаажсан, 3 ажил үлдсэн");
assert.equal(summary.tone, "red");
assert.equal(summary.unverified_theo, 38);

const fromTrust = summarizeTrust({ grades, data_trust: { purchase_pct: summary.purchase_pct } });
assert.equal(fromTrust.purchase_pct, 80);
assert.equal(fromTrust.meter, summary.meter);

// grades ирээгүй ч data_trust-ийн тоог самбар болон AI ижил харуулна.
const fromCountsOnly = summarizeTrust({
  data_trust: { verified: 2, total: 3, missing: 0, check: 1, remaining: 1, unverified_theo: 8, purchase_pct: 80 },
});
assert.equal(fromCountsOnly.verified, 2);
assert.equal(fromCountsOnly.total, 3);
assert.equal(fromCountsOnly.check, 1);
assert.equal(fromCountsOnly.missing, 0);
assert.equal(fromCountsOnly.estimate, "Тооцоолсон, 3 бараанаас 2 баталгаажсан, 1 ажил үлдсэн");


// grades байвал data_trust-ийн өөр тоог үл тоомсорлож, самбарын жагсаалтыг дагана.
const gradesWin = summarizeTrust({
  grades: [
    { name: "Сүү", status: "Check", purchase_value: 10 },
    { name: "Кофе үр", status: "Check", purchase_value: 10 },
    { name: "Цаасан аяга", status: "Check", purchase_value: 10 },
  ],
  data_trust: { verified: 2, total: 3, missing: 0, check: 1, remaining: 1, purchase_pct: 80, unverified_theo: 0 },
});
assert.equal(gradesWin.verified, 0);
assert.equal(gradesWin.check, 3);
assert.equal(gradesWin.estimate, "Тооцоолсон, 3 бараанаас 0 баталгаажсан, 3 ажил үлдсэн");
assert.equal(gradesWin.counts, "0 бараа дутуу, 3 бараа шалгах");

const actions = topFixActions(grades, 3);
assert.equal(actions.length, 3);
assert.equal(actions[0].name, "Гурил");
assert.equal(actions[0].purchase_value, 100);
assert.deepEqual(actions.map((row) => row.purchase_value), [100, 50, 50]);
assert.equal(unlockLine(100), `Энэ засвар ${Math.round(100).toLocaleString()}₮-ийн өртгийг баталгаажуулна`);
assert.match(unlockLine(100), /^Энэ засвар \d+₮-ийн өртгийг баталгаажуулна$/);

const low = impossibleReasons(40, 90, 72);
assert.equal(low.length, 1);
assert.match(low[0], /онолын өртгөөс бага/);
assert.match(IMPOSSIBLE_TITLE, /бодит биш/);

const both = impossibleReasons(40, 90, 81);
assert.equal(both.length, 2);
assert.match(both[1], /80%/);

assert.deepEqual(impossibleReasons(90, 40, 80), []);
assert.equal(impossibleReasons(90, 40, 80.01).length, 1);

assert.equal(topFixActions([{ status: "Verified", purchase_value: 10 }]).length, 0);
assert.equal(COMPLETE_PERIOD, "Энэ хугацааны өгөгдөл бүрэн");
assert.equal(SURPLUS_NOTE, "Илүүдэл: тооллого эсвэл худалдан авалт дутуу байж магадгүй, эсвэл жорын норм бодит хэрэглээнээс их, эсвэл порц бага өгч байна");

assert.equal(trustTone(49), "red");
assert.equal(trustTone(50), "yellow");
assert.equal(trustTone(89), "yellow");
assert.equal(trustTone(90), "green");

const meter = readFileSync("src/features/finance/TruthMeter.tsx", "utf8");
assert.equal(meter.includes("<button"), false);
assert.equal(meter.includes("<input"), false);
assert.match(meter, /Үнэн зөв байдал:/);
assert.match(meter, /бараа дутуу/);

const finance = readFileSync("src/features/finance/FinanceTab.tsx", "utf8");
assert.match(finance, /<TruthMeter/);
assert.match(finance, /variant="actions"/);
assert.match(finance, /IMPOSSIBLE_TITLE/);
assert.match(finance, /trustSummary\.estimate/);
assert.match(finance, /dashboardTrust\(liveAnalytics\)/);
assert.match(finance, /unverifiedTheo/);

const panel = readFileSync("src/features/finance/DataGradePanel.tsx", "utf8");
assert.match(panel, /SURPLUS_NOTE/);
assert.match(panel, /COMPLETE_PERIOD/);
assert.match(panel, /unlockLine/);
assert.match(panel, /total_waste_loss/);
assert.match(panel, /total_surplus_savings/);

const kiosk = readFileSync("src/app/kiosk/page.tsx", "utf8");
const uses = [...kiosk.matchAll(/<TruthMeter[\s\S]*?\/>/g)].map((match) => match[0]);
assert.equal(uses.length, 1);
assert.equal(uses[0].includes("onClick"), false);
assert.equal(uses[0].includes("onChange"), false);
assert.match(kiosk, /kioskTrust/);

const route = readFileSync("src/app/api/kiosk/trust/route.ts", "utf8");
assert.match(route, /purchase_pct: trust\.purchase_pct/);
assert.match(route, /missing: trust\.missing/);
assert.match(route, /check: trust\.check/);
assert.doesNotMatch(route, /\.(insert|update|delete|upsert)\(/);

console.log("honest dashboard checks passed");

const overview = readFileSync("src/ai/agents/overview.ts", "utf8");
assert.match(overview, /dashboardTrust/);
assert.match(overview, /overviewStatusBlock/);
assert.match(overview, /ubDayStartIso/);
assert.match(overview, /ubDayEndIso/);
assert.match(overview, /resolveOverviewPeriod/);
assert.match(overview, /buildOverviewSnapshot/);
assert.match(overview, /overviewDateLine/);

const cfo = readFileSync("src/ai/agents/cfo.agent.ts", "utf8");
assert.match(cfo, /preamble: wantsOverview/);
assert.match(cfo, /resolveOverviewPeriod/);
assert.match(cfo, /MN_BUSINESS_SPELLING_NOTE/);
assert.match(cfo, /overviewDateLine\(overviewPeriod\)/);

const chat = readFileSync("src/features/ai-cfo/AiCfoChat.tsx", "utf8");
assert.match(chat, /startDate: ubDayStartIso\(startDate\)/);
assert.match(chat, /endDate: ubDayEndIso\(endDate\)/);

const kioskAi = readFileSync("src/app/api/kiosk-ai/route.ts", "utf8");
assert.match(kioskAi, /activeStartDate: body\.startDate/);
assert.match(kioskAi, /activeEndDate: body\.endDate/);

const analytics = readFileSync("src/lib/analytics.ts", "utf8");
assert.match(analytics, /buildDataTrust\(grades\)/);
assert.match(analytics, /analyticsPeriod\(startDate, endDate\)/);
