package com.gatewayxpay.chatnative;

import android.os.Handler;
import android.os.Looper;

import org.json.JSONObject;
import org.json.JSONArray;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

final class NexaApi {
    interface Callback {
        void onSuccess(JSONObject data);
        void onError(String message);
    }

    private static final int CONNECT_TIMEOUT_MS = 8000;
    private static final int READ_TIMEOUT_MS = 14000;
    private static final int AI_READ_TIMEOUT_MS = 70000;

    private final String baseUrl;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private String token;

    NexaApi(String baseUrl, String token) {
        this.baseUrl = baseUrl;
        this.token = token;
    }

    void setToken(String token) {
        this.token = token;
    }

    void requestOtp(String phone, String email, String purpose, Callback callback) {
        JSONObject body = new JSONObject();
        put(body, "phone", phone);
        put(body, "email", email);
        put(body, "purpose", purpose);
        post("/api/auth/otp/request", body, false, callback);
    }

    void login(String phone, String password, Callback callback) {
        JSONObject body = new JSONObject();
        put(body, "phone", phone);
        put(body, "password", password);
        post("/api/auth/login", body, false, callback);
    }

    void register(String phone, String email, String name, String password, String otp, Callback callback) {
        JSONObject body = new JSONObject();
        put(body, "phone", phone);
        put(body, "email", email);
        put(body, "name", name);
        put(body, "password", password);
        put(body, "otp", otp);
        post("/api/auth/register", body, false, callback);
    }

    void resetPassword(String phone, String email, String password, String otp, Callback callback) {
        JSONObject body = new JSONObject();
        put(body, "phone", phone);
        put(body, "email", email);
        put(body, "password", password);
        put(body, "otp", otp);
        post("/api/auth/reset-password", body, false, callback);
    }

    void restore(Callback callback) {
        post("/api/session/restore", new JSONObject(), true, callback);
    }

    void sync(Callback callback) {
        post("/api/sync", new JSONObject(), true, callback);
    }

    void askAi(String prompt, JSONArray history, Callback callback) {
        JSONObject body = new JSONObject();
        put(body, "prompt", prompt);
        if (history != null && history.length() > 0) {
            put(body, "history", history);
        }
        post("/api/ai/assistant", body, true, AI_READ_TIMEOUT_MS, callback);
    }

    void updateAiRules(JSONObject rules, Callback callback) {
        JSONObject body = new JSONObject();
        put(body, "rules", rules);
        post("/api/ai/rules/update", body, true, callback);
    }

    void addFriend(String phone, Callback callback) {
        JSONObject body = new JSONObject();
        put(body, "phone", phone);
        post("/api/friends/add", body, true, callback);
    }

    void respondFriendRequest(String requestId, String action, Callback callback) {
        JSONObject body = new JSONObject();
        put(body, "requestId", requestId);
        put(body, "action", action);
        post("/api/friends/respond", body, true, callback);
    }

    void updateFriendBlock(String friendPhone, boolean blocked, Callback callback) {
        JSONObject body = new JSONObject();
        put(body, "friendPhone", friendPhone);
        put(body, "blocked", blocked);
        post("/api/friends/block", body, true, callback);
    }

    void appAdminUsers(Callback callback) {
        post("/api/app-admin/users", new JSONObject(), true, callback);
    }

    void updateAppAdminBadges(String phone, boolean verified, boolean vip, Callback callback) {
        JSONObject body = new JSONObject();
        JSONObject badges = new JSONObject();
        put(badges, "verified", verified);
        put(badges, "vip", vip);
        put(body, "phone", phone);
        put(body, "accountBadges", badges);
        post("/api/app-admin/user/badges", body, true, callback);
    }

    void updateAppAdminBusiness(String ownerPhone, String status, String reviewNote, Callback callback) {
        JSONObject body = new JSONObject();
        put(body, "ownerPhone", ownerPhone);
        put(body, "status", status);
        put(body, "reviewNote", reviewNote);
        post("/api/app-admin/business/update", body, true, callback);
    }

    void updateProfile(JSONObject profile, Callback callback) {
        JSONObject body = new JSONObject();
        put(body, "profile", profile);
        post("/api/profile/update", body, true, callback);
    }

