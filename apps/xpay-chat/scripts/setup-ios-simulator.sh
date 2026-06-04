#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKSPACE="$ROOT_DIR/ios/App/App.xcworkspace"
SCHEME="App"
DEVICE_NAME="${XPAYCHAT_IOS_SIMULATOR_NAME:-XPAY Chat iPhone 15 iOS 17.2}"
DEVICE_TYPE="${NEXACHAT_IOS_DEVICE_TYPE:-com.apple.CoreSimulator.SimDeviceType.iPhone-15}"
RUNTIME_ID="${NEXACHAT_IOS_RUNTIME_ID:-com.apple.CoreSimulator.SimRuntime.iOS-17-2}"
BUILD_DESTINATION="${NEXACHAT_IOS_BUILD_DESTINATION:-generic/platform=iOS Simulator}"
BOOT_TIMEOUT_SECONDS="${NEXACHAT_IOS_BOOT_TIMEOUT_SECONDS:-120}"
BUILD_TIMEOUT_SECONDS="${NEXACHAT_IOS_BUILD_TIMEOUT_SECONDS:-600}"
SETTINGS_TIMEOUT_SECONDS="${NEXACHAT_IOS_SETTINGS_TIMEOUT_SECONDS:-120}"
BUILD_LOG="${NEXACHAT_IOS_BUILD_LOG:-/tmp/xpaychat-ios-simulator-build.log}"

reset_ibtool_cache() {
  pkill -9 -x ibtool 2>/dev/null || true
  pkill -9 -x ibtoold 2>/dev/null || true
  pkill -9 -x actool 2>/dev/null || true
  rm -rf "$HOME/Library/Caches/com.apple.ibtool"
}

wait_for_simulator_boot() {
  local elapsed=0
  while (( elapsed < BOOT_TIMEOUT_SECONDS )); do
    if xcrun simctl list devices available | grep -q "$DEVICE_ID.*(Booted)"; then
      break
    fi
    sleep 1
    elapsed=$((elapsed + 1))
  done

  if (( elapsed >= BOOT_TIMEOUT_SECONDS )); then
    echo "Warning: simulator did not report Booted within ${BOOT_TIMEOUT_SECONDS}s; continuing with build attempt."
    return 0
  fi

  xcrun simctl bootstatus "$DEVICE_ID" -b >/tmp/xpaychat-ios-bootstatus.log 2>&1 &
  local boot_pid=$!
  elapsed=0
  while kill -0 "$boot_pid" 2>/dev/null && (( elapsed < BOOT_TIMEOUT_SECONDS )); do
    sleep 1
    elapsed=$((elapsed + 1))
  done

  if kill -0 "$boot_pid" 2>/dev/null; then
    kill "$boot_pid" 2>/dev/null || true
    wait "$boot_pid" 2>/dev/null || true
    echo "Warning: simctl bootstatus timed out; continuing because simulator is already Booted."
  else
    wait "$boot_pid" 2>/dev/null || true
  fi
}

build_for_simulator() {
  local status=0
  reset_ibtool_cache
  set +e
  /usr/bin/perl -e 'alarm shift; exec @ARGV' "$BUILD_TIMEOUT_SECONDS" xcodebuild \
    -workspace "$WORKSPACE" \
    -scheme "$SCHEME" \
    -configuration Debug \
    -destination "$BUILD_DESTINATION" \
    CODE_SIGNING_ALLOWED=NO \
    ASSETCATALOG_COMPILER_GENERATE_SWIFT_ASSET_SYMBOL_EXTENSIONS=NO \
    -quiet \
    build 2>&1 | tee "$BUILD_LOG"
  status=${PIPESTATUS[0]}
  set -e

  if (( status != 0 )) && grep -qiE "database is locked|ibtoold|CompileStoryboard|CompileAssetCatalog" "$BUILD_LOG"; then
    echo "Xcode ibtool/asset cache issue detected. Cleaning cache and retrying once..."
    reset_ibtool_cache
    set +e
    /usr/bin/perl -e 'alarm shift; exec @ARGV' "$BUILD_TIMEOUT_SECONDS" xcodebuild \
      -workspace "$WORKSPACE" \
      -scheme "$SCHEME" \
      -configuration Debug \
      -destination "$BUILD_DESTINATION" \
      CODE_SIGNING_ALLOWED=NO \
      ASSETCATALOG_COMPILER_GENERATE_SWIFT_ASSET_SYMBOL_EXTENSIONS=NO \
      -quiet \
      build 2>&1 | tee "$BUILD_LOG"
    status=${PIPESTATUS[0]}
    set -e
  fi

  return "$status"
}

