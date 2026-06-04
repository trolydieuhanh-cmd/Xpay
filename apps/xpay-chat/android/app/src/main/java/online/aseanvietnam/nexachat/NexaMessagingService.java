package com.gatewayxpay.chat;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import com.capacitorjs.plugins.pushnotifications.PushNotificationsPlugin;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.util.Map;

public class NexaMessagingService extends FirebaseMessagingService {
    private static final String CHANNEL_MESSAGES = "xpaychat_messages";
    private static final String CHANNEL_CALLS = "xpaychat_calls";

    @Override
    public void onMessageReceived(@NonNull RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);
        PushNotificationsPlugin.sendRemoteMessage(remoteMessage);
        showNativeNotification(remoteMessage);
    }

    @Override
    public void onNewToken(@NonNull String token) {
        super.onNewToken(token);
        PushNotificationsPlugin.onNewToken(token);
    }

    private void showNativeNotification(RemoteMessage remoteMessage) {
        Map<String, String> data = remoteMessage.getData();
        RemoteMessage.Notification notification = remoteMessage.getNotification();
        String type = value(data, "type", "message");
        boolean isCall = "call".equals(type);
        String title = value(data, "title", notification != null ? notification.getTitle() : "");
        String body = value(data, "body", notification != null ? notification.getBody() : "");

        if (title.isEmpty()) {
            title = isCall ? "Cuộc gọi XPAY Chat" : "XPAY Chat";
        }
        if (body.isEmpty()) {
            body = isCall ? "Có cuộc gọi đến" : "Bạn có tin nhắn mới";
        }

        createChannels();
        Intent openIntent = new Intent(this, MainActivity.class);
        openIntent.setAction(isCall ? "com.gatewayxpay.chat.OPEN_CALL" : "com.gatewayxpay.chat.OPEN_CHAT");
        openIntent.putExtra("xpaychat_type", type);
        openIntent.putExtra("xpaychat_call_id", value(data, "callId", ""));
        openIntent.putExtra("xpaychat_from_phone", value(data, "fromPhone", ""));
        openIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);

        int notificationId = notificationIdFor(isCall ? value(data, "callId", "") : value(data, "messageId", ""));
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
        PendingIntent contentIntent = PendingIntent.getActivity(this, notificationId, openIntent, flags);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, isCall ? CHANNEL_CALLS : CHANNEL_MESSAGES)
            .setSmallIcon(R.drawable.ic_stat_xpaychat)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setContentIntent(contentIntent)
            .setAutoCancel(true)
            .setShowWhen(true)
            .setDefaults(NotificationCompat.DEFAULT_SOUND | NotificationCompat.DEFAULT_VIBRATE)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setPriority(isCall ? NotificationCompat.PRIORITY_MAX : NotificationCompat.PRIORITY_HIGH)
            .setCategory(isCall ? NotificationCompat.CATEGORY_CALL : NotificationCompat.CATEGORY_MESSAGE);

        if (isCall) {
            Intent answerIntent = new Intent(openIntent);
            answerIntent.setAction("com.gatewayxpay.chat.ANSWER_CALL");
            PendingIntent answerPendingIntent = PendingIntent.getActivity(this, notificationId + 1, answerIntent, flags);
            builder
                .setOngoing(true)
                .setTimeoutAfter(60000)
                .setFullScreenIntent(contentIntent, true)
                .addAction(R.drawable.ic_stat_xpaychat, "Nghe", answerPendingIntent);
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
            && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            return;
        }

        NotificationManagerCompat.from(this).notify(notificationId, builder.build());
    }

    private void createChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return;
        createChannel(manager, CHANNEL_MESSAGES, "Tin nhắn XPAY Chat", "Thông báo khi có tin nhắn mới", NotificationManager.IMPORTANCE_HIGH);
        createChannel(manager, CHANNEL_CALLS, "Cuộc gọi XPAY Chat", "Thông báo khi có cuộc gọi đến", NotificationManager.IMPORTANCE_HIGH);
    }

    private void createChannel(NotificationManager manager, String id, String name, String description, int importance) {
        NotificationChannel channel = new NotificationChannel(id, name, importance);
        channel.setDescription(description);
        channel.enableVibration(true);
        channel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);
        AudioAttributes attributes = new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build();
        Uri soundUri = Settings.System.DEFAULT_NOTIFICATION_URI;
        channel.setSound(soundUri, attributes);
        manager.createNotificationChannel(channel);
    }

    private static String value(Map<String, String> data, String key, String fallback) {
        String value = data != null ? data.get(key) : "";
        return value == null || value.trim().isEmpty() ? fallback : value.trim();
    }

    private static int notificationIdFor(String id) {
        if (id == null || id.isEmpty()) return 9001;
        int hash = id.hashCode();
        return hash == Integer.MIN_VALUE ? 9001 : Math.abs(hash);
    }
}
