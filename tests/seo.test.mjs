import assert from "node:assert/strict";
import test from "node:test";
import { titleWithSingleBrand } from "../src/lib/seo.ts";

test("custom titles already ending in CASSEMIRO bypass the parent suffix", () => {
  assert.deepEqual(titleWithSingleBrand("Residência Linear | CASSEMIRO"), { absolute: "Residência Linear | CASSEMIRO" });
  assert.equal(titleWithSingleBrand("Residência Linear"), "Residência Linear");
});
