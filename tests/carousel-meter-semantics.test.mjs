import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("project index has an author-name-compatible role without another live announcer", async () => {
  const source = await readFile(new URL("../src/components/marketing/ProjectsJourney.tsx", import.meta.url), "utf8");
  const meter = source.match(/<div className=\{styles\.meter\}[^>]+>/)?.[0];
  assert.ok(meter);
  assert.match(meter, /role="group"/);
  assert.match(meter, /aria-label=\{`Projeto \$\{active \+ 1\} de \$\{projects\.length\}`\}/);
  assert.doesNotMatch(meter, /aria-live|tabIndex/);
  assert.match(source, /className=\{styles\.caption\} aria-live="polite" aria-atomic="true"/);
});

test("public accessibility checker blocks writes and does not certify inconclusive contrast", async () => {
  const source = await readFile(new URL("../scripts/design/check-live-public-accessibility.mjs", import.meta.url), "utf8");
  assert.match(source, /method\(\) === "GET"/);
  assert.match(source, /return route\.abort\(\)/);
  assert.match(source, /assert\.equal\(nonGetRequests, 0\)/);
  assert.match(source, /assert\.deepEqual\(result\.violations, \[\]\)/);
  assert.match(source, /incomplete\.filter\(rule => rule\.id !== "color-contrast"\)/);
  assert.match(source, /color-contrast incompletes are not passes/);
  assert.match(source, /visible-\$\{selector\.slice\(1\)\}-contrast/);
  assert.match(source, /scrollIntoViewIfNeeded\(\)/);
  assert.match(source, /"#etapa-6"/);
  assert.match(source, /\/admin\/esqueci-senha/);
  assert.match(source, /\/admin\/redefinir-senha/);
});
