import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  CAUSE_COUNT,
  CAUSE_MISSING,
  CAUSE_PURCHASE,
  CAUSE_RECIPE,
  CAUSE_WASTE,
  PRICE_MISSING,
  assemblePhase4,
  cupCompare,
  kioskPhase4Payload,
  likelyCause,
  monthHasEnded,
  teamGoalView,
} from "../src/lib/phase4";

const day = (n: number) => `2026-11-${String(n).padStart(2, "0")}T12:00:00+08:00`;

const purchase = likelyCause({
  counts: [
    { at: day(1), qty: 10 },
    { at: day(2), qty: 14 },
  ],
  purchases: [],
  gaps: [{ at: day(2), qty: -4 }],
  gap: { at: day(2), qty: -4 },
  unit: "кг",
});
assert.equal(purchase.title, CAUSE_PURCHASE);
assert.match(purchase.why, /10/);
assert.match(purchase.why, /14/);
assert.match(purchase.why, /худалдан авалт 0/);
assert.match(purchase.why, /магадгүй/);

const recipe = likelyCause({
  counts: [day(1), day(2), day(3), day(4)].map((at, index) => ({ at, qty: 40 - index * 2 })),
  purchases: [],
  gaps: [day(1), day(2), day(3)].map((at) => ({ at, qty: 2 })),
  gap: { at: day(3), qty: 2 },
  unit: "кг",
});
assert.equal(recipe.title, CAUSE_RECIPE);
assert.match(recipe.why, /3 ээлж/);
assert.match(recipe.why, /магадгүй/);

const countedWrong = likelyCause({
  counts: [
    { at: day(1), qty: 10 },
    { at: day(2), qty: 6 },
    { at: day(3), qty: 10 },
  ],
  purchases: [],
  gaps: [{ at: day(2), qty: 4 }],
  gap: { at: day(2), qty: 4 },
  unit: "кг",
});
assert.equal(countedWrong.title, CAUSE_COUNT);

const waste = likelyCause({
  counts: [
    { at: day(1), qty: 20 },
    { at: day(2), qty: 8 },
  ],
  purchases: [],
  gaps: [{ at: day(2), qty: 8 }],
  gap: { at: day(2), qty: 8 },
  unit: "кг",
});
assert.equal(waste.title, CAUSE_WASTE);
assert.match(waste.why, /жорын нэг порцыг шалга/i);

const thin = likelyCause({
  counts: [{ at: day(1), qty: 5 }],
  purchases: [],
  gaps: [{ at: day(1), qty: 5 }],
  gap: { at: day(1), qty: 5 },
  unit: "кг",
});
assert.equal(thin.title, CAUSE_MISSING);

assert.equal(cupCompare({ enabled: false, previousQty: 80, currentQty: 30, purchasesBetween: 0, drinksSold: 45 }).enabled, false);
const cups = cupCompare({ enabled: true, previousQty: 80, currentQty: 30, purchasesBetween: 0, drinksSold: 45 });
assert.equal(cups.enabled, true);
if (cups.enabled) {
  assert.equal(cups.status, "check");
  assert.equal(cups.line, "Аяга 50 ширхэг ашигласан, ундаа 45 зарагдсан");
}

const goal = teamGoalView({
  unexplainedKnown: 12000,
  missingPrices: 0,
  teamStreak: 4,
  longestStaffStreak: 6,
  limit: 50000,
  streakTarget: 3,
  reward: 100000,
  monthEnded: false,
});
assert.equal(goal.line, "Багийн зорилт: Тайлбаргүй зөрүү 12,000₮ / 50,000₮");
assert.equal(goal.barPct, 24);
assert.equal(goal.priceNote, null);

const unpriced = teamGoalView({
  unexplainedKnown: null,
  missingPrices: 2,
  teamStreak: 1,
  longestStaffStreak: 1,
  limit: 50000,
  streakTarget: 3,
  reward: null,
  monthEnded: true,
});
assert.match(unpriced.line, /Үнэ алга/);
assert.equal(unpriced.priceNote, PRICE_MISSING);
assert.equal(unpriced.barPct, null);
assert.equal(unpriced.metText, CAUSE_MISSING);

