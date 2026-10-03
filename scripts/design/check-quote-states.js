async page => {
  const results = [];
  for (const width of [1366, 390, 320]) {
    await page.setViewportSize({ width, height: width === 1366 ? 768 : 844 });
    await page.goto("http://127.0.0.1:3001/contato", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Enviar solicitação" }).click();
    await page.waitForFunction(() => document.activeElement?.id === "name");
    results.push({ width, state: "invalid", focus: await page.evaluate(() => document.activeElement?.id), invalidFields: await page.locator('[aria-invalid="true"]').count() });
    await page.screenshot({ path: `.codex/audits/redesign/current/${width}-quote-invalid.png`, fullPage: true });
    await page.locator("#name").fill("Teste visual isolado");
    await page.locator("#phone").fill("15999999999");
    await page.locator("#city").fill("Sorocaba");
    await page.locator("#workType").selectOption({ label: "Reforma" });
    await page.locator("#description").fill("Somente teste da interface. Nenhum pedido será enviado ao banco.");
    await page.locator("#desiredStart").fill("31/02/2027");
    await page.getByRole("button", { name: "Enviar solicitação" }).click();
    await page.waitForFunction(() => document.activeElement?.id === "desiredStart");
    results.push({ width, state: "invalid-date", dateErrorVisible: await page.locator("#desiredStart-error").isVisible() });
    await page.locator("#desiredStart").fill("");
    let requests = 0;
    let finishRequest;
    const pending = new Promise(resolve => { finishRequest = resolve; });
    await page.route("**/api/quotes", async route => {
      requests++;
      await pending;
      await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Teste isolado: serviço temporariamente indisponível." }) });
    });
    await page.getByRole("button", { name: "Enviar solicitação" }).click();
    const sending = page.getByRole("button", { name: "Enviando…" });
    await sending.waitFor();
    await page.locator("main form").evaluate(form => form.requestSubmit());
    results.push({ width, state: "pending", disabled: await sending.isDisabled(), busy: await page.locator("main form").getAttribute("aria-busy") });
    await page.screenshot({ path: `.codex/audits/redesign/current/${width}-quote-pending.png`, fullPage: true });
    finishRequest();
    await page.getByText("Teste isolado: serviço temporariamente indisponível.").waitFor();
    results.push({ width, state: "error", interceptedRequests: requests, retryEnabled: await page.getByRole("button", { name: "Enviar solicitação" }).isEnabled() });
    await page.screenshot({ path: `.codex/audits/redesign/current/${width}-quote-error.png`, fullPage: true });
    await page.unroute("**/api/quotes");
    let payload;
    await page.route("**/api/quotes", async route => {
      payload = route.request().postDataJSON();
      await route.fulfill({ status: 201, contentType: "application/json", body: "{}" });
    });
    await page.getByRole("button", { name: "Enviar solicitação" }).click();
    await page.getByRole("status").waitFor();
    results.push({ width, state: "success", whatsapp: await page.getByRole("link", { name: "Continuar no WhatsApp" }).getAttribute("href"), payload, overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth) });
    await page.screenshot({ path: `.codex/audits/redesign/current/${width}-quote-success.png`, fullPage: true });
    await page.unroute("**/api/quotes");
  }
  return { scope: "Browser UI only; all quote POST requests intercepted, no database writes", results };
}
