// GET-only production browser check; never submit a quote or mutate CMS data.
import assert from "node:assert/strict";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE);
const browser = await chromium.launch({
  executablePath: "/home/bng/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome",
  headless: true,
  args: process.env.BROWSER_PROXY_HTTP1 === "1" ? ["--disable-http2", "--disable-quic"] : [],
  proxy: { server: process.env.HTTPS_PROXY || process.env.HTTP_PROXY || "http://192.168.1.187:8080" },
});
const origin = "https://cassemiro-one.vercel.app";
const titles = ["Qualidade", "Prazos", "Experiência", "Confiança"];
try {
  for (const width of [390, 1366]) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: width === 390, hasTouch: width === 390, reducedMotion: "no-preference" });
    await context.route("**/*", route => route.request().method() === "GET" ? route.continue() : route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.name));
    try {
      assert.equal((await page.goto(origin, { waitUntil: "domcontentloaded", timeout: 30000 })).status(), 200);
      const controls = page.getByRole("group", { name: "Compromissos CASSEMIRO" });
      await controls.waitFor();
      const phases = [];
      for (const index of [0, 1, 2, 3, 2, 1, 0]) {
        await page.evaluate(index => {
          const root = document.querySelector("#porque");
          const stage = root.firstElementChild;
          const header = innerWidth <= 1000 ? 64 : 72;
          const start = root.getBoundingClientRect().top + scrollY - header;
          const travel = root.getBoundingClientRect().height - stage.getBoundingClientRect().height;
          scrollTo(0, start + travel * ((index + .2) / 4));
        }, index);
        await page.waitForFunction(index => {
          const feature = document.querySelector(`#trust-feature-${index}`);
          if (!feature || feature.getAttribute("aria-hidden") !== "false") return false;
          const style = getComputedStyle(feature);
          return style.visibility === "visible" && Number(style.opacity) > .95;
        }, index, { timeout: 10000 });
        assert.equal(await page.locator(`#trust-feature-${index} h3`).innerText(), titles[index]);
        assert.equal(await controls.locator('[aria-pressed="true"]').count(), 1);
        phases.push(titles[index]);
      }
      for (const title of titles) {
        const button = controls.getByRole("button", { name: title, exact: true });
        if (width === 390) await button.tap(); else await button.focus();
        assert.equal(await button.getAttribute("aria-pressed"), "true");
        assert.equal((await button.innerText()).trim().split("\n").at(-1), title);
      }
      await page.emulateMedia({ reducedMotion: "reduce" });
      await controls.getByRole("button", { name: "Qualidade", exact: true }).focus();
      await page.keyboard.press("End");
      assert.equal(await controls.getByRole("button", { name: "Confiança", exact: true }).getAttribute("aria-pressed"), "true");
      assert.equal(await page.locator("#porque").evaluate(root => getComputedStyle(root.firstElementChild).position), "relative");
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);

      assert.equal((await page.goto(`${origin}/contato`, { waitUntil: "domcontentloaded", timeout: 30000 })).status(), 200);
      // SSR fields can appear before their client handlers are installed.
      // Verify the interactive path only once this specific input is hydrated.
      await page.waitForFunction(() => {
        const input = document.querySelector("#desiredStart");
        const key = input && Object.keys(input).find(key => key.startsWith("__reactProps$"));
        return key && typeof input[key]?.onChange === "function";
      }, undefined, { timeout: 20000 });
      const date = page.locator("#desiredStart");
      await date.fill("");
      await date.pressSequentially("05112026");
      assert.equal(await date.inputValue(), "05/11/2026");
      const calendar = page.locator('input[type="date"][aria-label="Escolher data no calendário"]');
      await calendar.fill("2027-02-14");
      assert.equal(await date.inputValue(), "14/02/2027");
      await calendar.fill("");
      assert.equal(await date.inputValue(), "");
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.deepEqual(errors, []);
      console.log(JSON.stringify({ width, passed: true, phases, touchControls: width === 390, reducedMotionKeyboard: true, dateMask: true, calendarValueSync: true, runtimeErrors: errors.length, scope: "Emulated Chromium scroll-position/touch-control and date-value checks; no physical Safari/native calendar popup/quote submission" }));
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
