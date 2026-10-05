import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("Orca verifier isolates desktop preferences, waits for readiness and requires generated speech", () => {
  const source = readFileSync(new URL("../scripts/design/check-live-orca-carousel.mjs", import.meta.url), "utf8");
  assert.match(source, /spawn\("dbus-run-session"/);
  assert.match(source, /GSETTINGS_BACKEND: "memory"/);
  assert.match(source, /XDG_CONFIG_HOME: `\$\{dir\}\/config`/);
  assert.match(source, /"--user-prefs", `\$\{dir\}\/prefs`/);
  assert.doesNotMatch(source, /"--replace"|"-r"/);
  assert.match(source, /SPEECHD_CMD: "\/bin\/false"/);
  assert.match(source, /assert\.match\(await orcaLog\(\), \/Starting Atspi main event loop\//);
  assert.match(source, /speech\.some\(line => line\.includes\(afterTitle\)\)/);
  assert.match(source, /if \(route\.request\(\)\.method\(\) === "GET"\) return route\.continue\(\)/);
  assert.match(source, /attemptedWrites\+\+;\s*return route\.abort\(\)/);
  assert.match(source, /blockedNonGetRequests: attemptedWrites/);
  assert.match(source, /for \(const child of children\.reverse\(\)\) await stop\(child\)/);
  assert.match(source, /not physical keyboard routing, mobile VoiceOver or complete screen-reader certification/);
});
