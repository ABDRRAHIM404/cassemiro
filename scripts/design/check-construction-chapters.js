async page => {
  const results = [];
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  for (const width of [1366, 390, 320]) {
    const context = await page.context().browser().newContext({ viewport: { width, height: width === 1366 ? 768 : 844 }, hasTouch: width < 700 });
    try {
      const p = await context.newPage();
      p.on("pageerror", error => errors.push(error.message));
      const images = new Set();
      p.on("request", request => { if (request.url().includes("/media/hero/")) images.add(new URL(request.url()).pathname); });
      await p.goto("http://127.0.0.1:3001/", { waitUntil: "load" });
      await p.locator("#construction-panel-0 img").evaluate(image => image.decode());
      await p.evaluate(() => document.fonts.ready);
      const initialImages = [...images];
      if (initialImages.length !== 1) throw new Error("Hidden chapters downloaded upfront: " + JSON.stringify(initialImages));
      const details = await p.evaluate(() => ({
        height: Math.round(document.querySelector("[data-construction-story]").getBoundingClientRect().height),
        overflow: document.documentElement.scrollWidth > innerWidth,
        canvas: document.querySelectorAll("canvas").length,
        ctaBottom: document.querySelector('[data-construction-story] a[href="#contato"]').getBoundingClientRect().bottom,
      }));
      if (details.overflow || details.canvas || details.height > 1100 || details.ctaBottom > (width === 1366 ? 768 : 844)) throw new Error(JSON.stringify(details));
      await p.screenshot({ path: `.codex/audits/redesign/current/${width}-construction-chapters.png` });
      await p.getByRole("link", { name: "Conheça nossos serviços", exact: true }).click();
      const caption = await p.locator("#construction-panel-0 h2").boundingBox();
      if (!caption || caption.y < 65 || caption.y + caption.height > (width === 1366 ? 768 : 844)) throw new Error("Services link scrolled the matching photograph out of view");
      await p.evaluate(() => window.scrollTo(0, 0));
      const seen = [];
      for (let index = 0; index < 6; index++) {
        await p.locator(`label[for="construction-chapter-${index}"]`).click();
        await p.locator(`#construction-panel-${index} img`).evaluate(image => image.decode());
        const title = await p.locator(`#construction-panel-${index} h2`).innerText();
        const checked = await p.locator(`#construction-chapter-${index}`).isChecked();
        if (!checked || await p.locator('[id^="construction-panel-"]:visible').count() !== 1) throw new Error("Chapter selection failed");
        seen.push(title);
      }
      if (images.size !== 6 || [...images].some(path => width < 700 ? !path.includes("frames-mobile-webp") : path.includes("frames-mobile-webp"))) throw new Error("Responsive image budget failed: " + JSON.stringify([...images]));
      await p.getByRole("button", { name: "Próxima etapa", exact: true }).click();
      if (!await p.locator("#construction-chapter-0").isChecked()) throw new Error("Next arrow wrap failed");
      await p.getByRole("button", { name: "Etapa anterior", exact: true }).click();
      if (!await p.locator("#construction-chapter-5").isChecked()) throw new Error("Previous arrow failed");
      await p.locator("#construction-chapter-5").focus();
      await p.keyboard.press("Home");
      await p.keyboard.press("ArrowRight");
      if (!await p.locator("#construction-chapter-1").isChecked()) throw new Error("Keyboard navigation failed");
      await p.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
      const box = await p.locator("#construction-panel-1").boundingBox();
      const x = box.x + box.width * .8, y = box.y + box.height * .72;
      if (width < 700) {
        const cdp = await context.newCDPSession(p);
        await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
        for (let step = 1; step <= 8; step++) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x - step * 12, y }] });
        await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        await cdp.detach();
      } else {
        await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.move(x - 140, y, { steps: 8 }); await p.mouse.up();
      }
      if (!await p.locator("#construction-chapter-2").isChecked()) throw new Error("Drag/swipe did not advance exactly one chapter");
      if (width < 700) {
        const cdp = await context.newCDPSession(p);
        await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
        for (let step = 1; step <= 10; step++) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: y - step * 18 }] });
        await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        await cdp.detach();
        await p.waitForFunction(() => scrollY > 50, null, { timeout: 5000 }).catch(async () => {
          throw new Error("Vertical touch failed at width " + width + ": " + JSON.stringify(await p.evaluate(() => ({ y: scrollY, hash: location.hash, active: document.querySelector('input[name="construction-chapter"]:checked')?.id }))));
        });
        if (!await p.locator("#construction-chapter-2").isChecked()) throw new Error("Vertical touch scrolling changed the service");
      }
      // Test the actual input for each device. A mouse wheel during simulated
      // touch inertia is not a phone interaction and can cancel the touch fling.
      if (width === 1366) {
        await p.evaluate(() => window.scrollTo(0, 0));
        await p.mouse.move(x, y);
        await p.mouse.wheel(0, 1000);
        await p.waitForFunction(() => scrollY > document.querySelector("[data-construction-story]").offsetHeight / 2, null, { timeout: 5000 }).catch(async () => {
          throw new Error("Wheel scroll failed: " + JSON.stringify(await p.evaluate(() => ({ y: scrollY, hash: location.hash }))));
        });
      }
      await p.emulateMedia({ reducedMotion: "reduce" });
      const animation = await p.locator("#construction-panel-2").evaluate(element => getComputedStyle(element, "::before").animationName);
      if (animation !== "none") throw new Error("Reduced motion animated the curtain");
      results.push({ width, ...details, initialImages, chapterImages: images.size, seen, arrows: true, keyboard: true, swipe: true, nativeScroll: true, reducedMotion: true });
    } finally { await context.close(); }
  }
  if (errors.length) throw new Error(JSON.stringify(errors));
  return { results, errors };
}
