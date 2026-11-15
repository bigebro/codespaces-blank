import assert from "node:assert/strict";
import { defaultAuditDate, importFallbackIso, ubDay } from "../src/lib/ubDate";
import { inventoryImportMessage, parseInventoryCountPaste } from "../src/lib/inventoryPaste";

const openMonth = importFallbackIso("2026-11-01", "2026-11-30", "2026-11-16");
assert.equal(openMonth, "2026-11-16T12:00:00.000Z");
assert.equal(openMonth.endsWith("T12:00:00.000Z"), true);
assert.notEqual(openMonth.slice(0, 10), "2026-11-30");

const closedMonth = importFallbackIso("2026-10-01", "2026-10-31", "2026-11-16");
assert.equal(closedMonth, "2026-10-31T12:00:00.000Z");

const futureMonth = importFallbackIso("2026-12-01", "2026-12-31", "2026-11-16");
assert.equal(futureMonth, "2026-12-01T12:00:00.000Z");

const missingEnd = importFallbackIso("2026-11-01", "", "2026-11-16");
assert.equal(missingEnd, "2026-11-01T12:00:00.000Z");

const today = defaultAuditDate(new Date("2026-11-16T02:00:00Z"));
assert.equal(today, "2026-11-16");
assert.notEqual(today, "2026-09-01");
assert.equal(defaultAuditDate(new Date()), ubDay(new Date()));

const parsed = parseInventoryCountPaste("Testxyz  5");
assert.equal(parsed.ok, true);
if (!parsed.ok) throw new Error("parse failed");
assert.equal(parsed.rows.length, 1);
assert.equal(parsed.rows[0].itemName, "Testxyz");
assert.equal(parsed.rows[0].qty, 5);
const message = inventoryImportMessage(0, today, parsed.rows.map((row) => row.itemName));
assert.match(message, /Олдоогүй бараа \(хадгалагдаагүй\): Testxyz/);

console.log("import date checks passed");
