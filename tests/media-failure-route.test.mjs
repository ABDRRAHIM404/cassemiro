import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";

test("actual media handler keeps lookup failures private without changing delivery or authorization", async () => {
  const stateKey = Symbol.for("cassemiro.media-failure-test");
  const state = { available: true, error: null, media: null, lookups: 0, signs: 0, sessions: 0 };
  globalThis[stateKey] = state;
  const prefix = 'const state=globalThis[Symbol.for("cassemiro.media-failure-test")];';
  const mocks = {
    "@/lib/supabase/admin": `${prefix} export const createSupabaseAdmin=()=>state.available?{
      from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>{state.lookups++;return {data:state.media,error:state.error}}})})}),
      storage:{from:()=>({createSignedUrl:async()=>{state.signs++;return {data:{signedUrl:"https://example.invalid/private-image?token=synthetic"},error:null}}})}
    }:null;`,
    "@/lib/supabase/server": `${prefix} export const createClient=async()=>{state.sessions++;return {auth:{getClaims:async()=>({data:null})}}};`,
    "@/lib/project-media": 'export const PRIVATE_PROJECT_MEDIA_BUCKET="private-test-only";',
  };
  const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
    if (Object.hasOwn(mocks, specifier)) return { url: `data:text/javascript,${encodeURIComponent(mocks[specifier])}`, shortCircuit: true };
    return nextResolve(specifier, context);
  } });
  const originalFetch = globalThis.fetch, originalError = console.error, logs = [];
  try {
    globalThis.fetch = () => { throw new Error("Network forbidden in isolated media test"); };
    console.error = (...values) => logs.push(values);
    const { GET } = await import("../src/app/api/project-media/[id]/route.ts");
    const id = "f03e8cca-1042-4fc1-861f-ccbf7cfe166b";
    const request = (value = id) => GET(new Request(`https://example.invalid/api/project-media/${value}`), { params: Promise.resolve({ id: value }) });
    let response = await request("invalid");
    assert.equal(response.status, 404);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(state.lookups, 0);

    state.available = false;
    response = await request();
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("cache-control"), "no-store");
    state.available = true;
    const privateText = "customer@example.invalid private/customer-image.webp token=synthetic-secret";
    for (const error of [
      { code: "42501", message: privateText, details: privateText },
      Object.assign(new Error(privateText), { cause: { path: privateText } }),
      { get message() { throw new Error("Raw error properties must not be read"); } },
    ]) {
      state.error = error;
      response = await request();
      assert.equal(response.status, 503);
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.equal(response.headers.get("location"), null);
      assert.equal(await response.text(), "");
    }
    assert.deepEqual(logs, Array.from({ length: 3 }, () => ["Project media lookup failed"]));
    assert.equal(state.signs, 0);
    assert.equal(state.sessions, 0);

    state.error = null;
    response = await request();
    assert.equal(response.status, 404);
    state.media = { storage_path: "private-test-only/photo.webp", projects: { is_published: false } };
    response = await request();
    assert.equal(response.status, 404);
    assert.equal(state.sessions, 1);
    assert.equal(state.signs, 0);
    state.media.projects.is_published = true;
    response = await request();
    assert.equal(response.status, 302);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.equal(response.headers.get("referrer-policy"), "no-referrer");
    assert.equal(response.headers.get("location"), "https://example.invalid/private-image?token=synthetic");
    assert.equal(state.signs, 1);
    assert.equal(logs.length, 3);
  } finally {
    globalThis.fetch = originalFetch;
    console.error = originalError;
    hooks.deregister();
    delete globalThis[stateKey];
  }
});
