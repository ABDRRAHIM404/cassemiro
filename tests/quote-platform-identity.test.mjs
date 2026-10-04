import assert from "node:assert/strict";
import test from "node:test";
import { platformQuoteIdentity } from "../src/lib/quotes/platform-identity.ts";

const production = { vercel: "1", nodeEnv: "production" };
test("quote identity reads only Vercel's address, not conflicting forwarding headers", () => {
  const headers = new Headers({ "x-vercel-forwarded-for": " 203.0.113.7 ", "x-forwarded-for": "198.51.100.9, 192.0.2.3", "x-real-ip": "192.0.2.55" });
  assert.equal(platformQuoteIdentity(headers, production), "203.0.113.7");
  headers.delete("x-vercel-forwarded-for");
  assert.equal(platformQuoteIdentity(headers, production), null);
});

test("quote identity rejects missing, invalid and chained platform addresses", () => {
  for (const value of ["", "unknown", "203.0.113.7, 198.51.100.9", "203.0.113.7:443", "[2001:db8::1]", "fe80::1%eth0", "localhost", "999.2.3.4"]) {
    assert.equal(platformQuoteIdentity(new Headers({ "x-vercel-forwarded-for": value }), production), null, value);
  }
  assert.equal(platformQuoteIdentity(new Headers(), production), null);
});

test("equivalent IPv6 addresses share one normalized quote identity", () => {
  for (const value of ["2001:0DB8:0000:0000:0000:0000:0000:0001", "2001:db8::1"]) {
    assert.equal(platformQuoteIdentity(new Headers({ "x-vercel-forwarded-for": value }), production), "2001:db8::1");
  }
});

test("forwarding headers do not enable quote writes on a non-Vercel production host", () => {
  const headers = new Headers({ "x-vercel-forwarded-for": "203.0.113.7" });
  assert.equal(platformQuoteIdentity(headers, { nodeEnv: "production" }), null);
  assert.equal(platformQuoteIdentity(headers, { nodeEnv: "test" }), null);
  assert.equal(platformQuoteIdentity(headers, { nodeEnv: "development" }), "local-development");
});
