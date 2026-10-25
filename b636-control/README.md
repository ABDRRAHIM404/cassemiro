# B636 Control

Private/local original Android app for Huawei B636-336 (4G LTE + 2.4/5 GHz Wi-Fi). Default address 192.168.1.1, user admin. Password is provided on-device and is NOT stored, hard-coded or sent to GitHub.

## Features
- Huawei HiLink login with token/cookies and password_type=4; unsupported firmware will fail clearly.
- Signal and cell dashboard: PCI, RSRP, RSRQ, SINR, RSSI, Cell ID, EARFCN, LTE bandwidth (read-only), traffic.
- LTE B1/B3/B5/B7/B8/B20/B28/B32/B38/B40/B41/B42/B43 band choice and automatic/all bands, with confirmations.
- 2.4 GHz / 5 GHz Wi-Fi API inspection. Wi-Fi channel/width writes only when the router reports an editable field; 5 GHz multi-profile editing blocked pending firmware schema verification.
- Mobile data and reboot controls.
- Endpoint inspector, credential redaction, local private IPv4-only.
- No invented tower, frequency, LTE carrier-width or per-device speed limit controls. B636 firmware support is not proven for advanced settings.

## Build
GitHub Actions `Build B636 Controller APK` produces an installable debug APK.

## Notes
Developed as original code, inspired by publicly accessible feature ideas from fz911a/Brovi-Huawei-5G-CPE-Manager and degdag/huawei-manager (no source copied). These repos do not declare a license. Not yet tested against a real B636-336; commands may require adjustment to the installed firmware. Band/wifi changes can temporarily disconnect connectivity.