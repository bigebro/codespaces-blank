import assert from "node:assert/strict";
import { looksLikeCashExpense } from "../src/lib/cashExpenseHint";

assert.equal(looksLikeCashExpense("TEST цаас 5000₮"), true);
assert.equal(looksLikeCashExpense("Сүү 100 мл асгарсан"), false);
assert.equal(looksLikeCashExpense(""), false);
console.log("cash expense hint checks passed");
