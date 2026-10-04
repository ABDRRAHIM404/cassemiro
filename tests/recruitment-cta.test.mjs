import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("homepage recruitment link sits beside WhatsApp and uses its own configurable message", () => {
  const source = readFileSync(new URL("../src/components/marketing/ContactCta.tsx", import.meta.url), "utf8");
  const links = [...source.matchAll(/<a href=\{`https:\/\/wa\.me\/\$\{business\.phoneE164\}\?text=\$\{encodeURIComponent\((.*?)\)\}`\}([^>]+)>(.*?)<ArrowIcon \/><\/a>/g)];
  assert.equal(links.length, 2);
  assert.match(links[0][1], /business\.quoteMessage/);
  assert.equal(links[0][3].trim(), "Falar no WhatsApp");
  assert.equal(links[1][1], "business.recruitmentMessage.trim() || defaultBusinessSettings.recruitmentMessage");
  assert.equal(links[1][3].trim(), "Faça parte da nossa equipe");
  assert.match(links[1][2], /target="_blank" rel="noreferrer"/);
  assert.doesNotMatch(links[1][1], /quoteMessage/);
  assert.doesNotMatch(source, /use client|onClick=/);
});

test("contact actions wrap on desktop and stack with accessible touch targets on mobile", () => {
  const css = readFileSync(new URL("../src/components/marketing/ContactCta.module.css", import.meta.url), "utf8");
  assert.match(css, /\.content \{ max-width: 850px/);
  assert.match(css, /\.actions \{[^}]*flex-wrap: wrap/);
  assert.match(css, /\.primary, \.secondary \{[^}]*min-height: 48px/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*\.actions \{[^}]*flex-direction: column/);
});
