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
