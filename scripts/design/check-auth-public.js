async page => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  const routes = [
    ["login", "/admin/login"],
    ["login-error", "/admin/login?error=Confira+o+e-mail+e+a+senha."],
    ["login-unauthorized", "/admin/login?error=unauthorized"],
    ["login-sent", "/admin/login?sent=1"],
    ["login-reset", "/admin/login?reset=1"],
    ["forgot", "/admin/esqueci-senha"],
    ["forgot-sent", "/admin/esqueci-senha?sent=1"],
    ["forgot-error", "/admin/esqueci-senha?error=Não+foi+possível+enviar.+Tente+novamente."],
    ["reset-expired", "/admin/redefinir-senha"],
  ];
  const results = [];
  for (const width of [1366, 390, 320]) {
    await page.setViewportSize({ width, height: width === 1366 ? 768 : 844 });
    for (const [name, path] of routes) {
      const response = await page.goto("http://127.0.0.1:3001" + path, { waitUntil: "domcontentloaded" });
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: `.codex/audits/redesign/current/${width}-auth-${name}.png`, fullPage: true });
      results.push({ width, state: name, status: response?.status(), redirected: new URL(page.url()).pathname, ...await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        heading: document.querySelector("h2")?.textContent,
        bodyPadding: getComputedStyle(document.body).paddingBottom,
        controls: [...document.querySelectorAll("input:not([type=hidden]),button")].map(element => ({ name: element.name, label: element.textContent, height: Math.round(element.getBoundingClientRect().height) })),
        alert: document.querySelector('[role="alert"]')?.textContent,
        notice: document.querySelector('[role="status"]')?.textContent,
      })) });
    }
    await page.goto("http://127.0.0.1:3001/admin/projetos");
    results.push({ width, state: "protected-redirect", path: new URL(page.url()).pathname });
  }
  return { scope: "Unauthenticated auth screens and redirects only; no email sent or password changed", results, pageErrors: errors };
}
