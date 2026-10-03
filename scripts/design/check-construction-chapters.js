async page => {
  const results = [];
  for (const width of [1366, 390, 320]) {
    const context = await page.context().browser().newContext({ viewport: { width, height: width === 1366 ? 768 : 844 }, hasTouch: width < 700 });
    try {
      const p = await context.newPage();
      const errors = [], requests = new Set();
      p.on("pageerror", error => errors.push(error.message));
      p.on("request", request => { if (/\/images\/story\/|\/media\/hero\//.test(request.url())) requests.add(new URL(request.url()).pathname); });
      await p.goto("http://127.0.0.1:3001/", { waitUntil: "load" });
      await p.evaluate(() => document.fonts.ready);
      const details = await p.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        canvas: document.querySelectorAll("canvas").length,
        ctaBottom: document.querySelector('[data-construction-story] a[href="#contato"]').getBoundingClientRect().bottom,
      }));
      if (details.overflow || details.canvas || details.ctaBottom > (width === 1366 ? 768 : 844) - (width < 700 ? 52 : 0)) throw new Error(JSON.stringify(details));
      await p.screenshot({ path: `.codex/audits/redesign/current/${width}-scroll-story-opening.png` });
      if (width < 700) {
        const cdp = await context.newCDPSession(p);
        await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: width / 2, y: 650 }] });
        for (let step = 1; step <= 10; step++) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: width / 2, y: 650 - step * 24 }] });
        await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        await cdp.detach();
      } else {
        await p.mouse.move(700, 550);
        await p.mouse.wheel(0, 300);
      }
      await p.waitForFunction(() => scrollY > 100);
      await p.waitForTimeout(800);
      const seen = [];
      for (let index = 1; index <= 6; index++) {
        await p.locator(`[data-story-chapter="${index}"]`).evaluate(element => {
          window.scrollTo({ top: scrollY + element.getBoundingClientRect().top - innerHeight * .15, behavior: "instant" });
        });
        await p.waitForFunction(i => document.querySelector('[data-phase]')?.dataset.phase === String(i), index);
        await p.waitForTimeout(1000);
        const heading = p.locator(`[data-story-chapter="${index}"] h2`);
        const box = await heading.boundingBox();
        if (!box || box.y < 65 || box.y + box.height > (width === 1366 ? 768 : 844) - 52) throw new Error(`Chapter ${index} heading out of view: ${JSON.stringify(box)}`);
        seen.push(await heading.innerText());
        const copy = await p.locator(`[data-story-chapter="${index}"] [class*="chapterCopy"]`).boundingBox();
        if (width < 700 && copy.y + copy.height > 744) throw new Error(`Mobile copy overlaps progress/contact bar: ${JSON.stringify(copy)}`);
        await p.screenshot({ path: `.codex/audits/redesign/current/${width}-scroll-story-${index}.png` });
      }
      if ([...requests].some(path => path.includes("/media/hero/")) || requests.size !== 2) throw new Error(JSON.stringify([...requests]));
      if ([...requests].some(path => path.includes("mobile") !== (width < 700))) throw new Error("Wrong responsive artwork");
      await p.locator('[data-story-chapter="1"]').evaluate(element => window.scrollTo({ top: element.getBoundingClientRect().top + scrollY, behavior: "instant" }));
      await p.waitForFunction(() => document.querySelector('[data-phase]')?.dataset.phase === "1");
      await p.emulateMedia({ reducedMotion: "reduce" });
      const animations = await p.locator('[data-construction-story] picture').evaluateAll(elements => elements.map(element => ({ animation: getComputedStyle(element).animationName, transition: getComputedStyle(element).transitionDuration })));
      if (animations.some(item => item.animation !== "none" || parseFloat(item.transition) > .001)) throw new Error(JSON.stringify(animations));
      if (errors.length) throw new Error(JSON.stringify(errors));
      results.push({ width, ...details, seen, requests: [...requests], nativeTouchOrWheel: true, reverseScroll: true, reducedMotion: true });
    } finally { await context.close(); }
  }
  return { results };
}
