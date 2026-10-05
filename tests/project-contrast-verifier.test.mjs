import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("ending contrast verifier samples every actual carousel state after keyboard selection", () => {
  const source = readFileSync(new URL("../scripts/design/check-image-text-contrast.mjs", import.meta.url), "utf8");
  assert.match(source, /'#projetos article\[data-active\]'\)\.count\(\)/);
  assert.match(source, /Array\.from\(\{ length: projectCount \}/);
  assert.match(source, /await stage\.press\("Home"\)/);
  assert.match(source, /await stage\.press\("ArrowRight"\)/);
  assert.ok(source.indexOf('await stage.press("Home")') < source.indexOf('await image.evaluate(el => el.decode())'));
  assert.match(source, /article\[data-active="true"\]\[aria-label=/);
  assert.match(source, /results\.push\(\{ width, section, pillar, projectIndex/);
  assert.match(source, /result\.projectIndex === projectIndex/);
  assert.match(source, /not transition\/scroll\/hover states or WCAG certification/);
});

test("chapter contrast verifier checks the actual sticky phase and decoded artwork", () => {
  const source = readFileSync(new URL("../scripts/design/check-image-text-contrast.mjs", import.meta.url), "utf8");
  assert.match(source, /Array\.from\(\{ length: 6 \}/);
  assert.match(source, /phase: index \+ 1/);
  assert.match(source, /closest\('\[data-phase\]'\)\?\.dataset\.phase === String\(phase\)/);
  assert.match(source, /getComputedStyle\(el\)\.opacity/);
  assert.match(source, /only the visible artwork without scrolling away from the text/);
  assert.match(source, /chapters group tests six naturally scrolled construction phases/);
  assert.match(source, /status: measured \? minimum >= threshold \? "pass" : "review" : "inconclusive"/);
});

test("tiny-label contrast uses bounded pixel density and identical cropped screenshot geometry", () => {
  const source = readFileSync(new URL("../scripts/design/check-image-text-contrast.mjs", import.meta.url), "utf8");
  assert.match(source, /AUDIT_TEXT_DPR \?\? 1/);
  assert.match(source, /\[1, 2, 3\]\.includes\(deviceScaleFactor\)/);
  assert.match(source, /tinyTextOnly && metadata\.fontSize > 12/);
  assert.equal((source.match(/page\.screenshot\(\{ clip \}\)/g) ?? []).length, 2);
  assert.match(source, /y < full\.info\.height/);
  assert.match(source, /x < full\.info\.width/);
  assert.match(source, /\(y \* full\.info\.width \+ x\)/);
  assert.match(source, /if \(!samples && section === "footer"\)/);
  assert.match(source, /origin, group, deviceScaleFactor, tinyTextOnly, results/);
});

test("founder caption uses brighter ivory only over the mobile portrait", () => {
  const css = readFileSync(new URL("../src/components/marketing/SergioStory.module.css", import.meta.url), "utf8");
  assert.match(css, /\.context \{[^}]*color: #c4c6ba/);
  const mobile = css.slice(css.indexOf("@media (max-width: 760px)"), css.indexOf("@media (prefers-reduced-motion"));
  assert.match(mobile, /\.context \{ margin-bottom: 20px; color: #f1f0e8; font-size: 10px; \}/);
  assert.doesNotMatch(mobile, /text-shadow|filter:/);
});
