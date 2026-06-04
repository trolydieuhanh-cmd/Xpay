# Chay XPAY Chat tren Android va iOS

Day la ban mobile-ready dang Progressive Web App. Co the mo tren trinh duyet mobile, cai ra man hinh chinh, va chay nhu mot app doc lap.

## Chay thu tren dien thoai cung mang Wi-Fi

1. Mo Terminal tai thu muc du an.
2. Chay server:

```bash
python3 -m http.server 4173
```

3. Lay IP may Mac:

```bash
ipconfig getifaddr en0
```

4. Tren dien thoai, mo:

```text
http://IP_CUA_MAC:4173/index.html
```

Vi du:

```text
http://192.168.1.25:4173/index.html
```

## Cai tren Android

1. Mo duong dan bang Chrome.
2. Bam menu ba cham.
3. Chon Add to Home screen hoac Install app.
4. Mo XPAY Chat tu icon tren man hinh chinh.

## Cai tren iPhone / iPad

1. Mo duong dan bang Safari.
2. Bam Share.
3. Chon Add to Home Screen.
4. Bam Add de tao icon XPAY Chat.

## Ghi chu

- Service worker va cai dat PWA hoat dong tot nhat tren `localhost` hoac domain HTTPS.
- Chuc nang goi thoai/video can quyen micro/camera. Tren Android va iOS, trinh duyet thuong yeu cau HTTPS, tru truong hop ban dang mo bang `localhost`.
- Chuc nang quet QR ket ban cung can quyen camera va co cung yeu cau HTTPS/localhost nhu video call.
- Neu muon dua len App Store/Google Play, nen boc ban web nay bang Capacitor hoac chuyen sang React Native/Flutter de co goi native chuan.

## Thong bao khi dien thoai tat man hinh

Ban native Capacitor da co khung Push Notifications cho tin nhan va cuoc goi:

- Android dung Firebase Cloud Messaging, can file `google-services.json` va service account tren VPS.
- iOS dung APNs, can Apple Developer Push Notifications capability, APNs Auth Key, Team ID, Key ID va Bundle ID.
- Server can cac bien moi truong: `FCM_SERVICE_ACCOUNT_FILE` hoac `FCM_SERVICE_ACCOUNT_JSON`; neu ho tro iOS thi them `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_PRIVATE_KEY_FILE` hoac `APNS_PRIVATE_KEY`, `APNS_BUNDLE_ID`.
- Tren dien thoai, vao XPAY Chat > Cai dat > Thong bao va bat "Thong bao ngoai man hinh cho tin nhan va cuoc goi".
