import assert from "node:assert/strict";
import test from "node:test";
import { optionalNotificationError } from "../src/lib/quotes/optional-notification.ts";

test("successful optional notification has no error", async () => {
  assert.equal(await optionalNotificationError(async () => ({ error: null })), null);
});

test("provider-returned notification error is reported", async () => {
  const error = new Error("provider rejected email");
  assert.equal(await optionalNotificationError(async () => ({ error })), error);
});

test("thrown notification error is returned instead of escaping", async () => {
  const error = new Error("transport failed");
  assert.equal(await optionalNotificationError(async () => { throw error; }), error);
});
