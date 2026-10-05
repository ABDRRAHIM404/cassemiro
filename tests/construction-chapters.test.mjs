import { readFileSync, statSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

test("scroll story uses five complete optimized illustrations, never old frames", () => {
  const config = readFileSync("src/config/construction-chapters.ts", "utf8");
  assert.ok(!config.includes("frames-"));
  const paths = [...config.matchAll(/"(\/images\/story\/[^\"]+)"/g)].map(match => match[1]);
  assert.equal(paths.length, 10);
  for (const mobile of [false, true]) {
    const bytes = paths.filter(path => path.includes("mobile") === mobile).reduce((sum, path) => sum + statSync(`public${path}`).size, 0);
    assert.ok(bytes < (mobile ? 350_000 : 900_000), `Artwork budget exceeded: ${bytes}`);
  }
});

test("services unfold on natural scrolling without arrows, frame decoding, or React scroll updates", () => {
  const component = readFileSync("src/components/marketing/ConstructionChapters.tsx", "utf8");
  const css = readFileSync("src/components/marketing/ConstructionChapters.module.css", "utf8");
  for (const forbidden of ["createImageBitmap", "requestAnimationFrame", "useState", 'type="radio"', "preventDefault", "<canvas", "<button"]) assert.ok(!component.includes(forbidden));
  assert.ok(component.includes("IntersectionObserver"));
  assert.ok(component.includes("observer.disconnect()"));
  assert.ok(component.includes("data-story-chapter={index + 1}"));
  assert.ok(component.includes("Visualizações ilustrativas"));
  assert.ok(css.includes("animation-timeline: --construction"));
  assert.ok(css.includes("prefers-reduced-motion: reduce"));
  assert.ok(css.includes("position: sticky"));
  assert.ok(!css.includes("clip-path: inset"));
  // Text backing may feather its edges; the approved artwork must remain
  // complete and unmasked. Exempt only that non-image pseudo-element.
  const artworkCss = css.replace(/\.chapterCopy::before\s*\{[^}]*\}/g, "");
  assert.ok(!artworkCss.includes("mask-image"));
  assert.ok(component.includes("data-artwork={artwork.name}"));
});
