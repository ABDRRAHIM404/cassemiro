// Local-only, explicit operator helper. Never imported by the application.
// Run with --env-file=.env.local and NODE_USE_ENV_PROXY=1; pass the existing
// admin email as the only argument. Auth material stays in memory, not logs/files.
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

const email = process.argv[2];
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!email || !url || !anon || !key) throw new Error("Explicit email and local Supabase environment required.");
if (new URL(url).hostname !== "zjjepitczgffszbilfte.supabase.co") throw new Error("Unexpected project: refusing session creation.");
const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const users = await admin.auth.admin.listUsers({ page: 1, perPage: 100 });
if (users.error) throw new Error("Unable to resolve the existing admin identity.");
const user = users.data.users.find(user => user.email?.toLowerCase() === email.toLowerCase());
if (!user?.email_confirmed_at) throw new Error("Existing confirmed identity not found; no user will be created.");
const profile = await admin.from("profiles").select("id,role").eq("id", user.id).maybeSingle();
if (profile.error || !profile.data) throw new Error("Administrative profile not found.");
const generated = await admin.auth.admin.generateLink({ type: "magiclink", email });
if (generated.error || generated.data.user?.id !== user.id) throw new Error("Unable to generate an existing-user sign-in.");
const cookieJar = new Map();
const client = createServerClient(url, anon, { cookies: {
  getAll: () => [...cookieJar.values()].map(({ name, value }) => ({ name, value })),
  setAll: cookies => cookies.forEach(cookie => cookieJar.set(cookie.name, cookie)),
} });
const verified = await client.auth.verifyOtp({ token_hash: generated.data.properties.hashed_token, type: "email" });
if (verified.error || verified.data.user?.id !== user.id || !verified.data.session) throw new Error("Unable to establish the isolated session.");
const nonce = randomUUID();
let consumed = false;
const server = createServer((request, response) => {
  response.setHeader("Cache-Control", "no-store");
  if (request.method !== "GET" || request.url !== `/${nonce}` || consumed) { response.writeHead(404); response.end(); return; }
  consumed = true;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify([...cookieJar.values()].map(({ name, value }) => ({ name, value }))));
});
let closing = false;
async function close() {
  if (closing) return;
  closing = true;
  await admin.auth.admin.signOut(verified.data.session.access_token, "local");
  cookieJar.clear();
  server.close(() => process.exit(0));
}
process.on("SIGINT", close);
process.on("SIGTERM", close);
server.listen(3002, "127.0.0.1", () => console.log(`One-use browser-cookie endpoint: http://127.0.0.1:3002/${nonce}`));
setTimeout(close, 60 * 60 * 1000).unref();
