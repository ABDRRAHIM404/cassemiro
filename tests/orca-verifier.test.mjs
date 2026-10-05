import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

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
  assert.match(source, /nativeKey\("Tab", true\)/);
  assert.match(source, /nativeKey\("Return"\)/);
  assert.match(source, /nativeKey\("space"\)/);
  assert.match(source, /returnSpeech\.some\(line => line\.includes\(beforeTitle\)\)/);
  assert.match(source, /not physical hardware, mobile VoiceOver or complete screen-reader certification/);
});

test("native key helper refuses the normal desktop before loading X11 or injecting events", () => {
  const helper = new URL("../scripts/design/orca-private-key.py", import.meta.url);
  const source = readFileSync(helper, "utf8");
  assert.ok(source.indexOf('assert os.environ.get("GSETTINGS_BACKEND") == "memory"') < source.indexOf('ctypes.CDLL("libX11.so.6")'));
  const result = spawnSync("python3", [helper.pathname, "Tab"], {
    env: { ...process.env, GSETTINGS_BACKEND: "", XDG_RUNTIME_DIR: "/not-an-orca-test" }, timeout: 5000, encoding: "utf8",
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /AssertionError/);
});
