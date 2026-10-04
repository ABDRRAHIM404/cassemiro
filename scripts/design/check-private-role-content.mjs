// Owner-approved PRIVATE batch only. No publishing, emails or real content edits.
// Random credentials remain in memory; cleanup targets exact fixture IDs.
import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

assert.equal(process.env.APPROVED_PRIVATE_ROLE_CONTENT_TEST, "yes", "Explicit batch approval required");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
assert.equal(new URL(url).hostname, "zjjepitczgffszbilfte.supabase.co");
const origin = process.env.AUDIT_ORIGIN;
assert.equal(origin, "https://cassemiro-one.vercel.app");
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE);
const run = promisify(execFile);
const marker = randomUUID();
const fixtures = [], proof = [];
let browser, stage = "baseline", failed = false;
async function rows(table, key = "id") {
  const result = await admin.from(table).select("*").order(key);
  assert.ok(!result.error, `Unable to read ${table}`);
  return result.data;
}
const tables = ["profiles", "services", "testimonials", "quote_requests"];
const baseline = Object.fromEntries(await Promise.all(tables.map(async table => [table, await rows(table)])));
const baselineSettings = await rows("site_settings", "key");
const users = await admin.auth.admin.listUsers({ page: 1, perPage: 100 });
assert.ok(!users.error && users.data.users.length < 100);
const userIds = users.data.users.map(user => user.id).sort();
try {
  browser = await chromium.launch({ executablePath: "/home/bng/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome", headless: true,
    args: process.env.BROWSER_PROXY_HTTP1 === "1" ? ["--disable-http2", "--disable-quic"] : [],
    proxy: { server: process.env.HTTPS_PROXY || process.env.HTTP_PROXY || "http://192.168.1.187:8080" } });
  for (const role of ["admin", "editor"]) {
    stage = `${role}-fixtures`;
    const fixture = { role, email: `audit-${marker}-${role}@example.invalid`, serviceId: randomUUID(),
      slug: `private-role-${marker}-${role}`, customer: `PRIVATE ${role} ${marker}`, settingKey: `private-audit-${marker}-${role}` };
    fixtures.push(fixture);
    const password = `Audit!${randomBytes(24).toString("base64url")}`;
    const created = await admin.auth.admin.createUser({ email: fixture.email, password, email_confirm: true });
    assert.ok(!created.error && created.data.user);
    fixture.id = created.data.user.id;
    assert.ok(!(await admin.from("profiles").upsert({ id: fixture.id, role, display_name: `PRIVATE ${role} ${marker}` })).error);
    const jar = new Map();
    const client = createServerClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { cookies: {
      getAll: () => [...jar.values()], setAll: cookies => cookies.forEach(cookie => jar.set(cookie.name, { name: cookie.name, value: cookie.value })),
    } });
    const login = await client.auth.signInWithPassword({ email: fixture.email, password });
    assert.ok(!login.error && login.data.user.id === fixture.id);
    fixture.token = login.data.session.access_token;
    // There is no service-create UI: create only this hidden fixture via role RLS.
    assert.ok(!(await client.from("services").insert({ id: fixture.serviceId, slug: fixture.slug, title: `PRIVATE ${role}`, is_visible: false,
      short_description: "Synthetic private service for approved audit.", content: "Synthetic private audit content; not a real offered service." })).error);
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    try {
      await context.addCookies([...jar.values()].map(cookie => ({ ...cookie, url: origin })));
      const page = await context.newPage();
      page.setDefaultTimeout(60000);
      const errors = [];
      page.on("pageerror", error => errors.push(error.name));
      page.on("dialog", dialog => dialog.accept());
      stage = `${role}-service-edit`;
      await page.goto(`${origin}/admin/servicos/${fixture.serviceId}`, { waitUntil: "load" });
      const form = page.locator('.service-form');
      const description = `Edited hidden ${role} service; never publish.`;
      await form.locator('[name="short_description"]').fill(description);
      await form.locator('[name="is_visible"]').uncheck();
      await form.getByRole("button", { name: "Salvar serviço", exact: true }).click();
      await page.waitForURL(current => current.pathname === `/admin/servicos/${fixture.serviceId}` && current.searchParams.get("saved") === "1");
      const service = await client.from("services").select("short_description,is_visible").eq("id", fixture.serviceId).single();
      assert.ok(!service.error && service.data.short_description === description && !service.data.is_visible);
      stage = `${role}-testimonial-create`;
      await page.goto(`${origin}/admin/depoimentos`, { waitUntil: "load" });
      const review = page.locator('.testimonial-create form');
      await review.locator('[name="customer_name"]').fill(fixture.customer);
      await review.locator('[name="text"]').fill("Synthetic private audit review, not a customer testimonial.");
      await review.locator('[name="is_approved"]').uncheck();
      await review.getByRole("button", { name: "Adicionar depoimento", exact: true }).click();
      await page.waitForURL(current => current.searchParams.get("created") === "1");
      const testimonial = await admin.from("testimonials").select("id,is_approved").eq("customer_name", fixture.customer).single();
      assert.ok(!testimonial.error && !testimonial.data.is_approved);
      fixture.testimonialId = testimonial.data.id;
      stage = `${role}-testimonial-edit`;
      await page.goto(`${origin}/admin/depoimentos/${fixture.testimonialId}`, { waitUntil: "load" });
      const updatedText = "Edited synthetic private review. Never publish this fixture.";
      await page.locator('[name="text"]').fill(updatedText);
      await page.locator('[name="is_approved"]').uncheck();
      await page.getByRole("button", { name: "Salvar depoimento", exact: true }).click();
      await page.waitForURL(current => current.searchParams.get("saved") === "1");
      const updated = await client.from("testimonials").select("text,is_approved").eq("id", fixture.testimonialId).single();
      assert.ok(!updated.error && updated.data.text === updatedText && !updated.data.is_approved);
      const publicClient = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
      for (const [table, id] of [["services", fixture.serviceId], ["testimonials", fixture.testimonialId]]) {
        const excluded = await publicClient.from(table).select("id").eq("id", id);
        assert.ok(!excluded.error && excluded.data.length === 0);
      }
      stage = `${role}-testimonial-delete`;
      await page.getByRole("button", { name: "Excluir depoimento", exact: true }).click();
      await page.waitForURL(current => current.pathname === "/admin/depoimentos" && current.searchParams.get("deleted") === "1");
      assert.ok(!(await client.from("services").delete().eq("id", fixture.serviceId).select("id").single()).error);
      // Private setting CRUD proves database authorization, NOT global settings-form saves.
      assert.ok(!(await client.from("site_settings").insert({ key: fixture.settingKey, value: { synthetic: true }, is_public: false })).error);
      assert.ok(!(await client.from("site_settings").update({ value: { synthetic: "edited" } }).eq("key", fixture.settingKey).select("key").single()).error);
      const hiddenSetting = await publicClient.from("site_settings").select("key").eq("key", fixture.settingKey);
      assert.ok(!hiddenSetting.error && hiddenSetting.data.length === 0);
      assert.ok(!(await client.from("site_settings").delete().eq("key", fixture.settingKey).select("key").single()).error);
      assert.deepEqual(errors, []);
    } finally { await context.close(); jar.clear(); }
    stage = `${role}-project-lifecycle`;
    const lifecycle = await run(process.execPath, ["scripts/design/check-private-project-lifecycle.mjs", fixture.email], {
      env: { ...process.env, APPROVED_PRIVATE_TEST: "yes" }, timeout: 240000, maxBuffer: 200000,
    });
    // The child emits only sanitized fixture evidence, never credentials.
    console.log(lifecycle.stdout.trim());
    proof.push({ role, hiddenServiceEdit: true, unpublishedTestimonialCreateEditDelete: true, privateSettingRlsCrud: true,
      anonymousFixturesExcluded: true, projectAndMediaLifecycle: true });
    console.log(JSON.stringify({ checkpoint: role, passed: true }));
  }
} catch (error) {
  failed = true;
  console.log(JSON.stringify({ checkpoint: stage, failed: true, errorType: error.name }));
} finally {
  if (browser) await browser.close();
  for (const fixture of fixtures) {
    // Resolve UI-created testimonials even if the browser failed before ID capture.
    const pending = await admin.from("testimonials").select("id,is_approved").eq("customer_name", fixture.customer);
    assert.ok(!pending.error && pending.data.length <= 1 && pending.data.every(item => !item.is_approved));
    for (const item of pending.data) assert.ok(!(await admin.from("testimonials").delete().eq("id", item.id).eq("customer_name", fixture.customer).eq("is_approved", false)).error);
    assert.ok(!(await admin.from("services").delete().eq("id", fixture.serviceId).eq("slug", fixture.slug).eq("is_visible", false)).error);
    assert.ok(!(await admin.from("site_settings").delete().eq("key", fixture.settingKey).eq("is_public", false)).error);
    if (fixture.id) {
      const exact = await admin.auth.admin.getUserById(fixture.id);
      assert.ok(!exact.error && exact.data.user.email === fixture.email);
      if (fixture.token) assert.ok(!(await admin.auth.admin.signOut(fixture.token, "global")).error);
      assert.ok(!(await admin.from("profiles").delete().eq("id", fixture.id)).error);
      assert.ok(!(await admin.auth.admin.deleteUser(fixture.id)).error);
    }
  }
  for (const table of tables) assert.ok(JSON.stringify(await rows(table)) === JSON.stringify(baseline[table]), `Original ${table} changed`);
  assert.ok(JSON.stringify(await rows("site_settings", "key")) === JSON.stringify(baselineSettings), "Original settings changed");
  const after = await admin.auth.admin.listUsers({ page: 1, perPage: 100 });
  assert.ok(!after.error && JSON.stringify(after.data.users.map(user => user.id).sort()) === JSON.stringify(userIds));
  console.log(JSON.stringify({ proof, cleanup: { fixtureAccountsAndContentRemoved: true, originalRowsUnchanged: true }, emailsSent: 0, publicPublicationTested: false }));
  if (failed) process.exitCode = 1;
}
