import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
import { inspect } from "node:util";

test("actual quote handler redacts storage/provider failures while retaining 500/201 semantics", async () => {
  const stateKey = Symbol.for("cassemiro.quote-failure-test");
  const state = { databaseError: null, providerError: null, providerThrows: false, captures: [], inserts: 0, sends: 0 };
  globalThis[stateKey] = state;
  const stateSource = 'const state=globalThis[Symbol.for("cassemiro.quote-failure-test")];';
  const mocks = {
    "next/server": 'export class NextRequest extends Request {} export class NextResponse extends Response {static json(body, options){return Response.json(body,options)}}',
    "@/lib/rate-limit": 'export const quoteClientIdentity=()=>"isolated-test"; export const checkQuoteRateLimit=async()=>({allowed:true,error:false});',
    "@/lib/supabase/admin": `${stateSource} export const createSupabaseAdmin=()=>({from:()=>({insert:()=>{state.inserts++;return {select:()=>({single:async()=>({data:state.databaseError?null:{id:"synthetic-id",created_at:"2026-10-05T00:00:00Z"},error:state.databaseError})})}}})});`,
    "@sentry/nextjs": `${stateSource} export const captureException=(error,context)=>state.captures.push({error,context});`,
    "resend": `${stateSource} export class Resend {emails={send:async()=>{state.sends++;if(state.providerThrows)throw state.providerError;return {error:state.providerError}}};}`,
  };
  const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
    if (Object.hasOwn(mocks, specifier)) return { url: `data:text/javascript,${encodeURIComponent(mocks[specifier])}`, shortCircuit: true };
    if (specifier.startsWith("@/")) return nextResolve(new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href, context);
    return nextResolve(specifier, context);
  } });
  const envNames = ["RESEND_API_KEY", "QUOTE_NOTIFICATION_EMAIL", "RESEND_FROM_EMAIL"];
  const originalEnv = envNames.map(name => process.env[name]);
  const originalConsoleError = console.error;
  const originalFetch = globalThis.fetch;
  const logs = [];
  try {
    // Fake transport modules only; absolutely no database/email/network traffic.
    globalThis.fetch = () => { throw new Error("Network forbidden in isolated quote test"); };
    console.error = (...values) => logs.push(values);
    envNames.forEach(name => { process.env[name] = "synthetic-test-only"; });
    const { POST } = await import("../src/app/api/quotes/route.ts");
    const privateText = "Private Customer contact@example.invalid +5515999990000";
    const payload = { name: "Private Customer", phone: "+5515999990000", city: "Synthetic City", workType: "Construção residencial", description: privateText };
    const submit = () => POST(new Request("https://example.invalid/api/quotes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) }));

    state.databaseError = { code: "23514", message: privateText, details: privateText };
    let response = await submit();
    assert.equal(response.status, 500);
    assert.match(response.headers.get("cache-control"), /private.*no-store/);
    assert.equal(state.sends, 0);
    assert.deepEqual(state.captures.at(-1).context.tags, { operation: "quote_insert", code: "23514" });

    state.databaseError = null;
    for (const throws of [false, true]) {
      state.providerError = { name: "validation_error", message: privateText, cause: { submitted: payload } };
      state.providerThrows = throws;
      response = await submit();
      assert.equal(response.status, 201);
      assert.deepEqual(await response.json(), { ok: true, id: "synthetic-id" });
      assert.match(response.headers.get("cache-control"), /private.*no-store/);
      assert.deepEqual(state.captures.at(-1).context.tags, { operation: "quote_notification", code: "validation_error" });
    }
    assert.equal(state.inserts, 3);
    assert.equal(state.sends, 2);
    assert.equal(state.captures.length, 3);
    assert.equal(logs.length, 3);
    for (const capture of state.captures) {
      assert.ok(capture.error instanceof Error);
      assert.equal(capture.error.cause, undefined);
    }
    assert.ok(!inspect({ logs, captures: state.captures }, { depth: null }).includes(privateText));
  } finally {
    globalThis.fetch = originalFetch;
    console.error = originalConsoleError;
    envNames.forEach((name, index) => {
      if (originalEnv[index] === undefined) delete process.env[name];
      else process.env[name] = originalEnv[index];
    });
    hooks.deregister();
    delete globalThis[stateKey];
  }
});
