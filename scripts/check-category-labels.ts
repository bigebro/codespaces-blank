import assert from "node:assert/strict";
import { categoryDisplayName, dedupeCategoryNames } from "../src/lib/categoryLabels";

assert.equal(categoryDisplayName("Халуун ундаа"), "Халуун ундаа");
assert.equal(categoryDisplayName("Хоол & Зууш"), "Хоол & Зууш");
assert.deepEqual(
  dedupeCategoryNames(["ундаа", "Ундаа", "Халуун ундаа", "ундаа", "Бэйкэри & Десерт"]),
  ["ундаа", "Халуун ундаа", "Бэйкэри & Десерт"],
);
const broken = ["Халуун ундаа", "Хүйтэн ундаа", "Хоол & Зууш", "Бэйкэри & Десерт"].map((n) =>
  n.replace(/^[^\s]+\s/, ""),
);
assert.deepEqual(broken, ["ундаа", "ундаа", "& Зууш", "& Десерт"]);
const fixed = dedupeCategoryNames(["Халуун ундаа", "Хүйтэн ундаа", "Хоол & Зууш", "Бэйкэри & Десерт"]);
assert.deepEqual(fixed, ["Халуун ундаа", "Хүйтэн ундаа", "Хоол & Зууш", "Бэйкэри & Десерт"]);
console.log("category label checks passed");
