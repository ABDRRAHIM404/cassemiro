// Production GET-only media/CSP verification. Auth credentials and signed URLs
// stay in memory; no uploads, publication changes, new users or fixture writes.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

assert.equal(process.env.AUDIT_READ_ONLY_ADMIN_TEST, "yes", "Explicit read-only audit flag required");
const origin = "https://cassemiro-one.vercel.app";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
assert.equal(new URL(url).hostname, "zjjepitczgffszbilfte.supabase.co");
const bucketName = "project-media-private";
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const snapshot = async () => {
  const result = {};
  for (const table of ["projects", "project_media"]) {
    const response = await admin.from(table).select("*").order("id");
    assert.equal(response.error, null, `Read-only ${table} snapshot failed`);
    result[table] = response.data;
  }
  return result;
};
const before = await snapshot();
const bucket = await admin.storage.getBucket(bucketName);
assert.ok(!bucket.error && bucket.data.public === false, "Project media bucket must be private");
const profile = await admin.from("profiles").select("id").eq("role", "owner").single();
assert.equal(profile.error, null, "Existing owner required");
const identity = await admin.auth.admin.getUserById(profile.data.id);
assert.ok(!identity.error && identity.data.user.email_confirmed_at, "Confirmed existing owner required");
const jar = new Map();
let token;
let browser;
let blockedWrites = 0;
const digest = bytes => createHash("sha256").update(bytes).digest("hex");
try {
  const generated = await admin.auth.admin.generateLink({ type: "magiclink", email: identity.data.user.email });
  assert.ok(!generated.error && generated.data.user.id === profile.data.id, "Existing-user sign-in failed");
  const client = createServerClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { cookies: {
    getAll: () => [...jar.values()].map(({ name, value }) => ({ name, value })),
    setAll: cookies => cookies.forEach(cookie => jar.set(cookie.name, cookie)),
  } });
  const verified = await client.auth.verifyOtp({ token_hash: generated.data.properties.hashed_token, type: "email" });
  token = verified.data.session?.access_token;
  assert.ok(!verified.error && token && verified.data.user.id === profile.data.id, "Isolated session failed");
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE);
  browser = await chromium.launch({
    executablePath: "/home/bng/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome",
    headless: true,
    args: process.env.BROWSER_PROXY_HTTP1 === "1" ? ["--disable-http2", "--disable-quic"] : [],
    proxy: { server: process.env.HTTPS_PROXY || process.env.HTTP_PROXY || "http://192.168.1.187:8080" },
  });
  for (const width of [390, 1366]) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: width === 390, hasTouch: width === 390 });
    await context.route("**/*", route => {
      if (route.request().method() === "GET") return route.continue();
      blockedWrites++;
      return route.abort();
    });
    await context.addCookies([...jar.values()].map(({ name, value }) => ({ name, value, url: origin })));
    await context.addInitScript(() => {
      window.auditCspViolations = [];
      document.addEventListener("securitypolicyviolation", event => window.auditCspViolations.push(event.effectiveDirective));
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.name));
    let images = 0;
    try {
      for (const project of before.projects) {
        const response = await page.goto(`${origin}/admin/projetos/${project.id}?uploads=1`, { waitUntil: "domcontentloaded", timeout: 30000 });
        assert.equal(response.status(), 200, "Editor did not load");
        assert.ok(new URL(page.url()).pathname.startsWith("/admin/projetos/"), "Editor auth redirected");
        const csp = response.headers()["content-security-policy"] || "";
        assert.ok(csp.includes("object-src 'none'") && csp.includes("https://zjjepitczgffszbilfte.supabase.co"), "Missing CSP baseline/media origin");
        for (const media of before.project_media.filter(item => item.project_id === project.id && item.type !== "video")) {
          assert.ok(media.storage_path && media.url === `/api/project-media/${media.id}`, "Media must use private delivery route");
          const image = page.locator(".project-media__preview img").filter({ hasNot: page.locator("video") });
          const matching = image.locator(`xpath=self::img[@src='${media.url}']`);
          assert.equal(await matching.count(), 1, "Expected real gallery image missing");
          await matching.scrollIntoViewIfNeeded();
          await matching.evaluate(async el => { await el.decode(); });
          assert.ok(await matching.evaluate(el => el.naturalWidth > 0 && el.naturalHeight > 0 && Boolean(el.alt.trim())), "Image failed decoding or lacks alternative");
          images++;
        }
        await page.getByRole("heading", { name: "Envios interrompidos", exact: true }).waitFor({ timeout: 20000 });
        assert.deepEqual(await page.evaluate(() => window.auditCspViolations), [], "CSP blocked legitimate editor resources");
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, "Editor overflow");
      }
      assert.deepEqual(errors, [], "Editor runtime errors");
      console.log(JSON.stringify({ width, editorProjects: before.projects.length, decodedGalleryImages: images, cspViolations: 0, runtimeErrors: 0, overflow: false }));
      if (width === 390) {
        for (const media of before.project_media) {
          const redirected = await context.request.get(`${origin}/api/project-media/${media.id}`, { maxRedirects: 0 });
          assert.equal(redirected.status(), 302);
          assert.ok(redirected.headers()["cache-control"]?.includes("private") && redirected.headers()["cache-control"]?.includes("no-store"), "Signed redirect cacheable");
          assert.equal(redirected.headers()["referrer-policy"], "no-referrer");
          const signed = new URL(redirected.headers().location);
          assert.ok(signed.origin === url && signed.pathname.startsWith(`/storage/v1/object/sign/${bucketName}/`), "Unexpected signed target");
          const claims = JSON.parse(Buffer.from(signed.searchParams.get("token").split(".")[1], "base64url").toString());
          assert.ok(claims.exp <= Date.now() / 1000 + 65 && claims.exp > Date.now() / 1000, "Signed URL is not short-lived");
          const delivered = await context.request.get(signed.href);
          assert.equal(delivered.status(), 200);
          const original = await admin.storage.from(bucketName).download(media.storage_path);
          assert.equal(original.error, null, "Original private object unavailable");
          assert.equal(digest(await delivered.body()), digest(Buffer.from(await original.data.arrayBuffer())), "Delivered object differs from private original");
          // A private bucket is not made public by its published media route.
          const raw = await fetch(`${url}/storage/v1/object/public/${bucketName}/${media.storage_path}`, { signal: AbortSignal.timeout(15000) });
          assert.ok(!raw.ok, "Unsigned private object unexpectedly public");
        }
      }
    } finally { await context.close(); }
  }
  const anonymous = await browser.newContext();
  try {
    for (const media of before.project_media) {
      const project = before.projects.find(item => item.id === media.project_id);
      const response = await anonymous.request.get(`${origin}/api/project-media/${media.id}`, { maxRedirects: 0 });
      assert.equal(response.status(), project.is_published ? 302 : 404, "Anonymous publication boundary failed");
    }
    for (const id of ["invalid-id", "00000000-0000-4000-8000-000000000000"]) {
      const response = await anonymous.request.get(`${origin}/api/project-media/${id}`, { maxRedirects: 0 });
      assert.equal(response.status(), 404);
      assert.ok(response.headers()["cache-control"]?.includes("no-store"));
    }
    console.log(JSON.stringify({ privateBucket: true, unsignedObjectAccessDenied: true, byteIdenticalDelivery: true, shortLivedUncachedRedirects: true, anonymousPublishedDelivery: true, unpublishedMediaTested: before.projects.some(project => !project.is_published), invalidAndUnknownIds: true, blockedBrowserWrites: blockedWrites }));
  } finally { await anonymous.close(); }
} finally {
  try { await browser?.close(); }
  finally {
    if (token) {
      const revoked = await admin.auth.admin.signOut(token, "local");
      assert.equal(revoked.error, null, "Isolated session revocation failed");
    }
    jar.clear();
    assert.deepEqual(await snapshot(), before, "Original project/media rows changed");
    console.log(JSON.stringify({ isolatedSessionRevoked: Boolean(token), projectMediaRowsUnchanged: true }));
  }
}
