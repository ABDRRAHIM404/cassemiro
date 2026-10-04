// Explicit operator test: requires owner approval before running against production.
// Creates ONE unpublished fixture; only that project's rows/objects are removed.
// Browser/Auth credentials stay in memory. No customer records are edited.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

if (process.env.APPROVED_PRIVATE_TEST !== "yes") throw new Error("Explicit private-test approval required");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
assert.equal(new URL(url).hostname, "zjjepitczgffszbilfte.supabase.co");
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE);
const origin = process.env.AUDIT_ORIGIN ?? "http://127.0.0.1:3001";
assert.ok(["http://127.0.0.1:3001", "https://cassemiro-one.vercel.app"].includes(origin), "Unexpected private-test origin");
const slug = `private-audit-${randomUUID()}`;
const title = `PRIVATE AUDIT TEST ${slug.slice(-12)}`;
const bucket = "project-media-private";
const buffer = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZVQAAAAASUVORK5CYII=", "base64");
const image = { name: "private-audit-fixture.png", mimeType: "image/png", buffer };
const jar = new Map();
let browser, session, fixtureId, page;
const proof = {};
async function rows(table, columns = "*") {
  const result = await admin.from(table).select(columns).order("id");
  if (result.error) throw new Error(`Unable to read ${table}`);
  return result.data;
}
async function associations() {
  const result = await admin.from("project_services").select("project_id,service_id");
  if (result.error) throw new Error("Unable to read associations");
  return result.data;
}
const baseline = {
  projects: await rows("projects"), media: await rows("project_media"),
  links: await associations(),
};
async function fixture() {
  const result = await admin.from("projects").select("*").eq("slug", slug).maybeSingle();
  if (result.error) throw new Error("Unable to resolve exact fixture");
  if (result.data) {
    assert.equal(result.data.title, title);
    assert.equal(result.data.is_published, false, "Fixture must NEVER be published");
    fixtureId = result.data.id;
  }
  return result.data;
}
async function media() {
  assert.ok(fixtureId);
  const result = await admin.from("project_media").select("*").eq("project_id", fixtureId);
  if (result.error) throw new Error("Unable to read fixture media");
  return result.data;
}
async function files() {
  assert.ok(fixtureId);
  const result = await admin.storage.from(bucket).list(fixtureId, { limit: 100 });
  if (result.error) throw new Error("Unable to inspect fixture objects");
  return result.data;
}
try {
  const bucketCheck = await admin.storage.getBucket(bucket);
  assert.ok(!bucketCheck.error && bucketCheck.data.public === false, "Fixture bucket must be private");
  const users = await admin.auth.admin.listUsers({ page: 1, perPage: 100 });
  if (users.error) throw new Error("Unable to resolve existing admin");
  const user = users.data.users.find(item => item.email === process.argv[2]);
  assert.ok(user?.email_confirmed_at, "Existing confirmed user required");
  const profile = await admin.from("profiles").select("id").eq("id", user.id).single();
  assert.ifError(profile.error);
  const generated = await admin.auth.admin.generateLink({ type: "magiclink", email: user.email });
  assert.ifError(generated.error);
  const auth = createServerClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { cookies: {
    getAll: () => [...jar.values()],
    setAll: cookies => cookies.forEach(cookie => jar.set(cookie.name, { name: cookie.name, value: cookie.value })),
  } });
  const verified = await auth.auth.verifyOtp({ token_hash: generated.data.properties.hashed_token, type: "email" });
  assert.ifError(verified.error);
  session = verified.data.session;
  assert.equal(verified.data.user.id, user.id);
  browser = await chromium.launch({ executablePath: "/home/bng/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome", headless: true,
    args: process.env.BROWSER_PROXY_HTTP1 === "1" ? ["--disable-http2", "--disable-quic"] : [],
    proxy: { server: process.env.HTTPS_PROXY || process.env.HTTP_PROXY || "http://192.168.1.187:8080", bypass: "localhost,127.0.0.1" } });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addCookies([...jar.values()].map(cookie => ({ ...cookie, url: origin })));
  page = await context.newPage();
  page.setDefaultTimeout(60000);
  page.setDefaultNavigationTimeout(60000);
  const errors = [];
  page.on("pageerror", error => errors.push(error.name));
  page.on("dialog", dialog => dialog.accept());
  // The sole failure is BEFORE media insertion: Storage remains real/private.
  let uploads = 0, insertAttempts = 0;
  await page.route(`${url}/**`, async route => {
    const request = route.request();
    const endpoint = new URL(request.url());
    if (request.method() === "POST" && endpoint.pathname.startsWith(`/storage/v1/object/${bucket}/`)) {
      await fixture();
      assert.ok(decodeURIComponent(endpoint.pathname).startsWith(`/storage/v1/object/${bucket}/${fixtureId}/`));
      uploads++;
    }
    if (request.method() === "POST" && endpoint.pathname === "/rest/v1/project_media") {
      await fixture();
      const record = request.postDataJSON();
      assert.equal(record.project_id, fixtureId);
      assert.ok(record.storage_path.startsWith(`${fixtureId}/`));
      insertAttempts++;
      if (insertAttempts === 1) return route.fulfill({ status: 503, contentType: "application/json",
        headers: { "access-control-allow-origin": "*" }, body: JSON.stringify({ message: "Controlled private-test registration failure" }) });
    }
    return route.continue();
  });
  await page.goto(`${origin}/admin/projetos/novo`, { waitUntil: "load" });
  const form = page.locator(".project-form");
  await form.locator('[name="title"]').fill(title);
  await form.locator('[name="slug"]').fill(slug);
  await form.locator('[name="summary"]').fill("Temporary owner-approved private test. Not a real construction project.");
  await form.locator('[name="is_published"]').uncheck();
  await form.locator('[name="service_ids"]').first().check();
  await form.locator('input[type="file"]').setInputFiles(image);
  await form.getByPlaceholder("Descreva o que aparece na fotografia").fill("Imagem sintética de teste privado, não representa uma obra.");
  await form.getByRole("button", { name: "Guardar projeto e imagens", exact: true }).click();
  await form.getByRole("status").filter({ hasText: "tente novamente para continuar" }).waitFor();
  assert.ok(await fixture());
  assert.equal(await form.locator('[name="title"]').inputValue(), title, "Handled failures must retain required inputs");
  assert.equal(await form.locator('input[type="file"]').evaluate(input => input.files.length), 1);
  assert.equal(await form.evaluate(element => element.checkValidity()), true);
  console.log(JSON.stringify({ checkpoint: "first-upload-attempt", uploads, insertAttempts, status: await form.getByRole("status").innerText() }));
  assert.equal((await files()).length, 1);
  assert.equal((await media()).length, 0);
  await form.getByRole("button", { name: "Tentar novamente", exact: true }).click();
  await page.waitForURL(`${origin}/admin/projetos/${fixtureId}?created=1`, { waitUntil: "commit" });
  let records = await media();
  assert.equal(records.length, 1);
  assert.equal(uploads, 1);
  assert.equal(insertAttempts, 2);
  assert.equal((await fixture()).hero_image, records[0].url);
  proof.createAndRetry = { uploads, insertAttempts, projects: 1, media: 1, unpublished: true };
  console.log(JSON.stringify({ checkpoint: "retry-saved", ...proof.createAndRetry }));
  const anonymous = await browser.newContext();
  try {
    const denied = await anonymous.request.get(origin + records[0].url, { maxRedirects: 0 });
    assert.equal(denied.status(), 404);
    const projectDenied = await anonymous.request.get(`${origin}/projetos/${slug}`);
    assert.equal(projectDenied.status(), 404);
    const allowed = await context.request.get(origin + records[0].url);
    assert.equal(allowed.status(), 200);
    assert.equal((await allowed.body()).length, buffer.length);
    proof.privateAccess = { anonymousImage: 404, anonymousProject: 404, signedInImage: 200 };
    console.log(JSON.stringify({ checkpoint: "private-access", ...proof.privateAccess }));
  } finally { await anonymous.close(); }
  const edit = page.locator(".project-form");
  await edit.locator('[name="summary"]').fill("Edited private fixture; never publish.");
  await edit.getByRole("button", { name: "Salvar projeto", exact: true }).click();
  await page.waitForURL(`${origin}/admin/projetos/${fixtureId}?saved=1`);
  assert.equal((await fixture()).summary, "Edited private fixture; never publish.");
  const links = await admin.from("project_services").select("service_id").eq("project_id", fixtureId);
  assert.ifError(links.error);
  assert.equal(links.data.length, 1);
  proof.editAndAssociation = true;
  await page.locator(".project-media").getByRole("button", { name: "Remover", exact: true }).click();
  await page.locator(".project-media").getByRole("status").filter({ hasText: "Arquivo removido." }).waitFor();
  assert.equal((await media()).length, 0);
  assert.equal((await files()).length, 0);
  assert.equal((await fixture()).hero_image, null);
  proof.removeMediaAndCover = true;
  console.log(JSON.stringify({ checkpoint: "edit-and-media-delete", passed: true }));
  // Reuse the same single fixture image to verify project deletion cleans Storage.
  const gallery = page.locator(".project-media");
  await gallery.locator('input[type="file"]').setInputFiles(image);
  await gallery.getByPlaceholder("Descreva o que aparece na fotografia").fill("Mesmo teste privado, não representa uma obra.");
  await gallery.getByRole("button", { name: "Enviar arquivos", exact: true }).click();
  await gallery.getByRole("status").filter({ hasText: "com sucesso" }).waitFor();
  assert.equal((await media()).length, 1);
  assert.equal((await files()).length, 1);
  await page.getByRole("button", { name: "Excluir projeto", exact: true }).click();
  await page.waitForURL(`${origin}/admin/projetos?deleted=1`);
  assert.equal(await fixture(), null);
  assert.equal((await media()).length, 0);
  assert.equal((await files()).length, 0);
  proof.deleteProjectAndStorage = true;
  assert.deepEqual(errors, []);
  proof.pageErrors = errors;
} catch (error) {
  console.log(JSON.stringify({ checkpoint: "failure", currentPage: page?.url(),
    status: page ? await page.locator('.project-form__status').allTextContents().catch(() => []) : [],
    fixtureMedia: fixtureId ? (await media()).length : 0,
    fixtureObjects: fixtureId ? (await files()).length : 0 }));
  // Transport exceptions can include signed download URLs; keep them out of logs.
  throw new Error(`Private lifecycle check failed (${error.name})`);
} finally {
  if (browser) await browser.close();
  // Even a failed browser assertion must not leave a private test behind.
  try {
    await fixture();
    if (fixtureId) {
      const remaining = await files();
      if (remaining.length) {
        const removed = await admin.storage.from(bucket).remove(remaining.map(file => `${fixtureId}/${file.name}`));
        assert.ifError(removed.error);
      }
      const removed = await admin.from("projects").delete().eq("id", fixtureId).eq("slug", slug).eq("is_published", false);
      assert.ifError(removed.error);
      assert.equal((await media()).length, 0);
      assert.equal((await files()).length, 0);
    }
  } finally {
    if (session) {
      const revoked = await admin.auth.admin.signOut(session.access_token, "local");
      assert.ok(!revoked.error, "Isolated test-session revocation failed");
      proof.sessionRevoked = true;
    }
    jar.clear();
  }
  assert.ok(JSON.stringify(await rows("projects")) === JSON.stringify(baseline.projects), "Real projects must be unchanged");
  assert.ok(JSON.stringify(await rows("project_media")) === JSON.stringify(baseline.media), "Real media must be unchanged");
  const sort = items => [...items].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  assert.ok(JSON.stringify(sort(await associations())) === JSON.stringify(sort(baseline.links)), "Real associations must be unchanged");
  assert.equal(await fixture(), null, "Exact private fixture must be removed");
  console.log(JSON.stringify({ origin, proof, fixtureRemoved: true, customerRowsUnchanged: true, scope: "Existing owner, real hosted Supabase, explicitly approved private fixture; no publication or email test" }));
}
