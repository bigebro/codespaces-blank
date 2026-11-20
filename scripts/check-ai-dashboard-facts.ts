import assert from "node:assert/strict";
import { dashboardItemFactsText, gradeFactLines, gradeGuide, itemVarianceFacts } from "../src/lib/gradeGuide";

/** Самбарт гарсан сүүний жишээ: бүртгэгдсэн хаягдал 2100, тайлбаргүй 3800, эхлэх 10000, эцэс 8800. */
const milk = {
  name: "Сүү",
  status: "Check",
  unit: "мл",
  action: "count",
  has_start: true,
  has_end: true,
  start_qty: 10000,
  end_qty: 8800,
  purchased_qty: 4700,
  theoretical_qty: 0,
  actual_qty: 5900,
  gap_qty: 5900,
  gap_money: 29500,
  waste_spoilage: 900,
  waste_testing: 1200,
  waste_staff_meal: 0,
  waste_other: 0,
};

const facts = itemVarianceFacts(milk);
assert.equal(facts.start, 10000);
assert.equal(facts.end, 8800);
assert.equal(facts.logged, 2100);
assert.equal(facts.spoilage, 900);
assert.equal(facts.testing, 1200);
assert.equal(facts.unexplainedQty, 3800);

const dashboard = dashboardItemFactsText(milk);
assert.match(dashboard, /Эхлэх тоо 10000 мл/);
assert.match(dashboard, /эцсийн тоо 8800 мл/);
assert.match(dashboard, /Хаягдал бүртгэгдсэн 2100 мл/);
assert.match(dashboard, /Муудсан 900/);
assert.match(dashboard, /Туршилт 1200/);
assert.match(dashboard, /Тайлбаргүй 3800 мл/);
assert.doesNotMatch(dashboard, /Тайлбаргүй 0/);

const ai = gradeFactLines([milk]);
assert.equal(ai.includes(dashboard), true);
assert.match(ai, /Хаягдал бүртгэгдсэн 2100 мл/);
assert.match(ai, /Тайлбаргүй 3800 мл/);
assert.doesNotMatch(ai, /тайлбаргүй зөрүү: 0/i);

// Нийт дүн шар мөрийг оруулдаггүй. Барааны мөр 0 болох ёсгүй.
const board = gradeGuide(milk);
assert.match(board.facts.join(" "), /нийт дүнд ороогүй/);
assert.equal(facts.unexplainedQty, 3800);

console.log("ai dashboard facts checks passed");
