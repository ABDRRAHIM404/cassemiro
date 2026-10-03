async page => {
  const origin = new URL(page.url()).origin;
  const response = await page.request.get(`${origin}/sitemap.xml`);
  if (!response.ok()) throw new Error(`Sitemap returned ${response.status()}`);
  const sitemap = await response.text();
  const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]);
  if (!urls.length) throw new Error("Sitemap contains no public routes");
  const results = [];
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  for (const width of [1366, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 768 });
    for (const url of urls) {
      const pathname = new URL(url).pathname;
      const navigation = await page.goto(`${origin}${pathname}`, { waitUntil: "domcontentloaded" });
      const name = pathname === "/" ? "home" : pathname.slice(1).replaceAll("/", "--");
      await page.screenshot({ path: `.codex/audits/redesign/baseline/${width}-${name}.png`, fullPage: pathname !== "/" });
      results.push({
        width,
        pathname,
        status: navigation?.status(),
        title: await page.title(),
        ...await page.evaluate(() => ({
          overflow: document.documentElement.scrollWidth > innerWidth,
          canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href"),
          heading: document.querySelector("h1")?.textContent,
        })),
      });
      if (pathname === "/") {
        for (const selector of ["#sobre", 'section[aria-labelledby="why-title"]', "#projetos", ".testimonials", "#contato", ".footer"]) {
          const section = page.locator(selector);
          if (!await section.count()) continue;
          await section.scrollIntoViewIfNeeded();
          await section.screenshot({ path: `.codex/audits/redesign/baseline/${width}-home-${selector.replace(/[^a-z]/g, "")}.png` });
        }
      }
    }
  }
  return { origin, routes: urls.length, results, errors };
}
