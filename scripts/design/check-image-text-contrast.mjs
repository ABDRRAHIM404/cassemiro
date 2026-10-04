// Read-only browser lab check, not a substitute for an accessibility audit.
// Sample rendered backgrounds beneath solid glyph pixels; use nominal CSS
// foreground colors, not antialiased edge colors, for WCAG contrast calculations.
import sharp from "sharp";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE);
const origin = process.argv[2] ?? "http://127.0.0.1:3001";
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
  proxy: { server: "http://192.168.1.144:8080", bypass: "localhost,127.0.0.1" } });
const results = [];
try {
  for (const width of [1366, 768, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 844 }, reducedMotion: "reduce", deviceScaleFactor: 1 });
    try {
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.goto(origin, { waitUntil: "domcontentloaded" });
      await page.evaluate(() => document.fonts.ready);
      for (const section of ["sobre", "porque"]) {
        // Lazy images must enter the viewport before decode() can complete.
        await page.locator(`#${section}`).scrollIntoViewIfNeeded();
        await page.locator(`#${section} img`).evaluateAll(images => Promise.all(images.map(image => image.decode())));
        const count = await page.locator(`#${section}`).evaluate(root => {
          let count = 0;
          for (const element of root.querySelectorAll("p,h2,h3,blockquote,span,strong,button,a")) {
            if ([...element.childNodes].some(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim())) {
              element.setAttribute("data-contrast-probe", `${count++}`);
            }
          }
          return count;
        });
        for (let index = 0; index < count; index++) {
          const element = page.locator(`#${section} [data-contrast-probe="${index}"]`);
          if (!await element.isVisible()) continue;
          await element.evaluate(element => {
            window.scrollTo(0, element.getBoundingClientRect().top + scrollY - innerHeight / 2);
          });
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
          const hidden = await page.addStyleTag({ content: `#${section} [data-contrast-probe], #${section} [data-contrast-probe] * { color: transparent !important; text-shadow: none !important; text-decoration-color: transparent !important; }` });
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
          results.push({ width, section, text: metadata.text, samples, minimum: samples ? Number(minimum.toFixed(3)) : null,
            threshold, status: samples ? minimum >= threshold ? "pass" : "review" : "inconclusive" });
        }
      }
      if (errors.length) throw new Error(JSON.stringify(errors));
      console.log(JSON.stringify({ checkpoint: "viewport", width, tested: results.filter(result => result.width === width).length }));
    } finally { await page.close(); }
  }
} finally { await browser.close(); }
console.log(JSON.stringify({ origin, results, scope: "sampled solid glyph positions over current photographs; reduced motion; not all hover/motion states or WCAG certification" }));
if (results.some(result => result.status === "review")) process.exitCode = 1;
