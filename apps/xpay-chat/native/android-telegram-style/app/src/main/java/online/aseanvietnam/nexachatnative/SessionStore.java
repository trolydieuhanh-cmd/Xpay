package com.gatewayxpay.chatnative;

import android.content.Context;
import android.content.SharedPreferences;

import java.util.UUID;

final class SessionStore {
    private static final String PREFS = "nexa_native_session";
    private static final String KEY_TOKEN = "token";
    private static final String KEY_PHONE = "phone";
    private static final String KEY_DEVICE_ID = "device_id";
    private static final String KEY_PUSH_ENABLED = "push_enabled";
    private static final String KEY_PUSH_TOKEN = "push_token";

    private final SharedPreferences preferences;

    SessionStore(Context context) {
        preferences = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    String token() {
        return preferences.getString(KEY_TOKEN, "");
    }

    String phone() {
        return preferences.getString(KEY_PHONE, "");
    }

    String deviceId() {
        String value = preferences.getString(KEY_DEVICE_ID, "");
        if (value == null || value.isEmpty()) {
            value = "android-" + UUID.randomUUID();
            preferences.edit().putString(KEY_DEVICE_ID, value).apply();
        }
        return value;
    }

    boolean pushEnabled() {
        return preferences.getBoolean(KEY_PUSH_ENABLED, false);
    }

    void setPushEnabled(boolean enabled) {
        preferences.edit().putBoolean(KEY_PUSH_ENABLED, enabled).apply();
    }

    String pushToken() {
        return preferences.getString(KEY_PUSH_TOKEN, "");
    }

    void savePushToken(String token) {
        preferences.edit().putString(KEY_PUSH_TOKEN, token == null ? "" : token).apply();
    }

    void save(String token, String phone) {
        preferences.edit().putString(KEY_TOKEN, token).putString(KEY_PHONE, phone).apply();
    }

    void clear() {
        String currentDeviceId = deviceId();
        preferences.edit().clear().putString(KEY_DEVICE_ID, currentDeviceId).apply();
    }
}
