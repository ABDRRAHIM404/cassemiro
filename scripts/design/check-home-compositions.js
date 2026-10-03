async page => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const results = [];
  for (const width of [1366, 390, 320]) {
    await page.setViewportSize({ width, height: width === 1366 ? 768 : 844 });
    await page.goto("http://127.0.0.1:3001/", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => document.fonts.ready);
    for (const id of ["sobre", "porque", "projetos"]) {
      const section = page.locator(`#${id}`);
      await section.evaluate(element => {
        document.activeElement?.blur?.();
        window.scrollTo(0, element.getBoundingClientRect().top + scrollY - (innerWidth <= 1000 ? 64 : 72));
      });
      await section.locator("img").evaluateAll(images => Promise.all(images.map(image => image.decode().catch(() => {}))));
      await page.waitForFunction(id => [...document.querySelectorAll(`#${id} .reveal`)].every(element => +getComputedStyle(element).opacity >= .99), id);
      await page.screenshot({ path: `.codex/audits/redesign/current/${width}-${id}-viewport.png` });
      await section.screenshot({ path: `.codex/audits/redesign/current/${width}-${id}-rebuilt.png` });
      results.push({ width, section: id, ...await section.evaluate(element => ({
        height: Math.round(element.getBoundingClientRect().height),
        overflow: document.documentElement.scrollWidth > innerWidth,
        images: [...element.querySelectorAll("img")].map(image => ({ loaded: image.complete && image.naturalWidth > 0, alt: image.alt })),
      })) });
    }
    const trust = page.locator("#porque");
    const commitments = trust.getByRole("group", { name: "Compromissos CASSEMIRO" });
    await commitments.getByRole("button", { name: /^Prazos/ }).click();
    if (await commitments.locator('[aria-pressed="true"]').innerText().then(text => !text.includes("Prazos"))) throw new Error("Trust click failed");
    await commitments.locator('[aria-pressed="true"]').press("ArrowRight");
    if (await commitments.locator('[aria-pressed="true"]').innerText().then(text => !text.includes("Experiência"))) throw new Error("Trust keyboard failed");
    const catalogue = page.locator("#projetos");
    await catalogue.scrollIntoViewIfNeeded();
    const heading = () => catalogue.locator("h3").innerText();
    const first = await heading();
    await catalogue.getByRole("button", { name: "Próximo projeto", exact: true }).click();
    await page.waitForFunction(title => document.querySelector("#projetos h3")?.textContent !== title, first);
    const second = await heading();
    await catalogue.getByRole("button", { name: "Projeto anterior", exact: true }).click();
    await page.waitForFunction(title => document.querySelector("#projetos h3")?.textContent === title, first);
    const stage = catalogue.locator('[role="group"][tabindex="0"]');
    await stage.focus();
    await stage.press("ArrowRight");
    await page.waitForFunction(title => document.querySelector("#projetos h3")?.textContent === title, second);
    const bounds = await stage.boundingBox();
    if (!bounds) throw new Error("Catalogue stage missing");
    await page.mouse.move(bounds.x + bounds.width * .55, bounds.y + bounds.height * .5);
    await page.mouse.down();
    await page.mouse.move(bounds.x + bounds.width * .25, bounds.y + bounds.height * .5, { steps: 12 });
    await page.mouse.up();
    await page.waitForFunction(title => document.querySelector("#projetos h3")?.textContent === title, first);
    if (new URL(page.url()).pathname !== "/") throw new Error("Dragging navigated away");
    let touchSwipe = false;
    if (width !== 1366) {
      const session = await page.context().newCDPSession(page);
      await session.send("Emulation.setTouchEmulationEnabled", { enabled: true });
      const y = bounds.y + bounds.height * .5;
      await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: bounds.x + bounds.width * .7, y }] });
      for (let step = 1; step <= 8; step++) await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: bounds.x + bounds.width * (.7 - step * .05), y }] });
      await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await page.waitForFunction(title => document.querySelector("#projetos h3")?.textContent === title, second);
      await session.send("Emulation.setTouchEmulationEnabled", { enabled: false });
      await session.detach();
      touchSwipe = true;
    }
    const selected = await heading();
    const imageLink = catalogue.getByRole("link", { name: `Ver projeto ${selected}`, exact: true });
    const detailPath = await imageLink.getAttribute("href");
    await imageLink.focus();
    await imageLink.press("Enter");
    await page.waitForURL(url => url.pathname === detailPath);
    results.push({ width, carousel: { arrows: true, keyboard: true, mouseDrag: true, touchSwipe, keyboardLinkAfterDrag: true, distinctTitles: first !== second }, trust: { click: true, keyboard: true } });
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("http://127.0.0.1:3001/", { waitUntil: "domcontentloaded" });
  results.push({ reducedMotion: await page.locator("#porque").evaluate(element => ({ height: Math.round(element.getBoundingClientRect().height), overflow: document.documentElement.scrollWidth > innerWidth })) });
  return { results, pageErrors: errors };
}
