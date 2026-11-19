// Run: JITI_ALIAS={"@":"$PWD/src"} jiti scripts/check-status-sync.ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { applyCountPick, gradeIngredient } from "../src/lib/analytics";
import { dashboardTrust, overviewStatusBlock } from "../src/lib/honestDashboard";

const LIMIT = "2026-12-20T00:00:00+08:00";

function blank(extra: Record<string, unknown> = {}) {
  return {
    id: "x",
    name: "n",
    unit: "u",
    purchased: 0,
    purchase_value: 0,
    purchases: [],
    purchases_after: [],
    theoretical: 0,
    in_period_log: true,
    no_price: false,
    future_log_id: null,
    has_start: false,
    has_end: false,
    start: null,
    end: null,
    ...extra,
  };
}

function gradeRow(
  name: string,
  history: Array<{ id: string; date: string; qty: number }>,
  startDay: string,
  endDay: string,
) {
  const item = blank({ name, id: name });
  applyCountPick(item, history, startDay, endDay, LIMIT);
  const grade = gradeIngredient(item, startDay, endDay, 1000);
  assert.ok(grade, `${name} ${startDay}..${endDay} should grade`);
  return { ...grade, name };
}

// TEST кафегийн бодит тооллого (UB-д 11-01 00:00, 11-20 00:29, 11-20 04:47).
const coffee = [
  { id: "a", date: "2026-10-31T16:00:00+00:00", qty: 2000 },
  { id: "b", date: "2026-11-19T16:29:09.006+00:00", qty: 1750 },
  { id: "c", date: "2026-11-19T20:47:32.594+00:00", qty: 1750 },
];
const milk = [
  { id: "a", date: "2026-10-31T16:00:00+00:00", qty: 10000 },
  { id: "b", date: "2026-11-19T16:29:09.006+00:00", qty: 8800 },
  { id: "c", date: "2026-11-19T20:47:32.594+00:00", qty: 5000 },
];
const cups = [
  { id: "a", date: "2026-10-31T16:00:00+00:00", qty: 200 },
  { id: "b", date: "2026-11-19T16:29:09.006+00:00", qty: 175 },
  { id: "c", date: "2026-11-19T20:47:32.594+00:00", qty: 175 },
];

function gradesFor(startDay: string, endDay: string) {
  return [
    gradeRow("Кофе үр (ТУРШИЛТ)", coffee, startDay, endDay),
    gradeRow("Сүү (ТУРШИЛТ)", milk, startDay, endDay),
    gradeRow("Цаасан аяга (ТУРШИЛТ)", cups, startDay, endDay),
  ];
}

function assertBoardMatchesOverview(grades: ReturnType<typeof gradesFor>) {
  const board = dashboardTrust({ grades });
  const text = overviewStatusBlock(board);
  // AI snapshot болон самбар ижил тоо, ижил барааны статусыг ашиглана.
  assert.equal(board.summary.verified, board.items.filter((row) => row.status === "Verified").length);
  assert.equal(board.summary.check, board.items.filter((row) => row.status === "Check").length);
  assert.equal(board.summary.missing, board.items.filter((row) => row.status === "Missing").length);
  assert.equal(board.summary.total, board.items.length);
  for (const row of board.items) {
    assert.ok(text.includes(`${row.name}: ${row.label}`));
  }
  assert.match(text, new RegExp(`${board.summary.total} бараанаас ${board.summary.verified} баталгаажсан`));
  return board;
}

const todayGrades = gradesFor("2026-11-20", "2026-11-20");
const today = assertBoardMatchesOverview(todayGrades);
assert.equal(today.items.find((row) => row.name.startsWith("Кофе"))?.label, "Баталгаажсан");
assert.equal(today.items.find((row) => row.name.startsWith("Цаасан"))?.label, "Баталгаажсан");
assert.equal(today.items.find((row) => row.name.startsWith("Сүү"))?.label, "Шалгах");
assert.equal(today.summary.verified, 2);
assert.equal(today.summary.check, 1);
assert.equal(today.summary.estimate, "Тооцоолсон, 3 бараанаас 2 баталгаажсан, 1 ажил үлдсэн");

const monthGrades = gradesFor("2026-11-01", "2026-11-20");
const month = assertBoardMatchesOverview(monthGrades);
assert.deepEqual(month.items.map((row) => row.label), ["Шалгах", "Шалгах", "Шалгах"]);
assert.equal(month.summary.verified, 0);
assert.equal(month.summary.check, 3);
assert.equal(month.summary.counts, "0 бараа дутуу, 3 бараа шалгах");
assert.equal(month.summary.estimate, "Тооцоолсон, 3 бараанаас 0 баталгаажсан, 3 ажил үлдсэн");

const finance = readFileSync("src/features/finance/FinanceTab.tsx", "utf8");
assert.match(finance, /dashboardTrust\(liveAnalytics\)/);
assert.match(finance, /trustEstimateDisplay\(liveAnalytics, loading\)/);
assert.equal(finance.includes("{trustSummary.estimate}"), false);
const overview = readFileSync("src/ai/agents/overview.ts", "utf8");
assert.match(overview, /dashboardTrust\(/);
assert.match(overview, /overviewStatusBlock\(board\)/);

console.log("status sync checks passed");
