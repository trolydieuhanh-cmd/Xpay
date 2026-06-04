# XPAY Chat Store Release Checklist

Updated: 2026-06-01

## Current Status

- Release candidate name: `XPAY Chat iOS App Store readiness 1.0.16`
- Web/package version: `1.0.0-store-rc.1`
- Android version: `versionCode 100`, `versionName 1.0.0`
- iOS version: `MARKETING_VERSION 1.0.16`, `CURRENT_PROJECT_VERSION 116`
- Production web/PWA: `https://gatewayxpay.com`
- Mobile shell target: Capacitor
- Android package id: `com.gatewayxpay.chat`
- iOS bundle id: `com.gatewayxpay.chat`
- Privacy Policy: `/privacy.html`
- Terms and Community Guidelines: `/terms.html`
- Account deletion: in app Settings -> Account and privacy -> Delete account

## Local Tools Still Needed

Install these on the Mac before generating signed store builds:

- Node.js with `npm` and `npx`
- Android Studio, Android SDK, Android Build Tools
- Xcode command line tools and a valid Apple Developer account
- CocoaPods: `sudo gem install cocoapods` or Homebrew equivalent

## Build Commands After Tools Are Installed

```bash
npm install
npm run check
npm run mobile:prepare
npx cap add android
npx cap add ios
npx cap sync
```

Android release:

```bash
while IFS='=' read -r key value; do [ -z "$key" ] && continue; export "$key=$value"; done < secrets/xpaychat-upload-keystore.properties
npm run android:bundle
npm run native:android:bundle
```

Target SDK is set to 35. The local upload keystore is stored at `secrets/xpaychat-upload-keystore.jks`; keep this file and `secrets/xpaychat-upload-keystore.properties` backed up outside Git before uploading to Google Play.

iOS release:

```bash
npm run ios:setup-simulator
npx cap open ios
```

If CoreSimulator hangs immediately after installing the iOS runtime, restart the Mac first. The setup script now clears the ibtool cache and avoids re-downloading the simulator runtime on every run.

Current local result: iOS device Debug build and install have passed on the connected iPhone 11 `Benjamin Tran` for build `116` using the local Personal Team. A final App Store upload still needs a paid Apple Developer distribution signing setup, archive, TestFlight upload, reviewer account, screenshots, privacy answers, and review notes.

Unsigned iPhoneOS handoff IPA was exported at `dist/ios/XPAY Chat-1.0.0-ios-device-unsigned.ipa`. It is built for real iPhone arm64, but this Mac has no valid Apple signing identity or provisioning profile, so it must be signed with a valid Apple Developer/development/ad-hoc profile before direct iPhone installation.

Installable iPhone WebClip/PWA profile was exported at `dist/ios/XPAY Chat-iPhone-WebClip.mobileconfig`. This can be installed on iPhone without Apple Developer signing and adds XPAY Chat to the Home Screen in fullscreen mode.

Connected iPhone 11 `Benjamin Tran` is available/paired over USB with Developer Mode enabled. Debug installs are working with the local Personal Team. Push notification entitlement is enabled only for Release because Personal Team provisioning does not support Push Notifications.

Then use Xcode with a paid Apple Developer Team, archive build `116`, and upload to App Store Connect.

## Store Metadata Required

- App name: XPAY Chat
- Developer/publisher: Công Ty TNHH TM DV PHẦN MỀM XPAY
- Privacy policy URL: `https://gatewayxpay.com/privacy.html`
- Terms/community URL: `https://gatewayxpay.com/terms.html`
- Support/contact email: `admin@gatewayxpay.com`
- Data safety declarations: phone, email, profile info, messages, photos/videos, location, calls, AI assistant content
- Permissions explanation: camera, microphone, location, photos/videos
- Test account for reviewer
- Screenshots for iPhone, iPad if supported, Android phone, Android tablet if supported

## Native Permission Strings To Add

iOS `Info.plist`:

- `NSCameraUsageDescription`: XPAY Chat uses the camera for video calls, QR scanning, avatar updates, and sending selected media.
- `NSMicrophoneUsageDescription`: XPAY Chat uses the microphone for voice and video calls.
- `NSLocationWhenInUseUsageDescription`: XPAY Chat uses location only when you enable Nearby or send your current location in chat.
- `NSPhotoLibraryUsageDescription`: XPAY Chat reads photos/videos only when you choose media to send or post.

Android manifest permissions:

- `android.permission.CAMERA`
- `android.permission.RECORD_AUDIO`
- `android.permission.ACCESS_FINE_LOCATION`
- `android.permission.ACCESS_COARSE_LOCATION`
- Media permissions according to the target Android SDK and selected Capacitor plugins.

## Before Submission

- Test registration/login/forgot password with email OTP.
- Confirm `EMAIL_OTP_REQUIRED=1`, `PUBLIC_RELEASE_DOWNLOADS=0`, and `APP_ADMIN_PHONES` are set on production.
- Test account deletion with a non-admin test account.
- Test server-side content filtering for chat messages, journals, profile text, business profile text, and business contact messages.
- Test chat media, QR, location, voice call, video call on real Android and iPhone devices.
- Test report flow for chat, journal, business profile, and XPAY AI responses.
- Confirm XPAY AI latency and fallback behavior.
- Close unneeded public VPS ports before production launch.
- Add Digital Asset Links after the Android signing certificate SHA-256 is known.
- Run dependency audit after installing a package manager on this Mac; `npm`, `pnpm`, `yarn`, and `bun` are currently unavailable in the shell.