    void updateBusiness(JSONObject business, boolean acceptTerms, Callback callback) {
        JSONObject body = new JSONObject();
        put(body, "business", business);
        put(body, "acceptTerms", acceptTerms);
        post("/api/businesses/upsert", body, true, callback);
    }

    void contactBusiness(String ownerPhone, String text, Callback callback) {
        JSONObject body = new JSONObject();
        JSONObject message = new JSONObject();
        put(message, "text", text);
        put(message, "time", "");
        put(body, "ownerPhone", ownerPhone);
        put(body, "text", text);
        put(body, "message", message);
        post("/api/businesses/contact", body, true, callback);
    }

    void updateBusinessCustomerStatus(String customerPhone, String status, Callback callback) {
        JSONObject body = new JSONObject();
        put(body, "customerPhone", customerPhone);
        put(body, "status", status);
        post("/api/businesses/customer/status", body, true, callback);
    }

    void updatePresence(String mode, Callback callback) {
        JSONObject body = new JSONObject();
        put(body, "mode", mode);
        post("/api/presence/update", body, true, callback);
    }

    void updateLocation(boolean enabled, double latitude, double longitude, Callback callback) {
        JSONObject body = new JSONObject();
        put(body, "enabled", enabled);
        if (enabled) {
            put(body, "latitude", latitude);
            put(body, "longitude", longitude);
        }
        post("/api/location/update", body, true, callback);
    }

    void sendMessage(String friendPhone, String text, Callback callback) {
        JSONObject body = new JSONObject();
        JSONObject message = new JSONObject();
        put(message, "text", text);
        put(message, "time", "");
        put(body, "friendPhone", friendPhone);
        put(body, "message", message);
        post("/api/messages/send", body, true, callback);
    }

    void sendMediaMessage(String friendPhone, String text, JSONObject media, Callback callback) {
        JSONObject body = new JSONObject();
        JSONObject message = new JSONObject();
        put(message, "text", text);
        put(message, "time", "");
        put(message, "media", media);
        put(body, "friendPhone", friendPhone);
        put(body, "message", message);
        post("/api/messages/send", body, true, callback);
    }

    void deleteMessage(String friendPhone, String messageId, Callback callback) {
        JSONObject body = new JSONObject();
        put(body, "friendPhone", friendPhone);
        put(body, "messageId", messageId);
        post("/api/messages/delete", body, true, callback);
    }

    void deleteConversation(String friendPhone, Callback callback) {
        JSONObject body = new JSONObject();
        put(body, "friendPhone", friendPhone);
        put(body, "hide", true);
        post("/api/conversations/delete", body, true, callback);
    }

    void recallMessage(String friendPhone, String messageId, Callback callback) {
        JSONObject body = new JSONObject();
        put(body, "friendPhone", friendPhone);
        put(body, "messageId", messageId);
        post("/api/messages/recall", body, true, callback);
    }

    void createJournal(String text, String privacy, JSONObject image, Callback callback) {
        JSONObject body = new JSONObject();
        JSONObject post = new JSONObject();
        put(post, "text", text);
        put(post, "privacy", privacy);
        put(post, "time", "");
        if (image != null) put(post, "image", image);
        put(body, "post", post);
        post("/api/journals/create", body, true, callback);
    }

    void deleteJournal(String id, Callback callback) {
        JSONObject body = new JSONObject();
        put(body, "id", id);
        post("/api/journals/delete", body, true, callback);
    }

    void reportContent(String targetType, String targetId, String targetOwnerPhone, String reason, String details, Callback callback) {
        JSONObject body = new JSONObject();
        put(body, "targetType", targetType);
        put(body, "targetId", targetId);
        put(body, "targetOwnerPhone", targetOwnerPhone);
        put(body, "reason", reason);
        put(body, "details", details);
        post("/api/reports/create", body, true, callback);
    }

    void startCall(String friendPhone, String mode, Callback callback) {
        JSONObject body = new JSONObject();
        put(body, "friendPhone", friendPhone);
        put(body, "mode", mode);
        post("/api/calls/start", body, true, callback);
    }

    void respondCall(String id, String action, Callback callback) {
        JSONObject body = new JSONObject();
        put(body, "id", id);
        put(body, "action", action);
        post("/api/calls/respond", body, true, callback);
    }

    void rtcConfig(Callback callback) {
        post("/api/rtc/config", new JSONObject(), true, callback);
    }

