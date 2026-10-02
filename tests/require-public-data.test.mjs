import assert from "node:assert/strict";
import test from "node:test";
import { requirePublicData } from "../src/lib/supabase/require-public-data.ts";

test("genuine empty public content is allowed", () => {
  assert.deepEqual(requirePublicData({ data: [], error: null }, "projects"), []);
  assert.equal(requirePublicData({ data: null, error: null }, "project detail"), null);
});

test("failed public content read cannot become an empty prerender", () => {
  assert.throws(
    () => requirePublicData({ data: null, error: { message: "temporary database failure" } }, "home projects"),
    /Public content unavailable \(home projects\): temporary database failure/
  );
});
