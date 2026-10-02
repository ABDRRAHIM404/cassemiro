import assert from "node:assert/strict";
import test from "node:test";
import { getVerifiedProjectContext } from "../src/lib/project-photo-context.ts";

test("verified completed projects identify the observed construction-stage cover", () => {
  const context = getVerifiedProjectContext("residencia-contemporanea-linear", "/api/project-media/df2b37c2-418b-4f3d-a3bc-49673d61dafa");
  assert.equal(context?.status, "Obra concluída");
  assert.equal(context?.photo?.caption, "Registro da obra em execução");
});

test("replaced covers do not inherit a stale photo description", () => {
  assert.deepEqual(getVerifiedProjectContext("residencia-contemporanea-linear", "/new-photo.webp"), { status: "Obra concluída", photo: null });
  assert.equal(getVerifiedProjectContext("future-project", "/new-photo.webp"), null);
});