    void sendCallSignal(String id, String type, JSONObject payload, Callback callback) {
        JSONObject body = new JSONObject();
        put(body, "id", id);
        put(body, "type", type);
        put(body, "payload", payload);
        post("/api/calls/signal", body, true, callback);
    }

    void pushStatus(Callback callback) {
        post("/api/push/status", new JSONObject(), true, callback);
    }

    void registerPush(String tokenValue, String platform, String provider, String deviceId, Callback callback) {
        JSONObject body = new JSONObject();
        put(body, "token", tokenValue);
        put(body, "platform", platform);
        put(body, "provider", provider);
        put(body, "deviceId", deviceId);
        put(body, "enabled", true);
        post("/api/push/register", body, true, callback);
    }

    void unregisterPush(String tokenValue, String deviceId, Callback callback) {
        JSONObject body = new JSONObject();
        put(body, "token", tokenValue);
        put(body, "deviceId", deviceId);
        post("/api/push/unregister", body, true, callback);
    }

    void logout(String tokenValue, String deviceId, Callback callback) {
        JSONObject body = new JSONObject();
        put(body, "token", tokenValue);
        put(body, "deviceId", deviceId);
        post("/api/session/logout", body, true, callback);
    }

    void deleteAccount(String password, String confirmation, Callback callback) {
        JSONObject body = new JSONObject();
        put(body, "password", password);
        put(body, "confirmation", confirmation);
        post("/api/account/delete", body, true, callback);
    }

    private void post(String path, JSONObject body, boolean authenticated, Callback callback) {
        post(path, body, authenticated, READ_TIMEOUT_MS, callback);
    }

    private void post(String path, JSONObject body, boolean authenticated, int readTimeoutMs, Callback callback) {
        executor.execute(() -> {
            HttpURLConnection connection = null;
            try {
                URL url = new URL(baseUrl + path);
                connection = (HttpURLConnection) url.openConnection();
                connection.setRequestMethod("POST");
                connection.setConnectTimeout(CONNECT_TIMEOUT_MS);
                connection.setReadTimeout(readTimeoutMs);
                connection.setDoOutput(true);
                connection.setRequestProperty("Content-Type", "application/json; charset=utf-8");
                if (authenticated && token != null && !token.isEmpty()) {
                    connection.setRequestProperty("Authorization", "Bearer " + token);
                }
                byte[] payload = body.toString().getBytes(StandardCharsets.UTF_8);
                connection.setFixedLengthStreamingMode(payload.length);
                try (OutputStream output = connection.getOutputStream()) {
                    output.write(payload);
                }
                int status = connection.getResponseCode();
                String responseText = readAll(status >= 200 && status < 300 ? connection.getInputStream() : connection.getErrorStream());
                JSONObject data;
                try {
                    data = responseText.isEmpty() ? new JSONObject() : new JSONObject(responseText);
                } catch (Exception parseError) {
                    data = new JSONObject();
                    put(data, "message", status == 504
                            ? "Máy chủ XPAY AI phản hồi quá lâu. Anh thử lại sau vài giây nhé."
                            : "Máy chủ trả về dữ liệu chưa hợp lệ.");
                }
                if (status >= 200 && status < 300) {
                    JSONObject finalData = data;
                    mainHandler.post(() -> callback.onSuccess(finalData));
                } else {
                    String message = data.optString("message", "Không thể kết nối máy chủ.");
                    mainHandler.post(() -> callback.onError(message));
                }
            } catch (Exception error) {
                String message = error.getMessage() == null ? "Lỗi kết nối." : error.getMessage();
                if ("timeout".equalsIgnoreCase(message) || message.toLowerCase().contains("timed out")) {
                    message = "XPAY AI phản hồi quá lâu. Anh thử lại sau vài giây nhé.";
                }
                String finalMessage = message;
                mainHandler.post(() -> callback.onError(finalMessage));
            } finally {
                if (connection != null) connection.disconnect();
            }
        });
    }

    private static String readAll(InputStream inputStream) throws Exception {
        if (inputStream == null) return "";
        StringBuilder builder = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) builder.append(line);
        }
        return builder.toString();
    }

    private static void put(JSONObject body, String key, Object value) {
        try {
            body.put(key, value);
        } catch (Exception ignored) {
        }
    }
}
