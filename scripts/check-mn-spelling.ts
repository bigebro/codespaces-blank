import assert from "node:assert/strict";
import { createSpellingFixer, fixMnBusinessSpelling } from "../src/ai/runtime/mnSpelling";

assert.equal(fixMnBusinessSpelling("бизнисийн байдал"), "бизнесийн байдал");
assert.equal(fixMnBusinessSpelling("бизнесийн байдал"), "бизнесийн байдал");
assert.equal(fixMnBusinessSpelling("өнөөдөр бизнес ямар байна"), "өнөөдөр бизнес ямар байна");
assert.equal(fixMnBusinessSpelling("Тайбаргүй зөрүү"), "Тайлбаргүй зөрүү");
assert.equal(fixMnBusinessSpelling("тайбаргүй зөрүү"), "тайлбаргүй зөрүү");
assert.equal(fixMnBusinessSpelling("бизнсийн байдал"), "бизнесийн байдал");

const fixer = createSpellingFixer();
const parts = ["өнөөдөр бизн", "исийн байдал сайн"];
let out = "";
for (const part of parts) out += fixer.push(part);
out += fixer.flush();
assert.equal(out, "өнөөдөр бизнесийн байдал сайн");

const fixer2 = createSpellingFixer();
let out2 = fixer2.push("Тайбар") + fixer2.push("гүй зөрүү");
out2 += fixer2.flush();
assert.equal(out2, "Тайлбаргүй зөрүү");

// The typo filter must only replace wrong stems (бизнис / бизнс), never the correct бизнес / бизнесийн.
assert.equal(fixMnBusinessSpelling("бизнес"), "бизнес");
assert.equal(fixMnBusinessSpelling("бизнесийн"), "бизнесийн");
assert.equal(fixMnBusinessSpelling("Бизнесийн байдал"), "Бизнесийн байдал");
assert.equal(fixMnBusinessSpelling("бизнес ба бизнис"), "бизнес ба бизнес");
assert.equal(fixMnBusinessSpelling("бизнисийн"), "бизнесийн");
console.log("mn spelling checks passed");
