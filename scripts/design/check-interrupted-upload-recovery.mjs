// Explicitly approved, one unpublished draft/one synthetic image. No email.
// Auth material stays in memory; exact fixtures are removed in finally.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

if (process.env.APPROVED_INTERRUPTED_UPLOAD_TEST !== "yes") throw new Error("Explicit private recovery-test approval required");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
assert.equal(new URL(url).hostname, "zjjepitczgffszbilfte.supabase.co");
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const origin = process.env.AUDIT_ORIGIN ?? "http://127.0.0.1:3003";
assert.ok(["http://127.0.0.1:3003", "https://cassemiro-one.vercel.app"].includes(origin));
const bucket = "project-media-private";
const projectId = randomUUID(), slug = `private-recovery-${projectId}`;
const jar = new Map();
let token, browser, path, stage = "baseline", failed = false, created = false;
const proof = {};
async function rows(table) {
  const result = await admin.from(table).select("*").order("id");
  assert.ifError(result.error);
  return result.data;
}
const baselineProjects = await rows("projects"), baselineMedia = await rows("project_media");
const users = await admin.auth.admin.listUsers({ page: 1, perPage: 100 });
assert.ifError(users.error);
const profiles = await admin.from("profiles").select("id").eq("role", "owner").single();
assert.ifError(profiles.error);
const owner = users.data.users.find(user => user.id === profiles.data.id);
assert.ok(owner?.email_confirmed_at && owner.email);
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE);
try {
  stage = "isolated-session";
  const link = await admin.auth.admin.generateLink({ type: "magiclink", email: owner.email });
  assert.ifError(link.error);
  assert.equal(link.data.user.id, owner.id);
  const session = createServerClient(url, anon, { cookies: {
    getAll: () => [...jar.values()],
    setAll: values => values.forEach(value => jar.set(value.name, { name: value.name, value: value.value })),
  } });
  const verified = await session.auth.verifyOtp({ token_hash: link.data.properties.hashed_token, type: "email" });
  assert.ifError(verified.error);
  assert.equal(verified.data.user.id, owner.id);
  token = verified.data.session.access_token;
  stage = "private-draft";
  const inserted = await session.from("projects").insert({ id: projectId, slug, title: `PRIVATE RECOVERY ${projectId}`, is_published: false });
  assert.ifError(inserted.error);
  created = true;
  browser = await chromium.launch({ executablePath: "/home/bng/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome", headless: true,
    args: process.env.BROWSER_PROXY_HTTP1 === "1" ? ["--disable-http2", "--disable-quic"] : [],
    proxy: { server: process.env.HTTPS_PROXY || process.env.HTTP_PROXY || "http://192.168.1.187:8080", bypass: "localhost,127.0.0.1" } });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addCookies([...jar.values()].map(cookie => ({ ...cookie, url: origin })));
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  const errors = [];
  page.on("pageerror", error => errors.push(error.name));
  stage = "upload-interrupted-registration";
  await page.goto(`${origin}/admin/projetos/${projectId}`, { waitUntil: "load" });
  assert.equal(new URL(page.url()).pathname, `/admin/projetos/${projectId}`);
  const image = await sharp({ create: { width: 64, height: 48, channels: 3, background: { r: 140, g: 112, b: 78 } } }).webp().toBuffer();
  await page.getByLabel("Arquivos", { exact: true }).setInputFiles({ name: "synthetic-private-recovery.webp", mimeType: "image/webp", buffer: image });
  await page.locator('.project-media').getByPlaceholder("Descreva o que aparece na fotografia").fill("Synthetic private audit image, not a real project photo");
  let blocked = 0;
  await page.route("**/rest/v1/project_media*", route => {
    if (route.request().method() === "POST") { blocked++; return route.abort("failed"); }
    return route.continue();
  });
  await page.getByRole("button", { name: "Enviar arquivos", exact: true }).click();
  await page.getByRole("button", { name: "Tentar novamente", exact: true }).waitFor();
  assert.equal(blocked, 1);
  const files = await admin.storage.from(bucket).list(projectId);
  assert.ifError(files.error);
  assert.equal(files.data.length, 1);
  path = `${projectId}/${files.data[0].name}`;
  const mediaId = /^upload-([0-9a-f-]+)\.webp$/.exec(files.data[0].name)?.[1];
  assert.ok(mediaId);
  assert.deepEqual((await rows("project_media")), baselineMedia);
  await page.close(); // Discard selected File/ref state; recovery must be durable.
  stage = "fresh-tab-grace";
  const fresh = await context.newPage();
  fresh.setDefaultTimeout(60000);
  fresh.on("pageerror", error => errors.push(error.name));
  const edit = `${origin}/admin/projetos/${projectId}?uploads=1`;
  await fresh.goto(edit, { waitUntil: "domcontentloaded" });
  await fresh.getByText("Nenhum envio recuperável encontrado.", { exact: true }).waitFor();
  assert.equal(await fresh.getByRole("button", { name: "Adicionar à galeria sem reenviar", exact: true }).count(), 0);
  proof.closedTab = { objectPreserved: true, noMediaRow: true, recentFileNotRecoverable: true };
  const anonymous = await browser.newContext();
  try {
    assert.equal((await anonymous.request.get(`${origin}/api/project-media/${mediaId}`)).status(), 404);
    assert.equal((await anonymous.request.get(`${origin}/projetos/${slug}`)).status(), 404);
  } finally { await anonymous.close(); }
  stage = "real-grace-period";
  const info = await admin.storage.from(bucket).info(path);
  assert.ifError(info.error);
  // The editor uses the database listing timestamp, which can be newer than
  // Storage's underlying object Last-Modified. Wait for the newest known date.
  const timestamps = [info.data.lastModified, info.data.updatedAt, info.data.createdAt,
    files.data[0].updated_at, files.data[0].created_at].map(value => Date.parse(value ?? "")).filter(Number.isFinite);
  assert.ok(timestamps.length);
  const deadline = Math.max(...timestamps) + 600000 + 5000;
  assert.ok(Number.isFinite(deadline));
  console.log(JSON.stringify({ checkpoint: stage, projectId, remainingSeconds: Math.ceil((deadline - Date.now()) / 1000) }));
  while (Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, Math.min(30000, deadline - Date.now())));
    console.log(JSON.stringify({ checkpoint: "grace-wait", remainingSeconds: Math.max(0, Math.ceil((deadline - Date.now()) / 1000)) }));
  }
  stage = "recover-existing-object";
  await fresh.goto(edit, { waitUntil: "domcontentloaded" });
  assert.equal(new URL(fresh.url()).pathname, `/admin/projetos/${projectId}`, "Recovery page must remain authenticated");
  await fresh.locator('#interrupted-uploads-title').waitFor();
  const inventory = await admin.storage.from(bucket).list(projectId);
  assert.ifError(inventory.error);
  console.log(JSON.stringify({ checkpoint: "recovery-inventory", files: inventory.data.map(file => ({
    name: file.name, updatedAt: file.updated_at, ageSeconds: (Date.now() - Date.parse(file.updated_at)) / 1000,
  })), renderedRecoveryForms: await fresh.getByRole("button", { name: "Adicionar à galeria sem reenviar", exact: true }).count() }));
  await fresh.getByRole("button", { name: "Adicionar à galeria sem reenviar", exact: true }).waitFor();
  const form = fresh.locator("form").filter({ has: fresh.getByRole("button", { name: "Adicionar à galeria sem reenviar", exact: true }) });
  await form.getByLabel("Descrição do arquivo", { exact: true }).fill("Synthetic private recovery fixture; not a customer photograph");
  // getByLabel's text includes all nested option text here; use the control's
  // actual accessible name, independently verified with the same HTML markup.
  await form.getByRole("combobox", { name: "Tipo de imagem", exact: true }).selectOption("before");
  await form.getByLabel("Grupo comparativo (para Antes/Depois)", { exact: true }).fill("private-audit-comparison");
  const preview = form.getByRole("link", { name: /Conferir arquivo privado/ });
  const previewResponse = await context.request.get(await preview.getAttribute("href"));
  assert.equal(previewResponse.status(), 200);
  assert.deepEqual(await previewResponse.body(), image);
  const requestPromise = fresh.waitForRequest(request => request.method() === "POST" && request.headers()["next-action"]);
  await form.getByRole("button", { name: "Adicionar à galeria sem reenviar", exact: true }).click();
  const actionRequest = await requestPromise;
  await fresh.waitForURL(current => current.searchParams.get("recovered") === "1");
  const record = await admin.from("project_media").select("*").eq("id", mediaId).single();
  assert.ifError(record.error);
  assert.equal(record.data.storage_path, path);
  assert.equal(record.data.project_id, projectId);
  assert.equal(record.data.type, "before");
  assert.equal(record.data.before_after_group, "private-audit-comparison");
  const project = await admin.from("projects").select("hero_image,is_published").eq("id", projectId).single();
  assert.ifError(project.error);
  assert.deepEqual(project.data, { hero_image: null, is_published: false });
  stage = "same-action-retry";
  // Replay only the exact fixture's successful action: same identity, no reupload.
  const headers = { ...actionRequest.headers(), origin };
  delete headers.host; delete headers["content-length"]; delete headers.cookie;
  const replay = await context.request.post(actionRequest.url(), { headers, data: actionRequest.postDataBuffer(), maxRedirects: 0 });
  assert.ok([200, 303].includes(replay.status()));
  assert.ok((replay.headers()["x-action-redirect"] ?? replay.headers().location ?? "").includes("recovered=1"));
  const afterMedia = await admin.from("project_media").select("id").eq("project_id", projectId);
  assert.ifError(afterMedia.error);
  assert.deepEqual(afterMedia.data, [{ id: mediaId }]);
  const download = await context.request.get(`${origin}/api/project-media/${mediaId}`);
  assert.equal(download.status(), 200);
  assert.deepEqual(await download.body(), image);
  const remainingObjects = await admin.storage.from(bucket).list(projectId);
  assert.ifError(remainingObjects.error);
  assert.equal(remainingObjects.data.length, 1);
  assert.deepEqual(errors, []);
  assert.equal(await fresh.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  proof.recovery = { sameObjectAndId: true, noReupload: true, sameActionRetryOneRow: true, comparisonMetadata: true,
    coverAndPublicationUnchanged: true, authenticatedDownload: true, runtimeErrors: [], mobileOverflow: false };
} catch (error) {
  failed = true;
  console.log(JSON.stringify({ checkpoint: stage, failed: true, errorType: error.name,
    sourceLocation: error.stack?.match(/check-interrupted-upload-recovery\.mjs:\d+:\d+/)?.[0] }));
} finally {
  if (browser) await browser.close();
  if (created) {
    const owned = await admin.from("projects").select("slug,is_published").eq("id", projectId).single();
    assert.ifError(owned.error);
    assert.deepEqual(owned.data, { slug, is_published: false });
    const files = await admin.storage.from(bucket).list(projectId, { limit: 100 });
    assert.ifError(files.error);
    assert.ok(files.data.length <= 1);
    if (files.data.length) {
      const removed = await admin.storage.from(bucket).remove(files.data.map(file => `${projectId}/${file.name}`));
      assert.ifError(removed.error);
    }
    const removed = await admin.from("projects").delete().eq("id", projectId).eq("slug", slug).eq("is_published", false);
    assert.ifError(removed.error);
  }
  if (token) assert.ifError((await admin.auth.admin.signOut(token, "local")).error);
  jar.clear();
  assert.ok(JSON.stringify(await rows("projects")) === JSON.stringify(baselineProjects), "Original projects changed");
  assert.ok(JSON.stringify(await rows("project_media")) === JSON.stringify(baselineMedia), "Original media changed");
  const leftover = await admin.storage.from(bucket).list(projectId);
  assert.ifError(leftover.error);
  assert.deepEqual(leftover.data, []);
  console.log(JSON.stringify({ proof, cleanup: { exactPrivateProjectAndImageRemoved: true, originalRowsUnchanged: true, isolatedSessionRevoked: true } }));
  if (failed) process.exitCode = 1;
}
