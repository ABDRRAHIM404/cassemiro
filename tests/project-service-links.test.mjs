import assert from "node:assert/strict";
import test from "node:test";
import { projectServiceLinkChanges } from "../src/lib/project-service-links.ts";

test("unchanged project services require no writes", () => {
  assert.deepEqual(projectServiceLinkChanges(["a", "b"], ["b", "a"]), { added: [], removed: [] });
});

test("project services add new links before removing obsolete links", () => {
  assert.deepEqual(projectServiceLinkChanges(["a", "b"], ["b", "c"]), { added: ["c"], removed: ["a"] });
});

test("duplicate submitted services do not create duplicate inserts", () => {
  assert.deepEqual(projectServiceLinkChanges(["a"], ["a", "b", "b"]), { added: ["b"], removed: [] });
});
