# XPAY Chat Rebrand Notes

This folder is the XPAY project copy of the original Nexa Chat source.

Completed in this workspace:

- App name changed to `XPAY Chat`.
- Company owner changed to `Công Ty TNHH TM DV PHẦN MỀM XPAY`.
- Public domain changed to `gatewayxpay.com`.
- Support/admin email changed to `admin@gatewayxpay.com`.
- Capacitor app id changed to `com.gatewayxpay.chat`.
- Native Android label changed to `XPAY Chat`.
- iOS display name and permission strings changed to `XPAY Chat`.

The root Gateway XPAY app is the license/payment gateway. It exposes `/chat` as the first customer login surface and keeps license state in the shared API. The copied XPAY Chat source can be connected to the same license API before a mobile production build.

Large generated folders, dependency folders, secrets, and the Telegram reference checkout are ignored by the root Git repository.
