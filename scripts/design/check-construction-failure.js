async page => {
  const context = await page.context().browser().newContext({ viewport: { width: 390, height: 844 } });
  try {
    const p = await context.newPage();
    await p.route("**/images/story/**", route => route.fulfill({ status: 404, body: "" }));
    await p.goto("http://127.0.0.1:3001/", { waitUntil: "load" });
    for (let index = 1; index <= 6; index++) {
      const heading = p.locator(`[data-story-chapter="${index}"] h2`);
      await heading.scrollIntoViewIfNeeded();
      if (!await heading.isVisible()) throw new Error("Failed artwork hid service content");
    }
    await p.getByRole("link", { name: "Conheça quem conduz sua obra" }).click();
    return { failureFallback: "all six services and founder navigation remain usable" };
  } finally { await context.close(); }
}
