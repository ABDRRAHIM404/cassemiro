import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { protectErrorPrivacy } from "../src/lib/monitoring/error-privacy.ts";
import { BrowserClient } from "@sentry/browser";

test("error reports discard request payloads, identities and unbounded ancillary context", () => {
  const secret = "Synthetic Customer contact@example.invalid token=private-test-only";
  const event = {
    type: undefined,
    event_id: "synthetic-event",
    exception: { values: [{ type: "Error", value: "Quote storage operation failed", stacktrace: { frames: [{ filename: "route.ts", lineno: 123 }] } }] },
    tags: { operation: "quote_insert", code: "23514" },
    release: "synthetic-release",
    request: { url: `https://example.invalid/auth/callback?${secret}`, data: secret, headers: { Authorization: secret }, cookies: secret },
    user: { email: secret, ip_address: "192.0.2.1" },
    breadcrumbs: [{ category: "http", data: { url: secret } }, { category: "console", message: secret }],
    extra: { submitted: secret }
  };
  const diagnostic = structuredClone({ exception: event.exception, tags: event.tags, release: event.release });
  const result = protectErrorPrivacy(event);
  assert.equal(result, event);
  for (const key of ["request", "user", "breadcrumbs", "extra"]) assert.ok(!Object.hasOwn(result, key));
  assert.ok(!JSON.stringify(result).includes(secret));
  assert.deepEqual({ exception: result.exception, tags: result.tags, release: result.release }, diagnostic);
  assert.deepEqual(protectErrorPrivacy(result), result);
});

test("minimal error events remain valid", () => {
  assert.deepEqual(protectErrorPrivacy({ type: undefined }), { type: undefined });
});

test("installed Sentry SDK applies the filter before the in-memory transport", async () => {
  const envelopes = [];
  const client = new BrowserClient({
    dsn: "https://synthetic@example.invalid/1",
    integrations: [],
    stackParser: () => [],
    sendDefaultPii: false,
    beforeSend: protectErrorPrivacy,
    transport: () => ({
      send: async envelope => { envelopes.push(envelope); return { statusCode: 200 }; },
      flush: async () => true
    })
  });
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = () => { throw new Error("No network permitted in telemetry privacy test"); };
    client.captureEvent({
      message: "Synthetic diagnostic",
      request: { data: "private-body", url: "https://example.invalid/?token=private-token" },
      user: { email: "private@example.invalid" },
      breadcrumbs: [{ message: "private-history" }],
      extra: { submitted: "private-form" },
      tags: { operation: "quote_insert", code: "23514" }
    });
    assert.equal(await client.flush(2000), true);
    assert.equal(envelopes.length, 1);
    const event = envelopes[0][1][0][1];
    assert.equal(event.message, "Synthetic diagnostic");
    assert.deepEqual(event.tags, { operation: "quote_insert", code: "23514" });
    assert.ok(!JSON.stringify(envelopes).includes("private-"));
    assert.ok(!JSON.stringify(envelopes).includes("private@example.invalid"));
  } finally {
    await client.close(2000);
    globalThis.fetch = originalFetch;
  }
});

test("all three Sentry runtimes install the same error filter without enabling a service", async () => {
  for (const path of ["sentry.server.config.ts", "sentry.edge.config.ts", "instrumentation-client.ts"]) {
    const source = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
    assert.match(source, /beforeSend: protectErrorPrivacy/);
    assert.match(source, /sendDefaultPii: false/);
    assert.match(source, /tracesSampleRate: 0\.1/);
    assert.match(source, /process\.env\.(?:NEXT_PUBLIC_)?SENTRY_DSN/);
  }
});
