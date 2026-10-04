import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { updateUploadFileState, uploadFileStateLabels } from "../src/lib/admin/upload-progress.ts";

test("partial upload shows saved, uncertain and not-yet-attempted files independently", () => {
  const original = ["first.webp", "second.webp", "third.webp"].map(name => ({ name, state: "pending" }));
  let progress = updateUploadFileState(original, 0, "saved");
  progress = updateUploadFileState(progress, 1, "uploading");
  progress = updateUploadFileState(progress, 1, "unconfirmed");
  assert.deepEqual(progress.map(item => item.state), ["saved", "unconfirmed", "pending"]);
  assert.deepEqual(original.map(item => item.state), ["pending", "pending", "pending"]);
  assert.match(uploadFileStateLabels.unconfirmed, /não confirmado/);
  progress = updateUploadFileState(progress, 1, "uploading");
  progress = updateUploadFileState(progress, 1, "saved");
  assert.deepEqual(progress.map(item => item.state), ["saved", "saved", "pending"]);
});

test("both upload forms report confirmed files only after registration and preserve finalization results", async () => {
  for (const file of ["ProjectForm", "ProjectMediaManager"]) {
    const source = await readFile(new URL(`../src/components/admin/${file}.tsx`, import.meta.url), "utf8");
    assert.match(source, /<UploadFileProgress items=\{fileProgress\}/);
    assert.ok(source.indexOf('updateUploadFileState(items, index, "saved")') > source.indexOf("await uploadProjectMedia("));
    assert.match(source, /currentIndex = null;[\s\S]*catch \(error\)/);
    assert.match(source, /if \(currentIndex !== null\)/);
  }
});
