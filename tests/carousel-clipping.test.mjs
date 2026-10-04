import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("carousel clips neighbors without a focus-scrollable viewport", async () => {
  const css = await readFile(new URL("../src/components/marketing/ProjectsJourney.module.css", import.meta.url), "utf8");
  for (const selector of [".root, .empty", ".stage"]) {
    const rule = css.slice(css.indexOf(`${selector} {`)).split("}")[0];
    assert.match(rule, /overflow:\s*clip\s*;/);
    assert.doesNotMatch(rule, /overflow:\s*hidden\s*;/);
  }
  assert.match(css, /touch-action:\s*pan-y/);
});
