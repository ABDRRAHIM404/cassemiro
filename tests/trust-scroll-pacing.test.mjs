import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";

test("trust section gives desktop and mobile pillars scroll reading space while respecting reduced motion", () => {
  const css = readFileSync("src/components/marketing/WhyCassemiro.module.css", "utf8");
  assert.match(css, /\.root\s*\{[^}]*height:\s*420svh/);
  assert.match(css, /@media \(max-width: 760px\)\s*\{\s*\.root\s*\{\s*height:\s*360svh/);
  assert.match(css, /height:\s*calc\(100svh - 124px - env\(safe-area-inset-bottom/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.root\s*\{\s*height:\s*auto/);
});

test("mobile trust scrolling is enabled and controls do not repeat pillar descriptions", () => {
  const source = readFileSync("src/components/marketing/WhyCassemiro.tsx", "utf8");
  assert.doesNotMatch(source, /reducedMotion\.matches\s*\|\|\s*mobile\.matches/);
  assert.match(source, /stageRef\.current\?\.getBoundingClientRect\(\)\.height/);
  assert.doesNotMatch(source, /mobileDetail|\{pillar\.text\}/);
  assert.match(source, /addEventListener\("scroll", requestUpdate, \{ passive: true \}\)/);
});
