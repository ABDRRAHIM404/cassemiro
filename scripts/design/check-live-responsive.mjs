// GET-only production sweep at the audit's eight requested widths.
import assert from "node:assert/strict";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE);
const auditWidths = [1920, 1440, 1366, 1024, 768, 430, 390, 360];
const widths = process.env.AUDIT_WIDTHS ? process.env.AUDIT_WIDTHS.split(",").map(Number) : auditWidths;
assert.ok(widths.length > 0 && widths.every(width => auditWidths.includes(width)), "Use only the audit's requested widths");
const browser = await chromium.launch({
  executablePath: "/home/bng/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome",
  headless: true,
  args: process.env.BROWSER_PROXY_HTTP1 === "1" ? ["--disable-http2", "--disable-quic"] : [],
  proxy: { server: process.env.HTTPS_PROXY || process.env.HTTP_PROXY || "http://192.168.1.187:8080" },
});
try {
  for (const width of widths) {
    const context = await browser.newContext({ viewport: { width, height: width < 800 ? 844 : 900 }, hasTouch: width < 700, isMobile: width < 700 });
    await context.route("**/*", route => route.request().method() === "GET" ? route.continue() : route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.name));
    try {
      assert.equal((await page.goto("https://cassemiro-one.vercel.app", { waitUntil: "domcontentloaded", timeout: 30000 })).status(), 200);
      await page.evaluate(() => document.fonts.ready);
      const states = [];
      for (const selector of ["h1", ...Array.from({ length: 6 }, (_, i) => `[data-story-chapter="${i + 1}"] h2`), "#sobre", "#porque", "#projetos", "footer"]) {
        const target = page.locator(selector).first();
        await target.scrollIntoViewIfNeeded();
        if (selector.startsWith("#")) {
          for (const image of await target.locator("img").all()) {
            await image.scrollIntoViewIfNeeded();
            try { await image.evaluate(el => el.decode()); }
            catch {
              const diagnostic = await image.evaluate(el => ({ source: new URL(el.currentSrc || el.src, location.href).pathname, complete: el.complete, naturalWidth: el.naturalWidth, loading: el.loading }));
              throw new Error(`Image decode failed at ${width}, ${selector}: ${JSON.stringify(diagnostic)}`);
            }
          }
          await page.waitForFunction(selector => [...document.querySelectorAll(`${selector} .reveal`)].every(el => Number(getComputedStyle(el).opacity) >= .99), selector);
        }
        const state = await target.evaluate(el => {
          const bounds = el.getBoundingClientRect();
          return { pageWidth: document.documentElement.scrollWidth, viewport: innerWidth, left: bounds.left, right: bounds.right };
        });
        assert.ok(state.pageWidth <= width && state.left >= -1 && state.right <= width + 1, `Overflow at ${width}, ${selector}: ${JSON.stringify(state)}`);
        states.push(selector);
        if ([1920, 768, 430].includes(width) && ["h1", "#sobre", "#porque", "#projetos"].includes(selector)) {
          await page.screenshot({ path: `.codex/audits/redesign/current/${width}-live-audit-${selector.replace(/[#]/g, "")}.png` });
        }
      }
      const carousel = page.locator("#projetos");
      await carousel.scrollIntoViewIfNeeded();
      const stage = carousel.getByRole("group", { name: "Use as setas para navegar pelos projetos", exact: true });
      await stage.focus();
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");
      const geometry = await stage.evaluate(el => {
        const active = el.querySelector('[data-active="true"]').getBoundingClientRect();
        const bounds = el.getBoundingClientRect();
        return { scrollLeft: el.scrollLeft, offset: Math.abs((active.left + active.right - bounds.left - bounds.right) / 2) };
      });
      assert.ok(geometry.scrollLeft === 0 && geometry.offset <= 1, `Keyboard focus shifted catalogue at ${width}: ${JSON.stringify(geometry)}`);
      const caption = carousel.locator('[aria-live="polite"] h3');
      const firstTitle = await caption.innerText();
      await carousel.getByRole("button", { name: "Próximo projeto", exact: true }).click();
      await page.waitForFunction(title => document.querySelector('#projetos [aria-live="polite"] h3')?.textContent !== title, firstTitle);
      assert.equal(await carousel.locator('[data-active="true"]').count(), 1);
      await carousel.getByRole("button", { name: "Projeto anterior", exact: true }).click();
      assert.equal(await caption.innerText(), firstTitle);
      let menuChecked = false;
      if (width <= 1000) {
        await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
        const toggle = page.getByRole("button", { name: "Abrir menu", exact: true });
        await toggle.click();
        assert.equal(await page.locator('button[aria-controls="primary-navigation"]').getAttribute("aria-expanded"), "true");
        await page.getByRole("navigation", { name: "Navegação principal", exact: true }).waitFor({ state: "visible" });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        await page.keyboard.press("Escape");
        assert.equal(await toggle.getAttribute("aria-expanded"), "false");
        assert.equal(await toggle.evaluate(el => el === document.activeElement), true);
        menuChecked = true;
      }
      assert.deepEqual(errors, [], "Runtime errors");
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      console.log(JSON.stringify({ width, states, wholePageOverflow: false, runtimeErrors: 0, carouselFocusCentered: true, carouselArrows: true, mobileMenuChecked: menuChecked, scope: "Emulated Chromium geometry/image decoding/arrows/menu; no performance/physical-device claim" }));
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
