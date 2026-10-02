import assert from "node:assert/strict";
import test from "node:test";
import { quoteRequestSchema } from "../src/features/quotes/validation.ts";
import { parseBrazilianDate } from "../src/features/quotes/date.ts";

const validQuote = {
  name: "Cliente Teste",
  phone: "(15) 99610-1849",
  city: "Sorocaba",
  workType: "Reforma",
  description: "Reforma de uma residência existente.",
};

test("quote validation accepts the empty honeypot used by the form", () => {
  assert.equal(quoteRequestSchema.safeParse({ ...validQuote, company: "" }).success, true);
});

test("filled honeypot parses for the route's quiet-success branch", () => {
  const result = quoteRequestSchema.safeParse({ ...validQuote, company: "Bot Company" });
  assert.equal(result.success, true);
  assert.equal(result.data.company, "Bot Company");
});

test("oversized honeypot content remains invalid", () => {
  assert.equal(quoteRequestSchema.safeParse({ ...validQuote, company: "x".repeat(201) }).success, false);
});

test("Brazilian date entry converts to the unambiguous API date", () => {
  assert.equal(parseBrazilianDate("01/10/2026"), "2026-10-01");
  assert.equal(parseBrazilianDate(" 29/02/2028 "), "2028-02-29");
  assert.equal(quoteRequestSchema.safeParse({ ...validQuote, desiredStart: parseBrazilianDate("01/10/2026") }).success, true);
});

test("Brazilian date entry rejects impossible and ambiguous dates", () => {
  for (const value of ["31/02/2026", "29/02/2027", "13/13/2026", "1/10/2026", "10/01/26", "2026-10-01"]) {
    assert.equal(parseBrazilianDate(value), null, value);
  }
});
