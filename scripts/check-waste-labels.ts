import assert from "node:assert/strict";
import { addWasteLog, cleanLogNotes, displaySourceNote, emptyWasteBuckets, logTypeLabel, staffDisplayName, tabletSourceNote, wasteBucket, wasteFeedDetail, wasteLoggedTotal, wasteReasonLabel } from "../src/lib/shiftCycle";
import { itemDisplayName, localizedItemName, splitItemName } from "../src/lib/itemDisplayName";

assert.equal(logTypeLabel("TESTING"), "Туршилт");
assert.equal(logTypeLabel("testing"), "Туршилт");
assert.equal(logTypeLabel("OTHER"), "Бусад");
assert.equal(logTypeLabel("SPOILAGE"), "Муудсан");
assert.equal(logTypeLabel("spoilage", "өглөө асгарсан"), "Асгарсан/Алдаа");
assert.equal(logTypeLabel("spoilage", "муудсан"), "Муудсан");
assert.equal(logTypeLabel("mystery"), "Бусад");
assert.equal(staffDisplayName("staff (TEST Бариста)"), "Ажилтан: TEST Бариста");
assert.equal(staffDisplayName("STAFF (Анхтуул)"), "Ажилтан: Анхтуул");
assert.equal(staffDisplayName("TEST Бариста"), "TEST Бариста");
assert.equal(staffDisplayName("Ажилтан: staff (TEST Бариста)"), "Ажилтан: TEST Бариста");
assert.equal(staffDisplayName("Kiosk (Хаягдал)"), "Таблет (Хаягдал)");
assert.equal(staffDisplayName("kiosk"), "Таблет");
assert.equal(staffDisplayName("Киоск (Хаягдал)"), "Таблет (Хаягдал)");
assert.equal(displaySourceNote("Kiosk (Хаягдал)"), "Таблет (Хаягдал)");
assert.equal(displaySourceNote("Киоскын түүхээс"), "Таблетын түүхээс");
assert.equal(displaySourceNote("киоск дээр орлого"), "таблет дээр орлого");
assert.equal(itemDisplayName("Сүү (ТУРШИЛТ)"), "Сүү");
assert.equal(splitItemName("Кофе үр (ТУРШИЛТ)").isTest, true);
assert.equal(localizedItemName("Сүү (ТУРШИЛТ)", "mn"), "Сүү");
assert.equal(localizedItemName("Milk (Сүү)", "mn"), "Сүү");
assert.equal(localizedItemName("Milk (Сүү) (ТУРШИЛТ)", "mn"), "Сүү");

