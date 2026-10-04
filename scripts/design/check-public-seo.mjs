// Read-only public SEO sweep. No accounts, CMS writes or form submissions.
import assert from "node:assert/strict";
import sharp from "sharp";

const origin = process.env.SEO_TEST_ORIGIN ?? "https://cassemiro-one.vercel.app";
assert.ok(["https://cassemiro-one.vercel.app", "http://127.0.0.1:3006"].includes(origin));
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE);
const browser = await chromium.launch({ executablePath: "/home/bng/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome", headless: true,
  // Opt-in compatibility for the owner's HTTP proxy; not a performance profile.
  args: process.env.BROWSER_PROXY_HTTP1 === "1" ? ["--disable-http2", "--disable-quic"] : [],
  proxy: { server: process.env.HTTPS_PROXY || process.env.HTTP_PROXY || "http://192.168.1.187:8080", bypass: "localhost,127.0.0.1" } });
const results = [], images = new Map();
const canonicalOrigin = "https://cassemiro-one.vercel.app";
let failures = 0;
try {
  const context = await browser.newContext({ viewport: { width: 1366, height: 844 } });
  await context.route("**/*", route => route.request().method() === "GET" ? route.continue() : route.abort());
  const sitemap = await context.request.get(`${origin}/sitemap.xml`, { timeout: 30000 });
  assert.equal(sitemap.status(), 200);
  const xml = await sitemap.text();
  const routes = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => new URL(match[1]));
  assert.ok(routes.length >= 5);
  assert.equal(new Set(routes.map(route => route.href)).size, routes.length);
  for (const route of routes) {
    assert.ok([canonicalOrigin, origin].includes(route.origin));
    assert.ok(!route.pathname.startsWith("/admin"));
    const page = await context.newPage(), errors = [], issues = [];
    page.on("pageerror", error => errors.push(error.name));
    try {
      const response = await page.goto(`${origin}${route.pathname}`, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForFunction(() => document.title.includes("CASSEMIRO") && document.querySelector('link[rel="canonical"]'), undefined, { timeout: 15000 });
      if (response.status() !== 200) issues.push(`HTTP ${response.status()}`);
      const data = await page.evaluate(() => {
        const meta = name => document.querySelector(`meta[property="${name}"],meta[name="${name}"]`)?.content ?? null;
        return { title: document.title, description: meta("description"), language: document.documentElement.lang,
          canonicals: [...document.querySelectorAll('link[rel="canonical"]')].map(link => link.href),
          ogTitle: meta("og:title"), ogDescription: meta("og:description"), ogImage: meta("og:image"), ogAlt: meta("og:image:alt"),
          twitterCard: meta("twitter:card"), twitterImage: meta("twitter:image"), twitterAlt: meta("twitter:image:alt"),
          robots: meta("robots"), h1: document.querySelectorAll("h1").length,
          jsonLd: [...document.querySelectorAll('script[type="application/ld+json"]')].map(script => script.textContent),
        };
      });
      if ((data.title.match(/CASSEMIRO/gi) ?? []).length !== 1) issues.push("Title must contain brand once");
      if (!data.description?.trim()) issues.push("Missing description");
      const expectedCanonical = `${origin === canonicalOrigin ? canonicalOrigin : "http://localhost:3000"}${route.pathname === "/" ? "/" : route.pathname}`;
      if (data.canonicals.length !== 1 || data.canonicals[0] !== expectedCanonical) issues.push("Canonical mismatch");
      if (data.language !== "pt-BR" || data.h1 !== 1) issues.push("Language/H1 mismatch");
      if (/noindex/.test(data.robots ?? "")) issues.push("Public route is noindex");
      if (!data.ogTitle || !data.ogDescription) issues.push("Missing OG text");
      if (!data.ogImage) issues.push("Missing OG image");
      if (!data.ogAlt) issues.push("Missing OG image alternative");
      if (data.twitterCard !== "summary_large_image" || !data.twitterImage || !data.twitterAlt) issues.push("Incomplete Twitter large-image preview");
      const types = [];
      for (const raw of data.jsonLd) {
        try { const parsed = JSON.parse(raw); types.push(parsed["@type"]); }
        catch { issues.push("Invalid JSON-LD"); }
      }
      if (route.pathname === "/" && !types.includes("GeneralContractor")) issues.push("Missing contractor schema");
      if (route.pathname.startsWith("/servicos/") && !types.includes("Service")) issues.push("Missing service schema");
      for (const imageUrl of new Set([data.ogImage, data.twitterImage].filter(Boolean))) {
        if (!images.has(imageUrl)) {
          const image = new URL(imageUrl);
          assert.ok([canonicalOrigin, "http://localhost:3000", origin].includes(image.origin), "Preview must use a CASSEMIRO public URL");
          const requestUrl = new URL(image.pathname + image.search, origin).href;
          const response = await context.request.get(requestUrl, { timeout: 45000 });
          let dimensions = null;
          if (response.status() === 200 && /^image\//.test(response.headers()["content-type"] ?? "")) {
            try { const metadata = await sharp(await response.body()).metadata(); dimensions = { width: metadata.width, height: metadata.height }; } catch { /* reported below */ }
          }
          images.set(imageUrl, { path: image.pathname, status: response.status(), dimensions });
        }
        if (!images.get(imageUrl).dimensions) issues.push("Preview image unavailable/undecodable");
      }
      if (errors.length) issues.push("Browser runtime error");
      failures += issues.length;
      const result = { path: route.pathname, title: data.title, canonical: data.canonicals[0], jsonLdTypes: types, issues, runtimeErrors: errors.length };
      results.push(result);
      console.log(JSON.stringify({ checkpoint: route.pathname, issues }));
    } finally { await page.close(); }
  }
  await context.close();
} finally { await browser.close(); }
console.log(JSON.stringify({ passed: failures === 0, routes: results.length, failures, results, images: [...images.values()],
  scope: "rendered public sitemap routes and downloadable preview assets; not search-engine indexing, social-platform cache behavior or rich-result eligibility" }));
if (failures) process.exitCode = 1;
