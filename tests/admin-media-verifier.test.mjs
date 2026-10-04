import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("read-only media verifier selects an explicit existing owner, never a guessed singleton", () => {
  const source = readFileSync(new URL("../scripts/design/check-admin-media-access.mjs", import.meta.url), "utf8");
  assert.match(source, /AUDIT_EXISTING_OWNER_EMAIL\?\.trim\(\)\.toLowerCase\(\)/);
  assert.match(source, /user\.email\?\.toLowerCase\(\) === ownerEmail/);
  assert.match(source, /owner\?\.email_confirmed_at/);
  assert.match(source, /\.eq\("id", owner\.id\)\.single\(\)/);
  assert.match(source, /profile\.data\?\.role === "owner"/);
  assert.doesNotMatch(source, /\.eq\("role", "owner"\)\.single\(\)/);
  assert.doesNotMatch(source, /createUser|updateUserById|resetPasswordForEmail/);
  assert.match(source, /signOut\(token, "local"\)/);
});

test("private recovery verifier requires exact owner and a full monotonic safety wait", () => {
  const source = readFileSync(new URL("../scripts/design/check-interrupted-upload-recovery.mjs", import.meta.url), "utf8");
  assert.match(source, /APPROVED_INTERRUPTED_UPLOAD_TEST !== "yes"/);
  assert.match(source, /AUDIT_EXISTING_OWNER_EMAIL\?\.trim\(\)\.toLowerCase\(\)/);
  assert.match(source, /user\.email\?\.toLowerCase\(\) === ownerEmail/);
  assert.match(source, /profile\.data\?\.role === "owner"/);
  assert.match(source, /bucketInfo\.data\.public === false/);
  assert.doesNotMatch(source, /\.eq\("role", "owner"\)\.single\(\)/);
  assert.match(source, /const deadline = objectObservedAt \+ 605000/);
  assert.match(source, /while \(performance\.now\(\) < deadline\)/);
  assert.doesNotMatch(source, /while \(Date\.now\(\) < deadline\)/);
  assert.match(source, /assert\.equal\(storageUploads, 1, "Recovery and replay must not upload again"\)/);
  assert.match(source, /anonymousRecoveredMediaDenied: true/);
});

test("private recovery cleanup reconciles an ambiguous draft INSERT and always revokes its own session", () => {
  const source = readFileSync(new URL("../scripts/design/check-interrupted-upload-recovery.mjs", import.meta.url), "utf8");
  assert.ok(source.indexOf("creationAttempted = true") < source.indexOf('session.from("projects").insert'));
  assert.match(source, /if \(creationAttempted\)[\s\S]*\.eq\("id", projectId\)\.maybeSingle\(\)/);
  assert.match(source, /if \(owned\.data\) assert\.deepEqual\(owned\.data, \{ slug, is_published: false \}\)/);
  assert.match(source, /\.delete\(\)\.eq\("id", projectId\)\.eq\("slug", slug\)\.eq\("is_published", false\)/);
  assert.match(source, /\} finally \{\s*try \{ if \(token\).*signOut\(token, "local"\)/);
  assert.match(source, /finally \{ jar\.clear\(\); \}/);
  assert.doesNotMatch(source, /signOut\(token, "global"\)|createUser|resetPasswordForEmail/);
});

test("expiry verifier distinguishes cache replay from explicit rejection evidence", () => {
  const source = readFileSync(new URL("../scripts/design/check-admin-media-access.mjs", import.meta.url), "utf8");
  assert.match(source, /uncachedUrl\.searchParams\.set\("cacheNonce", randomUUID\(\)\)/);
  assert.match(source, /\[400, 401, 403\]\.includes\(originCheck\.status\(\)\)/);
  assert.match(source, /cachedReplayDelivered: replayStatus === 200/);
  assert.match(source, /cacheNonceExpiryRequestsDenied: expiryChecks\.length/);
  assert.doesNotMatch(source, /expiredSignedUrlsDenied:/);
  assert.match(source, /assert\.equal\(digest\(await expired\.body\(\)\), check\.digest/);
  assert.doesNotMatch(source, /assert\.notEqual\(renewed\.headers\(\)\.location/);
  assert.match(source, /claims\.exp - claims\.iat === 60/);
  assert.match(source, /const rejectionCheckAfter = performance\.now\(\) \+ 65000/);
  assert.match(source, /while \(performance\.now\(\) < deadline\)/);
  assert.doesNotMatch(source, /claims\.exp \* 1000|claims\.exp > Date\.now/);
});
