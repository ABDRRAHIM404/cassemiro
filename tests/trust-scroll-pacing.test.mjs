import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";

test("trust section is normal document flow without a pinned scroll runway on any viewport", () => {
  const css = readFileSync("src/components/marketing/WhyCassemiro.module.css", "utf8");
  assert.doesNotMatch(css, /position:\s*(?:sticky|fixed)|\d+svh|scroll-snap|--trust-progress/);
  assert.match(css, /\.stage\s*\{[^}]*position:\s*relative/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});

test("trust retains content and manual pillar controls without listening to or cancelling page gestures", () => {
  const source = readFileSync("src/components/marketing/WhyCassemiro.tsx", "utf8");
  assert.doesNotMatch(source, /addEventListener|useEffect|requestAnimationFrame|scrollTo|stageRef|sectionRef/);
  assert.doesNotMatch(source, /mobileDetail|\{pillar\.text\}/);
  assert.match(source, /onClick=\{\(\) => setActive\(index\)\}/);
  assert.match(source, /onPointerEnter/);
  for (const pillar of ["Qualidade", "Prazos", "Experiência", "Confiança"]) assert.ok(source.includes(pillar));
});
