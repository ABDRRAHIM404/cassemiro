async page => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("http://127.0.0.1:3001/", { waitUntil: "domcontentloaded" });
  const metrics = await page.locator("#porque").evaluate(section => {
    const stage = section.firstElementChild;
    const height = section.getBoundingClientRect().height;
    return { start: scrollY + section.getBoundingClientRect().top - 72, height,
      travel: height - (innerHeight - 72), stageHeight: stage.getBoundingClientRect().height };
  });
  if (metrics.travel / 4 < 600) throw new Error("Pillars still advance too quickly: " + JSON.stringify(metrics));
  const seen = [];
  for (let index = 0; index < 4; index++) {
    const position = metrics.start + (index + .2) * metrics.travel / 4;
    await page.evaluate(y => window.scrollTo({ top: y, behavior: "instant" }), position);
    await page.waitForFunction(i => document.querySelectorAll('#porque button[aria-pressed="true"]')[0]?.textContent.includes(["Qualidade", "Prazos", "Experiência", "Confiança"][i]), index);
    const title = await page.locator('#porque button[aria-pressed="true"]').innerText();
    await page.mouse.move(1100, 350);
    await page.mouse.wheel(0, 240);
    await page.waitForTimeout(400);
    if (await page.locator('#porque button[aria-pressed="true"]').innerText() !== title) throw new Error("Small scroll skipped the reading hold");
    const stageTop = await page.locator('#porque > div').evaluate(element => element.getBoundingClientRect().top);
    if (Math.abs(stageTop - 72) > 2) throw new Error("Trust composition did not remain pinned");
    seen.push(title);
  }
  await page.locator('#porque button').filter({ hasText: "Qualidade" }).click();
  if (!(await page.locator('#porque button[aria-pressed="true"]').innerText()).includes("Qualidade")) throw new Error("Manual selection broke");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForFunction(() => getComputedStyle(document.querySelector('#porque > div')).position === "relative");
  const reduced = await page.locator("#porque").evaluate(element => element.getBoundingClientRect().height);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 390, height: 844 });
  // Verify a phone page load, not transient desktop layout cached during resize.
  await page.goto("http://127.0.0.1:3001/", { waitUntil: "domcontentloaded" });
  const mobile = await page.locator("#porque").evaluate(element => ({ height: element.getBoundingClientRect().height,
    overflow: document.documentElement.scrollWidth > innerWidth }));
  if (reduced > 1500 || mobile.height > 1500 || mobile.overflow) throw new Error("Static/mobile experience was lengthened: " + JSON.stringify({ reduced, mobile }));
  return { metrics, pixelsPerPillar: metrics.travel / 4, seen, smallScrollHold: true, manualSelection: true, reducedHeight: reduced, mobile };
}
