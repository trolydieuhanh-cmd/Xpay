# XPAY Chat Android Native Preview

Day la ban Android native preview theo huong Telegram-style. Ung dung dung Java native Android, goi truc tiep API hien tai va cai bang package rieng `com.gatewayxpay.chatnative` de khong ghi de ban APK dang test.

## Chuc nang dau tien

- Dang nhap bang so dien thoai va mat khau qua `/api/auth/login`.
- Luu token vao SharedPreferences cua app preview.
- Dong bo `/api/sync`.
- Xem danh sach hoi thoai va mo tung khung chat.
- Gui tin nhan text qua `/api/messages/send`.
- Gui anh/video trong hoi thoai qua file picker native.
- Gui vi tri hien tai bang lien ket ban do khi thiet bi da cap quyen vi tri.
- Them ban bang so dien thoai qua `/api/friends/add`.
- Bo cuc su dung giong ban HTML: profile strip, tim kiem, tac vu nhanh, tab Tin nhan/Quanh day/Nhat ky/XPAY AI.
- Tin nhan duoc thu gon khoang cach, khung nhap chat tu resize khi ban phim hien len.
- Khung nhap tin nhan theo kieu Telegram: o nhap va nut Gui nam cung mot hang, tu cuon len khi ban phim mo.
- Man hoi thoai dung thanh nhap co dinh o day man hinh, vung tin nhan co gian theo ban phim ao de khong che nut Gui.
- Xoa, thu hoi, tra loi, chuyen tiep tin nhan nam trong menu nhan giu tin nhan.
- Xem Ban be, Quanh day, Nhat ky, Cuoc goi, Ca nhan, Cai dat tu cac tac vu nhanh.
- Dang ky va quen mat khau bang OTP email.
- Cap nhat ho so, avatar, quyen hien thi thong tin ca nhan.
- Dang nhat ky text/anh va xoa nhat ky cua chinh minh.
- Tao/tiep nhan/tu choi/ket thuc cuoc goi o lop signaling API.
- Chat truc tiep voi XPAY AI qua `/api/ai/assistant`.

## Build

Tu thu muc goc du an:

```bash
JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" \
ANDROID_HOME="$HOME/Library/Android/sdk" \
ANDROID_SDK_ROOT="$HOME/Library/Android/sdk" \
./android/gradlew -p native/android-telegram-style :app:assembleDebug
```

APK debug:

```text
native/android-telegram-style/app/build/outputs/apk/debug/app-debug.apk
```
