// Explicit, GET-only live audit. Existing owner only; no account creation,
// email, password reset, CMS saves or persisted browser credentials.
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

assert.equal(process.env.AUDIT_READ_ONLY_ADMIN_TEST, "yes", "Explicit read-only audit flag required");
const origin = "https://cassemiro-one.vercel.app";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
assert.equal(new URL(url).hostname, "zjjepitczgffszbilfte.supabase.co");
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const ownerEmail = process.env.AUDIT_EXISTING_OWNER_EMAIL?.trim().toLowerCase();
assert.ok(ownerEmail, "Explicit existing owner email required");
const users = await admin.auth.admin.listUsers({ page: 1, perPage: 100 });
assert.equal(users.error, null, "Existing owner lookup failed");
const owner = users.data.users.find(user => user.email?.toLowerCase() === ownerEmail && user.email_confirmed_at);
assert.ok(owner, "Existing confirmed owner required; no account will be created");
const profile = await admin.from("profiles").select("id, role").eq("id", owner.id).single();
assert.equal(profile.error, null, "Existing owner lookup failed");
assert.equal(profile.data.role, "owner", "Explicit account must already be an owner");
const identity = await admin.auth.admin.getUserById(profile.data.id);
assert.ok(!identity.error && identity.data.user?.email_confirmed_at, "Existing confirmed owner required");
const jar = new Map();
let token;
let browser;
let blockedWrites = 0;
const counts = async () => {
  const result = {};
  for (const table of ["projects", "project_media", "quote_requests", "profiles"]) {
    const response = await admin.from(table).select("id", { count: "exact", head: true });
    assert.equal(response.error, null, `Read-only ${table} count failed`);
    result[table] = response.count;
  }
  return result;
};
const before = await counts();
try {
  const generated = await admin.auth.admin.generateLink({ type: "magiclink", email: identity.data.user.email });
  assert.ok(!generated.error && generated.data.user.id === profile.data.id, "Existing-user link failed");
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
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.name));
    const goto = async path => {
      const response = await page.goto(`${origin}${path}`, { waitUntil: "domcontentloaded", timeout: 30000 });
      assert.equal(response.status(), 200, `Unexpected status on ${path}`);
      assert.equal(new URL(page.url()).pathname, path);
      await page.waitForFunction(() => {
        const button = document.querySelector('[role="switch"][aria-label="Modo escuro"]');
        const key = button && Object.keys(button).find(key => key.startsWith("__reactProps$"));
        return key && typeof button[key]?.onClick === "function";
      }, undefined, { timeout: 20000 });
    };
    const theme = async expected => {
      await page.locator(`[data-admin-theme="${expected}"]`).waitFor();
      assert.equal(await page.getByRole("switch", { name: "Modo escuro" }).getAttribute("aria-checked"), String(expected === "dark"));
      assert.equal(await page.locator("[data-admin-theme]").evaluate(el => getComputedStyle(el).colorScheme), expected);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, "Page overflow");
    };
    const contrast = async () => {
      const mobileMenu = page.locator('details').filter({ has: page.locator('summary', { hasText: "Menu" }) });
      if (width === 390) await mobileMenu.locator('summary').click();
      // Measure opaque text against its nearest opaque CSS background, not
      // image overlays, disabled controls, or a blanket WCAG conformance claim.
      const samples = await page.evaluate(() => {
        const luminance = color => {
          const channels = color.match(/[\d.]+/g)?.map(Number);
          if (!channels || channels.length < 3 || channels[3] != null && channels[3] !== 1) return null;
          return channels.slice(0, 3).map(n => n / 255).map(n => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4)
            .reduce((sum, n, i) => sum + n * [.2126, .7152, .0722][i], 0);
        };
        return [...document.querySelectorAll('.admin-field > span, .admin-table th, .admin-notice, .admin-email-warning, [role="switch"], nav[aria-label="Navegação administrativa"] a span, aside p, aside a[href="/"], details summary, details a[href="/"]')]
          .filter(el => el.getBoundingClientRect().width > 0 && getComputedStyle(el).visibility === "visible")
          .map(el => {
            const foreground = luminance(getComputedStyle(el).color);
            let background = null;
            let parent = el;
            while (parent && background === null) {
              background = luminance(getComputedStyle(parent).backgroundColor);
              parent = parent.parentElement;
            }
            return { element: el.tagName.toLowerCase(), ratio: foreground === null || background === null ? null : (Math.max(foreground, background) + .05) / (Math.min(foreground, background) + .05) };
          }).filter(sample => sample.ratio !== null);
      });
      if (width === 390) await mobileMenu.locator('summary').click();
      for (const sample of samples) assert.ok(sample.ratio >= 4.5, `${sample.element} normal-text contrast ${sample.ratio.toFixed(2)} below 4.5`);
      return samples.map(sample => sample.ratio);
    };
    try {
      await goto("/admin");
      await theme("light");
      const contrastRatios = await contrast();
      const routes = ["/admin/projetos", "/admin/projetos/novo", "/admin/servicos", "/admin/depoimentos", "/admin/conteudo", "/admin/configuracoes", "/admin/orcamentos"];
      for (const path of routes) {
        await goto(path);
        await theme("light");
        contrastRatios.push(...await contrast());
      }
      const toggle = page.getByRole("switch", { name: "Modo escuro" });
      const box = await toggle.boundingBox();
      assert.ok(box.width >= 44 && box.height >= 44, "Theme touch target below 44px");
      await toggle.focus();
      await page.keyboard.press("Space");
      await theme("dark");
      assert.equal(await toggle.evaluate(el => el === document.activeElement), true);
      const visited = [];
      for (const path of routes) {
        await goto(path);
        await theme("dark");
        contrastRatios.push(...await contrast());
        // Rendered controls/table headers must actually receive the dark palette.
        const input = page.locator('.admin-field input:not([type="checkbox"]):not([type="hidden"])').first();
        if (await input.count()) assert.equal(await input.evaluate(el => getComputedStyle(el).backgroundColor), "rgb(29, 35, 25)");
        const th = page.locator(".admin-table th").first();
        if (await th.count()) assert.equal(await th.evaluate(el => getComputedStyle(el).backgroundColor), "rgb(37, 43, 33)");
        visited.push(path);
      }
      await page.reload({ waitUntil: "domcontentloaded" });
      await theme("dark");
      const sibling = await context.newPage();
      await sibling.goto(`${origin}/admin`, { waitUntil: "domcontentloaded" });
      await sibling.locator('[data-admin-theme="dark"]').waitFor();
      await page.getByRole("switch", { name: "Modo escuro" }).focus();
      await page.keyboard.press("Enter");
      await theme("light");
      await sibling.locator('[data-admin-theme="light"]').waitFor();
      await sibling.close();
      await page.getByRole("switch", { name: "Modo escuro" }).click();
      await theme("dark");
      await page.goto(origin, { waitUntil: "domcontentloaded" });
      assert.equal(await page.locator("[data-admin-theme]").count(), 0, "Admin theme leaked into public shell");
      assert.equal(await page.locator('header a[href="/"]').first().evaluate(el => getComputedStyle(el.closest("header")).backgroundColor), "rgb(17, 18, 15)");
      assert.deepEqual(errors, [], "Browser runtime errors");
      console.log(JSON.stringify({ width, passed: true, visited, persistence: true, crossTabSync: true, keyboardSwitch: true, publicThemeIsolation: true, opaqueTextContrastSamples: contrastRatios.length, minimumSampledContrast: Number(Math.min(...contrastRatios).toFixed(2)), overflow: false, runtimeErrors: errors.length }));
    } finally { await context.close(); }
  }
  const anonymous = await browser.newContext();
  try {
    await anonymous.route("**/*", route => route.request().method() === "GET" ? route.continue() : route.abort());
    const page = await anonymous.newPage();
    await page.goto(`${origin}/admin/configuracoes`, { waitUntil: "domcontentloaded", timeout: 30000 });
    assert.equal(new URL(page.url()).pathname, "/admin/login");
    assert.equal(await page.locator("[data-admin-theme]").count(), 0);
    assert.equal(blockedWrites, 0, "Unexpected browser write attempted");
    console.log(JSON.stringify({ anonymousProtection: true, blockedBrowserWrites: blockedWrites, scope: "Read-only existing-owner theme checks; no saves, uploads or new accounts" }));
  } finally { await anonymous.close(); }
} finally {
  try { await browser?.close(); }
  finally {
    if (token) {
      const revoked = await admin.auth.admin.signOut(token, "local");
      assert.equal(revoked.error, null, "Isolated session revocation failed");
    }
    jar.clear();
    assert.deepEqual(await counts(), before, "Hosted row counts changed during read-only check");
    console.log(JSON.stringify({ isolatedSessionRevoked: Boolean(token), hostedCountsUnchanged: true }));
  }
}
