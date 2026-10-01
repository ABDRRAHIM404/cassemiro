import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

nextEnv.loadEnvConfig(process.cwd());

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Supabase server configuration is missing.");

const projectRef = new URL(url).hostname.split(".")[0];
const apply = process.argv.includes("--apply");
const prunePublic = process.argv.includes("--prune-public");
if (prunePublic && !apply) throw new Error("--prune-public requires --apply.");
if (apply && !process.argv.includes(`--project-ref=${projectRef}`)) {
  throw new Error(`To apply changes, pass --apply --project-ref=${projectRef} after reviewing the dry run.`);
}

const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
const publicBucket = supabase.storage.from("project-media");
const privateBucket = supabase.storage.from("project-media-private");

async function allMedia() {
  const rows = [];
  let hasStoragePathColumn = true;
  for (let from = 0; ; from += 1000) {
    let { data, error } = await supabase.from("project_media")
      .select(hasStoragePathColumn ? "id, project_id, url, storage_path" : "id, project_id, url")
      .order("id").range(from, from + 999);
    if (error?.code === "42703" && hasStoragePathColumn) {
      hasStoragePathColumn = false;
      ({ data, error } = await supabase.from("project_media")
        .select("id, project_id, url").order("id").range(from, from + 999));
    }
    if (error) throw error;
    rows.push(...data);
    if (data.length < 1000) return { rows, hasStoragePathColumn };
  }
}

function pathFor(row) {
  if (row.storage_path) return row.storage_path;
  const marker = "/storage/v1/object/public/project-media/";
  try {
    const parsed = new URL(row.url);
    const index = parsed.pathname.indexOf(marker);
    if (index < 0) return null;
    const path = decodeURIComponent(parsed.pathname.slice(index + marker.length));
    return path.startsWith(`${row.project_id}/`) ? path : null;
  } catch {
    return null;
  }
}

async function hasObject(bucket, path) {
  const slash = path.lastIndexOf("/");
  const { data, error } = await bucket.list(path.slice(0, slash), { search: path.slice(slash + 1), limit: 100 });
  if (error) throw error;
  return data.some((file) => file.name === path.slice(slash + 1));
}

const { rows: media, hasStoragePathColumn } = await allMedia();
const { data: projects, error: projectError } = await supabase.from("projects").select("id, hero_image");
if (projectError) throw projectError;
const projectById = new Map(projects.map((project) => [project.id, project]));
const candidates = media.map((row) => ({ row, path: pathFor(row) })).filter((item) => item.path);

console.log(JSON.stringify({ projectRef, mode: apply ? (prunePublic ? "prune-public" : "apply") : "dry-run", mediaRows: media.length, candidates: candidates.length }));
if (!apply) process.exit(0);
if (!hasStoragePathColumn) throw new Error("Apply the private_project_media migration before migrating files.");

for (const { row, path } of candidates) {
  if (!path.startsWith(`${row.project_id}/`)) throw new Error("Unexpected media path; stopped without deleting its object.");
  const oldUrl = publicBucket.getPublicUrl(path).data.publicUrl;
  const newUrl = `/api/project-media/${row.id}`;
  const publicExists = await hasObject(publicBucket, path);
  const privateExists = await hasObject(privateBucket, path);

  if (!privateExists) {
    if (!publicExists) throw new Error("Media object is missing from both buckets; stopped.");
    const { error } = await publicBucket.copy(path, path, { destinationBucket: "project-media-private" });
    if (error) throw error;
  }

  if (row.url !== newUrl || row.storage_path !== path) {
    const { error } = await supabase.from("project_media")
      .update({ url: newUrl, storage_path: path }).eq("id", row.id);
    if (error) throw error;
  }

  const project = projectById.get(row.project_id);
  if (project?.hero_image === row.url || project?.hero_image === oldUrl) {
    const { error } = await supabase.from("projects")
      .update({ hero_image: newUrl }).eq("id", row.project_id);
    if (error) throw error;
    project.hero_image = newUrl;
  }

  if (prunePublic && publicExists) {
    const { error } = await publicBucket.remove([path]);
    if (error) throw error;
  }
  console.log(JSON.stringify({ migrated: row.id }));
}
