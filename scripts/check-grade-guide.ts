import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { gradeGuide } from "../src/lib/gradeGuide";
import { unlockLine } from "../src/lib/honestDashboard";

const eggsCovered = gradeGuide({
  status: "Check",
  unit: "ширхэг",
  action: "count",
  has_start: true,
  has_end: true,
  start_qty: 10,
  end_qty: 4,
  purchased_qty: 0,
  theoretical_qty: 0,
  actual_qty: 6,
  gap_qty: 6,
  gap_money: 3900,
  waste_spoilage: 6,
  waste_testing: 0,
  waste_staff_meal: 0,
  waste_other: 0,
});
assert.equal(eggsCovered.countTask, false);
assert.match(eggsCovered.facts.join(" "), /Борлуулалт алга/);
assert.match(eggsCovered.facts.join(" "), /6 ширхэг гарсан/);
assert.match(eggsCovered.facts.join(" "), /Хаягдал бүртгэгдсэн 6 ширхэг/);
assert.match(eggsCovered.facts.join(" "), /Тайлбаргүй үлдэгдэл 0/);
assert.equal(eggsCovered.facts.join(" ").includes("хаягдал бүртгээгүй"), false);
assert.match(eggsCovered.steps[0], /Тоолох даалгавар хэрэггүй/);

const eggsLeft = gradeGuide({
  status: "Check",
  unit: "ширхэг",
  action: "count",
  has_start: true,
  has_end: true,
  start_qty: 10,
  end_qty: 4,
  purchased_qty: 0,
  theoretical_qty: 0,
  actual_qty: 6,
  gap_qty: 6,
  gap_money: 3900,
  waste_spoilage: 4,
  waste_testing: 0,
  waste_staff_meal: 0,
  waste_other: 0,
});
assert.equal(eggsLeft.countTask, false);
assert.match(eggsLeft.facts.join(" "), /Тайлбаргүй 2 ширхэг/);
assert.match(eggsLeft.steps[1], /2 ширхэг/);
assert.match(eggsLeft.steps[1], /Муудсан/);

const noPrice = gradeGuide({
  action: "price",
  has_start: true,
  has_end: true,
  theoretical_qty: 1,
  actual_qty: 1,
  gap_qty: 0,
  gap_money: 0,
  waste_spoilage: 0,
  waste_testing: 0,
  waste_staff_meal: 0,
  waste_other: 0,
});
assert.equal(noPrice.countTask, false);
assert.match(noPrice.steps.join(" "), /Үнэ оруулах/);

const missingEnd = gradeGuide({
  action: "count",
  has_start: true,
  has_end: false,
  start_qty: 3,
  theoretical_qty: 0,
  waste_spoilage: 0,
  waste_testing: 0,
  waste_staff_meal: 0,
  waste_other: 0,
});
assert.equal(missingEnd.countTask, true);
assert.match(missingEnd.steps[0], /одоо тоол/);

const missingStart = gradeGuide({
  action: "count",
  has_start: false,
  has_end: true,
  end_qty: 3,
  theoretical_qty: 0,
  waste_spoilage: 0,
  waste_testing: 0,
  waste_staff_meal: 0,
  waste_other: 0,
});
assert.equal(missingStart.countTask, false);
assert.match(missingStart.facts[0], /Эхлэх тоо алга/);

const surplus = gradeGuide({
  action: "count",
  has_start: true,
  has_end: true,
  start_qty: 5,
  end_qty: 8,
  purchased_qty: 0,
  theoretical_qty: 1,
  actual_qty: -3,
  gap_qty: -4,
  gap_money: -800,
  waste_spoilage: 0,
  waste_testing: 0,
  waste_staff_meal: 0,
  waste_other: 0,
});
assert.equal(surplus.countTask, false);
assert.match(surplus.steps.join(" "), /орлого/);
assert.equal(surplus.facts.join(" ").includes("хаягдал бүртгээгүй"), false);

const partial = gradeGuide({
  action: "count",
  partial: true,
  has_start: false,
  has_end: true,
  measured_from: "2026-11-15",
  theoretical_qty: 40,
  actual_qty: 10,
  waste_spoilage: 0,
  waste_testing: 0,
  waste_staff_meal: 0,
  waste_other: 0,
});
assert.equal(partial.countTask, false);
assert.match(partial.facts.join(" "), /бүү харьцуул/);

assert.match(unlockLine(0, 0), /үнэ баталгаажуулах ажил биш/);
assert.equal(unlockLine(0, 0).includes("0₮-ийн өртгийг баталгаажуулна"), false);

const panel = readFileSync("src/features/finance/DataGradePanel.tsx", "utf8");
assert.match(panel, /gradeGuide/);
assert.equal(panel.includes("хаягдал бүртгээгүй"), false);
assert.equal(panel.includes("likelyCauses"), false);

console.log("grade guide checks passed");
