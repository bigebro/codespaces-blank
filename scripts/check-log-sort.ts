import assert from "node:assert/strict";
import { sortLogsNewestFirst } from "../src/lib/logSort";

const rows = [
  { id: "old", created_at: "2026-11-20T01:00:00.000Z", date: "2026-11-20T10:00:00.000Z" },
  { id: "new", created_at: "2026-11-20T03:00:00.000Z", date: "2026-11-20T09:00:00.000Z" },
  { id: "mid-same-created", created_at: "2026-11-20T03:00:00.000Z", date: "2026-11-20T11:00:00.000Z" },
];
assert.deepEqual(sortLogsNewestFirst(rows).map((r) => r.id), ["mid-same-created", "new", "old"]);
console.log("log sort checks passed");
