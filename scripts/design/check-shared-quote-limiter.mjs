// Bounded hosted concurrency check: one synthetic counter, never a quote/IP.
// The counter uses the RPC's minimum 60-second test window; normal production
// requests retain the application's 900-second window. Expired counters are
// reclaimed by the deployed routine's ordinary opportunistic retention policy.
import assert from "node:assert/strict";
import { fork } from "node:child_process";
import { createHmac, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

if (process.env.APPROVED_QUOTE_LIMITER_TEST !== "yes") throw new Error("Explicit bounded audit test required");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
assert.equal(new URL(url).hostname, "zjjepitczgffszbilfte.supabase.co");
const client = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const windowSeconds = 60;
const consume = key => client.rpc("consume_quote_rate_limit", { p_key_hash: key, p_max_attempts: 5, p_window_seconds: windowSeconds }).abortSignal(AbortSignal.timeout(20000));

if (process.argv.includes("--worker")) {
  process.once("message", async ({ key }) => {
    const results = await Promise.all(Array.from({ length: 3 }, () => consume(key)));
    const failed = results.some(result => result.error || typeof result.data !== "boolean");
    process.send({ failed, decisions: failed ? [] : results.map(result => result.data) }, () => process.disconnect());
  });
  process.send({ ready: true });
} else {
  const quotes = async () => {
    const result = await client.from("quote_requests").select("id", { count: "exact", head: true });
    assert.ifError(result.error);
    return result.count;
  };
  const before = await quotes();
  const key = createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY).update(`audit-limiter:${randomUUID()}`).digest("hex");
  const workers = Array.from({ length: 2 }, () => fork(new URL(import.meta.url), ["--worker"], { stdio: ["ignore", "ignore", "ignore", "ipc"] }));
  const workerDeadline = setTimeout(() => {
    for (const worker of workers) if (worker.exitCode === null) worker.kill();
  }, 120000);
  try {
    const ready = workers.map(worker => new Promise((resolve, reject) => {
      worker.once("message", message => message.ready ? resolve() : reject(new Error("Worker readiness failed")));
      worker.once("error", reject);
      worker.once("exit", code => { if (code !== 0) reject(new Error("Worker exited before ready")); });
    }));
    await Promise.all(ready);
    const responses = workers.map(worker => new Promise((resolve, reject) => {
      worker.once("message", message => message.failed ? reject(new Error("Worker RPC failed")) : resolve(message.decisions));
      worker.once("error", reject);
      worker.once("exit", code => { if (code !== 0) reject(new Error("Worker exited during RPC")); });
    }));
    workers.forEach(worker => worker.send({ key }));
    const decisions = (await Promise.all(responses)).flat();
    assert.equal(decisions.length, 6);
    assert.equal(decisions.filter(Boolean).length, 5);
    const seventh = await consume(key);
    assert.ifError(seventh.error);
    assert.equal(seventh.data, false);
    const publicClient = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    const anonymous = await publicClient.rpc("consume_quote_rate_limit", { p_key_hash: key, p_max_attempts: 5, p_window_seconds: windowSeconds });
    assert.equal(anonymous.error?.code, "42501");
    assert.equal(anonymous.data, null);
    console.log(JSON.stringify({ checkpoint: "shared-burst", serverProcesses: 2, requests: 6, allowed: 5, denied: 1,
      subsequentDenied: true, anonymousExecutionDenied: true, resetWaitSeconds: 62 }));
    // Split waits keep the operation observable without a blocking >60s sleep.
    await new Promise(resolve => setTimeout(resolve, 31000));
    console.log(JSON.stringify({ checkpoint: "window-reset-wait", remainingSeconds: 31 }));
    await new Promise(resolve => setTimeout(resolve, 31000));
    const reset = await consume(key);
    assert.ifError(reset.error);
    assert.equal(reset.data, true);
    assert.equal(await quotes(), before);
    console.log(JSON.stringify({ passed: true, independentServerProcesses: 2, sharedLimit: 5, windowReset: true,
      quotesUnchanged: true, quotesCreated: 0, syntheticCounters: 1,
      scope: "hosted RPC concurrency and minimum test-window reset; not Vercel HTTP traffic/forwarded-header or sustained abuse verification" }));
  } finally {
    clearTimeout(workerDeadline);
    for (const worker of workers) if (worker.exitCode === null) worker.kill();
  }
}
