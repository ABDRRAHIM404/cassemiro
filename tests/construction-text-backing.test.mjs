import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("construction copy gets a feathered non-interactive backing only below desktop width", async () => {
  const css = await readFile(new URL("../src/components/marketing/ConstructionChapters.module.css", import.meta.url), "utf8");
  const backing = css.match(/@media \(max-width: 1000px\) \{\s*\.chapterCopy \{ position: relative; isolation: isolate; \}\s*\.chapterCopy::before \{([\s\S]*?)\}\s*\}/);
  assert.ok(backing);
  assert.match(backing[1], /pointer-events: none/);
  assert.match(backing[1], /z-index: -1/);
  assert.match(backing[1], /background: rgb\(17 18 15 \/ 96%\)/);
  assert.match(backing[1], /mask-composite: intersect/);
  assert.match(backing[1], /linear-gradient\(to right/);
  assert.match(backing[1], /linear-gradient\(to bottom/);
  assert.doesNotMatch(backing[1], /filter:|backdrop-filter:|animation:|transition:|url\(/);
});
