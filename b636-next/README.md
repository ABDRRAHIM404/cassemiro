# B636 Command — Android LTE / Wi-Fi management

A **new**, independent Android app for the Huawei B636-336. Source is under `b636-next/` on the isolated GitHub branch `build/b636-reborn`; the Cassemiro website's `main` remains unchanged.

## Evidence and implementation

- **morluto/rea** was executed in GitHub Actions using its JADX engine against the tracked APK in `fz911a/Brovi-Huawei-5G-CPE-Manager`. The resulting Evidence reports the binary SHA-256, package metadata, permissions, class inventory and static-analysis limitations. [REA audit workflow](../../.github/workflows/b636-rea-audit.yml).
- **degdag/huawei-manager** is the source of the **Huawei password type-4 login formula**. The app uses a single password attempt with: SHA256 hex(password) -> Base64(hex) -> SHA256 hex(username + Base64 + raw TokInfo) -> Base64(hex), and posts it to `/api/user/login`. Session handling uses the HiLink `SesTokInfo` endpoint and OkHttp CookieJar.
- **fz911a/Brovi-Huawei-5G-CPE-Manager** provides evidence for `/api/net/lock-cell`, `/api/device/seccellinfo`, `/api/device/nbrcellinfo`, `/api/wlan/wlan-debug`.
- Important: sources and REA static analysis **do not prove these write APIs work on the owner's B636 firmware**.

## Features in this alpha

- Fresh native Android UI, private LAN-only HTTP, optional Android Keystore AES-GCM encrypted login and auto-sign-in
- Real router polling every 3 seconds while foregrounded: RSRP, RSRQ, SINR, RSSI, PCI, cell ID, EARFCN, LTE band, traffic rate, radio channel allocation
- RSRP/SINR history on correctly labeled axes, signal quality indicators, and configurable 2/3/5/10-second foreground sampling; no synthetic data or speed values
- Multi-band LTE masks, read-current-band control, preservation of network mode and verified readback; settings writes refresh Huawei POST tokens and have one safe fallback if error 125003 occurs
- EARFCN / PCI cell lock and release using the documented Huawei endpoint **only if the router accepts it**
- Current + neighboring cell discovery and secondary-cell info if supplied by firmware
- Read-only capability inspection for 2.4 / 5 GHz Wi-Fi, clients and QoS
- Mobile data on/off and reboot with explicit confirmation
- Read-only Huawei API inspector with errors shown, no unverified write payloads

## Limits (must not promise more)

- **LTE channel bandwidth** is allocated by the network operator; the router normally cannot force 5/10/15/20 MHz.
- **Wi-Fi channel width / per-device QoS**: introspection is available, but writes remain disabled until a genuine B636 firmware response validates the schema.
- Neighbor-cell reporting and lock-cell commands are firmware-specific and can be unavailable.
- This is an **alpha**, not tested against the owner's physical B636-336. Validation requires the owner to run the APK on their Wi-Fi/VPN setup.
- No hidden debug ports, vulnerability exploitation, jailbreak/root or stealth access.

## Build

```bash
gradle assembleDebug
```

Or use the [B636 Command Actions workflow](../../.github/workflows/build-b636-command.yml) (GitHub Actions runner with Android SDK 35).

Do not reuse the previously pasted router web session token; use your own current password locally in the new app.

## Secure login and validation

- Opt-in saved credentials are encrypted locally using Android Keystore (AES-256-GCM). `android:allowBackup=false` is set. The encryption key is nonexportable and no plaintext password is stored on disk. Auto-login occurs once when the app opens; users can erase the encrypted login and key from the Login page. This feature still needs on-device validation.
- B636 POST token flow accepts either the 64-character `/api/webserver/token` convention (last 32 chars) or the `SesTokInfo` token used by Huawei Manager. A rejected LTE settings request with Huawei 125003 may be retried once with the other token source; unconfirmed changes are never labeled successful.
- LTE changes read the current network mode and preserve it, then check the router's actual `LTEBand` readback. Routers can still reject specific masks or privileges; no bypass is attempted.
- No custom VPN routing, per-network socket binding, or background routing changes.
