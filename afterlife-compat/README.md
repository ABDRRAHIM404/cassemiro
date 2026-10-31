# Afterlife Manager – imported APK package identity compatibility patch

Source: https://github.com/etonedemid/afterlife-manager
Patch prepared against upstream commit `c58ad0f5a6338fc6e2c806c9ba1320d715c57bd2`.
Original license: PolyForm Noncommercial 1.0.0 + PolyForm Perimeter 1.0.1.

This is an **experimental source patch**, not a rebuilt APK and not a validated fix for any specific game.

## Changes
- Read the **real certificate metadata** from the imported APK by requesting Android's legacy and modern signing-information flags.
- Return imported APK package/application information when guest code explicitly queries that package, including when the host PackageManager returns null or throws.
- Keep the existing launcher-package mapping, but populate its signature fields from the *actual imported file* rather than reporting the launcher's certificates.

These changes are scoped to package-manager compatibility. They do **not** forge signatures, convert 32-bit native code, or override game integrity enforcement.

## Apply

Clone upstream source and checkout the pinned revision:

```sh
git clone https://github.com/etonedemid/afterlife-manager.git
cd afterlife-manager
git checkout c58ad0f5a6338fc6e2c806c9ba1320d715c57bd2
```

Copy the two files from this branch's `afterlife-compat/overrides/` folder over the same relative paths in that upstream checkout.

Build with the upstream [README](https://github.com/etonedemid/afterlife-manager#build) (Android SDK, NDK r29, native runtime bundle, Gradle).

## Validation status

- Source edits checked against the pinned upstream file content.
- Not compiled; the available environment could not run an Android build.
- Not tested on the POCO X7 Pro or the uploaded game.
- The game's "APK modificado" message may come from a different integrity check; fixing package metadata may not resolve it.
- The original Free Fire APK has not been modified.
