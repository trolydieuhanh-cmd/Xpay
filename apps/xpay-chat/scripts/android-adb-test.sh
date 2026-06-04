#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ADB_BIN="${ADB_BIN:-adb}"
DEFAULT_APK="$ROOT_DIR/native/android-telegram-style/app/build/outputs/apk/debug/app-debug.apk"
APK_PATH="${1:-$DEFAULT_APK}"

echo "XPAY Chat Android ADB test"
echo "ADB: $("$ADB_BIN" version | head -n 1)"

"$ADB_BIN" start-server >/dev/null
DEVICES="$("$ADB_BIN" devices | sed '1d' | awk 'NF {print $0}')"

if [ -z "$DEVICES" ]; then
  echo "No Android device is visible to ADB."
  echo ""
  echo "Checklist:"
  echo "1. Use a data USB cable, not a charge-only cable."
  echo "2. On Android: Settings > Developer options > USB debugging = ON."
  echo "3. Reconnect USB and tap Allow on the RSA prompt."
  echo "4. Run: adb devices -l"
  echo "5. Then rerun this script."
  exit 2
fi

echo "Detected devices:"
"$ADB_BIN" devices -l

if echo "$DEVICES" | grep -q "unauthorized"; then
  echo ""
  echo "Device is unauthorized. Unlock the phone and tap Allow on the RSA prompt."
  exit 3
fi

if echo "$DEVICES" | grep -q "offline"; then
  echo ""
  echo "Device is offline. Reconnect USB, then run: adb kill-server && adb start-server"
  exit 4
fi

if [ ! -f "$APK_PATH" ]; then
  echo "APK not found: $APK_PATH"
  echo "Build it first:"
  echo 'JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" ANDROID_HOME="$HOME/Library/Android/sdk" ANDROID_SDK_ROOT="$HOME/Library/Android/sdk" ./android/gradlew -p native/android-telegram-style :app:assembleDebug'
  exit 5
fi

echo "Installing APK: $APK_PATH"
"$ADB_BIN" install -r "$APK_PATH"

PACKAGE_NAME="com.gatewayxpay.chatnative"
echo "Launching $PACKAGE_NAME"
"$ADB_BIN" shell monkey -p "$PACKAGE_NAME" -c android.intent.category.LAUNCHER 1 >/dev/null

echo "Done. XPAY Chat Native is installed and launched."