assert.equal(wasteFeedDetail({ type: "spoilage", notes: "Kiosk (Хаягдал)", worker: "Kiosk (Хаягдал)" }), "Таблет (Хаягдал) · Муудсан");
assert.equal(wasteFeedDetail({ type: "spoilage", notes: "Асгарсан", worker: "TEST Бариста" }), "Таблет (Хаягдал) · Асгарсан/Алдаа");
assert.equal(wasteFeedDetail({ type: "spoilage", notes: "Таблет (Хаягдал) · Муудсан" }), "Таблет (Хаягдал) · Муудсан");
assert.equal(cleanLogNotes("сүү 200мл асгасан (🧠 Суралцсан үг)"), "сүү 200мл асгасан");
assert.doesNotMatch(cleanLogNotes("foo (⚡ Local Parser)"), /Local Parser|Суралцсан/);
assert.equal(tabletSourceNote("Хаягдал", "Асгарсан"), "Таблет (Хаягдал) · Асгарсан");
assert.equal(wasteBucket("spoilage", "Асгарсан"), "spill");
assert.equal(wasteBucket("spoilage", "Асгарсан/Алдаа"), "spill");
assert.equal(wasteBucket("other", "өглөө асгарсан"), "spill");
assert.equal(wasteBucket("spoilage", "Муудсан"), "spoilage");
assert.equal(wasteBucket("spoilage", "Хугацаа дууссан"), "spoilage");
assert.equal(wasteBucket("spoilage", ""), "spoilage");
assert.equal(wasteReasonLabel("spoilage", "Асгарсан"), "Асгарсан/Алдаа");
assert.equal(logTypeLabel("spoilage", "Асгарсан"), "Асгарсан/Алдаа");
assert.equal(wasteFeedDetail({ type: "spoilage", notes: "Асгарсан", worker: "TEST Бариста" }), "Таблет (Хаягдал) · Асгарсан/Алдаа");
assert.equal(wasteFeedDetail({ type: "other", notes: "Бусад", worker: "Анхтуул" }), "Таблет (Хаягдал) · Бусад");
assert.equal(
  wasteFeedDetail({ type: "spoilage", notes: "Сүү 100 мл асгарсан (🧠 Суралцсан үг)", worker: "staff (TEST Бариста)" }),
  "Таблет (Хаягдал) · Асгарсан/Алдаа",
);
assert.equal(
  wasteFeedDetail({ type: "spoilage", notes: "200 мл сүү асгарсан", worker: "staff (TEST Бариста)" }),
  "Таблет (Хаягдал) · Асгарсан/Алдаа",
);
assert.equal(
  wasteFeedDetail({ type: "other", notes: "Бусад", worker: "staff (TEST Бариста)" }),
  "Таблет (Хаягдал) · Бусад",
);
assert.equal(
  wasteFeedDetail({ type: "other", notes: "", worker: "TEST Бариста" }),
  "Таблет (Хаягдал) · Бусад",
);

// qa6 regression: milk counts (10000+14000+17800=41800) must not enter Бусад.
const milkId = "milk-1";
const coffeeId = "coffee-1";
const cupId = "cup-1";
const logs = [
  { ingredient_id: milkId, type: "count", incident_type: "normal", quantity: 10000, notes: "Бөөнөөр Тоолсон Үлдэгдэл (start)" },
  { ingredient_id: milkId, type: "count", incident_type: "opening_recount", quantity: 14000, notes: "Ээлж нээх тооллого" },
  { ingredient_id: milkId, type: "count", incident_type: "daily_cycle_count", quantity: 17800, notes: "Ээлж хаалтын тооллого" },
  { ingredient_id: milkId, type: "count", incident_type: "daily_cycle_count", quantity: 4300, notes: "Ээлж хаалтын тооллого 4300" },
  { ingredient_id: milkId, type: "other", incident_type: "unexplained_gap", quantity: 3800, notes: "Тайлбаргүй зөрүү" },
  { ingredient_id: milkId, type: "spoilage", notes: "Kiosk (Хаягдал)", quantity: -100 },
  { ingredient_id: milkId, type: "spoilage", notes: "Асгарсан", quantity: -1100 },
  { ingredient_id: milkId, type: "testing", incident_type: "shift_waste", notes: "Туршилт", quantity: -1200 },
  { ingredient_id: coffeeId, type: "count", quantity: 2000, notes: "start" },
  { ingredient_id: coffeeId, type: "testing", notes: "Туршилт", quantity: -250 },
  { ingredient_id: cupId, type: "count", quantity: 200, notes: "start" },
  { ingredient_id: cupId, type: "testing", notes: "Туршилт", quantity: -25 },
  { ingredient_id: cupId, type: "purchase", notes: "Таблет (Орлого)", quantity: 1 },
];
const buckets = emptyWasteBuckets();
for (const log of logs) addWasteLog(buckets, log, milkId);
assert.equal(buckets.spoilage, 100);
assert.equal(buckets.spill, 1100);
assert.equal(buckets.testing, 1200);
assert.equal(buckets.staff_meal, 0);
assert.equal(buckets.other, 0);
assert.equal(wasteLoggedTotal(buckets), 2400);
assert.notEqual(wasteLoggedTotal(buckets), 41800);
assert.notEqual(wasteLoggedTotal(buckets), 44200);

console.log("waste and item label checks passed");
