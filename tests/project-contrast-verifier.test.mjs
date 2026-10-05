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
