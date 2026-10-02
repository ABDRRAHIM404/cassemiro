import assert from "node:assert/strict";
import test from "node:test";
import { quoteRequestSchema } from "../src/features/quotes/validation.ts";

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