if [[ "${NEXACHAT_IOS_RUN_FIRST_LAUNCH:-0}" == "1" ]]; then
  echo "Running Xcode first-launch setup..."
  xcodebuild -runFirstLaunch >/dev/null
else
  echo "Skipping Xcode first-launch setup. Set NEXACHAT_IOS_RUN_FIRST_LAUNCH=1 to run it."
fi

if [[ "${NEXACHAT_IOS_SKIP_RUNTIME_CHECK:-1}" == "1" ]]; then
  echo "Skipping runtime download check. Set NEXACHAT_IOS_SKIP_RUNTIME_CHECK=0 to verify/install."
elif ! xcrun simctl list runtimes | grep -q "$RUNTIME_ID"; then
  echo "Installing iOS simulator runtime with xcodebuild -downloadPlatform iOS..."
  xcodebuild -downloadPlatform iOS
fi

DEVICE_ID="${NEXACHAT_IOS_DEVICE_ID:-}"

if [[ -z "$DEVICE_ID" ]]; then
  DEVICE_ID="$(xcrun simctl list devices available | sed -n "s/.*$DEVICE_NAME (\([A-F0-9-][A-F0-9-]*\)) (.*/\1/p" | head -n 1)"
fi

if [[ -z "$DEVICE_ID" ]]; then
  echo "Creating simulator: $DEVICE_NAME"
  DEVICE_ID="$(xcrun simctl create "$DEVICE_NAME" "$DEVICE_TYPE" "$RUNTIME_ID")"
fi

if [[ "${NEXACHAT_IOS_SKIP_BOOT:-0}" == "1" ]]; then
  echo "Skipping simulator boot for: $DEVICE_ID"
elif [[ "${NEXACHAT_IOS_SKIP_BOOT_WAIT:-0}" == "1" ]]; then
  echo "Booting simulator without bootstatus wait: $DEVICE_ID"
  xcrun simctl boot "$DEVICE_ID" 2>/dev/null || true
else
  echo "Booting simulator: $DEVICE_ID"
  xcrun simctl boot "$DEVICE_ID" 2>/dev/null || true
  wait_for_simulator_boot
fi

echo "Building XPAY Chat iOS for simulator..."
build_for_simulator

APP_PATH="$(/usr/bin/perl -e 'alarm shift; exec @ARGV' "$SETTINGS_TIMEOUT_SECONDS" xcodebuild \
  -workspace "$WORKSPACE" \
  -scheme "$SCHEME" \
  -configuration Debug \
  -destination "$BUILD_DESTINATION" \
  CODE_SIGNING_ALLOWED=NO \
  -showBuildSettings 2>/dev/null | awk -F'= ' '
    / TARGET_BUILD_DIR = / { dir=$2 }
    / WRAPPER_NAME = / { app=$2 }
    END { if (dir && app) print dir "/" app }
  ')"

if [[ -n "$APP_PATH" && -d "$APP_PATH" ]]; then
  if [[ "${NEXACHAT_IOS_SKIP_INSTALL:-0}" == "1" ]]; then
    echo "Build completed. Skipping install/launch: $APP_PATH"
    echo "iOS simulator app path: $APP_PATH"
    exit 0
  fi
  echo "Installing and launching: $APP_PATH"
  xcrun simctl install "$DEVICE_ID" "$APP_PATH"
  xcrun simctl launch "$DEVICE_ID" com.gatewayxpay.chat
fi

echo "iOS simulator ready: $DEVICE_NAME ($DEVICE_ID)"
