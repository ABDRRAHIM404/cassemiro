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
