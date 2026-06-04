# XPAY Chat Native

Thu muc nay chua lop native moi cua XPAY Chat. Day la vung phat trien song song, khong thay the ban web/Capacitor hien tai.

## Thanh phan

- `core/`: NexaCore C++ cho cac logic co the dung chung giua Android va iOS.
- `android-telegram-style/`: ban Android native preview, package rieng `com.gatewayxpay.chatnative`.
- `ios-swift/`: cho giai doan iOS Swift tiep theo.

## Cach build Android preview

Tu thu muc goc du an:

```bash
JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" \
ANDROID_HOME="$HOME/Library/Android/sdk" \
ANDROID_SDK_ROOT="$HOME/Library/Android/sdk" \
./android/gradlew -p native/android-telegram-style :app:assembleDebug
```

File APK debug nam tai:

```text
native/android-telegram-style/app/build/outputs/apk/debug/app-debug.apk
```

## Luu y

Ban preview ket noi truc tiep `https://gatewayxpay.com` va luu token trong SharedPreferences cua app preview. No khong copy hoac migrate du lieu nguoi dung.
