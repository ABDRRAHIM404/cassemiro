import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { deleteProjectStorage } from "../src/lib/admin/delete-project-storage.ts";

const id = "d4d26b81-28d3-4ab5-8120-47833889c151";
const file = name => ({ name, id: `object-${name}` });

test("cleanup inventories all pages and nested folders before bounded removal", async () => {
  const entries = Array.from({ length: 2501 }, (_, i) => file(`${String(i).padStart(4, "0")}.webp`));
  entries.push({ name: "legacy", id: null });
  const events = [];
  const removed = [];
  await deleteProjectStorage(id, ["legacy", "private"], {
    list: async (bucket, prefix, offset, limit) => {
      events.push({ type: "list", bucket, prefix, offset, limit });
      assert.ok(prefix === id || prefix.startsWith(`${id}/`));
      const objects = bucket === "legacy" ? (prefix === id ? entries : [file("before.jpg"), file("after.mp4")]) : [];
      return objects.slice(offset, offset + limit);
    },
    remove: async (bucket, paths) => {
      events.push({ type: "remove", bucket });
      assert.ok(paths.length > 0 && paths.length <= 1000);
      assert.equal(bucket, "legacy");
      removed.push(...paths);
    }
  });
  assert.deepEqual(events.filter(e => e.type === "list" && e.prefix === id && e.bucket === "legacy").map(e => e.offset), [0, 1000, 2000]);
  assert.equal(removed.length, 2503);
  assert.equal(new Set(removed).size, 2503);
  assert.ok(removed.includes(`${id}/legacy/before.jpg`));
  assert.ok(removed.includes(`${id}/legacy/after.mp4`));
  assert.ok(!removed.includes(`${id}/legacy`));
  const firstRemoval = events.findIndex(e => e.type === "remove");
  assert.ok(events.slice(firstRemoval).every(e => e.type === "remove"));
  assert.ok(events.slice(0, firstRemoval).some(e => e.bucket === "private"));
});

test("exact full page requires a final empty page; empty folders need no removal", async () => {
  const offsets = [];
  let removed = 0;
  await deleteProjectStorage(id, ["private"], {
    list: async (_bucket, _prefix, offset, limit) => {
      offsets.push(offset);
      return offset === 0 ? Array.from({ length: limit }, (_, i) => file(`${i}.png`)) : [];
    },
    remove: async (_bucket, paths) => { removed += paths.length; }
  });
  assert.deepEqual(offsets, [0, 1000]);
  assert.equal(removed, 1000);
  await deleteProjectStorage(id, ["private"], { list: async () => [], remove: async () => assert.fail("Empty folder") });
});

test("any bucket or later-page inventory failure prevents all deletion", async () => {
  for (const scenario of ["second-bucket", "later-page", "nested-folder"]) {
    await assert.rejects(deleteProjectStorage(id, ["legacy", "private"], {
      list: async (bucket, prefix, offset, limit) => {
        if (scenario === "second-bucket" && bucket === "private" ||
            scenario === "later-page" && offset > 0 ||
            scenario === "nested-folder" && prefix !== id) throw new Error("Synthetic listing failure");
        if (scenario === "later-page") return Array.from({ length: limit }, (_, i) => file(`${i}.jpg`));
        if (scenario === "nested-folder") return [{ name: "nested", id: null }];
        return [file("original.jpg")];
      },
      remove: async () => assert.fail("No files may be removed after failed inventory")
    }), /Synthetic listing failure/);
  }
});

test("invalid project roots and unsafe or repeated names fail closed", async () => {
  for (const root of ["", "/", "..", `${id}/other`, "not-an-id"]) {
    await assert.rejects(deleteProjectStorage(root, ["private"], {
      list: async () => assert.fail("Invalid root must not be listed"),
      remove: async () => assert.fail("Invalid root must not be removed")
    }), /Identificador/);
  }
  for (const names of [[".."], ["."], [""], ["../other.jpg"], ["other/file.png"], ["other\\file.png"], ["a\0b"], ["same.jpg", "same.jpg"]]) {
    await assert.rejects(deleteProjectStorage(id, ["private"], {
      list: async () => names.map(file),
      remove: async () => assert.fail("Unsafe inventory must not be removed")
    }), /verificar/);
  }
});

test("removal error stops later batches and buckets", async () => {
  let calls = 0;
  await assert.rejects(deleteProjectStorage(id, ["legacy", "private"], {
    list: async (_bucket, _prefix, offset) => offset === 0 ? Array.from({ length: 1000 }, (_, i) => file(`${i}.jpg`)) : [file("tail.jpg")],
    remove: async () => { calls++; throw new Error("Synthetic removal failure"); }
  }), /Synthetic removal failure/);
  assert.equal(calls, 1);
});

test("server deletion keeps authentication, project preflight, sorted listing and DB ordering", async () => {
  const source = await readFile(new URL("../src/app/admin/(protected)/projetos/actions.ts", import.meta.url), "utf8");
  const action = source.slice(source.indexOf("export async function deleteProject("));
  assert.match(action, /await requireAdmin\(\)/);
  assert.match(action, /if \(projectError \|\| !project\) throw/);
  assert.match(action, /sortBy: \{ column: "name", order: "asc" \}/);
  assert.match(action, /if \(error \|\| !data\) throw/);
  assert.ok(action.indexOf("await requireAdmin") < action.indexOf("await deleteProjectStorage"));
  assert.ok(action.indexOf("if (projectError") < action.indexOf("await deleteProjectStorage"));
  assert.ok(action.indexOf("await deleteProjectStorage") < action.indexOf('.from("projects").delete()'));
  assert.doesNotMatch(action, /createServiceRoleClient|emptyBucket/);
});
