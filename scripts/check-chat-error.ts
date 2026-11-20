import assert from "node:assert/strict";
import { CHAT_RETRY_MESSAGE, CHAT_TIMEOUT_MESSAGE, chatErrorMessage, isTransientChatFailure } from "../src/lib/chatError";

assert.equal(chatErrorMessage(new Error("HTTP 504 алдаа")), CHAT_TIMEOUT_MESSAGE);
assert.equal(chatErrorMessage("[SYSTEM ERROR]: HTTP 504 алдаа"), CHAT_TIMEOUT_MESSAGE);
assert.doesNotMatch(chatErrorMessage("HTTP 500"), /SYSTEM ERROR|HTTP 500/i);
assert.equal(chatErrorMessage("boom"), CHAT_RETRY_MESSAGE);
assert.equal(isTransientChatFailure("HTTP 504"), true);
assert.equal(isTransientChatFailure("AI одоогоор хариу өгсөнгүй. Бүртгэл хадгалагдаагүй."), true);
assert.equal(isTransientChatFailure("syntax"), false);
console.log("chat error checks passed");
