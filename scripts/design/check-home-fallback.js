async page => {
  const results = [];
  for (const width of [1366, 390, 320]) {
    const context = await page.context().browser().newContext({ javaScriptEnabled: false, viewport: { width, height: width === 1366 ? 768 : 844 } });
    try {
      const p = await context.newPage();
      await p.goto("http://127.0.0.1:3001/", { waitUntil: "load" });
      for (let index = 1; index <= 6; index++) {
        const heading = p.locator(`[data-story-chapter="${index}"] h2`);
        await heading.scrollIntoViewIfNeeded();
        if (!await heading.isVisible()) throw new Error(`No-JS chapter ${index} hidden`);
      }
      const overflow = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      if (overflow) throw new Error("No-JS horizontal overflow");
      await p.getByRole("link", { name: "Explorar todos os projetos" }).click();
      await p.waitForURL("**/projetos");
      results.push({ width, sixReadableChapters: true, portfolioLink: true });
    } finally { await context.close(); }
  }
  return { results };
}
