import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";

test("trust section gives desktop pillars reading space without lengthening mobile or reduced-motion layouts", () => {
  const css = readFileSync("src/components/marketing/WhyCassemiro.module.css", "utf8");
  assert.match(css, /\.root\s*\{[^}]*height:\s*420svh/);
  assert.match(css, /@media \(max-width: 760px\)\s*\{\s*\.root\s*\{\s*height:\s*auto/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.root\s*\{\s*height:\s*auto/);
});
