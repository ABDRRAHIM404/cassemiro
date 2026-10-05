import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
import { readFile } from "node:fs/promises";
import { NextRequest } from "next/server.js";
import { adminContentSecurityPolicy } from "../src/lib/security/admin-csp.ts";

test("admin policy blocks arbitrary inline scripts while retaining required resource destinations", () => {
  const nonce = Buffer.alloc(32, 7).toString("base64");
  const original = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = "production";
    const policy = adminContentSecurityPolicy(nonce);
    const script = policy.split("; ").find(part => part.startsWith("script-src "));
    assert.equal(script, `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`);
    assert.ok(policy.includes("script-src-attr 'none'"));
    assert.ok(policy.includes("style-src 'self' 'unsafe-inline'"));
    assert.ok(policy.includes("https://zjjepitczgffszbilfte.supabase.co"));
    assert.ok(policy.includes("object-src 'none'"));
    for (const invalid of ["", "caller-nonce", "a'; script-src *", "\r\nInjected: true"]) {
      assert.throws(() => adminContentSecurityPolicy(invalid), /Invalid CSP nonce/);
    }
    process.env.NODE_ENV = "development";
    assert.ok(adminContentSecurityPolicy(nonce).includes("'unsafe-eval'"));
  } finally { if (original === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = original; }
});

test("actual proxy forwards fresh nonces through auth refresh and secures anonymous redirects", async () => {
  const key = Symbol.for("cassemiro.admin-csp-test");
  const state = { authenticated: true, refresh: true };
  globalThis[key] = state;
  const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
    if (specifier === "next/server") return nextResolve("next/server.js", context);
    if (specifier === "@/lib/supabase/proxy") return { url: new URL("../src/lib/supabase/proxy.ts", import.meta.url).href, shortCircuit: true };
    if (specifier === "@/lib/security/admin-csp") return { url: new URL("../src/lib/security/admin-csp.ts", import.meta.url).href, shortCircuit: true };
    if (specifier === "@supabase/ssr") return {
      url: `data:text/javascript,${encodeURIComponent(`
        const state=globalThis[Symbol.for("cassemiro.admin-csp-test")];
        export const createServerClient=(_url,_key,{cookies})=>({auth:{getClaims:async()=>{
          if(state.refresh) cookies.setAll([{name:"synthetic-session",value:"synthetic-refreshed",options:{httpOnly:true,path:"/"}}],{"Cache-Control":"private, no-store","Pragma":"no-cache"});
          return {data:state.authenticated?{claims:{sub:"synthetic-owner"}}:null};
        }}});
      `)}`, shortCircuit: true
    };
    return nextResolve(specifier, context);
  } });
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = () => { throw new Error("Network forbidden in CSP regression"); };
    // The proxy must live beside src/app or Next will silently ignore it.
    const { proxy, config } = await import("../src/proxy.ts");
    assert.deepEqual(config.matcher, ["/admin/:path*"]);
    const nonces = new Set();
    for (const refresh of [false, true]) {
      state.refresh = refresh;
      state.authenticated = true;
      const request = new NextRequest("https://example.invalid/admin/projetos", { headers: { "x-nonce": "caller-nonce", "Content-Security-Policy": "script-src *" } });
      const response = await proxy(request);
      const policy = response.headers.get("Content-Security-Policy");
      const nonce = policy.match(/'nonce-([^']+)'/)[1];
      assert.equal(Buffer.from(nonce, "base64").length, 32);
      assert.ok(!nonces.has(nonce)); nonces.add(nonce);
      assert.equal(response.headers.get("x-middleware-request-x-nonce"), nonce);
      assert.equal(response.headers.get("x-middleware-request-content-security-policy"), policy);
      assert.equal(response.headers.get("Cache-Control"), "private, no-store, max-age=0");
      if (refresh) {
        assert.equal(response.cookies.get("synthetic-session").value, "synthetic-refreshed");
        assert.ok(response.headers.get("x-middleware-request-cookie").includes("synthetic-refreshed"));
      }
    }
    state.authenticated = false;
    state.refresh = true;
    const response = await proxy(new NextRequest("https://example.invalid/admin/projetos"));
    assert.equal(response.status, 307);
    assert.equal(new URL(response.headers.get("location")).pathname, "/admin/login");
    assert.ok(response.headers.get("Content-Security-Policy").includes("'strict-dynamic'"));
    assert.equal(response.headers.get("Cache-Control"), "private, no-store, max-age=0");
    assert.equal(response.cookies.get("synthetic-session").value, "synthetic-refreshed");
  } finally { globalThis.fetch = originalFetch; hooks.deregister(); delete globalThis[key]; }
});

test("dynamic rendering stays inside admin; public baseline policy remains compatible", async () => {
  const admin = await readFile(new URL("../src/app/admin/layout.tsx", import.meta.url), "utf8");
  assert.match(admin, /await connection\(\)/);
  for (const path of ["src/app/layout.tsx", "src/app/(marketing)/layout.tsx"]) {
    const source = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /await connection\(\)|force-dynamic|x-nonce/);
  }
  const config = await readFile(new URL("../next.config.ts", import.meta.url), "utf8");
  assert.match(config, /script-src 'self' 'unsafe-inline'/);
  assert.ok(config.includes('source: "/((?!admin(?:/|$)).*)"'), "Static CSP must not override admin response nonces");
});
