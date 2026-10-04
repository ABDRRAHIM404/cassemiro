import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { persistMediaUpload } from "../src/lib/admin/media-upload.ts";

function fixture() {
  const attempt = { id: "stable-media-id", path: "project/stable-photo.webp", started: false, storageUploaded: false };
  const state = { object: false, record: false, uploads: 0, inserts: 0 };
  const operations = {
    recordExists: async () => state.record,
    uploadObject: async () => { state.uploads++; state.object = true; },
    objectExists: async () => state.object,
    insertRecord: async () => { state.inserts++; state.record = true; }
  };
  return { attempt, state, operations };
}

test("normal media save uploads and registers exactly once", async () => {
  const { attempt, state, operations } = fixture();
  await persistMediaUpload(attempt, operations);
  await persistMediaUpload(attempt, operations);
  assert.deepEqual(state, { object: true, record: true, uploads: 1, inserts: 1 });
});

test("lost insert response does not delete a successfully registered object", async () => {
  const { attempt, state, operations } = fixture();
  operations.insertRecord = async () => { state.inserts++; state.record = true; throw new Error("Response lost after commit"); };
  await persistMediaUpload(attempt, operations);
  assert.equal(state.object, true);
  assert.equal(state.record, true);
  assert.equal(state.inserts, 1);
});

test("failed registration retries the same identity without uploading another file", async () => {
  const { attempt, state, operations } = fixture();
  const insert = operations.insertRecord;
  operations.insertRecord = async () => { state.inserts++; throw new Error("Database temporarily unavailable"); };
  await assert.rejects(persistMediaUpload(attempt, operations), /temporarily unavailable/);
  assert.equal(state.object, true);
  operations.insertRecord = insert;
  await persistMediaUpload(attempt, operations);
  assert.deepEqual(state, { object: true, record: true, uploads: 1, inserts: 2 });
  assert.equal(attempt.id, "stable-media-id");
  assert.equal(attempt.path, "project/stable-photo.webp");
});

test("unavailable reconciliation preserves committed data until a later retry", async () => {
  const { attempt, state, operations } = fixture();
  operations.insertRecord = async () => { state.inserts++; state.record = true; throw new Error("Response lost"); };
  operations.recordExists = async () => { throw new Error("Verification unavailable"); };
  await assert.rejects(persistMediaUpload(attempt, operations), /Verification unavailable/);
  assert.equal(state.object, true);
  operations.recordExists = async () => state.record;
  await persistMediaUpload(attempt, operations);
  assert.equal(state.uploads, 1);
  assert.equal(state.inserts, 1);
});

test("lost Storage acknowledgement reconciles the existing object", async () => {
  const { attempt, state, operations } = fixture();
  operations.uploadObject = async () => { state.uploads++; state.object = true; throw new Error("Storage response lost"); };
  await persistMediaUpload(attempt, operations);
  assert.equal(attempt.storageUploaded, true);
  assert.equal(state.record, true);
  assert.equal(state.uploads, 1);
});

test("failed Storage upload cannot register a missing object", async () => {
  const { attempt, state, operations } = fixture();
  operations.uploadObject = async () => { state.uploads++; throw new Error("Storage unavailable"); };
  await assert.rejects(persistMediaUpload(attempt, operations), /Storage unavailable/);
  assert.equal(state.inserts, 0);
  assert.equal(attempt.storageUploaded, false);
});

test("both admin upload flows retain per-file identities and use the shared recovery path", async () => {
  for (const component of ["ProjectForm", "ProjectMediaManager"]) {
    const source = await readFile(new URL(`../src/components/admin/${component}.tsx`, import.meta.url), "utf8");
    assert.match(source, /attempts: Map<number, MediaUploadAttempt>/);
    assert.match(source, /await uploadProjectMedia\(supabase, attempt,/);
    assert.doesNotMatch(source, /cleanupError/);
  }
});
