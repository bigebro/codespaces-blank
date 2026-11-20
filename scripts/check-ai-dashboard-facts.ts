import assert from "node:assert/strict";
import { dashboardItemFactsText, gradeFactLines, gradeGuide, itemVarianceFacts } from "../src/lib/gradeGuide";
import {
  officialNumberTokens,
  renderItemFactsBlock,
  stripContradictingNumberLines,
} from "../src/lib/dashboardFactsBlock";

/** Retest numbers: logged 2200 (Муудсан 1000, Туршилт 1200), unexplained 3800 / 19,000₮, start 10000, end 8800. */
const milk = {
  name: "Сүү",
  status: "Check",
  unit: "мл",
  action: "count",
  has_start: true,
  has_end: true,
  start_qty: 10000,
  end_qty: 8800,
  purchased_qty: 4800,
  theoretical_qty: 0,
  actual_qty: 6000,
  gap_qty: 6000,
  gap_money: 6000,
  unit_price: 5,
  price: 5,
  waste_spoilage: 1000,
  waste_testing: 1200,
  waste_staff_meal: 0,
  waste_other: 0,
};

const facts = itemVarianceFacts(milk);
assert.equal(facts.start, 10000);
assert.equal(facts.end, 8800);
assert.equal(facts.logged, 2200);
assert.equal(facts.spoilage, 1000);
assert.equal(facts.testing, 1200);
assert.equal(facts.unexplainedQty, 3800);

const dashboard = dashboardItemFactsText(milk);
assert.match(dashboard, /Эхлэх тоо 10000 мл/);
assert.match(dashboard, /эцсийн тоо 8800 мл/);
assert.match(dashboard, /Хаягдал бүртгэгдсэн 2200 мл/);
assert.match(dashboard, /Муудсан 1000/);
assert.match(dashboard, /Туршилт 1200/);
assert.match(dashboard, /Тайлбаргүй 3800 мл/);
assert.doesNotMatch(dashboard, /Тайлбаргүй 0/);
assert.doesNotMatch(dashboard, /2100/);

const serverBlock = renderItemFactsBlock(milk);
assert.equal(serverBlock.includes(dashboard), true);
assert.match(serverBlock, /Хаягдал бүртгэгдсэн 2200 мл/);
assert.match(serverBlock, /Тайлбаргүй 3800 мл/);
assert.match(serverBlock, /19,000₮/);
assert.doesNotMatch(serverBlock, /Тайлбаргүй зөрүү 0/);
assert.doesNotMatch(serverBlock, /2100/);

const aiLines = gradeFactLines([milk]);
assert.equal(aiLines.includes(dashboard), true);

const official = officialNumberTokens(serverBlock);
for (const n of ["2200", "1000", "1200", "3800", "19000", "10000", "8800"]) {
  assert.equal(official.has(n), true, `missing official number ${n}`);
}

const modelWrong = [
  "Хаягдлын алдагдал 2100 мл",
  "Тайлбаргүй зөрүү 0 мл",
  "Нийт 4,200 мл",
  "5,400 мл / 28,000₮",
  "4,800 мл",
  "Шалгах шалтгаан нь тооллого болон хаягдал зөрсөн явдал.",
].join("\n");
const cleaned = stripContradictingNumberLines(modelWrong, serverBlock, "Сүү");
assert.doesNotMatch(cleaned, /2100/);
assert.doesNotMatch(cleaned, /4,200|4200/);
assert.doesNotMatch(cleaned, /5,400|5400/);
assert.doesNotMatch(cleaned, /28,000|28000/);
assert.doesNotMatch(cleaned, /Тайлбаргүй зөрүү 0/);
assert.match(cleaned, /Шалгах шалтгаан/);

const modelRestate = "Хаягдал бүртгэгдсэн 2200 мл, тайлбаргүй 3800 мл.";
assert.equal(stripContradictingNumberLines(modelRestate, serverBlock, "Сүү"), "");

const board = gradeGuide(milk);
assert.match(board.facts.join(" "), /нийт дүнд ороогүй/);
assert.equal(facts.unexplainedQty, 3800);

console.log("ai dashboard facts checks passed");
