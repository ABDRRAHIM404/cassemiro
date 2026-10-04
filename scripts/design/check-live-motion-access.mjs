// GET-only deployed keyboard/reduced-motion/no-JS verification. No submissions.
import assert from "node:assert/strict";

const origin = "https://cassemiro-one.vercel.app";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE);
const browser = await chromium.launch({
  executablePath: "/home/bng/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome",
  headless: true,
  args: process.env.BROWSER_PROXY_HTTP1 === "1" ? ["--disable-http2", "--disable-quic"] : [],
  proxy: { server: process.env.HTTPS_PROXY || process.env.HTTP_PROXY || "http://192.168.1.187:8080" },
});
const chapterTitles = ["Fundações", "Estruturas", "Alvenaria", "Instalações", "Acabamentos", "Construção Completa"];
try {
  for (const width of [320, 390, 1366]) {
    for (const mode of ["reduce", "no-js"]) {
      const context = await browser.newContext({ viewport: { width, height: 844 }, hasTouch: width < 700, isMobile: width < 700,
        reducedMotion: "reduce", javaScriptEnabled: mode !== "no-js" });
      await context.route("**/*", route => route.request().method() === "GET" ? route.continue() : route.abort());
      const page = await context.newPage();
      const errors = [];
      const legacyRequests = [];
      page.on("pageerror", error => errors.push(error.name));
      page.on("request", request => { if (new URL(request.url()).pathname.startsWith("/media/hero/")) legacyRequests.push(true); });
      try {
        assert.equal((await page.goto(origin, { waitUntil: "domcontentloaded", timeout: 30000 })).status(), 200);
        assert.equal(await page.locator("canvas").count(), 0, "Heavy frame canvas returned");
        for (let index = 1; index <= 6; index++) {
          const chapter = page.locator(`[data-story-chapter="${index}"]`);
          await chapter.scrollIntoViewIfNeeded();
          const heading = chapter.getByRole("heading", { level: 2 });
          assert.equal(await heading.innerText(), chapterTitles[index - 1]);
          assert.equal(await heading.isVisible(), true);
          const box = await heading.boundingBox();
          assert.ok(box && box.y >= 64 && box.y + box.height < 784, "Chapter heading obscured by fixed header/contact bar");
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        }
        if (mode === "reduce") {
          const motion = await page.locator('[data-artwork], [data-story-chapter] > div').evaluateAll(elements => elements.map(el => {
            const style = getComputedStyle(el);
            return { animation: style.animationName, transitions: style.transitionDuration.split(",").map(parseFloat) };
          }));
          assert.ok(motion.length > 5 && motion.every(item => item.animation === "none" && item.transitions.every(duration => duration <= .001)), `Hero reduced-motion styles unexpected: ${JSON.stringify(motion)}`);
          const carousel = page.locator("#projetos");
          await carousel.scrollIntoViewIfNeeded();
          const stage = carousel.getByRole("group", { name: "Use as setas para navegar pelos projetos", exact: true });
          await page.waitForFunction(() => {
            const stage = document.querySelector('#projetos [tabindex="0"][role="group"]');
            const key = stage && Object.keys(stage).find(key => key.startsWith("__reactProps$"));
            return key && typeof stage[key]?.onKeyDown === "function";
          }, undefined, { timeout: 20000 });
          const caption = carousel.locator('[aria-live="polite"]');
          assert.equal(await caption.getAttribute("aria-atomic"), "true");
          const originalTitle = await caption.locator("h3").innerText();
          await stage.focus();
          await page.keyboard.press("ArrowRight");
          await page.waitForFunction(title => document.querySelector('#projetos [aria-live="polite"] h3')?.textContent !== title, originalTitle);
          assert.equal(await stage.evaluate(el => el === document.activeElement), true);
          await page.keyboard.press("Home");
          assert.equal(await caption.locator("h3").innerText(), originalTitle);
          await page.keyboard.press("End");
          assert.notEqual(await caption.locator("h3").innerText(), originalTitle);
          await page.keyboard.press("ArrowLeft");
          assert.equal(await caption.locator("h3").innerText(), originalTitle);
          const next = carousel.getByRole("button", { name: "Próximo projeto", exact: true });
          await next.focus();
          await page.keyboard.press("Space");
          assert.notEqual(await caption.locator("h3").innerText(), originalTitle);
          assert.equal(await next.evaluate(el => el === document.activeElement), true);
          assert.equal(await carousel.locator('[data-active="true"]').count(), 1);
          const image = carousel.locator('[data-active="true"] img');
          // The slide's link intentionally overlays its image. Hover the real
          // interaction target instead of forcing a pointer through that link.
          await carousel.locator('[data-active="true"]').hover();
          const style = await image.evaluate(el => ({ transform: getComputedStyle(el).transform, transition: getComputedStyle(el).transitionDuration }));
          assert.equal(style.transform, "none", "Reduced-motion hover still zooms");
          assert.ok(parseFloat(style.transition) <= .001, "Reduced-motion hover transition exceeds global 0.01ms override");
        } else {
          const link = page.getByRole("link", { name: "Explorar todos os projetos", exact: false });
          await link.scrollIntoViewIfNeeded();
          await link.click();
          await page.waitForURL(`${origin}/projetos`, { timeout: 20000 });
          assert.equal(await page.getByRole("heading", { level: 1 }).count(), 1);
        }
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        assert.deepEqual(errors, []);
        assert.deepEqual(legacyRequests, []);
        console.log(JSON.stringify({ width, mode, readableServiceChapters: 6, legacyFrameRequests: 0, runtimeErrors: 0, overflow: false,
          carouselKeyboardAndReducedHover: mode === "reduce", noJsPortfolioNavigation: mode === "no-js", scope: "Emulated Chromium; not physical device or screen-reader proof" }));
      } finally { await context.close(); }
    }
  }
} finally { await browser.close(); }