const met = teamGoalView({
  unexplainedKnown: 1000,
  missingPrices: 0,
  teamStreak: 4,
  longestStaffStreak: 4,
  limit: 5000,
  streakTarget: 3,
  reward: 20000,
  monthEnded: true,
});
assert.match(met.metText, /Зорилт биелсэн/);
assert.match(met.metText, /Цалинд автоматаар ороогүй/);
assert.equal(monthHasEnded("2026-10-31", "2026-11-17"), true);
assert.equal(monthHasEnded("2026-11-16", "2026-11-17"), false);

const view = assemblePhase4({
  settings: { cup_check_enabled: false, cup_ingredient_ids: ["cup"], team_goal: { unexplained_limit: 50000, streak_shifts: 3, reward_amount: 100000 } },
  ingredients: [{ id: "cup", name: "Аяга", unit: "ш" }],
  profiles: [
    { id: "me", full_name: "Болор" },
    { id: "other", full_name: "Дорж" },
  ],
  shifts: [
    { id: "s1", start_time: day(1), end_time: day(1), is_active: false, character_role: "Бариста (Болор)" },
    { id: "s2", start_time: day(2), end_time: day(2), is_active: false, character_role: "Бариста (Дорж)" },
  ],
  logs: [
    { date: day(1), type: "count", quantity: 10, ingredient_id: "cup", staff_id: "me", shift_id: "s1", incident_type: "opening_recount", total_cost: 0 },
    { date: day(2), type: "count", quantity: 10, ingredient_id: "cup", staff_id: "other", shift_id: "s2", incident_type: "opening_recount", total_cost: 0 },
    { date: day(2), type: "spoilage", quantity: 1, ingredient_id: "cup", staff_id: "other", shift_id: "s2", incident_type: "shift_waste", total_cost: 100 },
  ],
  gaps: [],
  endDay: "2026-11-17",
  today: "2026-11-17",
});
assert.equal(view.cup.enabled, false);
const home = kioskPhase4Payload(view, "me");
assert.equal(home.me.month.name, "Болор");
assert.equal(JSON.stringify(home).includes("Дорж"), false);
assert.equal(home.me.month.wasteCount, 0);
assert.equal(view.scorecard.month.find((row) => row.id === "other")?.wasteCount, 1);

const files = [
  "src/lib/phase4.ts",
  "src/lib/phase4Load.ts",
  "src/features/finance/CupCheck.tsx",
  "src/features/finance/TeamBoard.tsx",
  "src/features/finance/TeamGoalBar.tsx",
  "src/features/kiosk/OwnScore.tsx",
  "src/features/settings/Phase4Settings.tsx",
];
for (const file of files) {
  const source = readFileSync(file, "utf8");
  assert.equal(source.includes("window.alert"), false);
  assert.equal(source.includes("window.confirm"), false);
  assert.equal(source.includes("window.prompt"), false);
  assert.equal(/\b(alert|confirm|prompt)\(/.test(source), false);
  assert.equal(source.includes("сайн"), false);
  assert.equal(source.includes("муу"), false);
}
const route = readFileSync("src/app/api/kiosk/ops/route.ts", "utf8");
assert.match(route, /requireKioskWorker/);
assert.match(route, /loadKioskPhase4\(worker\.clientId, worker\.workerId\)/);
assert.equal(route.includes("body.client_id"), false);
const cup = readFileSync("src/features/finance/CupCheck.tsx", "utf8");
assert.match(cup, /if \(!data\?\.enabled\) return null/);
const migration = readFileSync("supabase/migrations/20261117143000_phase4_cup_and_team.sql", "utf8");
assert.match(migration, /cup_check_enabled boolean NOT NULL DEFAULT false/);
assert.equal(migration.toLowerCase().includes("create table"), false);

console.log("phase 4 checks passed");
