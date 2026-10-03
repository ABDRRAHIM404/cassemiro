async page => {
  const stages = ["Fundações", "Estruturas", "Alvenaria", "Instalações", "Acabamentos", "Construção Completa"];
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("http://127.0.0.1:3001/", { waitUntil: "domcontentloaded" });
  await page.locator(".hero-sequence--ready").waitFor();
  await page.mouse.move(600, 400);
  const results = [];
  for (let index = 0; index < stages.length; index++) {
    await page.mouse.wheel(0, 5000);
    await page.waitForFunction(title => document.querySelector('.hero-service[aria-hidden="false"] h2')?.textContent === title, stages[index]);
    await page.waitForTimeout(1200);
  }
  for (let index = 4; index >= 0; index--) {
    await page.mouse.wheel(0, -5000);
    await page.waitForFunction(index => document.querySelector(".hero")?.dataset.snapTarget === String(index), index);
    await page.mouse.wheel(0, -5000);
    const target = await page.locator(".hero").getAttribute("data-snap-target");
    if (target !== String(index)) throw new Error(`Reverse burst skipped stage ${index}`);
    await page.waitForFunction(title => document.querySelector('.hero-service[aria-hidden="false"] h2')?.textContent === title, stages[index]);
    await page.waitForTimeout(1200);
    results.push({ stage: stages[index], reverseBurstDidNotSkip: true });
  }
  await page.mouse.wheel(0, -5000);
  await page.waitForFunction(() => document.querySelector(".hero")?.dataset.snapTarget === "intro");
  await page.waitForFunction(() => document.querySelector(".hero")?.dataset.sequencePhase === "intro");
  results.push({ introRecovered: true });
  return { results };
}
