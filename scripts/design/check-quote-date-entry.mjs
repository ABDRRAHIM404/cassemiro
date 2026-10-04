// Local-only form test: intercept every write; no quote reaches the backend.
import assert from "node:assert/strict";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE);
const browser = await chromium.launch({ executablePath: "/home/bng/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome", headless: true });
try {
  for (const width of [390, 1366]) {
    const context = await browser.newContext({ viewport: { width, height: 844 } });
    let submitted = null;
    await context.route("**/*", async route => {
      if (route.request().method() === "GET") return route.continue();
      if (new URL(route.request().url()).pathname === "/api/quotes") {
        submitted = route.request().postDataJSON();
        return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
      }
      return route.abort();
    });
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.name));
    const response = await page.goto("http://127.0.0.1:3006/contato", { waitUntil: "domcontentloaded", timeout: 120000 });
    assert.equal(response.status(), 200);
    const text = page.locator("#desiredStart");
    await text.focus();
    await text.pressSequentially("05112026", { delay: 35 });
    assert.equal(await text.inputValue(), "05/11/2026");
    await text.press("Backspace");
    assert.equal(await text.inputValue(), "05/11/202");
    await text.press("6");
    assert.equal(await text.inputValue(), "05/11/2026");
    await text.fill("05112026");
    assert.equal(await text.inputValue(), "05/11/2026");
    // Mid-string editing keeps the caret near the edited day, not at the end.
    await text.evaluate(input => input.setSelectionRange(1, 2));
    await text.press("6");
    assert.equal(await text.inputValue(), "06/11/2026");
    assert.equal(await text.evaluate(input => input.selectionStart), 2);
    const calendar = page.getByLabel("Escolher data no calendário", { exact: true });
    assert.equal(await calendar.getAttribute("type"), "date");
    assert.equal(await calendar.inputValue(), "2026-11-06");
    await calendar.focus();
    assert.equal(await calendar.evaluate(input => document.activeElement === input), true);
    await calendar.fill("2028-02-29");
    assert.equal(await text.inputValue(), "29/02/2028");
    await calendar.fill("");
    assert.equal(await text.inputValue(), "");
    await page.locator("#name").fill("Teste local");
    await page.locator("#phone").fill("15999999999");
    await page.locator("#city").fill("Sorocaba");
    await page.locator("#workType").selectOption({ label: "Reforma" });
    await page.locator("#description").fill("Teste interceptado da entrada de data.");
    await text.fill("31022026");
    await page.getByRole("button", { name: "Enviar solicitação" }).click();
    await page.locator("#desiredStart-error").waitFor();
    assert.equal(submitted, null);
    assert.equal(await text.getAttribute("aria-invalid"), "true");
    await text.fill("05112026");
    await text.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `/tmp/cassemiro-quote-date-${width}.png` });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.getByRole("button", { name: "Enviar solicitação" }).click();
    await page.getByText("Solicitação recebida", { exact: true }).waitFor();
    assert.equal(submitted.desiredStart, "2026-11-05");
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ width, passed: true, typedDate: "05/11/2026", outgoingDate: submitted.desiredStart, backendWrites: 0 }));
    await context.close();
  }
} finally { await browser.close(); }
