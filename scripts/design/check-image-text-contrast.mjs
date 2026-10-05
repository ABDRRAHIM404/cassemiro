// Read-only browser lab check, not a substitute for an accessibility audit.
// Sample rendered backgrounds beneath solid glyph pixels; use nominal CSS
// foreground colors, not antialiased edge colors, for WCAG contrast calculations.
import sharp from "sharp";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE);
const origin = process.argv[2] ?? "http://127.0.0.1:3001";
const group = process.argv[3] ?? "trust";
if (!["trust", "ending", "chapters"].includes(group)) throw new Error("Unexpected audit group");
if (!["http://127.0.0.1:3001", "https://cassemiro-one.vercel.app"].includes(origin)) throw new Error("Unexpected audit origin");
const luminance = rgb => rgb.map(value => {
  const channel = value / 255;
  return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
}).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
const ratio = (first, second) => {
  const a = luminance(first), b = luminance(second);
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
};
const browser = await chromium.launch({ executablePath: "/home/bng/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome", headless: true,
    args: process.env.BROWSER_PROXY_HTTP1 === "1" ? ["--disable-http2", "--disable-quic"] : [],
    proxy: { server: process.env.HTTPS_PROXY || process.env.HTTP_PROXY || "http://192.168.1.187:8080", bypass: "localhost,127.0.0.1" } });
