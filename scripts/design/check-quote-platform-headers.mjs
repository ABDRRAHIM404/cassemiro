// No-save endpoint checks. A mandatory nonempty honeypot bypasses all writes.
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { quoteRequestSchema } from "../../src/features/quotes/validation.ts";

assert.equal(process.env.AUDIT_NO_SAVE_QUOTE_TEST, "yes");
const origin = process.env.QUOTE_HEADER_TEST_ORIGIN ?? "http://127.0.0.1:3005";
assert.ok(["http://127.0.0.1:3005", "https://cassemiro-one.vercel.app"].includes(origin));
const local = origin.startsWith("http:");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
assert.equal(new URL(url).hostname, "zjjepitczgffszbilfte.supabase.co");
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const quoteIds = async () => {
  const result = await admin.from("quote_requests").select("id").order("id");
  assert.ifError(result.error);
  return result.data;
};
const before = await quoteIds();
const payload = quoteRequestSchema.parse({ name: "Synthetic no-save header probe", phone: "0000000000", city: "Synthetic", workType: "Synthetic", description: "No customer request: mandatory honeypot prevents storage.", company: "audit-mandatory-nonempty-honeypot" });
assert.ok(payload.company);
const cases = local ? [
  { name: "missing-platform-header", headers: { "x-forwarded-for": "203.0.113.9", "x-real-ip": "198.51.100.7" }, status: 503 },
  { name: "invalid-platform-header", headers: { "x-vercel-forwarded-for": "not-an-ip", "x-forwarded-for": "203.0.113.9" }, status: 503 },
  { name: "chained-platform-header", headers: { "x-vercel-forwarded-for": "203.0.113.9, 198.51.100.7" }, status: 503 },
  { name: "valid-platform-address", headers: { "x-vercel-forwarded-for": "203.0.113.9", "x-forwarded-for": "198.51.100.7" }, status: 200 },
  { name: "normalized-ipv6", headers: { "x-vercel-forwarded-for": "2001:0DB8:0000:0000:0000:0000:0000:0001" }, status: 200 },
] : [
  { name: "edge-address-without-client-headers", headers: {}, status: 200 },
  { name: "spoofed-standard-headers", headers: { "x-forwarded-for": "203.0.113.9, 198.51.100.7", "x-real-ip": "192.0.2.5" }, status: 200 },
  { name: "edge-replaces-invalid-platform-header", headers: { "x-vercel-forwarded-for": "not-an-ip" }, status: 200 },
  { name: "edge-replaces-chained-platform-header", headers: { "x-vercel-forwarded-for": "203.0.113.9, 198.51.100.7" }, status: 200 },
];
const proof = [];
for (const probe of cases) {
  const response = await fetch(`${origin}/api/quotes`, { method: "POST", headers: { "content-type": "application/json", ...probe.headers }, body: JSON.stringify(payload), signal: AbortSignal.timeout(30000) });
  assert.equal(response.status, probe.status, probe.name);
  assert.match(response.headers.get("cache-control"), /private.*no-store/);
  if (response.status === 200) assert.deepEqual(await response.json(), { ok: true });
  proof.push({ name: probe.name, status: response.status, uncached: true });
}
assert.deepEqual(await quoteIds(), before);
console.log(JSON.stringify({ passed: true, environment: local ? "local-production-with-platform-env" : "production-edge", proof, quoteRowsUnchanged: true, quotesCreated: 0,
  scope: "strict identity gate and no-save platform-header handling; not deployed limiter saturation or valid-quote delivery" }));
