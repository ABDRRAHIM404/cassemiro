import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("target-size verifier blocks writes, checks real rule coverage and keeps claims scoped", () => {
  const source = readFileSync(new URL("../scripts/design/check-live-target-size.mjs", import.meta.url), "utf8");
  assert.match(source, /method\(\) === "GET"/);
  assert.match(source, /return route\.abort\(\)/);
  assert.match(source, /assert\.equal\(quoteAttempts, 0/);
  assert.match(source, /assert\.deepEqual\(result\.incomplete, \[\]/);
  assert.match(source, /assert\.ok\(result\.evaluatedTargets > 0/);
  assert.match(source, /menu-open/);
  assert.match(source, /empty-form-errors/);
  assert.match(source, /not full WCAG, physical touch or authenticated admin certification/);
  assert.doesNotMatch(source, /storageState|service.role|SUPABASE_SERVICE_ROLE/);
});
