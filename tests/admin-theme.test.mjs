import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { getAdminTheme, getServerAdminTheme, setAdminTheme, subscribeAdminTheme } from "../src/components/admin/admin-theme.ts";

test("admin theme persists, synchronizes, unsubscribes and tolerates blocked storage", () => {
  const events = new EventTarget();
  const values = new Map();
  let blocked = false;
  globalThis.window = {
    localStorage: {
      getItem: key => values.get(key) ?? null,
      setItem: (key, value) => { if (blocked) throw new Error("Storage blocked"); values.set(key, value); },
    },
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
    dispatchEvent: events.dispatchEvent.bind(events),
  };
  let updates = 0;
  const unsubscribe = subscribeAdminTheme(() => updates++);
  try {
    assert.equal(getServerAdminTheme(), "light");
    assert.equal(getAdminTheme(), "light");
    setAdminTheme("dark");
    assert.equal(getAdminTheme(), "dark");
    assert.equal(values.get("cassemiro-admin-theme-v1"), "dark");
    assert.equal(updates, 1);
    setAdminTheme("light");
    blocked = true;
    setAdminTheme("dark");
    assert.equal(getAdminTheme(), "dark", "readable old storage must not override an unsaved choice");
    blocked = false;
    setAdminTheme("light");
    values.set("cassemiro-admin-theme-v1", "dark");
    const event = new Event("storage");
    Object.defineProperty(event, "key", { value: "cassemiro-admin-theme-v1" });
    events.dispatchEvent(event);
    assert.equal(getAdminTheme(), "dark");
    const before = updates;
    unsubscribe();
    setAdminTheme("light");
    assert.equal(updates, before);
  } finally {
    unsubscribe();
    delete globalThis.window;
  }
});

test("admin theme stays inside the protected shell and has an accessible switch", () => {
  const shell = readFileSync(new URL("../src/components/admin/AdminShell.tsx", import.meta.url), "utf8");
  const theme = readFileSync(new URL("../src/components/admin/AdminTheme.tsx", import.meta.url), "utf8");
  const publicLayout = readFileSync(new URL("../src/app/layout.tsx", import.meta.url), "utf8");
  assert.match(shell, /<AdminTheme>/);
  assert.match(shell, /<AdminThemeToggle \/>/);
  assert.match(theme, /data-admin-theme=\{theme\}/);
  assert.match(theme, /role="switch"/);
  assert.match(theme, /aria-checked=\{dark\}/);
  assert.doesNotMatch(theme, /document\.(documentElement|body)/);
  assert.doesNotMatch(publicLayout, /AdminTheme/);
});

test("live admin theme checker selects an explicit owner and remains read-only", () => {
  const checker = readFileSync(new URL("../scripts/design/check-admin-theme.mjs", import.meta.url), "utf8");
  assert.match(checker, /AUDIT_EXISTING_OWNER_EMAIL/);
  assert.match(checker, /assert\.equal\(profile\.data\.role, "owner"/);
  assert.match(checker, /"quote_requests"/);
  assert.doesNotMatch(checker, /"quotes"|\.eq\("role", "owner"\)\.single\(\)/);
  assert.match(checker, /Navegação administrativa/);
  assert.match(checker, /await theme\("light"\);\s*contrastRatios\.push/);
  assert.match(checker, /assert\.equal\(blockedWrites, 0/);
  assert.match(checker, /signOut\(token, "local"\)/);
  assert.match(checker, /assert\.deepEqual\(await counts\(\), before/);
  assert.match(checker, /AXE_CORE_SCRIPT/);
  assert.match(checker, /"wcag22aa"/);
  assert.match(checker, /Automatic admin accessibility violations require review/);
  assert.match(checker, /AUDIT_FOCUSED_CONTRAST/);
  assert.match(checker, /scrollIntoViewIfNeeded\(\)/);
  assert.match(checker, /elementFromPoint/);
  assert.match(checker, /sample\.ratio >= sample\.required/);
  assert.match(checker, /graphical \? 3 : 4\.5/);
  assert.match(checker, /translucent background/);
  assert.doesNotMatch(checker, /node\.html|node\.failureSummary/);
  assert.doesNotMatch(checker, /\.createUser\(|\.updateUserById\(|\.insert\(|\.delete\(/);
});

test("light admin table hover retains readable bronze links without changing dark or status colors", () => {
  const css = readFileSync(new URL("../src/components/admin/AdminWorkspace.module.css", import.meta.url), "utf8");
  const rule = css.match(/\.root\[data-admin-theme="light"\] :global\(\.admin-table tr:hover td a:not\(\.status\)\) \{ color: (#[\da-f]{6}); \}/);
  assert.ok(rule, "Hover correction must remain scoped to light table links, excluding statuses");
  const background = css.match(/\.root :global\(\.admin-table tr:hover\) \{ background: (#[\da-f]{6}); \}/)[1];
  const luminance = hex => hex.slice(1).match(/../g).map(part => parseInt(part, 16) / 255).map(n => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4).reduce((sum, n, i) => sum + n * [.2126, .7152, .0722][i], 0);
  const a = luminance(rule[1]), b = luminance(background);
  assert.ok((Math.max(a, b) + .05) / (Math.min(a, b) + .05) >= 4.5);
  assert.match(css, /\.root :global\(\.admin-table td a\).*color: var\(--accent\)/);
});
