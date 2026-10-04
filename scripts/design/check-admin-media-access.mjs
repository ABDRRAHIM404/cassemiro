// Production GET-only media/CSP verification. Auth credentials and signed URLs
// stay in memory; no uploads, publication changes, new users or fixture writes.
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
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
const ownerEmail = process.env.AUDIT_EXISTING_OWNER_EMAIL?.trim().toLowerCase();
assert.ok(ownerEmail, "Explicit AUDIT_EXISTING_OWNER_EMAIL required; never guess between owner accounts");
const users = await admin.auth.admin.listUsers({ page: 1, perPage: 100 });
assert.equal(users.error, null, "Existing identity lookup failed");
const owner = users.data.users.find(user => user.email?.toLowerCase() === ownerEmail);
assert.ok(owner?.email_confirmed_at, "Exact existing confirmed owner required; no identity will be created");
const profile = await admin.from("profiles").select("id,role").eq("id", owner.id).single();
assert.ok(!profile.error && profile.data?.role === "owner", "Selected identity must have an owner profile");
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
        const expiryChecks = [];
        for (const media of before.project_media) {
          const redirected = await context.request.get(`${origin}/api/project-media/${media.id}`, { maxRedirects: 0 });
          assert.equal(redirected.status(), 302);
          assert.ok(redirected.headers()["cache-control"]?.includes("private") && redirected.headers()["cache-control"]?.includes("no-store"), "Signed redirect cacheable");
          assert.equal(redirected.headers()["referrer-policy"], "no-referrer");
          const signed = new URL(redirected.headers().location);
          assert.ok(signed.origin === url && signed.pathname.startsWith(`/storage/v1/object/sign/${bucketName}/`), "Unexpected signed target");
          const claims = JSON.parse(Buffer.from(signed.searchParams.get("token").split(".")[1], "base64url").toString());
          assert.ok(Number.isFinite(claims.iat) && claims.exp - claims.iat === 60, "Signed token must declare a 60-second lifetime");
          // Start a monotonic full-lifetime wait when we receive the URL.
          // Local wall time is not proof of the Storage server's clock.
          const rejectionCheckAfter = performance.now() + 65000;
          // Playwright transport exceptions can include their full request URL.
          // Never let a signed bearer URL escape through that diagnostic path.
          let delivered;
          try { delivered = await context.request.get(signed.href); }
          catch { throw new Error("Signed object download failed; bearer URL withheld"); }
          assert.equal(delivered.status(), 200);
          const original = await admin.storage.from(bucketName).download(media.storage_path);
          assert.equal(original.error, null, "Original private object unavailable");
          assert.equal(digest(await delivered.body()), digest(Buffer.from(await original.data.arrayBuffer())), "Delivered object differs from private original");
          // A private bucket is not made public by its published media route.
          const raw = await fetch(`${url}/storage/v1/object/public/${bucketName}/${media.storage_path}`, { signal: AbortSignal.timeout(15000) });
          assert.ok(!raw.ok, "Unsigned private object unexpectedly public");
          if (process.env.AUDIT_SIGNED_URL_EXPIRY === "yes") expiryChecks.push({ mediaId: media.id, signedUrl: signed.href, rejectionCheckAfter, digest: digest(await delivered.body()) });
        }
        if (expiryChecks.length) {
          const deadline = Math.max(...expiryChecks.map(check => check.rejectionCheckAfter));
          console.log(JSON.stringify({ checkpoint: "signed-url-expiry-wait", objects: expiryChecks.length }));
          while (performance.now() < deadline) await new Promise(resolve => setTimeout(resolve, Math.max(1, Math.min(30000, deadline - performance.now()))));
          for (const check of expiryChecks) {
            let expired;
            try { expired = await context.request.get(check.signedUrl, { headers: { "cache-control": "no-cache" } }); }
            catch { throw new Error("Expired object check failed; bearer URL withheld"); }
            // Supabase documents CDN cache lifetime as independent of token
            // expiry. Report exact-URL replay separately; don't mislabel a
            // cache hit as either a rejected token or an origin auth failure.
            const replayStatus = expired.status();
            assert.ok([200, 400, 401, 403].includes(replayStatus), "Unexpected expired-URL response");
            if (replayStatus === 200) assert.equal(digest(await expired.body()), check.digest, "Cached replay differs from original image");
            const uncachedUrl = new URL(check.signedUrl);
            uncachedUrl.searchParams.set("cacheNonce", randomUUID());
            let originCheck;
            try { originCheck = await context.request.get(uncachedUrl.href, { headers: { "cache-control": "no-cache" } }); }
            catch { throw new Error("Uncached expiry check failed; bearer URL withheld"); }
            console.log(JSON.stringify({ checkpoint: "signed-url-expiry-result", replayStatus, replayCacheControl: expired.headers()["cache-control"] || null, replayCacheStatus: expired.headers()["cf-cache-status"] || null, cacheNonceStatus: originCheck.status(), cacheNonceCacheStatus: originCheck.headers()["cf-cache-status"] || null, cachedReplayDelivered: replayStatus === 200 }));
            assert.ok([400, 401, 403].includes(originCheck.status()), "Expiry rejection unproven: cacheNonce request was not denied; origin bypass is not assumed");
            const renewed = await context.request.get(`${origin}/api/project-media/${check.mediaId}`, { maxRedirects: 0 });
            assert.equal(renewed.status(), 302);
            assert.ok(renewed.headers().location !== check.signedUrl, "Renewal reused an expired bearer URL; URLs withheld");
            let fresh;
            try { fresh = await context.request.get(renewed.headers().location); }
            catch { throw new Error("Renewed object check failed; bearer URL withheld"); }
            assert.equal(fresh.status(), 200);
          }
          console.log(JSON.stringify({ cacheNonceExpiryRequestsDenied: expiryChecks.length, freshAuthorizedUrlsDelivered: expiryChecks.length, exactUrlCacheReplayReportedSeparately: true }));
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
    assert.ok(JSON.stringify(await snapshot()) === JSON.stringify(before), "Original project/media rows changed");
    console.log(JSON.stringify({ isolatedSessionRevoked: Boolean(token), projectMediaRowsUnchanged: true }));
  }
}
