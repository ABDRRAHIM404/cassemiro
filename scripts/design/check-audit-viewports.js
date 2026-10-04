async page => {
  const results = [];
  for (const width of [1920, 1440, 1366, 1024, 768, 430, 390, 360]) {
    const context = await page.context().browser().newContext({ viewport: { width, height: width < 800 ? 844 : 900 } });
    try {
      const p = await context.newPage();
      const errors = [];
      p.on("pageerror", error => errors.push(error.message));
      const response = await p.goto("http://127.0.0.1:3001/", { waitUntil: "load" });
      if (response.status() !== 200) throw new Error(`Homepage failed at ${width}`);
      await p.evaluate(() => document.fonts.ready);
      const states = [];
      for (const selector of ["h1", ...Array.from({ length: 6 }, (_, i) => `[data-story-chapter="${i + 1}"] h2`), "#sobre", "#porque", "#projetos", "footer"]) {
        const target = p.locator(selector).first();
        await target.scrollIntoViewIfNeeded();
        await p.waitForTimeout(150);
        if (selector.startsWith("#")) {
          for (const img of await target.locator("img").all()) {
            await img.evaluate(image => image.decode());
          }
          await p.waitForFunction(selector => [...document.querySelectorAll(`${selector} .reveal`)]
            .every(element => Number(getComputedStyle(element).opacity) >= 0.99), selector);
        }
        const state = await target.evaluate(element => {
          const bounds = element.getBoundingClientRect();
          return { pageWidth: document.documentElement.scrollWidth, viewport: innerWidth, left: bounds.left, right: bounds.right };
        });
        if (state.pageWidth > width || state.left < -1 || state.right > width + 1) {
          throw new Error(`Overflow at ${width}, ${selector}: ${JSON.stringify(state)}`);
        }
        states.push(selector);
        if ([768, 430, 1920].includes(width) && ["h1", "#sobre", "#porque", "#projetos"].includes(selector)) {
          await p.screenshot({ path: `.codex/audits/redesign/current/${width}-audit-${selector.replace(/[#]/g, "")}.png` });
        }
      }
      if (errors.length) throw new Error(`Runtime errors at ${width}: ${JSON.stringify(errors)}`);
      results.push({ width, states, horizontalOverflow: false, pageErrors: errors });
    } finally { await context.close(); }
  }
  return { results };
}
