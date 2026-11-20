import assert from "node:assert/strict";
import {
  AUTH_EMAIL_PASSWORD,
  AUTH_EMAIL_UNCONFIRMED,
  AUTH_GENERIC,
  AUTH_NETWORK,
  AUTH_RATE_LIMIT,
  mapAuthError,
} from "../src/lib/authErrors";

assert.equal(mapAuthError("Invalid login credentials"), AUTH_EMAIL_PASSWORD);
assert.equal(mapAuthError({ message: "Invalid login credentials" }), AUTH_EMAIL_PASSWORD);
assert.equal(mapAuthError({ message: "Email not confirmed" }), AUTH_EMAIL_UNCONFIRMED);
assert.equal(mapAuthError({ message: "Too many requests" }), AUTH_RATE_LIMIT);
assert.equal(mapAuthError(new Error("Failed to fetch")), AUTH_NETWORK);
assert.equal(mapAuthError({ message: "Something exploded in the API" }), AUTH_GENERIC);
assert.equal(mapAuthError("Имэйлээ шалгана уу."), "Имэйлээ шалгана уу.");
assert.notEqual(mapAuthError("Invalid login credentials"), "Invalid login credentials");
console.log("auth error mapping checks passed");
