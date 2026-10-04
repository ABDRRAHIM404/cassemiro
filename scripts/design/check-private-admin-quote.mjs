// Owner-approved, bounded hosted test. No emails, public content or real-user writes.
// Credentials/cookies stay in memory. Exact synthetic identities/quote are cleaned up.
import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

if (process.env.APPROVED_PRIVATE_ADMIN_QUOTE_TEST !== "yes") throw new Error("Owner approval required");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
assert.equal(new URL(url).hostname, "zjjepitczgffszbilfte.supabase.co");
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE);
const origin = "http://127.0.0.1:3001";
const marker = randomUUID();
const quoteId = randomUUID();
const quoteName = `PRIVATE AUDIT ${marker}`;
const identities = [];
const proof = { roles: [], emailsSent: 0 };
let browser, ownerContext, stage = "baseline", failed = false;
async function read(table) {
  const result = await admin.from(table).select("*").order("id");
  assert.ifError(result.error);
  return result.data;
}
const baselineProfiles = await read("profiles");
const baselineQuotes = await read("quote_requests");
// The global retention routine may only run when this fixture is the sole quote.
assert.equal(baselineQuotes.length, 0, "Refuse this retention test when real quotes exist");
const beforeUsers = await admin.auth.admin.listUsers({ page: 1, perPage: 100 });
assert.ifError(beforeUsers.error);
assert.ok(beforeUsers.data.users.length < 100);
const baselineUserIds = beforeUsers.data.users.map(user => user.id).sort();
async function quote() {
  const result = await admin.from("quote_requests").select("*").eq("id", quoteId).single();
  assert.ifError(result.error);
  return result.data;
}
async function cookiesClient(context) {
  const jar = new Map((await context.cookies(origin)).map(cookie => [cookie.name, { name: cookie.name, value: cookie.value }]));
  return createServerClient(url, anon, { cookies: {
    getAll: () => [...jar.values()],
    setAll: cookies => cookies.forEach(cookie => jar.set(cookie.name, { name: cookie.name, value: cookie.value })),
  } });
}
async function captureSession(client, expectedId) {
  const verified = await client.auth.getUser();
  assert.ifError(verified.error);
  assert.equal(verified.data.user?.id, expectedId);
  const result = await client.auth.getSession();
  assert.ifError(result.error);
  assert.ok(result.data.session);
}
try {
  stage = "create-private-fixtures";
  for (const role of ["owner", "admin", "editor"]) {
    const identity = { role, email: `audit-${marker}-${role}@example.invalid`, password: `Audit!${randomBytes(24).toString("base64url")}` };
    const created = await admin.auth.admin.createUser({ email: identity.email, password: identity.password, email_confirm: true });
    assert.ifError(created.error);
    identity.id = created.data.user.id;
    identities.push(identity);
    const profile = await admin.from("profiles").upsert({ id: identity.id, display_name: `PRIVATE AUDIT ${role} ${marker}`, role });
    assert.ifError(profile.error);
  }
  const inserted = await admin.from("quote_requests").insert({ id: quoteId, name: quoteName, phone: "5515999990000", city: "Cidade de teste",
    work_type: "Construção residencial", description: "Synthetic owner-approved private audit; not a customer request.",
    source: "private-audit", utm_source: "synthetic", utm_campaign: marker, last_contact_at: "2025-08-01T00:00:00.000Z" });
  assert.ifError(inserted.error);
  browser = await chromium.launch({ executablePath: "/home/bng/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome", headless: true,
    proxy: { server: process.env.HTTPS_PROXY || process.env.HTTP_PROXY || "http://192.168.1.187:8080", bypass: "localhost,127.0.0.1" } });
  for (const [index, identity] of identities.entries()) {
    stage = `browser-${identity.role}`;
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    page.setDefaultTimeout(60000);
    page.setDefaultNavigationTimeout(60000);
    const errors = [];
    page.on("pageerror", error => errors.push(error.name));
    try {
      await page.goto(`${origin}/admin/login`, { waitUntil: "domcontentloaded" });
      await page.locator('#admin-email').fill(identity.email);
      await page.locator('#admin-password').fill(identity.password);
      await page.getByRole("button", { name: "Acessar painel", exact: true }).click();
      await page.waitForURL(`${origin}/admin`, { waitUntil: "domcontentloaded" });
      const client = await cookiesClient(context);
      await captureSession(client, identity.id);
      for (const route of ["configuracoes", "conteudo", "servicos", "depoimentos", "projetos", "orcamentos"]) {
        await page.goto(`${origin}/admin/${route}`, { waitUntil: "domcontentloaded" });
        assert.equal(new URL(page.url()).pathname, `/admin/${route}`);
        assert.ok(await page.locator('main h1').innerText());
      }
      await page.goto(`${origin}/admin/orcamentos/${quoteId}`, { waitUntil: "domcontentloaded" });
      assert.equal(await page.locator('main h1').innerText(), quoteName);
      const whatsapp = new URL(await page.getByRole("link", { name: "Abrir WhatsApp", exact: true }).getAttribute("href"));
      assert.equal(whatsapp.hostname, "wa.me");
      assert.equal(whatsapp.pathname, "/5515999990000");
      // Inspect the link only: never navigate to/call/message the synthetic number.
      const previous = (await quote()).last_contact_at;
      await page.getByRole("button", { name: "Registrar contato hoje", exact: true }).click();
      await page.waitForURL(`${origin}/admin/orcamentos/${quoteId}?contacted=1`, { waitUntil: "domcontentloaded" });
      const contacted = await quote();
      assert.notEqual(contacted.last_contact_at, previous);
      assert.ok(Math.abs(Date.now() - new Date(contacted.last_contact_at).getTime()) < 120000);
      const status = ["Em contato", "Orçamento", "Fechado"][index];
      await page.locator('#quote-status').selectOption(status);
      await page.getByRole("button", { name: "Salvar alteração", exact: true }).click();
      await page.waitForURL(`${origin}/admin/orcamentos/${quoteId}?saved=1`, { waitUntil: "domcontentloaded" });
      assert.equal((await quote()).status, status);
      const profileRead = await client.from("profiles").select("id").in("id", identities.map(item => item.id));
      assert.ifError(profileRead.error);
      assert.equal(profileRead.data.length, 3);
      const storage = await client.storage.from("project-media-private").list("", { limit: 10 });
      assert.ifError(storage.error);
      proof.roles.push({ role: identity.role, realPasswordLogin: true, protectedRoutes: 6, quoteContactAndStatus: true,
        leadWhatsappTarget: true, profileManagementRead: true, privateStorageRead: true, runtimeErrors: errors });
      assert.deepEqual(errors, []);
      if (identity.role === "owner") ownerContext = context;
      if (identity.role === "editor") {
        stage = "revoked-profile-denial";
        const removed = await admin.from("profiles").delete().eq("id", identity.id);
        assert.ifError(removed.error);
        const metadata = await client.auth.updateUser({ data: { role: "owner" } });
        assert.ifError(metadata.error);
        const forbiddenRead = await client.from("quote_requests").select("id").eq("id", quoteId);
        assert.ifError(forbiddenRead.error);
        assert.deepEqual(forbiddenRead.data, []);
        const forbiddenWrite = await client.from("quote_requests").update({ status: "Novo" }).eq("id", quoteId).select("id");
        assert.ifError(forbiddenWrite.error);
        assert.deepEqual(forbiddenWrite.data, []);
        assert.equal((await quote()).status, "Fechado");
        await page.goto(`${origin}/admin/orcamentos/${quoteId}`, { waitUntil: "domcontentloaded" });
        assert.equal(new URL(page.url()).pathname, "/admin/login");
        proof.profileRemoval = { existingJwtDenied: true, userMetadataCannotRestoreAccess: true };
      }
      console.log(JSON.stringify({ checkpoint: identity.role, passed: true }));
    } finally { if (context !== ownerContext) await context.close(); }
  }
  stage = "generate-recovery-link";
  const identity = identities.find(item => item.role === "admin");
  const generated = await admin.auth.admin.generateLink({ type: "recovery", email: identity.email });
  assert.ifError(generated.error);
  const jar = new Map();
  const recovered = createServerClient(url, anon, { cookies: {
    getAll: () => [...jar.values()],
    setAll: cookies => cookies.forEach(cookie => jar.set(cookie.name, { name: cookie.name, value: cookie.value })),
  } });
  stage = "verify-recovery-token";
  const verified = await recovered.auth.verifyOtp({ token_hash: generated.data.properties.hashed_token, type: "recovery" });
  assert.ifError(verified.error);
  assert.equal(verified.data.user.id, identity.id);
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  try {
    await context.addCookies([...jar.values()].map(cookie => ({ ...cookie, url: origin })));
    const page = await context.newPage();
    page.setDefaultTimeout(60000);
    const newPassword = `NewAudit!${randomBytes(24).toString("base64url")}`;
    stage = "recovery-form-mismatch";
    await page.goto(`${origin}/admin/redefinir-senha`, { waitUntil: "domcontentloaded" });
    await page.locator('#new-password').fill(newPassword);
    await page.locator('#confirm-password').fill(newPassword + "mismatch");
    await page.getByRole("button", { name: "Guardar nova senha", exact: true }).click();
    await page.waitForURL(current => current.pathname === "/admin/redefinir-senha" && current.searchParams.has("error"));
    // Next's route announcer is also role=alert; target the actual form error.
    await page.locator('main [role="alert"]').waitFor();
    stage = "recovery-form-save";
    await page.locator('#new-password').fill(newPassword);
    await page.locator('#confirm-password').fill(newPassword);
    await page.getByRole("button", { name: "Guardar nova senha", exact: true }).click();
    await page.waitForURL(`${origin}/admin/login?reset=1`);
    const isolated = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
    stage = "recovery-new-login";
    const oldLogin = await isolated.auth.signInWithPassword({ email: identity.email, password: identity.password });
    assert.ok(oldLogin.error);
    await page.locator('#admin-email').fill(identity.email);
    await page.locator('#admin-password').fill(newPassword);
    await page.getByRole("button", { name: "Acessar painel", exact: true }).click();
    await page.waitForURL(`${origin}/admin`);
    await captureSession(await cookiesClient(context), identity.id);
    stage = "recovery-used-token-denial";
    const reused = await isolated.auth.verifyOtp({ token_hash: generated.data.properties.hashed_token, type: "recovery" });
    assert.ok(reused.error);
    const invalid = await context.request.get(`${origin}/auth/callback?code=invalid-private-audit`, { maxRedirects: 0 });
    assert.equal(invalid.status(), 307);
    assert.ok(invalid.headers()["cache-control"].includes("no-store"));
    proof.recovery = { generatedWithoutEmail: true, mismatchRejected: true, realPasswordChanged: true,
      oldPasswordRejected: true, newPasswordLogin: true, reusedTokenRejected: true, invalidCallbackPrivate: true };
  } finally { await context.close(); jar.clear(); }
  // The operator runs guarded, fixture-only retention SQL through MCP. Poll the
  // exact row: exec's non-TTY input pipe may close even while this process lives.
  stage = "await-guarded-retention";
  console.log(JSON.stringify({ checkpoint: "ready-for-retention", quoteId, quoteName }));
  const deadline = Date.now() + 300000;
  while (!(await quote()).anonymized_at) {
    if (Date.now() >= deadline) throw new Error("Retention coordination timed out");
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  stage = "anonymized-browser-state";
  const anonymous = await quote();
  assert.equal(anonymous.name, "Anonimizado");
  assert.equal(anonymous.phone, "00000000");
  assert.equal(anonymous.city, "Não informado");
  assert.ok(anonymous.anonymized_at);
  assert.equal(anonymous.utm_campaign, null);
  assert.equal(anonymous.status, "Fechado");
  assert.equal(anonymous.work_type, "Construção residencial");
  const page = await ownerContext.newPage();
  await page.goto(`${origin}/admin/orcamentos/${quoteId}`, { waitUntil: "domcontentloaded" });
  assert.equal(await page.locator('main h1').innerText(), "Solicitação anonimizada");
  assert.equal(await page.getByRole("link", { name: "Abrir WhatsApp", exact: true }).count(), 0);
  assert.equal(await page.getByRole("button", { name: "Registrar contato hoje", exact: true }).count(), 0);
  assert.equal(await page.getByRole("button", { name: "Salvar alteração", exact: true }).count(), 0);
  assert.ok(!(await page.locator('main').innerText()).includes(quoteName));
  proof.retentionBrowser = { anonymousStatisticsVisible: true, personalDetailsAndActionsRemoved: true };
} catch (error) {
  failed = true;
  // Never print raw SDK/Playwright errors: they can contain credentials or URLs.
  console.log(JSON.stringify({ checkpoint: stage, failed: true, errorType: error.name,
    sourceLocation: error.stack?.match(/check-private-admin-quote\.mjs:\d+:\d+/)?.[0] }));
} finally {
  if (browser) await browser.close();
  const cleanupErrors = [];
  for (const identity of identities) {
    const found = await admin.auth.admin.getUserById(identity.id);
    if (found.error || found.data.user.email !== identity.email || !identity.email.startsWith(`audit-${marker}-`)) {
      cleanupErrors.push(`identity-guard-${identity.role}`);
      continue;
    }
    // Use a fresh fixture-only session to revoke every refresh session, instead
    // of treating previously reset/logged-out tokens as cleanup failures.
    // generateLink returns a token without sending email.
    const generated = await admin.auth.admin.generateLink({ type: "magiclink", email: identity.email });
    if (generated.error) {
      cleanupErrors.push(`session-link-${identity.role}`);
    } else {
      const isolated = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
      const fresh = await isolated.auth.verifyOtp({ token_hash: generated.data.properties.hashed_token, type: "magiclink" });
      if (fresh.error || fresh.data.user?.id !== identity.id || !fresh.data.session) {
        cleanupErrors.push(`session-guard-${identity.role}`);
      } else {
        const revoked = await admin.auth.admin.signOut(fresh.data.session.access_token, "global");
        if (revoked.error) cleanupErrors.push(`session-revocation-${identity.role}`);
      }
    }
    const profile = await admin.from("profiles").delete().eq("id", identity.id);
    if (profile.error) cleanupErrors.push(`profile-${identity.role}`);
    const removed = await admin.auth.admin.deleteUser(identity.id);
    if (removed.error) cleanupErrors.push(`identity-${identity.role}`);
  }
  const removedQuote = await admin.from("quote_requests").delete().eq("id", quoteId);
  if (removedQuote.error) cleanupErrors.push("synthetic-quote");
  assert.deepEqual(cleanupErrors, []);
  assert.deepEqual(await read("profiles"), baselineProfiles);
  assert.deepEqual(await read("quote_requests"), baselineQuotes);
  const after = await admin.auth.admin.listUsers({ page: 1, perPage: 100 });
  assert.ifError(after.error);
  assert.deepEqual(after.data.users.map(user => user.id).sort(), baselineUserIds);
  console.log(JSON.stringify({ proof, cleanup: { exactTemporaryAccountsRemoved: identities.length, syntheticQuoteRemoved: true,
    realProfilesAndQuotesUnchanged: true }, scope: "local production build, hosted Auth/database; no SMTP delivery or public publication test" }));
  if (failed) process.exitCode = 1;
}