const results = [];
try {
  for (const width of [1366, 768, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 844 }, reducedMotion: "reduce", deviceScaleFactor: 1 });
    await page.route("**/*", route => route.request().method() === "GET" ? route.continue() : route.abort());
    try {
      const errors = [];
      page.on("pageerror", error => errors.push(error.name));
      await page.goto(origin, { waitUntil: "domcontentloaded" });
      await page.evaluate(() => document.fonts.ready);
      const projectCount = group === "ending" ? await page.locator('#projetos article[data-active]').count() : 0;
      if (group === "ending" && !projectCount) throw new Error("No actual project slides available for contrast verification");
      const states = group === "chapters" ? Array.from({ length: 6 }, (_, index) => ({
        section: index === 0 ? "servicos" : `etapa-${index + 1}`, phase: index + 1, pillar: null, projectIndex: null
      })) : group === "ending" ? [
        ...Array.from({ length: projectCount }, (_, projectIndex) => ({ section: "projetos", pillar: null, projectIndex })),
        { section: "footer", pillar: null, projectIndex: null },
      ] : [
        { section: "sobre", pillar: null, projectIndex: null },
        ...["Qualidade", "Prazos", "Experiência", "Confiança"].map(pillar => ({ section: "porque", pillar, projectIndex: null })),
      ];
      for (const { section, phase, pillar, projectIndex } of states) {
        // Testimonials also contain a semantic footer; select site contentinfo.
        const selector = section === "footer" ? "footer:not(main footer)" : `#${section}`;
        // Lazy images must enter the viewport before decode() can complete.
        await page.locator(selector).scrollIntoViewIfNeeded();
        if (projectIndex !== null) {
          const stage = page.getByRole("group", { name: "Use as setas para navegar pelos projetos", exact: true });
          await page.waitForFunction(element => {
            const key = Object.keys(element).find(key => key.startsWith("__reactProps$"));
            return key && typeof element[key]?.onKeyDown === "function";
          }, await stage.elementHandle());
          await stage.focus();
          await stage.press("Home");
          for (let index = 0; index < projectIndex; index++) await stage.press("ArrowRight");
          await page.locator(`${selector} article[data-active="true"][aria-label="${projectIndex + 1} de ${projectCount}"]`).waitFor();
          await page.locator(`${selector} [aria-label="Projeto ${projectIndex + 1} de ${projectCount}"]`).waitFor();
        }
        for (const image of await page.locator(`${selector} img`).all()) {
          if (section === "projetos" && !await image.evaluate(el => Boolean(el.closest('[data-active="true"]')))) continue;
          await image.scrollIntoViewIfNeeded();
          await page.waitForFunction(el => el.complete && el.naturalWidth > 0, await image.elementHandle(), { timeout: 20000 });
          await image.evaluate(el => el.decode());
        }
        if (pillar) {
          const control = page.getByRole("button", { name: new RegExp(pillar) });
          await control.focus();
          await control.press("Enter");
          await page.waitForFunction(title => {
            const active = document.querySelector('#porque button[aria-pressed="true"]');
            const feature = document.querySelector('#porque [aria-hidden="false"] h3');
            return active?.textContent.includes(title) && feature?.textContent === title;
          }, pillar);
        }
        const count = await page.locator(selector).evaluate(root => {
          let count = 0;
          for (const element of root.querySelectorAll("p,h2,h3,blockquote,span,strong,em,button,a")) {
            if ([...element.childNodes].some(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim())) {
              element.setAttribute("data-contrast-probe", `${count++}`);
            }
          }
          return count;
        });
        for (let index = 0; index < count; index++) {
          const element = page.locator(`${selector} [data-contrast-probe="${index}"]`);
          if (!await element.isVisible()) continue;
          await element.evaluate(element => {
            window.scrollTo(0, element.getBoundingClientRect().top + scrollY - innerHeight / 2);
          });
          if (group === "chapters") {
            // The story illustration is a viewport-sticky sibling, not an
            // image inside the chapter. Observe its actual phase and decode
            // only the visible artwork without scrolling away from the text.
            await page.waitForFunction(({ selector, phase }) =>
              document.querySelector(selector)?.closest('[data-phase]')?.dataset.phase === String(phase), { selector, phase });
            const artwork = page.locator('[data-artwork]').filter({ visible: true });
            for (const picture of await artwork.all()) {
              if (await picture.evaluate(el => Number(getComputedStyle(el).opacity) < .99)) continue;
              const image = picture.locator('img');
              await page.waitForFunction(el => el.complete && el.naturalWidth > 0, await image.elementHandle(), { timeout: 20000 });
              await image.evaluate(el => el.decode());
            }
            await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          }
          const metadata = await element.evaluate(element => {
            const style = getComputedStyle(element), rect = element.getBoundingClientRect();
            let opacity = 1;
            for (let ancestor = element; ancestor; ancestor = ancestor.parentElement) opacity *= Number(getComputedStyle(ancestor).opacity);
            return { text: element.textContent.trim().slice(0, 100), color: style.color, fontSize: parseFloat(style.fontSize),
              fontWeight: parseInt(style.fontWeight, 10), opacity,
              rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height } };
          });
          if (metadata.opacity < .99) continue;
          const foreground = metadata.color.match(/[\d.]+/g)?.map(Number);
          if (!foreground || foreground.length !== 3) throw new Error("Unsupported foreground color");
          const full = await sharp(await page.screenshot()).removeAlpha().raw().toBuffer({ resolveWithObject: true });
          const hidden = await page.addStyleTag({ content: `${selector} [data-contrast-probe], ${selector} [data-contrast-probe] * { color: transparent !important; text-shadow: none !important; text-decoration-color: transparent !important; }` });
          const background = await sharp(await page.screenshot()).removeAlpha().raw().toBuffer();
          await hidden.evaluate(element => element.remove());
          const rect = metadata.rect;
          let minimum = Infinity, samples = 0;
          for (let y = Math.max(73, Math.floor(rect.y)); y < Math.min(844 - 54, Math.ceil(rect.y + rect.height)); y++) {
            for (let x = Math.max(0, Math.floor(rect.x)); x < Math.min(width, Math.ceil(rect.x + rect.width)); x++) {
              const offset = (y * width + x) * full.info.channels;
              const visible = [...full.data.subarray(offset, offset + 3)];
              const beneath = [...background.subarray(offset, offset + 3)];
              // Ignore background and glyph edges; retain near-solid CSS-color ink.
              if (visible.every((value, channel) => Math.abs(value - foreground[channel]) <= 8)
                && visible.some((value, channel) => Math.abs(value - beneath[channel]) > 20)) {
                minimum = Math.min(minimum, ratio(foreground, beneath));
                samples++;
              }
            }
          }
          const threshold = metadata.fontSize >= 24 || (metadata.fontSize >= 18.667 && metadata.fontWeight >= 700) ? 3 : 4.5;
          let method = "rendered-glyph-background";
          // Tiny/footer-edge glyphs can have no near-solid pixels. Only the
          // plain footer gets a nominal-color fallback: refuse gradients,
          // opacity, visible pseudo layers or translucent backgrounds.
          if (!samples && section === "footer") {
            const solid = await element.evaluate(element => {
              for (let ancestor = element; ancestor; ancestor = ancestor.parentElement) {
                const style = getComputedStyle(ancestor);
                if (Number(style.opacity) !== 1 || style.backgroundImage !== "none") return null;
                for (const pseudo of ["::before", "::after"]) {
                  const layer = getComputedStyle(ancestor, pseudo);
                  if (!["none", "normal"].includes(layer.content) && layer.display !== "none") return null;
                }
                const color = style.backgroundColor.match(/[\d.]+/g)?.map(Number);
                if (!color || (color.length === 4 && color[3] === 0)) continue;
                if (color.length === 4 && color[3] !== 1) return null;
                return color.slice(0, 3);
              }
              return null;
            });
            if (solid) {
              minimum = ratio(foreground, solid);
              method = "computed-solid-footer";
            }
          }
          const measured = Number.isFinite(minimum);
          results.push({ width, section, pillar, projectIndex, text: metadata.text, samples, minimum: measured ? Number(minimum.toFixed(3)) : null,
            method, threshold, status: measured ? minimum >= threshold ? "pass" : "review" : "inconclusive" });
        }
        console.log(JSON.stringify({ checkpoint: "state", width, section, pillar, projectIndex,
          measuredFailures: results.filter(result => result.width === width && result.section === section && result.pillar === pillar && result.projectIndex === projectIndex && result.status === "review") }));
      }
      if (errors.length) throw new Error(JSON.stringify(errors));
      console.log(JSON.stringify({ checkpoint: "viewport", width, tested: results.filter(result => result.width === width).length }));
    } finally { await page.close(); }
  }
} finally { await browser.close(); }
console.log(JSON.stringify({ origin, group, results, scope: "sampled solid glyph positions at three widths; trust group tests founder and four keyboard-selected trust states; ending group tests all actual keyboard-selected project states/footer; chapters group tests six naturally scrolled construction phases with decoded sticky artwork; reduced motion; not transition/scroll/hover states or WCAG certification" }));
if (results.some(result => result.status === "review")) process.exitCode = 1;
