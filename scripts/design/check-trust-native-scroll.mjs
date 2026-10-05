// Live GET-only trust verification; no local build, saved quote or CMS mutation.
import assert from "node:assert/strict";
assert.equal(process.env.AUDIT_NATIVE_TRUST_SCROLL, "yes");
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE);
const browser = await chromium.launch({
  executablePath: "/home/bng/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome",
  headless: true, args: ["--disable-http2", "--disable-quic"],
  proxy: { server: process.env.HTTPS_PROXY || process.env.HTTP_PROXY || "http://192.168.1.187:8080" }
});
try {
  for (const [width, height, reducedMotion] of [[1366, 768, "no-preference"], [390, 844, "no-preference"], [360, 640, "no-preference"], [390, 844, "reduce"]]) {
    const context = await browser.newContext({ viewport: { width, height }, isMobile: width < 761, hasTouch: width < 761, reducedMotion });
    let writes = 0; const errors = [];
    await context.route("**/*", route => { if (route.request().method() === "GET") return route.continue(); writes++; return route.abort(); });
    const page = await context.newPage(); page.on("pageerror", error => errors.push(error.name));
    try {
      const response = await page.goto("https://cassemiro-one.vercel.app/", { waitUntil: "domcontentloaded" });
      assert.equal(response.status(), 200);
      const section = page.locator("#porque");
      await section.scrollIntoViewIfNeeded();
      await page.waitForFunction(() => {
        const image = document.querySelector("#porque img");
        return image?.complete && image.naturalWidth > 0;
      });
      const group = section.getByRole("list", { name: "Compromissos CASSEMIRO" });
      assert.equal(await group.getByRole("listitem").count(), 4);
      assert.equal(await section.getByRole("button").count(), 0);
      for (const title of ["Qualidade", "Prazos", "Experiência", "Confiança"]) {
        assert.equal(await section.getByRole("heading", { name: title, exact: true }).count(), 1);
        assert.ok(await section.getByRole("heading", { name: title, exact: true }).isVisible());
      }
      assert.ok(await group.getByText("Cuidado técnico, inclusive no que não se vê.", { exact: true }).isVisible());
      assert.ok(await group.getByText("Planejamento claro em cada etapa da obra.", { exact: true }).isVisible());
      assert.ok(await group.getByText("Mais de quatro décadas orientando cada decisão.", { exact: true }).isVisible());
      assert.ok(await group.getByText("Presença e responsabilidade do início ao fim.", { exact: true }).isVisible());
      await section.screenshot({ path: `/tmp/cassemiro-trust-${width}-${reducedMotion}.png` });
      const initial = await section.evaluate(element => {
        window.scrollTo({ top: window.scrollY + element.getBoundingClientRect().top - 88, behavior: "instant" });
        return { height: element.getBoundingClientRect().height, position: getComputedStyle(element.firstElementChild).position };
      });
      assert.equal(initial.position, "relative"); assert.ok(initial.height <= 800, "No artificial multi-viewport runway");
      const before = await page.evaluate(() => ({ y: scrollY, top: document.querySelector("#porque").getBoundingClientRect().top }));
      if (width >= 761) {
        await page.mouse.move(width / 2, height / 2);
        await page.mouse.wheel(0, initial.height + 120);
      } else {
        const session = await context.newCDPSession(page);
        await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: width - 32, y: height - 140 }] });
        for (let step = 1; step <= 6; step++) {
          await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: width - 32, y: height - 140 - step * (height - 190) / 6 }] });
        }
        await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        await session.detach();
      }
      await page.waitForFunction(start => scrollY > start + 150, before.y);
      const after = await section.evaluate(element => ({ y: scrollY, top: element.getBoundingClientRect().top }));
      assert.ok(Math.abs((after.y - before.y) - (before.top - after.top)) < 3, "Section must move naturally with the page");
      assert.ok(after.top < -100, "One native gesture should move freely through the section");
      await page.locator("#projetos").scrollIntoViewIfNeeded();
      assert.ok(await page.locator("#projetos").isVisible());
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.deepEqual(errors, []); assert.equal(writes, 0);
      console.log(JSON.stringify({ trustNativeScroll: { width, height, reducedMotion, sectionHeight: initial.height, gesture: width >= 761 ? "wheel" : "touch", fourPillarsAccessible: true, normalFlow: true, nextSectionReachable: true, runtimeErrors: 0, writes: 0 } }));
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
