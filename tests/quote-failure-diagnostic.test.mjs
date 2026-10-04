import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { quoteFailureDiagnostic } from "../src/lib/quotes/failure-diagnostic.ts";

test("quote failure diagnostics retain only fixed messages and allowlisted machine codes", () => {
  const privateText = "Private Customer +5515999990000 contact@example.invalid bearer-secret";
  for (const [operation, cause, code] of [
    ["quote_insert", { code: "23514", message: privateText, details: privateText, hint: privateText }, "23514"],
    ["quote_notification", { name: "validation_error", message: privateText, request: { body: privateText } }, "validation_error"],
    ["quote_insert", { code: privateText, message: privateText }, "unknown"],
    ["quote_notification", Object.assign(new Error(privateText), { cause: { email: privateText } }), "unknown"],
    ["quote_insert", null, "unknown"],
    ["quote_notification", privateText, "unknown"],
  ]) {
    const result = quoteFailureDiagnostic(operation, cause);
    assert.deepEqual(result.tags, { operation, code });
    assert.ok(result.error instanceof Error);
    assert.equal(result.error.cause, undefined);
    assert.equal(result.error.message, operation === "quote_insert" ? "Quote storage failed" : "Quote notification failed after storage");
    assert.ok(!JSON.stringify({ tags: result.tags, message: result.error.message, stack: result.error.stack }).includes(privateText));
  }
});

test("quote route sends sanitized diagnostics to both explicit failure sinks without changing save responses", () => {
  const route = readFileSync(new URL("../src/app/api/quotes/route.ts", import.meta.url), "utf8");
  assert.match(route, /quoteFailureDiagnostic\("quote_insert", databaseError\)/);
  assert.match(route, /quoteFailureDiagnostic\("quote_notification", emailError\)/);
  assert.equal((route.match(/console\.error\(diagnostic\.error\.message, diagnostic\.tags\)/g) ?? []).length, 2);
  assert.equal((route.match(/Sentry\.captureException\(diagnostic\.error, \{ tags: diagnostic\.tags \}\)/g) ?? []).length, 2);
  assert.doesNotMatch(route, /console\.error\([^\n]*(?:databaseError|emailError)|captureException\((?:databaseError|emailError)/);
  assert.match(route, /return privateJson\(\{ ok: true, id: savedQuote\.id \}, 201\)/);
});
