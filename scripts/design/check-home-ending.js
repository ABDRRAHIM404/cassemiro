async page => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const results = [];
  for (const width of [1366, 390, 320]) {
    await page.setViewportSize({ width, height: width === 1366 ? 768 : 844 });
    const response = await page.goto("http://127.0.0.1:3001/", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => document.fonts.ready);
    for (const selector of ["#depoimentos", "#contato", "footer:has(nav[aria-label='Navegação do rodapé'])"]) {
      const section = page.locator(selector);
      if (!await section.count()) continue;
      const name = selector.startsWith("footer") ? "footer" : selector.slice(1);
      await section.evaluate(element => {
        document.activeElement?.blur?.();
        window.scrollTo(0, element.getBoundingClientRect().top + scrollY - (innerWidth <= 1000 ? 64 : 72));
      });
      await page.waitForFunction(selector => [...document.querySelectorAll(`${selector} .reveal`)].every(element => +getComputedStyle(element).opacity >= .99), selector);
      await page.screenshot({ path: `.codex/audits/redesign/current/${width}-${name}-viewport.png` });
      results.push({ width, section: name, status: response?.status(), ...await section.evaluate(element => ({
        height: Math.round(element.getBoundingClientRect().height),
        overflow: document.documentElement.scrollWidth > innerWidth,
        text: element.innerText,
        links: [...element.querySelectorAll("a")].map(link => ({ text: link.textContent, href: link.getAttribute("href") })),
      })) });
    }
    const mobileBar = page.getByRole("navigation", { name: "Contato rápido" });
    results.push({ width, mobileContact: await mobileBar.isVisible(), touchTargets: await mobileBar.locator("a").evaluateAll(links => links.map(link => ({ text: link.textContent, height: Math.round(link.getBoundingClientRect().height) }))) });
  }
  return { results, pageErrors: errors };
}
