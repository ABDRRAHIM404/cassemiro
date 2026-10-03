async page => {
  const results = [];
  for (const width of [1366, 390, 320]) {
    const context = await page.context().browser().newContext({
      javaScriptEnabled: false,
      viewport: { width, height: width === 1366 ? 768 : 844 },
    });
    try {
      const p = await context.newPage();
      await p.goto("http://127.0.0.1:3001/", { waitUntil: "load" });
      const stages = p.locator("#etapas-estaticas");
      if (!await stages.isVisible()) throw new Error("No-JS services are hidden");
      const details = await p.evaluate(() => ({
        heroHeight: Math.round(document.querySelector(".hero").getBoundingClientRect().height),
        stageCount: document.querySelectorAll("#etapas-estaticas h2").length,
        overflow: document.documentElement.scrollWidth > innerWidth,
      }));
      if (details.heroHeight > 2.5 * (width === 1366 ? 768 : 844) || details.stageCount !== 6 || details.overflow) throw new Error(JSON.stringify(details));
      if (width <= 1000) {
        await p.getByText("Menu", { exact: true }).click();
        await p.getByRole("navigation", { name: "Navegação principal sem JavaScript" }).getByRole("link", { name: "Serviços", exact: true }).click();
        await p.waitForURL("**/servicos");
        await p.goto("http://127.0.0.1:3001/", { waitUntil: "load" });
      }
      await p.getByRole("link", { name: "Conheça nossos serviços" }).click();
      await p.screenshot({ path: `.codex/audits/redesign/current/${width}-nojs-services.png` });
      await p.getByRole("link", { name: "Explorar todos os projetos" }).click();
      await p.waitForURL("**/projetos");
      results.push({ width, ...details, menu: width <= 1000 ? "native navigation works" : "desktop navigation", catalogueFallback: "archive link works" });
    } finally {
      await context.close();
    }
  }
  return { results };
}
