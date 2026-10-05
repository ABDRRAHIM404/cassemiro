// Read-only public check on a private D-Bus/display with separate Orca prefs.
// Records real Orca-generated speech text, not audible voice quality or WCAG certification.
import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { mkdtemp, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
if (!process.argv.includes("--isolated-worker")) {
  const dir = await mkdtemp(`${tmpdir()}/cassemiro-orca-`);
  for (const folder of ["runtime", "prefs", "config", "cache", "data"]) await mkdir(`${dir}/${folder}`, { mode: 0o700 });
  // Isolate activation-service configuration too, not just Orca's preferences.
  const env = { ...process.env, XDG_RUNTIME_DIR: `${dir}/runtime`, XDG_CONFIG_HOME: `${dir}/config`,
    XDG_CACHE_HOME: `${dir}/cache`, XDG_DATA_HOME: `${dir}/data`, GSETTINGS_BACKEND: "memory",
    SPEECHD_ADDRESS: `unix_socket:${dir}/no-audio.sock`, SPEECHD_CMD: "/bin/false", NO_AT_BRIDGE: "0" };
  const child = spawn("dbus-run-session", ["--", process.execPath, new URL(import.meta.url).pathname, "--isolated-worker", dir], { env, stdio: "inherit" });
  child.on("error", () => { process.exitCode = 1; });
  child.on("exit", code => { process.exitCode = code ?? 1; });
} else {
  assert.ok(process.env.PLAYWRIGHT_MODULE, "Use an existing Playwright installation");
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE);
  const dir = process.argv.at(-1);
  assert.equal(process.env.XDG_RUNTIME_DIR, `${dir}/runtime`);
  assert.equal(process.env.GSETTINGS_BACKEND, "memory");
  const env = { ...process.env, XDG_RUNTIME_DIR: `${dir}/runtime`, WAYLAND_DISPLAY: "cassemiro-audit", NO_AT_BRIDGE: "0",
    // Do not connect to the owner's audio service or speak on their desktop.
    SPEECHD_ADDRESS: `unix_socket:${dir}/no-audio.sock`, SPEECHD_CMD: "/bin/false" };
  const children = [];
  let browser, compositorLog = "", orcaOutput = "", stage = "isolated-display";
  async function stop(child) {
    if (child.exitCode !== null || child.signalCode !== null) return;
    child.kill("SIGTERM");
    await Promise.race([new Promise(resolve => child.once("exit", resolve)), wait(5000)]);
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
  }
  async function orcaLog() { return orcaOutput; }
  try {
    const weston = spawn("weston", ["--backend=headless", "--renderer=pixman", "--xwayland", "--no-config", "--width=1366", "--height=768", "--socket=cassemiro-audit"], { env, stdio: ["ignore", "ignore", "pipe"] });
    children.push(weston);
    weston.stderr.on("data", data => { compositorLog += data; });
    const displayDeadline = performance.now() + 15000;
    let display;
    while (performance.now() < displayDeadline && !display) {
      display = /xserver listening on display (:\d+)/i.exec(compositorLog)?.[1];
      if (!display) await wait(200);
    }
    assert.ok(display, "Isolated Xwayland display unavailable");
    env.DISPLAY = display;
    stage = "browser";
    browser = await chromium.launch({ executablePath: "/home/bng/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome", headless: false, env,
      args: ["--disable-http2", "--disable-quic", "--force-renderer-accessibility", "--ozone-platform=x11"],
      proxy: { server: process.env.HTTPS_PROXY || process.env.HTTP_PROXY || "http://192.168.1.187:8080" } });
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: "reduce" });
    let attemptedWrites = 0;
    await context.route("**/*", route => {
      if (route.request().method() === "GET") return route.continue();
      attemptedWrites++;
      return route.abort();
    });
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.name));
    const response = await page.goto("https://cassemiro-one.vercel.app", { waitUntil: "load", timeout: 60000 });
    assert.equal(response.status(), 200);
    stage = "orca-readiness";
    const orca = spawn("python3", ["-u", new URL("./orca-unbuffered.py", import.meta.url).pathname, "--user-prefs", `${dir}/prefs`, "--disable", "braille"], { env, stdio: ["ignore", "ignore", "pipe"] });
    orca.stderr.setEncoding("utf8");
    orca.stderr.on("data", data => { orcaOutput += data; });
    children.push(orca);
    const startupDeadline = performance.now() + 60000;
    while (performance.now() < startupDeadline && !(await orcaLog()).includes("Starting Atspi main event loop")) {
      assert.equal(orca.exitCode, null, "Orca exited before readiness");
      await wait(500);
    }
    assert.match(await orcaLog(), /Starting Atspi main event loop/, "Orca must be ready before interaction");
    console.log(JSON.stringify({ checkpoint: "orca-ready", artifactDirectory: dir }));
    stage = "carousel-announcements";
    await page.bringToFront();
    const next = page.getByRole("button", { name: "Próximo projeto", exact: true });
    await next.scrollIntoViewIfNeeded();
    await next.focus();
    await wait(2000);
    const nativeKey = (key, shift = false) => execFileSync("python3", [new URL("./orca-private-key.py", import.meta.url).pathname, key, ...(shift ? ["--shift"] : [])], { env, timeout: 5000 });
    nativeKey("Tab");
    await page.waitForFunction(() => document.activeElement?.textContent?.trim() === "Ver projeto");
    nativeKey("Tab", true);
    await page.waitForFunction(() => document.activeElement?.getAttribute("aria-label") === "Próximo projeto");
    const beforeTitle = await page.locator("#projetos h3").innerText();
    const logStart = (await orcaLog()).length;
    nativeKey("Return");
    await page.waitForFunction(previous => document.querySelector("#projetos h3")?.textContent !== previous, beforeTitle);
    const afterTitle = await page.locator("#projetos h3").innerText();
    console.log(JSON.stringify({ checkpoint: "selected-project", beforeTitle, afterTitle, logStart }));
    const announcementDeadline = performance.now() + 20000;
    let speech = [];
    while (performance.now() < announcementDeadline) {
      speech = (await orcaLog()).slice(logStart).split("\n").filter(line => line.includes("SPEECH OUTPUT:"));
      if (speech.some(line => line.includes(afterTitle))) break;
      await wait(250);
    }
    console.log(JSON.stringify({ checkpoint: "generated-announcements", speech }));
    assert.ok(speech.some(line => line.includes(afterTitle)), "Orca must generate the newly active project's title");
    const returnLogStart = (await orcaLog()).length;
    nativeKey("space");
    await page.waitForFunction(previous => document.querySelector("#projetos h3")?.textContent !== previous, afterTitle);
    assert.equal(await page.locator("#projetos h3").innerText(), beforeTitle);
    const returnDeadline = performance.now() + 20000;
    let returnSpeech = [];
    while (performance.now() < returnDeadline) {
      returnSpeech = (await orcaLog()).slice(returnLogStart).split("\n").filter(line => line.includes("SPEECH OUTPUT:"));
      if (returnSpeech.some(line => line.includes(beforeTitle))) break;
      await wait(250);
    }
    assert.ok(returnSpeech.some(line => line.includes(beforeTitle)), "Orca must generate the restored project's title");
    assert.equal(await next.evaluate(element => element === document.activeElement), true);
    assert.deepEqual(errors, []);
    // Optional analytics can attempt POSTs. Every non-GET is intercepted above;
    // don't mislabel a blocked request as a completed mutation or a failed AT check.
    console.log(JSON.stringify({ passed: true, beforeTitle, afterTitle, speech, returnSpeech, nativeKeys: ["Tab", "Shift-Tab", "Enter", "Space"], focusRetained: true, blockedNonGetRequests: attemptedWrites, runtimeErrors: errors,
      artifactDirectory: dir, scope: "native X11 injected keyboard events and real Orca-generated carousel text; no audio playback, not physical hardware, mobile VoiceOver or complete screen-reader certification" }));
  } catch (error) {
    console.log(JSON.stringify({ failed: true, stage, errorName: error.name,
      sourceLocation: error.stack?.match(/check-live-orca-carousel\.mjs:\d+:\d+/)?.[0], artifactDirectory: dir }));
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    for (const child of children.reverse()) await stop(child);
  }
}
