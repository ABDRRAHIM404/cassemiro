async page => {
  const context = await page.context().browser().newContext({ viewport: { width: 1366, height: 768 } });
  try {
    const p = await context.newPage();
    await p.goto("http://127.0.0.1:3001/", { waitUntil: "load" });
    await p.evaluate(() => {
      const root = document.querySelector("[data-phase]");
      const bounds = root.getBoundingClientRect();
      scrollTo(0, scrollY + bounds.top + (bounds.height - innerHeight) * 0.25);
    });
    await p.waitForTimeout(250);
    const blend = await p.evaluate(() => Object.fromEntries(
      ["foundation", "structure"].map(name => [name, Number(getComputedStyle(document.querySelector(`[data-artwork="${name}"]`)).opacity)])
    ));
    if (Object.values(blend).some(opacity => opacity < 0.35 || opacity > 0.65)) {
      throw new Error(`Expected continuous midpoint crossfade: ${JSON.stringify(blend)}`);
    }
    await p.locator('[data-story-chapter="6"]').scrollIntoViewIfNeeded();
    await p.setViewportSize({ width: 390, height: 844 });
    await p.waitForTimeout(300);
    await p.locator('[data-story-chapter="2"]').scrollIntoViewIfNeeded();
    const resized = await p.evaluate(() => {
      const model = document.querySelector('[data-artwork="structure"]').getBoundingClientRect();
      return { viewport: innerWidth, pageWidth: document.documentElement.scrollWidth, left: model.left, right: model.right };
    });
    if (resized.pageWidth > resized.viewport || resized.left < -2 || resized.right > resized.viewport + 2) {
      throw new Error(`Artwork overflow after desktop-to-phone resize: ${JSON.stringify(resized)}`);
    }
    return { continuousCrossfade: blend, desktopToPhoneResize: resized };
  } finally { await context.close(); }
}
