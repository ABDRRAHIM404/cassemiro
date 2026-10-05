// Existing-owner GET-only callback proof. No email or password change; only
// this isolated login session is revoked. Tokens/cookies never leave memory.
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
assert.equal(process.env.AUDIT_AUTH_CALLBACK, "yes");
const origin = "https://cassemiro-one.vercel.app";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
assert.equal(new URL(url).hostname, "zjjepitczgffszbilfte.supabase.co");
const email = process.env.AUDIT_EXISTING_OWNER_EMAIL?.toLowerCase(); assert.ok(email);
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const users = await admin.auth.admin.listUsers({ page: 1, perPage: 100 }); assert.equal(users.error, null);
const owner = users.data.users.find(user => user.email?.toLowerCase() === email && user.email_confirmed_at); assert.ok(owner);
const profile = await admin.from("profiles").select("role").eq("id", owner.id).single(); assert.equal(profile.error, null); assert.equal(profile.data.role, "owner");
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE);
const browser = await chromium.launch({ executablePath: "/home/bng/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome", headless: true,
  args: ["--disable-http2", "--disable-quic"], proxy: { server: process.env.HTTPS_PROXY || process.env.HTTP_PROXY || "http://192.168.1.187:8080" } });
try {
  for (const [linkType, verifyType, target] of [["magiclink", "email", "/admin"], ["recovery", "recovery", "/admin/redefinir-senha"]]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } }); let token;
    let writes = 0; const errors = [];
    await context.route("**/*", route => { if (route.request().method() === "GET") return route.continue(); writes++; return route.abort(); });
    const page = await context.newPage(); page.on("pageerror", error => errors.push(error.name));
    try {
      const generated = await admin.auth.admin.generateLink({ type: linkType, email: owner.email, options: { redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(target)}` } });
      assert.equal(generated.error, null); assert.equal(generated.data.user.id, owner.id);
      assert.equal(new URL(generated.data.properties.redirect_to).origin, origin);
      const callback = new URL("/auth/callback", origin);
      callback.search = new URLSearchParams({ token_hash: generated.data.properties.hashed_token, type: verifyType, next: target }).toString();
      // Keep token-bearing URLs out of assertion/error output.
      const response = await page.goto(callback.href, { waitUntil: "domcontentloaded" }).catch(() => { throw new Error("Production callback navigation failed"); });
      const cookies = await context.cookies(origin);
      const client = createServerClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { cookies: { getAll: () => cookies.map(({ name, value }) => ({ name, value })), setAll: () => {} } });
      token = (await client.auth.getSession()).data.session?.access_token;
      assert.ok(token, "Callback must create a session cookie");
      const verified = await admin.auth.getUser(token); assert.equal(verified.error, null); assert.equal(verified.data.user.id, owner.id);
      assert.equal(response.status(), 200); assert.equal(new URL(page.url()).origin, origin); assert.equal(new URL(page.url()).pathname, target);
      if (verifyType === "recovery") await page.getByRole("heading", { name: "Nova senha" }).waitFor();
      else await page.getByRole("switch", { name: "Modo escuro" }).waitFor();
      const callbackResponse = response.request().redirectedFrom()?.response();
      if (callbackResponse) assert.ok((await callbackResponse).headers()["cache-control"].includes("no-store"));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.deepEqual(errors, []); assert.equal(writes, 0);
      // Reusing the consumed token must fail to login, never localhost.
      const repeat = await page.request.get(callback.href, { maxRedirects: 0 }).catch(() => { throw new Error("Consumed-token callback check failed"); });
      assert.equal(repeat.status(), 307);
      const repeatTarget = new URL(repeat.headers().location); assert.equal(repeatTarget.origin, origin); assert.equal(repeatTarget.pathname, "/admin/login");
      console.log(JSON.stringify({ liveAuthCallback: { type: verifyType, destination: target, canonicalOrigin: true, sessionVerified: true, consumedTokenRejected: true, emailSent: false, passwordChanged: false, browserWrites: 0, runtimeErrors: 0 } }));
    } finally {
      // Recover the test cookie if a page assertion failed before token extraction.
      if (!token) {
        const cookies = await context.cookies(origin);
        const client = createServerClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { cookies: { getAll: () => cookies.map(({ name, value }) => ({ name, value })), setAll: () => {} } });
        token = (await client.auth.getSession()).data.session?.access_token;
      }
      if (token) { const revoked = await admin.auth.admin.signOut(token, "local"); assert.equal(revoked.error, null); }
      await context.close();
      console.log(JSON.stringify({ isolatedCallbackSessionRevoked: Boolean(token) }));
    }
  }
} finally { await browser.close(); }
