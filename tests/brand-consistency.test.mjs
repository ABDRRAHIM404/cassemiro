import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, existsSync } from "node:fs";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("admin and authentication shells use the approved responsive client logo", () => {
  const logo = read("src/components/brand/Logo.tsx");
  const css = read("src/components/brand/Logo.module.css");
  assert.match(logo, /src="\/images\/brand\/client-logo-construcoes-dark-v1\.png"/);
  assert.match(logo, /alt="CASSEMIRO Construções & Reformas"/);
  assert.match(logo, /width=\{1604\}/);
  assert.match(logo, /height=\{980\}/);
  assert.doesNotMatch(logo, /<svg|logo__mark|logo__type/);
  assert.match(css, /height: 64px[^}]*mix-blend-mode: lighten/);
  assert.match(css, /height: 56px/);
  for (const shell of ["AdminShell", "AuthShell"]) assert.match(read(`src/components/admin/${shell}.tsx`), /<Logo\s*\/>/);
  assert.match(read("src/components/admin/AdminWorkspace.module.css"), /\.sidebar \{[^}]*background: #171a16[^}]*isolation: isolate/);
  assert.match(read("src/components/admin/AuthShell.module.css"), /\.root \{[^}]*background: #11120f[^}]*isolation: isolate/);
});

test("browser icon and social preview reuse approved artwork instead of the old SVG", () => {
  for (const path of ["src/app/icon.tsx", "src/app/social-preview/route.ts"]) {
    const source = read(path);
    assert.match(source, /public\/images\/brand\/client-logo-construcoes-dark-v1\.png/);
    assert.match(source, /ImageResponse/);
    assert.doesNotMatch(source, /M42 9 24 1|viewBox.*0 0 48 56/);
  }
  assert.equal(existsSync(new URL("../src/app/icon.svg", import.meta.url)), false);
  assert.doesNotMatch(read("src/app/globals.css"), /logo__mark|logo__type/);
});
