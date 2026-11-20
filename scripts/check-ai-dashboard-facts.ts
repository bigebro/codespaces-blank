import assert from "node:assert/strict";
import { dashboardItemFactsText, gradeFactLines, gradeGuide, itemVarianceFacts } from "../src/lib/gradeGuide";
import {
  findNamedGrade,
  officialNumberTokens,
  renderItemFactsBlock,
  renderOverviewFactsBlock,
  sanitizeItemAdvice,
  stripAllItemBoardTotals,
  stripContradictingNumberLines,
} from "../src/lib/dashboardFactsBlock";

/** Start+end case: logged 2200 (Муудсан 1000, Туршилт 1200), unexplained 3800 / 19,000₮. */
const milk = {
  name: "Milk (Сүү)",
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
  waste_spill: 0,
  waste_testing: 1200,
  waste_staff_meal: 0,
  waste_other: 0,
  purchase_value: 0,
  reasons: [],
};

const facts = itemVarianceFacts(milk);
assert.equal(facts.start, 10000);
assert.equal(facts.end, 8800);
assert.equal(facts.logged, 2200);
assert.equal(facts.spoilage, 1000);
assert.equal(facts.spill, 0);
assert.equal(facts.testing, 1200);
assert.equal(facts.unexplainedQty, 3800);

const dashboard = dashboardItemFactsText(milk);
assert.match(dashboard, /Эхлэх тоо 10000 мл/);
assert.match(dashboard, /эцсийн тоо 8800 мл/);
assert.match(dashboard, /Хаягдал бүртгэгдсэн 2200 мл/);
assert.match(dashboard, /Муудсан 1000/);
assert.match(dashboard, /Асгарсан\/Алдаа 0/);
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
assert.doesNotMatch(serverBlock, /Самбарын тоо/);
assert.doesNotMatch(serverBlock, /Баталгаажсан барааны/);
assert.doesNotMatch(serverBlock, /2100/);
assert.match(serverBlock, /Худалдан авалт 0₮/);

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

/** Spill is its own bucket: 100 мл Асгарсан does not increase Муудсан. Logged total stays the sum. */
const milkWithSpill = {
  ...milk,
  waste_spoilage: 1100,
  waste_spill: 100,
  waste_testing: 1200,
  gap_qty: 6000,
};
const spillFacts = itemVarianceFacts(milkWithSpill);
assert.equal(spillFacts.spoilage, 1100);
assert.equal(spillFacts.spill, 100);
assert.equal(spillFacts.logged, 2400);
assert.equal(spillFacts.unexplainedQty, 3600);
const spillText = dashboardItemFactsText(milkWithSpill);
assert.match(spillText, /Хаягдал бүртгэгдсэн 2400 мл/);
assert.match(spillText, /Муудсан 1100/);
assert.match(spillText, /Асгарсан\/Алдаа 100/);
assert.match(spillText, /Туршилт 1200/);
assert.doesNotMatch(spillText, /Муудсан 1200/);

/** Unknown end: card keeps missing-end lines and still quotes the unexplained event line. */
const milkUnknownEnd = {
  name: "Milk (Сүү)",
  status: "Missing",
  unit: "мл",
  action: "count",
  has_start: true,
  has_end: false,
  start_qty: 10000,
  end_qty: null,
  purchased_qty: 4800,
  theoretical_qty: 0,
  actual_qty: null,
  gap_qty: null,
  gap_money: null,
  unit_price: 5,
  price: 5,
  waste_spoilage: 1100,
  waste_spill: 0,
  waste_testing: 1200,
  waste_staff_meal: 0,
  waste_other: 0,
  unexplained_event_qty: 3800,
  unexplained_event_money: 19000,
  purchase_value: 0,
  reasons: ["2026-11-30-нд эсвэл түүнээс хойш тооллого алга"],
};
const unknownFacts = itemVarianceFacts(milkUnknownEnd);
assert.equal(unknownFacts.hasEnd, false);
assert.equal(unknownFacts.logged, 2300);
assert.equal(unknownFacts.spoilage, 1100);
assert.equal(unknownFacts.unexplainedQty, null);
const unknownDash = dashboardItemFactsText(milkUnknownEnd);
assert.match(unknownDash, /Эхлэх тоо 10000 мл/);
assert.match(unknownDash, /Эцсийн тоо алга/);
assert.match(unknownDash, /Тооны зөрүүг тооцоолоогүй/);
assert.match(unknownDash, /Хаягдал бүртгэгдсэн 2300 мл/);
assert.match(unknownDash, /Муудсан 1100/);
assert.match(unknownDash, /Асгарсан\/Алдаа 0/);
assert.match(unknownDash, /Туршилт 1200/);
assert.match(unknownDash, /Ажилтны хоол 0/);
assert.match(unknownDash, /Бусад 0/);
assert.match(unknownDash, /3800 мл/);
assert.match(unknownDash, /19,000₮/);
const unknownBlock = renderItemFactsBlock(milkUnknownEnd);
assert.equal(unknownBlock.includes(unknownDash), true);
assert.match(unknownBlock, /Эцсийн тоо алга/);
assert.match(unknownBlock, /Тооны зөрүүг тооцоолоогүй/);
assert.match(unknownBlock, /3800 мл/);
assert.match(unknownBlock, /19,000₮/);
assert.doesNotMatch(unknownBlock, /Самбарын тоо/);
assert.doesNotMatch(unknownBlock, /Баталгаажсан барааны/);
assert.doesNotMatch(unknownBlock, /Баталгаажсан барааны тайлбаргүй зөрүү/);
assert.match(unknownBlock, /2026-11-30-нд эсвэл түүнээс хойш тооллого алга/);
assert.match(unknownBlock, /Худалдан авалт 0₮\. Өртөгт оруулаагүй\./);
assert.match(unknownBlock, /1\. Таблет дээр энэ барааг одоо тоол/);
assert.match(unknownBlock, /2\. /);
assert.match(unknownBlock, /3\. /);

const coda = "Сүүний орлого болон зарцуулалтын зөрүүг нягтлах хэрэгтэй. Энэ нь бизнесийн үрэлгэн байдлыг багасгана.";
assert.equal(sanitizeItemAdvice(coda), "");
assert.equal(sanitizeItemAdvice("Жорын нэг порцыг шалга."), "Жорын нэг порцыг шалга.");
assert.equal(sanitizeItemAdvice("Хаягдал 2400 мл байна."), "");

const overview = renderOverviewFactsBlock({
  financial_ladder: { revenue: 0, actual_cogs: 0, theo_cogs: 0, verified_gap: 0, data_trust: { grades: [] } },
  total_waste_loss: 0,
  total_unexplained_waste: 0,
  grades: [milkUnknownEnd],
}, "11-р сар");
assert.match(overview, /Самбарын тоо/);
const strippedOverview = stripAllItemBoardTotals(
  `${overview}\nЖорын нэг порцыг шалга.`,
);
assert.doesNotMatch(strippedOverview, /Самбарын тоо/);
assert.doesNotMatch(strippedOverview, /Баталгаажсан барааны/);
assert.match(strippedOverview, /Жорын нэг порцыг шалга/);

assert.equal(findNamedGrade([milkUnknownEnd], "Сүү яагаад шалгах гэж байна?")?.name, "Milk (Сүү)");
assert.equal(findNamedGrade([milkUnknownEnd], "milk waste")?.name, "Milk (Сүү)");

console.log("ai dashboard facts checks passed");
