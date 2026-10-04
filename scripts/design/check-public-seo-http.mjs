// Read-only live HTTP proof. Not a substitute for browser/accessibility checks.
import assert from "node:assert/strict";
import sharp from "sharp";

const origin = "https://cassemiro-one.vercel.app";
const images = new Map();
const results = [];
const decode = value => value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#(x[\da-f]+|\d+);/gi, (_, code) => String.fromCodePoint(code[0].toLowerCase() === "x" ? parseInt(code.slice(1), 16) : Number(code)));
const attrs = tag => Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(match => [match[1].toLowerCase(), decode(match[2] ?? match[3])]));
const get = url => fetch(url, { signal: AbortSignal.timeout(30000) });

const sitemap = await get(`${origin}/sitemap.xml`);
assert.equal(sitemap.status, 200);
const urls = [...(await sitemap.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => new URL(decode(match[1])));
assert.ok(urls.length >= 5);
assert.equal(new Set(urls.map(url => url.href)).size, urls.length);
for (const url of urls) {
  assert.equal(url.origin, origin);
  assert.ok(!url.pathname.startsWith("/admin"));
  const response = await get(url);
  const html = await response.text();
  const issues = [];
  const metadata = new Map([...html.matchAll(/<meta\b[^>]*>/gi)].map(match => attrs(match[0])).map(tag => [tag.property ?? tag.name, tag.content]));
  const canonicals = [...html.matchAll(/<link\b[^>]*>/gi)].map(match => attrs(match[0])).filter(tag => tag.rel === "canonical");
  const title = decode(html.match(/<title>([^<]*)<\/title>/i)?.[1] ?? "");
  if (response.status !== 200) issues.push(`HTTP ${response.status}`);
  if ((title.match(/CASSEMIRO/gi) ?? []).length !== 1) issues.push("Title brand count");
  let canonicalMatches = false;
  try { canonicalMatches = canonicals.length === 1 && new URL(canonicals[0].href).href === url.href; } catch { /* Invalid canonical fails below. */ }
  if (!canonicalMatches) issues.push("Canonical mismatch");
  if (!metadata.get("description")) issues.push("Missing description");
  if (attrs(html.match(/<html\b[^>]*>/i)?.[0] ?? "").lang !== "pt-BR") issues.push("Language mismatch");
  if ([...html.matchAll(/<h1\b/gi)].length !== 1) issues.push("H1 count");
  if (/noindex/.test(metadata.get("robots") ?? "")) issues.push("Unexpected noindex");
  for (const field of ["og:title", "og:description", "og:image", "og:image:alt", "twitter:image", "twitter:image:alt"]) {
    if (!metadata.get(field)) issues.push(`Missing ${field}`);
  }
  if (metadata.get("twitter:card") !== "summary_large_image") issues.push("Twitter card mismatch");
  const types = [];
  for (const script of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (attrs(script[1]).type !== "application/ld+json") continue;
    try { types.push(JSON.parse(script[2])["@type"]); } catch { issues.push("Invalid JSON-LD"); }
  }
  if (url.pathname === "/" && !types.includes("GeneralContractor")) issues.push("Missing contractor schema");
  if (url.pathname.startsWith("/servicos/") && !types.includes("Service")) issues.push("Missing service schema");
  const csp = response.headers.get("content-security-policy") ?? "";
  if (!/object-src 'none'(?:;|$)/.test(csp) || !/frame-ancestors '(?:self|none)'(?:;|$)/.test(csp)) issues.push("Missing CSP baseline");
  if (response.headers.get("x-content-type-options") !== "nosniff") issues.push("Missing nosniff");
  for (const imageUrl of new Set([metadata.get("og:image"), metadata.get("twitter:image")].filter(Boolean))) {
    const image = new URL(imageUrl);
    assert.equal(image.origin, origin, "Only fetch CASSEMIRO preview assets");
    if (!images.has(imageUrl)) {
      const preview = await get(image);
      let dimensions = null;
      if (preview.status === 200 && /^image\//.test(preview.headers.get("content-type") ?? "")) {
        try {
          const info = await sharp(Buffer.from(await preview.arrayBuffer())).metadata();
          dimensions = { width: info.width, height: info.height };
        } catch { /* An unavailable/invalid preview is reported below. */ }
      }
      images.set(imageUrl, { path: image.pathname, status: preview.status, dimensions });
    }
    if (!images.get(imageUrl).dimensions) issues.push("Unavailable/undecodable preview");
  }
  const result = { path: url.pathname, status: response.status, title, jsonLdTypes: types, issues };
  results.push(result);
  console.log(JSON.stringify(result));
}
const failures = results.reduce((total, result) => total + result.issues.length, 0);
console.log(JSON.stringify({ passed: failures === 0, routes: results.length, failures, images: [...images.values()], scope: "Live HTTP metadata, downloadable image decoding and baseline headers only; no browser runtime, social crawler, indexing or accessibility claim" }));
if (failures) process.exitCode = 1;
