import assert from "node:assert/strict";
import test from "node:test";
import { quotePageHref, quotePageNumber } from "../src/lib/admin/quote-pagination.ts";

test("quote page rejects invalid and oversized page numbers", () => {
  for (const value of [undefined, "0", "-1", "2.5", "NaN", "100001"]) {
    assert.equal(quotePageNumber(value), 1);
  }
  assert.equal(quotePageNumber("3"), 3);
});

test("quote page links preserve filters and encode search text", () => {
  assert.equal(quotePageHref(2, "Em contato", "São Paulo"), "/admin/orcamentos?status=Em+contato&busca=S%C3%A3o+Paulo&pagina=2");
  assert.equal(quotePageHref(1, "", ""), "/admin/orcamentos");
});
