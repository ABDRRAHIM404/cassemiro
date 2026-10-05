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
const accessibilityFindings = [];
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
    if (process.env.AUDIT_ADMIN_CSP === "yes") await context.addInitScript(() => {
      window.auditCspViolations = [];
      document.addEventListener("securitypolicyviolation", event => window.auditCspViolations.push(event.effectiveDirective));
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.name));
    const cspNonces = new Set();
    const goto = async path => {
      const response = await page.goto(`${origin}${path}`, { waitUntil: "domcontentloaded", timeout: 30000 });
      assert.equal(response.status(), 200, `Unexpected status on ${path}`);
      assert.equal(new URL(page.url()).pathname, path);
      await page.waitForFunction(() => {
        const button = document.querySelector('[role="switch"][aria-label="Modo escuro"]');
        const key = button && Object.keys(button).find(key => key.startsWith("__reactProps$"));
        return key && typeof button[key]?.onClick === "function";
      }, undefined, { timeout: 20000 });
      if (process.env.AUDIT_ADMIN_CSP === "yes") {
        const policy = response.headers()["content-security-policy"];
        const script = policy?.split("; ").find(part => part.startsWith("script-src "));
        assert.ok(script?.includes("'strict-dynamic'") && !script.includes("'unsafe-inline'") && !script.includes("'unsafe-eval'"));
        const nonce = script.match(/'nonce-([^']+)'/)?.[1];
        assert.ok(nonce && !cspNonces.has(nonce), "Every admin document needs a fresh nonce");
        cspNonces.add(nonce);
        assert.ok(response.headers()["cache-control"]?.includes("no-store"));
        const scripts = await page.evaluate(() => [...document.scripts].filter(el => !el.src && el.textContent.trim()).map(el => el.nonce));
        assert.ok(scripts.length && scripts.every(value => value === nonce), "Inline framework scripts must carry the response nonce");
        assert.deepEqual(await page.evaluate(() => window.auditCspViolations), [], "Legitimate admin scripts must not be blocked");
        if (cspNonces.size === 1) {
          // Local synthetic DOM probe only. No network, CMS save or handler call.
          await page.evaluate(() => {
            window.auditUntrustedScriptRan = false;
            const script = document.createElement("script");
            script.textContent = "window.auditUntrustedScriptRan = true";
            document.body.append(script); script.remove();
          });
          await page.waitForFunction(() => window.auditCspViolations.length > 0);
          assert.equal(await page.evaluate(() => window.auditUntrustedScriptRan), false);
          assert.deepEqual(await page.evaluate(() => window.auditCspViolations), ["script-src-elem"]);
          await page.evaluate(nonce => {
            const script = document.createElement("script"); script.nonce = nonce;
            script.textContent = "window.auditTrustedScriptRan = true";
            document.body.append(script); script.remove();
            window.auditCspViolations = [];
          }, nonce);
          assert.equal(await page.evaluate(() => window.auditTrustedScriptRan), true);
        }
        console.log(JSON.stringify({ adminCsp: { width, path, freshNonce: true, matchingFrameworkNonces: true, noLegitimateViolations: true, inlineProbeTested: cspNonces.size === 1 } }));
      }
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
      const scanAccessibility = async menu => {
        if (!process.env.AXE_CORE_SCRIPT) return;
        if (!await page.evaluate(() => Boolean(window.axe))) await page.addScriptTag({ path: process.env.AXE_CORE_SCRIPT });
        const accessibility = await page.evaluate(async () => {
          const result = await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] } });
          const summarize = rules => rules.map(rule => ({ id: rule.id, impact: rule.impact, targets: rule.nodes.map(node => node.target) }));
          return { violations: summarize(result.violations), incomplete: summarize(result.incomplete) };
        });
        const observation = { width, path: new URL(page.url()).pathname, theme: await page.locator("[data-admin-theme]").getAttribute("data-admin-theme"), menu, ...accessibility };
        accessibilityFindings.push(observation);
        console.log(JSON.stringify({ adminAccessibility: observation }));
      };
      await scanAccessibility(width === 390 ? "open" : "desktop");
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
      if (width === 390) await scanAccessibility("closed");
      for (const sample of samples) assert.ok(sample.ratio >= 4.5, `${sample.element} normal-text contrast ${sample.ratio.toFixed(2)} below 4.5`);
      return samples.map(sample => sample.ratio);
    };
    try {
      if (process.env.AUDIT_FOCUSED_CONTRAST === "yes") {
        for (const mode of ["light", "dark"]) {
          for (const path of ["/admin", "/admin/projetos", "/admin/servicos", "/admin/depoimentos", "/admin/orcamentos"]) {
            await goto(path);
            const toggle = page.getByRole("switch", { name: "Modo escuro" });
            if (await toggle.getAttribute("aria-checked") !== String(mode === "dark")) await toggle.click();
            await theme(mode);
            const targets = page.locator('.admin-table td a, .admin-table td:not(:has(*)), .admin-service-order button:not(:disabled), .testimonial-list article > div > span');
            const samples = [];
            for (let index = 0; index < await targets.count(); index++) {
              const target = targets.nth(index);
              await target.scrollIntoViewIfNeeded();
              await page.mouse.move(0, 0);
              for (const state of ["rest", "hover"]) {
                if (state === "hover") await target.hover();
                const sample = await target.evaluate(async el => {
                  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
                  const color = value => {
                    const parts = value.match(/[\d.]+/g)?.map(Number);
                    if (!parts || parts.length < 3 || parts.length > 4) return null;
                    return { rgb: parts.slice(0, 3), alpha: parts[3] ?? 1 };
                  };
                  const luminance = rgb => rgb.map(n => n / 255).map(n => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4).reduce((sum, n, i) => sum + n * [.2126, .7152, .0722][i], 0);
                  const foreground = color(getComputedStyle(el).color);
                  let background;
                  for (let parent = el; parent; parent = parent.parentElement) {
                    const style = getComputedStyle(parent);
                    if (Number(style.opacity) !== 1 || style.filter !== "none" || style.mixBlendMode !== "normal") return { inconclusive: "composited ancestor" };
                    if (!background) {
                      if (style.backgroundImage !== "none") return { inconclusive: "image background" };
                      const candidate = color(style.backgroundColor);
                      if (candidate?.alpha === 1) background = candidate;
                      else if (candidate?.alpha > 0) return { inconclusive: "translucent background" };
                    }
                  }
                  const rect = el.getBoundingClientRect();
                  const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
                  if (!hit || !el.contains(hit)) return { inconclusive: "not visibly uncovered" };
                  if (!background || foreground?.alpha !== 1) return { inconclusive: "non-opaque colors" };
                  const a = luminance(foreground.rgb), b = luminance(background.rgb);
                  const graphical = el.matches('.admin-service-order button') || /^★+$/.test(el.textContent.trim());
                  return { ratio: (Math.max(a, b) + .05) / (Math.min(a, b) + .05), required: graphical ? 3 : 4.5, graphical };
                });
                assert.ok(!sample.inconclusive, `Focused ${path} ${state} sample ${index}: ${sample.inconclusive}`);
                assert.ok(sample.ratio >= sample.required, `Focused ${path} ${mode} ${state} sample ${index}: ${sample.ratio.toFixed(2)} below ${sample.required}`);
                samples.push(sample);
              }
            }
            assert.ok(samples.length, "Expected real contrast targets");
            console.log(JSON.stringify({ focusedAdminContrast: { width, path, theme: mode, samples: samples.length, graphicalSamples: samples.filter(sample => sample.graphical).length, minimum: Number(Math.min(...samples.map(sample => sample.ratio)).toFixed(2)), method: "Visible opaque computed colors, rest and hover" } }));
          }
        }
        assert.deepEqual(errors, [], "Browser runtime errors");
        assert.equal(blockedWrites, 0, "Unexpected browser write attempted");
        continue;
      }
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
  assert.equal(accessibilityFindings.reduce((count, result) => count + result.violations.length, 0), 0, "Automatic admin accessibility violations require review");
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
