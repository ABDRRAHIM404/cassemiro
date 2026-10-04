import assert from "node:assert/strict";
import { test } from "node:test";
import { interruptedMediaIdentity, isInterruptedUploadOldEnough, INTERRUPTED_UPLOAD_GRACE_MS } from "../src/lib/admin/interrupted-media.ts";
import { readFileSync } from "node:fs";

const project = "11111111-1111-4111-8111-111111111111";
const media = "22222222-2222-4222-8222-222222222222";
test("interrupted media recovers only an exact project-scoped stable upload identity", () => {
  for (const extension of ["jpg", "png", "webp", "avif", "mp4", "webm"]) {
    assert.equal(interruptedMediaIdentity(project, `${project}/upload-${media}.${extension}`), media);
  }
  for (const path of [`${media}/upload-${media}.webp`, `${project}/../upload-${media}.webp`, `${project}/upload-${media}.svg`,
    `${project}/${media}.webp`, `${project}/nested/upload-${media}.webp`, `${project}/upload-${media}.webp?x=1`]) {
    assert.equal(interruptedMediaIdentity(project, path), null);
  }
});
test("recent, invalid and future upload times are never treated as abandoned", () => {
  const now = Date.parse("2026-10-04T12:00:00Z");
  assert.equal(isInterruptedUploadOldEnough(new Date(now - INTERRUPTED_UPLOAD_GRACE_MS).toISOString(), now), true);
  for (const date of [null, undefined, "bad", new Date(now + 1).toISOString(), new Date(now - 1).toISOString()]) {
    assert.equal(isInterruptedUploadOldEnough(date, now), false);
  }
});
test("both upload forms encode the row identity and recovery never deletes files", () => {
  for (const file of ["ProjectForm", "ProjectMediaManager"]) {
    assert.match(readFileSync(`src/components/admin/${file}.tsx`, "utf8"), /upload-\$\{id\}/);
  }
  const actions = readFileSync("src/app/admin/(protected)/projetos/actions.ts", "utf8");
  const recovery = actions.split("export async function recoverInterruptedProjectMedia")[1].split("export async function deleteProject")[0];
  assert.match(recovery, /await requireAdmin\(\)/);
  assert.match(recovery, /interruptedMediaIdentity/);
  assert.match(recovery, /isInterruptedUploadOldEnough/);
  assert.match(recovery, /reconciled/);
  assert.doesNotMatch(recovery, /\.remove\(|\.upload\(|\.delete\(|\.update\(/);
});
