import assert from "node:assert/strict";
import test from "node:test";
import { readLimitedJson } from "../src/lib/http/read-limited-json.ts";

function request(body) {
  return new Request("https://example.test/api/quotes", { method: "POST", body });
}

test("small valid quote JSON is parsed", async () => {
  assert.deepEqual(await readLimitedJson(request('{"name":"Maria"}'), 100), {
    ok: true,
    value: { name: "Maria" }
  });
});

test("declared oversized body is rejected before reading", async () => {
  assert.deepEqual(await readLimitedJson(request("x".repeat(101)), 100), {
    ok: false,
    reason: "too-large"
  });
});

test("chunked oversized body is rejected while streaming", async () => {
  const bytes = new TextEncoder().encode("á".repeat(51));
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(bytes.slice(0, 60));
      controller.enqueue(bytes.slice(60));
      controller.close();
    }
  });
  const result = await readLimitedJson(new Request("https://example.test/api/quotes", {
    method: "POST",
    body: stream,
    duplex: "half"
  }), 100);
  assert.deepEqual(result, { ok: false, reason: "too-large" });
});

test("malformed JSON and missing body are rejected", async () => {
  assert.deepEqual(await readLimitedJson(request("{"), 100), { ok: false, reason: "invalid" });
  assert.deepEqual(await readLimitedJson(request(undefined), 100), { ok: false, reason: "invalid" });
});
