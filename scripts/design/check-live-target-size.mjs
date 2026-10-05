// Read-only WCAG 2.2 target-size scan. No authenticated state or backend writes.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

assert.ok(process.env.PLAYWRIGHT_MODULE, "Use an existing Playwright installation");
assert.ok(process.env.AXE_SOURCE, "Use an existing axe-core installation");
const axeSource = await readFile(process.env.AXE_SOURCE, "utf8");
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE);
const browser = await chromium.launch({
  executablePath: "/home/bng/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome",
  headless: true,
  args: ["--disable-http2", "--disable-quic"],
  proxy: { server: process.env.HTTPS_PROXY || process.env.HTTP_PROXY || "http://192.168.1.187:8080" },
});
try {
  for (const width of [360, 1366]) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, reducedMotion: "reduce" });
    let blockedRequests = 0, quoteAttempts = 0;
    await context.route("**/*", route => {
      if (route.request().method() === "GET") return route.continue();
      blockedRequests++;
      if (new URL(route.request().url()).pathname === "/api/quotes") quoteAttempts++;
      return route.abort();
    });
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.name));
    const scan = async (path, state) => {
      const result = await page.evaluate(async () => {
        const result = await globalThis.axe.run(document, { runOnly: { type: "tag", values: ["wcag22aa"] } });
        return {
          version: globalThis.axe.version,
          violations: result.violations.map(rule => ({ id: rule.id, targets: rule.nodes.map(node => node.target) })),
          incomplete: result.incomplete.map(rule => ({ id: rule.id, count: rule.nodes.length })),
          evaluatedTargets: result.passes.find(rule => rule.id === "target-size")?.nodes.length ?? 0,
        };
      });
      console.log(JSON.stringify({ width, path, state, ...result }));
      assert.deepEqual(result.violations, []);
      assert.deepEqual(result.incomplete, [], "An inconclusive check is not a pass");
      assert.ok(result.evaluatedTargets > 0, "Target-size rule must actually evaluate controls");
    };
    try {
      for (const path of ["/", "/contato", "/servicos", "/admin/login"]) {
        assert.equal((await page.goto(`https://cassemiro-one.vercel.app${path}`, { waitUntil: "load", timeout: 45000 })).status(), 200);
        await page.evaluate(axeSource);
        await scan(path, "default");
        if (path === "/" && width === 360) {
          await page.getByRole("button", { name: "Abrir menu", exact: true }).click();
          await page.waitForFunction(() => document.querySelector('[aria-controls="primary-navigation"]')?.getAttribute("aria-expanded") === "true");
          await scan(path, "menu-open");
          await page.keyboard.press("Escape");
          await page.waitForFunction(() => document.querySelector('[aria-controls="primary-navigation"]')?.getAttribute("aria-expanded") === "false");
        }
        if (path === "/contato") {
          await page.waitForFunction(() => {
            const form = document.querySelector("form");
            const key = form && Object.keys(form).find(key => key.startsWith("__reactProps$"));
            return key && typeof form[key]?.onSubmit === "function";
          });
          await page.getByRole("button", { name: "Enviar solicitação", exact: true }).click();
          await page.locator("#name-error").waitFor();
          assert.equal(await page.locator("#name").evaluate(element => element === document.activeElement), true);
          for (const field of ["name", "phone", "city", "workType", "description"]) {
            const input = page.locator(`#${field}`);
            assert.equal(await input.getAttribute("aria-invalid"), "true");
            assert.equal(await input.getAttribute("aria-describedby"), `${field}-error`);
            assert.ok((await page.locator(`#${field}-error`).innerText()).trim());
          }
          await scan(path, "empty-form-errors");
          assert.equal(quoteAttempts, 0, "Invalid submission must not attempt a quote request");
        }
      }
      assert.deepEqual(errors, []);
      console.log(JSON.stringify({ width, passed: true, blockedRequests, quoteAttempts, runtimeErrors: errors,
        scope: "axe WCAG 2.2 AA target-size only; not full WCAG, physical touch or authenticated admin certification" }));
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
