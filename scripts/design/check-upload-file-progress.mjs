// Real admin UI/SDK, synthetic responses only. No project/media/Storage writes.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

assert.equal(process.env.AUDIT_INTERCEPTED_UPLOAD_TEST, "yes");
const origin = process.env.UPLOAD_PROGRESS_ORIGIN ?? "http://127.0.0.1:3004";
assert.ok(["http://127.0.0.1:3004", "https://cassemiro-one.vercel.app"].includes(origin));
// Production uses only the gallery: no fabricated Flight response/build ID.
const modes = origin.startsWith("https:") ? ["gallery"] : ["gallery", "creation"];
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
assert.equal(new URL(url).hostname, "zjjepitczgffszbilfte.supabase.co");
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const rows = async table => {
  const result = await admin.from(table).select("*").order("id");
  assert.ifError(result.error);
  return result.data;
};
const projects = await rows("projects"), media = await rows("project_media");
assert.ok(projects.length);
const buildId = (await readFile(".next/BUILD_ID", "utf8")).trim();
const profile = await admin.from("profiles").select("id").eq("role", "owner").single();
assert.ifError(profile.error);
const owner = await admin.auth.admin.getUserById(profile.data.id);
assert.ifError(owner.error);
const jar = new Map();
let token, browser, stage = "session";
const proof = [];
try {
  const link = await admin.auth.admin.generateLink({ type: "magiclink", email: owner.data.user.email });
  assert.ifError(link.error);
  const session = createServerClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { cookies: {
    getAll: () => [...jar.values()],
    setAll: values => values.forEach(value => jar.set(value.name, { name: value.name, value: value.value })),
  } });
  const verified = await session.auth.verifyOtp({ token_hash: link.data.properties.hashed_token, type: "email" });
  assert.ifError(verified.error);
  token = verified.data.session.access_token;
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE);
  browser = await chromium.launch({ executablePath: "/home/bng/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome", headless: true,
    proxy: { server: process.env.HTTPS_PROXY || process.env.HTTP_PROXY || "http://192.168.1.187:8080", bypass: "localhost,127.0.0.1" } });
  for (const width of [390, 1366]) for (const mode of modes) {
    stage = `${mode}-${width}`;
    const context = await browser.newContext({ viewport: { width, height: 844 } });
    await context.addCookies([...jar.values()].map(cookie => ({ ...cookie, url: origin })));
    const records = new Map(), insertAttempts = new Map();
    let uploads = 0, inserts = 0, actions = 0;
    const unexpected = [], errors = [];
    const fakeDraft = randomUUID();
    const json = (route, status, body) => route.fulfill({ status, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(body) });
    try {
      // No local action reaches the actual application, even for creation.
      await context.route(`${origin}/**`, route => {
        if (route.request().method() === "GET") return route.continue();
        if (mode === "creation" && route.request().method() === "POST" && route.request().headers()["next-action"]) {
          actions++;
          const value = actions === 1 ? { id: fakeDraft, publishRequested: false } : { error: "Synthetic finalization failure; no actual draft exists" };
          return route.fulfill({ status: 200, contentType: "text/x-component", body:
            `0:${JSON.stringify({ a: "$@1", f: [], b: buildId })}\n1:${JSON.stringify(value)}\n` });
        }
        unexpected.push("local-write");
        return route.abort();
      });
      await context.route(`${url}/**`, route => {
        const request = route.request(), endpoint = new URL(request.url()), method = request.method();
        if (method === "OPTIONS") return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" } });
        if (method === "POST" && endpoint.pathname.startsWith("/storage/v1/object/project-media-private/")) {
          uploads++;
          return json(route, 200, { Key: endpoint.pathname, Id: randomUUID() });
        }
        if (method === "POST" && endpoint.pathname === "/rest/v1/project_media") {
          inserts++;
          const record = request.postDataJSON();
          const count = (insertAttempts.get(record.id) ?? 0) + 1;
          insertAttempts.set(record.id, count);
          // Registration of the second file fails once; remaining file untouched.
          if (record.sort_order === (mode === "creation" ? 1 : Math.max(-1, ...media.filter(row => row.project_id === projects[0].id).map(row => row.sort_order)) + 2) && count === 1) {
            return json(route, 503, { code: "MOCK", message: "Synthetic uncertain registration" });
          }
          records.set(record.id, record);
          return json(route, 201, null);
        }
        if (method === "GET" && endpoint.pathname === "/rest/v1/project_media" && endpoint.searchParams.has("id")) {
          const record = records.get(endpoint.searchParams.get("id").replace(/^eq\./, ""));
          return json(route, 200, record ? [record] : []);
        }
        if (method !== "GET") { unexpected.push("supabase-write"); return route.abort(); }
        return route.continue();
      });
      const page = await context.newPage();
      page.setDefaultTimeout(20000);
      page.on("pageerror", error => errors.push(error.name));
      await page.goto(`${origin}/admin/projetos/${mode === "creation" ? "novo" : projects[0].id}`, { waitUntil: "load", timeout: 60000 });
      const container = page.locator(mode === "creation" ? ".project-form" : ".project-media");
      if (mode === "creation") await container.getByLabel("Título *", { exact: true }).fill("Synthetic intercepted draft only");
      const buffer = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZVQAAAAASUVORK5CYII=", "base64");
      await container.locator('input[type="file"]').setInputFiles(["first", "second", "third"].map(name => ({ name: `${name}-${"long-filename-".repeat(8)}.png`, mimeType: "image/png", buffer })));
      for (const input of await container.getByPlaceholder("Descreva o que aparece na fotografia").all()) await input.fill("Synthetic local-only test illustration");
      await container.getByRole("button", { name: mode === "creation" ? "Guardar projeto e imagens" : "Enviar arquivos", exact: true }).click();
      await container.getByRole("button", { name: "Tentar novamente", exact: true }).waitFor();
      const list = container.getByRole("region", { name: "Estado de cada arquivo", exact: true });
      assert.deepEqual(await list.locator("li strong").allTextContents(), ["Guardado na galeria", "Envio não confirmado — tente novamente", "Aguardando envio"]);
      assert.equal(uploads, 2); assert.equal(inserts, 2);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await container.getByRole("button", { name: "Tentar novamente", exact: true }).click();
      await list.locator("li strong").filter({ hasText: "Guardado na galeria" }).nth(2).waitFor();
      if (mode === "gallery") await container.getByRole("status").filter({ hasText: "com sucesso" }).waitFor();
      else await container.getByText(/Synthetic finalization failure/).waitFor();
      assert.deepEqual(await list.locator("li strong").allTextContents(), Array(3).fill("Guardado na galeria"));
      assert.equal(uploads, 3); assert.equal(inserts, 4); assert.equal(records.size, 3);
      assert.equal(actions, mode === "creation" ? 2 : 0);
      assert.deepEqual(errors, []); assert.deepEqual(unexpected, []);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      if (mode === "gallery") {
        await container.locator('input[type="file"]').setInputFiles({ name: "new-batch.png", mimeType: "image/png", buffer });
        await list.waitFor({ state: "hidden" });
        assert.equal(await list.count(), 0, "A new selection must not inherit old file statuses");
      }
      proof.push({ mode, width, mixedStatuses: true, retry: true, uploads, inserts, runtimeErrors: 0, overflow: false });
      console.log(JSON.stringify({ checkpoint: stage, passed: true }));
    } finally { await context.close(); }
  }
} catch (error) {
  console.log(JSON.stringify({ failed: true, stage, errorType: error.name, line: error.stack?.match(/check-upload-file-progress\.mjs:\d+:\d+/)?.[0] }));
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  if (token) assert.ifError((await admin.auth.admin.signOut(token, "local")).error);
  jar.clear();
  assert.deepEqual(await rows("projects"), projects);
  assert.deepEqual(await rows("project_media"), media);
}
console.log(JSON.stringify({ proof, hostedRowsUnchanged: true, writesIntercepted: true, isolatedSessionRevoked: true,
  scope: "actual browser UI with synthetic Storage/database/creation/finalization responses, not a hosted write lifecycle" }));
