import assert from "node:assert/strict";
import test from "node:test";
import { serializeJsonLd } from "../src/lib/json-ld.ts";
import { normalizeWhatsAppPhone, whatsappUrlForPhone } from "../src/lib/phone.ts";

test("JSON-LD preserves values without allowing a script-closing tag", () => {
  const input = { description: "</script><script>alert(1)</script>" };
  const serialized = serializeJsonLd(input);

  assert.equal(serialized.includes("<"), false);
  assert.deepEqual(JSON.parse(serialized), input);
});

test("WhatsApp links target complete lead numbers, not the business number", () => {
  assert.equal(normalizeWhatsAppPhone("(15) 99610-1849"), "5515996101849");
  assert.equal(normalizeWhatsAppPhone("+55 15 99610-1849"), "5515996101849");
  assert.equal(normalizeWhatsAppPhone("99610-1849"), null);
  assert.equal(normalizeWhatsAppPhone("not a phone"), null);
  assert.match(whatsappUrlForPhone("(15) 99610-1849", "Olá") ?? "", /^https:\/\/wa\.me\/5515996101849\?/u);
});
