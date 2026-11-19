import assert from "node:assert/strict";
import { createSpellingFixer, fixMnBusinessSpelling } from "../src/ai/runtime/mnSpelling";

assert.equal(fixMnBusinessSpelling("бизнисийн байдал"), "бизнесийн байдал");
assert.equal(fixMnBusinessSpelling("бизнесийн байдал"), "бизнесийн байдал");
assert.equal(fixMnBusinessSpelling("өнөөдөр бизнес ямар байна"), "өнөөдөр бизнес ямар байна");

const fixer = createSpellingFixer();
const parts = ["өнөөдөр бизн", "исийн байдал сайн"];
let out = "";
for (const part of parts) out += fixer.push(part);
out += fixer.flush();
assert.equal(out, "өнөөдөр бизнесийн байдал сайн");

console.log("mn spelling checks passed");
