import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
import { authOrigin, authCallbackUrl, safeAdminDestination } from "../src/lib/auth/redirects.ts";

test("deployed auth uses only the canonical origin and rejects escaping admin destinations", () => {
  const original = { mode: process.env.NODE_ENV, site: process.env.NEXT_PUBLIC_SITE_URL };
  try {
    for (const setting of [undefined, "", "http://localhost:3000", "https://attacker.invalid", "not a URL"]) {
      process.env.NODE_ENV = "production";
      if (setting === undefined) delete process.env.NEXT_PUBLIC_SITE_URL; else process.env.NEXT_PUBLIC_SITE_URL = setting;
      assert.equal(authOrigin(), "https://cassemiro-one.vercel.app");
      assert.equal(authCallbackUrl("/admin/redefinir-senha"), "https://cassemiro-one.vercel.app/auth/callback?next=%2Fadmin%2Fredefinir-senha");
    }
    for (const value of ["https://attacker.invalid", "//attacker.invalid/admin", "/administrator", "/admin/../../contato", "/admin/%2e%2e/contato", "/admin\\..\\contato", "/admin/%2f..", "/admin/%252f..", "/admin\n"]) {
      assert.equal(safeAdminDestination(value), "/admin");
    }
    assert.equal(safeAdminDestination("/admin/projetos?status=rascunho"), "/admin/projetos?status=rascunho");
    process.env.NODE_ENV = "development"; process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
    assert.equal(authOrigin(), "http://localhost:3000");
  } finally {
    for (const [key, value] of [["NODE_ENV", original.mode], ["NEXT_PUBLIC_SITE_URL", original.site]]) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});

test("actual email actions and callback route retain admin/reset destinations without trusting request hosts", async () => {
  const key = Symbol.for("cassemiro.auth-redirect-test");
  const state = { calls: [], error: null }; globalThis[key] = state;
  const mocks = {
    "next/cache": 'export const revalidatePath=()=>{};',
    "next/navigation": 'export function redirect(url){throw Object.assign(new Error("Redirect"),{destination:url})}',
    "@/lib/supabase/server": `const s=globalThis[Symbol.for("cassemiro.auth-redirect-test")];export const createClient=async()=>({auth:{signInWithOtp:async(p)=>{s.calls.push(["magic",p]);return {error:s.error}},resetPasswordForEmail:async(e,p)=>{s.calls.push(["reset",p]);return {error:s.error}},exchangeCodeForSession:async(c)=>{s.calls.push(["exchange",c]);return {error:s.error}},verifyOtp:async(p)=>{s.calls.push(["verify",p]);return {error:s.error}}}});`
  };
  const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
    if (specifier === "next/server") return nextResolve("next/server.js", context);
    if (mocks[specifier]) return { url: `data:text/javascript,${encodeURIComponent(mocks[specifier])}`, shortCircuit: true };
    if (specifier.startsWith("@/")) return nextResolve(new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href, context);
    return nextResolve(specifier, context);
  } });
  const original = { fetch: globalThis.fetch, mode: process.env.NODE_ENV, site: process.env.NEXT_PUBLIC_SITE_URL };
  try {
    globalThis.fetch=()=>{throw new Error("Network forbidden in auth regression")};
    process.env.NODE_ENV="production"; process.env.NEXT_PUBLIC_SITE_URL="http://localhost:3000";
    const actions=await import("../src/app/admin/actions.ts");
    const form=new FormData();form.set("email","synthetic@example.invalid");form.set("next","/admin/projetos");
    await assert.rejects(actions.sendMagicLink(form),e=>e.destination==="/admin/login?next=%2Fadmin%2Fprojetos&sent=1");
    assert.equal(state.calls.at(-1)[1].options.emailRedirectTo,"https://cassemiro-one.vercel.app/auth/callback?next=%2Fadmin%2Fprojetos");
    assert.equal(state.calls.at(-1)[1].options.shouldCreateUser,false);
    await assert.rejects(actions.requestPasswordReset(form),e=>e.destination==="/admin/esqueci-senha?sent=1");
    assert.equal(state.calls.at(-1)[1].redirectTo,authCallbackUrl("/admin/redefinir-senha"));
    const {GET}=await import("../src/app/auth/callback/route.ts");
    for(const [query,path] of [["code=synthetic&next=%2Fadmin%2Fprojetos","/admin/projetos"],["code=synthetic&next=%2Fadmin%2Fredefinir-senha","/admin/redefinir-senha"],["code=synthetic&next=%2F%2Fevil.invalid","/admin"],["token_hash=synthetic&type=recovery&next=%2Fadmin","/admin/redefinir-senha"],["token_hash=synthetic&type=email&next=%2Fadmin%2Fprojetos","/admin/projetos"]]){
      const response=await GET(new Request(`http://localhost:3000/auth/callback?${query}`,{headers:{"x-forwarded-host":"evil.invalid"}}));
      assert.equal(response.status,307);assert.equal(response.headers.get("location"),`https://cassemiro-one.vercel.app${path}`);
      assert.ok(response.headers.get("cache-control").includes("no-store"));
      assert.equal(response.headers.get("referrer-policy"),"no-referrer");
    }
    state.error=new Error("Synthetic expired token");
    for(const query of ["code=expired","token_hash=expired&type=recovery","token_hash=synthetic&type=unknown",""]){
      const response=await GET(new Request(`http://localhost:3000/auth/callback?${query}`));
      const target=new URL(response.headers.get("location"));assert.equal(target.origin,authOrigin());assert.equal(target.pathname,"/admin/login");
    }
  }finally{
    globalThis.fetch=original.fetch;hooks.deregister();delete globalThis[key];
    for(const [key,value]of[["NODE_ENV",original.mode],["NEXT_PUBLIC_SITE_URL",original.site]]){if(value===undefined)delete process.env[key];else process.env[key]=value;}
  }
});
