package com.gatewayxpay.chatnative;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Person;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import org.json.JSONObject;

import java.util.Map;

public class NexaFirebaseMessagingService extends FirebaseMessagingService {
    static final String CHANNEL_MESSAGES = "xpaychat_messages";
    static final String CHANNEL_CALLS = "xpaychat_calls";
    static final String ACTION_OPEN_NOTIFICATION = "com.gatewayxpay.chatnative.OPEN_NOTIFICATION";
    static final String ACTION_ANSWER_CALL = "com.gatewayxpay.chatnative.ANSWER_CALL";
    static final String ACTION_REJECT_CALL = "com.gatewayxpay.chatnative.REJECT_CALL";
    static final String EXTRA_ROUTE = "nexa_route";
    static final String EXTRA_CALL_ID = "nexa_call_id";
    static final String EXTRA_CALL_MODE = "nexa_call_mode";
    static final String EXTRA_FROM_PHONE = "nexa_from_phone";

    private static final String API_BASE_URL = "https://gatewayxpay.com";
    private static final String PREF_UI = "xpaychat-native-ui";

    @Override
    public void onCreate() {
        super.onCreate();
        ensureNotificationChannels(this);
    }

    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
        SessionStore store = new SessionStore(this);
        store.savePushToken(token);
        if (!store.token().isEmpty() && store.pushEnabled()) {
            NexaApi api = new NexaApi(API_BASE_URL, store.token());
            api.registerPush(token, "android", "fcm", store.deviceId(), new SilentCallback());
        }
    }

    @Override
    public void onMessageReceived(RemoteMessage message) {
        super.onMessageReceived(message);
        ensureNotificationChannels(this);

        Map<String, String> data = message.getData();
        String type = value(data, "type", "message");
        String callId = value(data, "callId", "");
        if ("call_update".equals(type)) {
            cancelCallNotification(callId);
            return;
        }
        RemoteMessage.Notification notification = message.getNotification();
        String title = value(data, "title", notification == null ? "XPAY Chat" : notification.getTitle());
        String body = value(data, "body", notification == null ? "Bạn có thông báo mới." : notification.getBody());
        String callMode = value(data, "mode", "voice");
        String fromPhone = value(data, "fromPhone", "");
        int id = notificationId(type, data);

        PendingIntent contentIntent = activityPendingIntent(
            ACTION_OPEN_NOTIFICATION,
            type,
            callId,
            callMode,
            fromPhone,
            requestCode(id, 0)
        );
        PendingIntent answerIntent = null;
        PendingIntent rejectIntent = null;
        if ("call".equals(type) && !callId.isEmpty()) {
            answerIntent = activityPendingIntent(
                ACTION_ANSWER_CALL,
                type,
                callId,
                callMode,
                fromPhone,
                requestCode(id, 1)
            );
            rejectIntent = activityPendingIntent(
                ACTION_REJECT_CALL,
                type,
                callId,
                callMode,
                fromPhone,
                requestCode(id, 2)
            );
        }

        showNotification(type, title, body, contentIntent, answerIntent, rejectIntent, id);
    }

    static void ensureNotificationChannels(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return;

        NotificationChannel messages = new NotificationChannel(
            CHANNEL_MESSAGES,
            "Tin nhắn XPAY Chat",
            NotificationManager.IMPORTANCE_HIGH
        );
        messages.setDescription("Thông báo tin nhắn mới");
        messages.enableVibration(true);
        messages.setLockscreenVisibility(Notification.VISIBILITY_PRIVATE);
        manager.createNotificationChannel(messages);

        NotificationChannel calls = new NotificationChannel(
            CHANNEL_CALLS,
            "Cuộc gọi XPAY Chat",
            NotificationManager.IMPORTANCE_HIGH
        );
        calls.setDescription("Thông báo cuộc gọi đến");
        calls.enableVibration(true);
        calls.setVibrationPattern(new long[] { 0, 450, 250, 450, 250, 650 });
        calls.setLightColor(Color.rgb(15, 118, 110));
        calls.enableLights(true);
        calls.setLockscreenVisibility(Notification.VISIBILITY_PRIVATE);
        Uri ringtone = Settings.System.DEFAULT_RINGTONE_URI;
        AudioAttributes attributes = new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build();
        calls.setSound(ringtone, attributes);
        manager.createNotificationChannel(calls);
    }

    private void showNotification(
        String type,
        String title,
        String body,
        PendingIntent contentIntent,
        PendingIntent answerIntent,
        PendingIntent rejectIntent,
        int id
    ) {
        String channelId = "call".equals(type) ? CHANNEL_CALLS : CHANNEL_MESSAGES;
        boolean call = "call".equals(type);
        boolean soundEnabled = notificationSetting(call ? "setting_call_ringtone" : "setting_message_sound", true);
        boolean vibrationEnabled = notificationSetting(call ? "setting_call_vibration" : "setting_message_vibration", true);
        Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? new Notification.Builder(this, channelId)
            : new Notification.Builder(this);

        int defaults = 0;
        if (soundEnabled) defaults |= Notification.DEFAULT_SOUND;
        if (vibrationEnabled) defaults |= Notification.DEFAULT_VIBRATE;

        builder
            .setSmallIcon(R.drawable.ic_launcher_native)
            .setContentTitle(emptyTo(title, "XPAY Chat"))
            .setContentText(call ? "Cuộc gọi XPAY Chat" : "Bạn có tin nhắn mới.")
            .setContentIntent(contentIntent)
            .setAutoCancel(true)
            .setShowWhen(true)
            .setVisibility(Notification.VISIBILITY_PRIVATE)
            .setDefaults(defaults)
            .setPriority(Notification.PRIORITY_HIGH);

        if (!soundEnabled) builder.setSound(null);
        if (!vibrationEnabled) builder.setVibrate(new long[] { 0 });

        if (call) {
            builder
                .setCategory(Notification.CATEGORY_CALL)
                .setOngoing(true)
                .setAutoCancel(false);
            if (canUseFullScreenIntent()) {
                builder.setFullScreenIntent(contentIntent, true);
            }
            if (vibrationEnabled) builder.setVibrate(new long[] { 0, 450, 250, 450, 250, 650 });
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) builder.setTimeoutAfter(60_000);
            if (answerIntent != null && rejectIntent != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    Person caller = new Person.Builder()
                        .setName(emptyTo(body, emptyTo(title, "XPAY Chat")))
                        .build();
                    builder.setStyle(Notification.CallStyle.forIncomingCall(caller, rejectIntent, answerIntent));
                } else {
                    builder
                        .addAction(R.drawable.ic_launcher_native, "Từ chối", rejectIntent)
                        .addAction(R.drawable.ic_launcher_native, "Nghe máy", answerIntent);
                }
            }
        } else {
            builder.setCategory(Notification.CATEGORY_MESSAGE);
        }

        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) manager.notify(id, builder.build());
    }

    private boolean canUseFullScreenIntent() {
        if (Build.VERSION.SDK_INT < 34) return true;
        Object service = getSystemService(Context.NOTIFICATION_SERVICE);
        return service instanceof NotificationManager
            && ((NotificationManager) service).canUseFullScreenIntent();
    }

    private void cancelCallNotification(String callId) {
        if (callId == null || callId.isEmpty()) return;
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) manager.cancel(callNotificationId(callId));
    }

    private boolean notificationSetting(String key, boolean fallback) {
        SharedPreferences preferences = getSharedPreferences(PREF_UI, Context.MODE_PRIVATE);
        return preferences.getBoolean(key, fallback);
    }

    private PendingIntent activityPendingIntent(
        String action,
        String type,
        String callId,
        String callMode,
        String fromPhone,
        int requestCode
    ) {
        Intent intent = new Intent(this, MainActivity.class);
        intent.setAction(action);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        intent.putExtra(EXTRA_ROUTE, "call".equals(type) ? "calls" : "messages");
        intent.putExtra(EXTRA_CALL_ID, emptyTo(callId, ""));
        intent.putExtra(EXTRA_CALL_MODE, emptyTo(callMode, "voice"));
        intent.putExtra(EXTRA_FROM_PHONE, emptyTo(fromPhone, ""));

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
        return PendingIntent.getActivity(this, requestCode, intent, flags);
    }

    private static int notificationId(String type, Map<String, String> data) {
        String key = "call".equals(type) ? value(data, "callId", "") : value(data, "messageId", "");
        if (key.isEmpty()) key = type + "-" + System.currentTimeMillis();
        return Math.abs(key.hashCode());
    }

    static int callNotificationId(String callId) {
        String key = emptyTo(callId, "");
        return key.isEmpty() ? 0 : Math.abs(key.hashCode());
    }

    private static int requestCode(int id, int salt) {
        return id ^ (0x4E584100 + salt);
    }

    private static String value(Map<String, String> data, String key, String fallback) {
        String value = data == null ? "" : data.get(key);
        return value == null || value.isEmpty() ? emptyTo(fallback, "") : value;
    }

    private static String emptyTo(String value, String fallback) {
        return value == null || value.isEmpty() ? fallback : value;
    }

    private static final class SilentCallback implements NexaApi.Callback {
        @Override
        public void onSuccess(JSONObject data) {
        }

        @Override
        public void onError(String message) {
        }
    }
}
