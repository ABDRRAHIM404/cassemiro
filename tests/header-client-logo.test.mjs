import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, existsSync } from "node:fs";

test("public header uses the client logo with responsive sizing and accessible branding", () => {
  const header = readFileSync(new URL("../src/components/layout/Header.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../src/components/layout/Header.module.css", import.meta.url), "utf8");
  assert.match(header, /src="\/images\/brand\/client-logo-construcoes-dark-v1\.png"/);
  assert.match(header, /alt="CASSEMIRO Construções & Reformas"/);
  assert.match(header, /sizes="\(max-width: 1000px\) 92px, 105px"/);
  assert.match(header, /width=\{1604\}/);
  assert.match(header, /height=\{980\}/);
  assert.match(css, /\.clientLogo \{[^}]*height: 64px/);
  assert.match(css, /\.clientLogo \{ height: 56px/);
  assert.match(css, /\.clientLogo \{[^}]*mix-blend-mode: lighten/);
  assert.match(css, /\.header \{[^}]*isolation: isolate/);
  assert.ok(existsSync(new URL("../public/images/brand/client-logo-construcoes-dark-v1.png", import.meta.url)));
});
