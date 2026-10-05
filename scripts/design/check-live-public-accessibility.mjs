// GET-only production checks. Image-overlay contrast incompletes remain unproven.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

assert.ok(process.env.PLAYWRIGHT_MODULE, "Use an existing Playwright installation");
assert.ok(process.env.AXE_SOURCE, "Use an existing axe-core installation");
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE);
const axeSource = await readFile(process.env.AXE_SOURCE, "utf8");
const browser = await chromium.launch({
  executablePath: "/home/bng/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome",
  headless: true,
  args: ["--disable-http2", "--disable-quic"],
  proxy: { server: process.env.HTTPS_PROXY || process.env.HTTP_PROXY || "http://192.168.1.187:8080" }
});

try {
  for (const width of [390, 1366]) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, reducedMotion: "reduce" });
    const errors = [];
    let nonGetRequests = 0;
    await context.route("**/*", route => {
      if (route.request().method() === "GET") return route.continue();
      nonGetRequests++;
      return route.abort();
    });
    const page = await context.newPage();
    page.on("pageerror", error => errors.push(error.name));
    const scan = async (path, state, contrastSelector = null) => {
      const result = await page.evaluate(async ({ path, contrastSelector }) => {
        // Whole-document contrast cannot resolve offscreen content-visibility
        // chapters against their viewport-sticky image. Test those after scroll.
        const options = contrastSelector ? { runOnly: ["color-contrast"] } : {
          runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] },
          ...(path === "/" ? { rules: { "color-contrast": { enabled: false } } } : {})
        };
        const result = await globalThis.axe.run(contrastSelector ? document.querySelector(contrastSelector) : document, options);
        return {
          version: globalThis.axe.version,
          passes: result.passes.map(rule => rule.id),
          violations: result.violations.map(rule => ({ id: rule.id, targets: rule.nodes.map(node => node.target) })),
          incomplete: result.incomplete.map(rule => ({ id: rule.id, targets: rule.nodes.map(node => node.target) }))
        };
      }, { path, contrastSelector });
      console.log(JSON.stringify({ width, path, state, ...result }));
      assert.ok(result.passes.length + result.incomplete.length + result.violations.length > 0, "Rules must actually evaluate the page");
      assert.deepEqual(result.violations, []);
      // Never call these contrast records passes; the separate rendered-pixel
      // verifier covers selected photographs, not every item below.
      assert.deepEqual(result.incomplete.filter(rule => rule.id !== "color-contrast"), []);
    };
    try {
      for (const path of ["/", "/contato", "/servicos", "/projetos", "/politica-de-privacidade", "/admin/login", "/admin/esqueci-senha", "/admin/redefinir-senha"]) {
        assert.equal((await page.goto(`https://cassemiro-one.vercel.app${path}`, { waitUntil: "networkidle", timeout: 45000 })).status(), 200);
        const renderedPath = new URL(page.url()).pathname;
        if (path === "/admin/redefinir-senha") {
          assert.equal(renderedPath, "/admin/login");
          await page.getByRole("alert").filter({ hasText: "O link de acesso é inválido ou expirou." }).waitFor();
        } else assert.equal(renderedPath, path);
        await page.evaluate(axeSource);
        await scan(path, path === "/admin/redefinir-senha" ? "signed-out-reset-login-error" : "default");
        if (path === "/") {
          for (const selector of ["#servicos", "#etapa-2", "#etapa-3", "#etapa-4", "#etapa-5", "#etapa-6"]) {
            await page.locator(selector).scrollIntoViewIfNeeded();
            await page.screenshot(); // Force the actual visible chapter to paint.
            await scan(path, `visible-${selector.slice(1)}-contrast`, selector);
          }
          const stage = page.getByRole("group", { name: "Use as setas para navegar pelos projetos", exact: true });
          await page.waitForFunction(element => {
            const key = Object.keys(element).find(key => key.startsWith("__reactProps$"));
            return key && typeof element[key]?.onKeyDown === "function";
          }, await stage.elementHandle());
          const count = await page.locator('#projetos article[data-active]').count();
          assert.ok(count > 0, "Catalogue must have real projects");
          await stage.focus();
          await stage.press("Home");
          for (let index = 0; index < count; index++) {
            if (index) await stage.press("ArrowRight");
            await page.getByRole("group", { name: `Projeto ${index + 1} de ${count}`, exact: true }).waitFor();
            await page.locator(`#projetos article[data-active="true"][aria-label="${index + 1} de ${count}"]`).waitFor();
            assert.equal(await stage.evaluate(element => element === document.activeElement), true);
            await scan(path, `project-${index + 1}`);
          }
        }
      }
      assert.deepEqual(errors, []);
      assert.equal(nonGetRequests, 0);
      console.log(JSON.stringify({ width, runtimeErrors: errors, nonGetRequests,
        scope: "Automated default-page and selected-carousel rules; homepage whole-document contrast excluded, six visible chapters sampled separately; color-contrast incompletes are not passes; not full WCAG or physical assistive-technology certification" }));
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
