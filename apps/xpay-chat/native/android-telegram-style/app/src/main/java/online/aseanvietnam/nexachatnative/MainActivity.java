package com.gatewayxpay.chatnative;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.app.DatePickerDialog;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.PixelFormat;
import android.graphics.Rect;
import android.graphics.RectF;
import android.graphics.Typeface;
import android.graphics.ColorFilter;
import android.graphics.drawable.Drawable;
import android.graphics.drawable.GradientDrawable;
import android.location.Location;
import android.location.LocationManager;
import android.media.AudioManager;
import android.media.ToneGenerator;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.MediaStore;
import android.provider.OpenableColumns;
import android.text.Editable;
import android.text.InputType;
import android.text.TextWatcher;
import android.util.Base64;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.ViewParent;
import android.view.inputmethod.EditorInfo;
import android.view.inputmethod.InputMethodManager;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.HorizontalScrollView;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TableLayout;
import android.widget.TableRow;
import android.widget.TextView;
import android.widget.Toast;

import com.google.zxing.BinaryBitmap;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.MultiFormatReader;
import com.google.zxing.RGBLuminanceSource;
import com.google.zxing.Result;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.common.HybridBinarizer;
import com.google.zxing.qrcode.QRCodeWriter;

import org.json.JSONArray;
import org.json.JSONObject;
import org.webrtc.RendererCommon;
import org.webrtc.SurfaceViewRenderer;

import com.google.firebase.messaging.FirebaseMessaging;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.text.Normalizer;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Comparator;
import java.util.Date;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import java.util.TimeZone;

@SuppressWarnings("deprecation")
public class MainActivity extends Activity {
    private static final String API_BASE_URL = "https://gatewayxpay.com";
    private static final int REQ_CHAT_MEDIA = 7001;
    private static final int REQ_JOURNAL_IMAGE = 7002;
    private static final int REQ_AVATAR_IMAGE = 7003;
    private static final int REQ_POST_NOTIFICATIONS = 7004;
    private static final int REQ_CALL_PERMISSIONS = 7005;
    private static final int REQ_QR_IMAGE = 7006;
    private static final int REQ_QR_CAMERA = 7007;
    private static final int REQ_BUSINESS_LOGO = 7008;
    private static final int REQ_BUSINESS_GALLERY = 7009;
    private static final int REQ_LOCATION = 7010;
    private static final int MEDIA_LIMIT_BYTES = 12 * 1024 * 1024;
    private static final int BUSINESS_IMAGE_LIMIT_BYTES = 6 * 1024 * 1024;
    private static final long FOREGROUND_SYNC_DELAY_MS = 1300;
    private static final long FOREGROUND_SYNC_WHILE_CALL_MS = 900;
    private static final long CALL_POLL_DELAY_MS = 420;
    private static final int RINGBACK_TONE_MS = 1450;
    private static final long RINGBACK_GAP_MS = 2350;
    private static final String PREF_UI = "xpaychat-native-ui";
    private static final String KEY_UNREAD_IDS = "unread_ids";
    private static final String KEY_KNOWN_INCOMING_IDS = "known_incoming_ids";

    private static final int COLOR_BG = Color.rgb(248, 250, 252);
    private static final int COLOR_SURFACE = Color.WHITE;
    private static final int COLOR_INK = Color.rgb(15, 23, 42);
    private static final int COLOR_MUTED = Color.rgb(102, 112, 133);
    private static final int COLOR_PRIMARY = Color.rgb(0, 168, 132);
    private static final int COLOR_BLUE = Color.rgb(10, 120, 255);
    private static final int COLOR_SOFT = Color.rgb(226, 232, 240);
    private static final int COLOR_PANEL = Color.rgb(241, 245, 249);

    private SessionStore store;
    private NexaApi api;
    private LinearLayout root;
    private LinearLayout content;
    private LinearLayout activeMessageList;
    private ScrollView appScroll;
    private TextView statusView;
    private JSONObject lastSync;
    private String activeSection = "messages";
    private String activeFriendPhone = "";
    private String pendingReplyText = "";
    private String pendingJournalText = "";
    private String pendingJournalPrivacy = "friends";
    private boolean businessEditorOpen = false;
    private JSONObject pendingBusinessLogo = null;
    private JSONArray pendingBusinessGallery = null;
    private float swipeStartX;
    private float swipeStartY;
    private final Handler callHandler = new Handler(Looper.getMainLooper());
    private final Handler ringbackHandler = new Handler(Looper.getMainLooper());
    private final Handler syncHandler = new Handler(Looper.getMainLooper());
    private final Set<String> processedCallSignals = new HashSet<>();
    private NexaCallEngine callEngine;
    private String activeCallId = "";
    private String activeCallMode = "voice";
    private String activeCallPeerPhone = "";
    private TextView callStateView;
    private Button callMicButton;
    private Button callSpeakerButton;
    private Button callCameraButton;
    private SurfaceViewRenderer localCallVideo;
    private SurfaceViewRenderer remoteCallVideo;
    private Runnable pendingPermissionAction;
    private Runnable pendingLocationAction;
    private boolean callPolling;
    private boolean foregroundSyncing;
    private boolean focusComposerAfterSync;
    private String renderSignature = "";
    private String activeTheme = "default";
    private String sectionBeforeCall = "";
    private String friendBeforeCall = "";
    private String pendingNotificationCallAction = "";
    private String pendingNotificationCallId = "";
    private String pendingNotificationCallMode = "voice";
    private ToneGenerator ringbackTone;
    private boolean ringbackPlaying;

    private final Runnable ringbackRunnable = new Runnable() {
        @Override
        public void run() {
            if (!ringbackPlaying) return;
            try {
                if (ringbackTone == null) ringbackTone = new ToneGenerator(AudioManager.STREAM_VOICE_CALL, 72);
                ringbackTone.startTone(ToneGenerator.TONE_SUP_RINGTONE, RINGBACK_TONE_MS);
            } catch (Exception ignored) {
            }
            ringbackHandler.postDelayed(this, RINGBACK_GAP_MS);
        }
    };

    private final Runnable foregroundSyncRunnable = new Runnable() {
        @Override
        public void run() {
            runForegroundSync();
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setSoftInputMode(
            android.view.WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE |
            android.view.WindowManager.LayoutParams.SOFT_INPUT_STATE_HIDDEN
        );
        store = new SessionStore(this);
        activeTheme = getSharedPreferences(PREF_UI, MODE_PRIVATE).getString("theme", "default");
        api = new NexaApi(API_BASE_URL, store.token());
        NexaFirebaseMessagingService.ensureNotificationChannels(this);
        applyIntentRoute(getIntent());
        captureNotificationAction(getIntent());
        if (store.token().isEmpty()) {
            showAuth("login");
        } else {
            restoreSession();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (store != null && !store.token().isEmpty()) startForegroundSync();
    }

    @Override
    protected void onPause() {
        stopForegroundSync();
        super.onPause();
    }

    @Override
    public void onBackPressed() {
        if (handleBackNavigation()) return;
        super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        closeNativeCall(false);
        super.onDestroy();
    }

    @Override
    public boolean dispatchTouchEvent(MotionEvent event) {
        if (event.getAction() == MotionEvent.ACTION_DOWN) {
            swipeStartX = event.getX();
            swipeStartY = event.getY();
            View focus = getCurrentFocus();
            if (focus instanceof EditText) {
                Rect bounds = new Rect();
                focus.getGlobalVisibleRect(bounds);
                if (!bounds.contains((int) event.getRawX(), (int) event.getRawY())) {
                    View touched = touchedViewAt(getWindow().getDecorView(), (int) event.getRawX(), (int) event.getRawY());
                    if (!keepsKeyboardOpen(touched)) {
                        hideKeyboard(focus);
                        focus.clearFocus();
                    }
                }
            }
        } else if (event.getAction() == MotionEvent.ACTION_UP) {
            float dx = event.getX() - swipeStartX;
            float dy = Math.abs(event.getY() - swipeStartY);
            if (dx > dp(92) && dy < dp(82) && handleBackNavigation()) return true;
        }
        return super.dispatchTouchEvent(event);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        applyIntentRoute(intent);
        captureNotificationAction(intent);
        if (!store.token().isEmpty()) syncAndShowHome(activeSection);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQ_POST_NOTIFICATIONS) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                registerPushToken(true);
            } else {
                store.setPushEnabled(false);
                setStatus("Chưa được cấp quyền thông báo ngoài màn hình.");
            }
            return;
        }
        if (requestCode == REQ_CALL_PERMISSIONS) {
            boolean granted = grantResults.length > 0;
            for (int result : grantResults) {
                granted = granted && result == PackageManager.PERMISSION_GRANTED;
            }
            Runnable action = pendingPermissionAction;
            pendingPermissionAction = null;
            if (granted && action != null) {
                action.run();
            } else {
                setStatus("Cần cấp quyền micro/camera để gọi thoại hoặc video.");
            }
            return;
        }
        if (requestCode == REQ_LOCATION) {
            boolean granted = grantResults.length > 0;
            for (int result : grantResults) {
                granted = granted && result == PackageManager.PERMISSION_GRANTED;
            }
            Runnable action = pendingLocationAction;
            pendingLocationAction = null;
            if (granted && action != null) {
                action.run();
            } else {
                setStatus("Cần cấp quyền vị trí để gửi vị trí hoặc tìm quanh đây.");
            }
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQ_QR_CAMERA) {
            if (resultCode != RESULT_OK || data == null || data.getExtras() == null) {
                setStatus("Chưa nhận được ảnh QR từ camera.");
                return;
            }
            try {
                Object thumbnail = data.getExtras().get("data");
                if (!(thumbnail instanceof Bitmap)) throw new Exception("Camera chưa trả về ảnh QR.");
                handleQrText(decodeQrFromBitmap((Bitmap) thumbnail));
            } catch (Exception error) {
                setStatus(error.getMessage() == null ? "Không đọc được mã QR từ camera." : error.getMessage());
            }
            return;
        }
        if (resultCode != RESULT_OK || data == null || (data.getData() == null && data.getClipData() == null)) {
            if (requestCode == REQ_AVATAR_IMAGE) {
                activeSection = "profile";
                showHome();
            }
            return;
        }
        Uri uri = data.getData() != null ? data.getData() : data.getClipData().getItemAt(0).getUri();
        try {
            if (requestCode == REQ_CHAT_MEDIA) {
                JSONObject media = mediaFromUri(uri, false);
                if (activeFriendPhone.isEmpty()) {
                    setStatus("Hãy mở một hội thoại trước khi gửi tệp.");
                    return;
                }
                setStatus("Đang gửi tệp...");
                api.sendMediaMessage(activeFriendPhone, "", media, new BasicCallback("Đã gửi tệp.", () -> syncAndReturnToChat(activeFriendPhone)));
            } else if (requestCode == REQ_JOURNAL_IMAGE) {
                JSONObject image = mediaFromUri(uri, true);
                setStatus("Đang đăng nhật ký kèm ảnh...");
                api.createJournal(pendingJournalText, pendingJournalPrivacy, image, new BasicCallback("Đã đăng nhật ký.", () -> syncAndShowHome("journals")));
            } else if (requestCode == REQ_AVATAR_IMAGE) {
                JSONObject image = mediaFromUri(uri, true);
                JSONObject profile = editableProfile();
                profile.put("avatarData", image.optString("data", ""));
                setStatus("Đang cập nhật avatar...");
                api.updateProfile(profile, new BasicCallback("Đã cập nhật avatar.", () -> syncAndShowHome("profile")));
            } else if (requestCode == REQ_BUSINESS_LOGO) {
                pendingBusinessLogo = mediaFromUri(uri, true, BUSINESS_IMAGE_LIMIT_BYTES);
                setStatus("Logo đã sẵn sàng. Bấm cập nhật hồ sơ để gửi admin duyệt.");
                syncAndShowHome("businesses");
            } else if (requestCode == REQ_BUSINESS_GALLERY) {
                pendingBusinessGallery = new JSONArray();
                if (data.getClipData() != null) {
                    int count = Math.min(5, data.getClipData().getItemCount());
                    for (int i = 0; i < count; i++) {
                        pendingBusinessGallery.put(mediaFromUri(data.getClipData().getItemAt(i).getUri(), true, BUSINESS_IMAGE_LIMIT_BYTES));
                    }
                } else {
                    pendingBusinessGallery.put(mediaFromUri(uri, true, BUSINESS_IMAGE_LIMIT_BYTES));
                }
                setStatus("Đã chọn " + pendingBusinessGallery.length() + " ảnh doanh nghiệp. Bấm cập nhật hồ sơ để gửi admin duyệt.");
                syncAndShowHome("businesses");
            } else if (requestCode == REQ_QR_IMAGE) {
                handleQrText(decodeQrFromUri(uri));
            }
        } catch (Exception error) {
            setStatus(error.getMessage() == null ? "Không đọc được tệp đã chọn." : error.getMessage());
        }
    }

    private void restoreSession() {
        showLoading("Đang mở lại phiên đăng nhập...");
        api.restore(new NexaApi.Callback() {
            @Override
            public void onSuccess(JSONObject data) {
                syncAndShowHome(activeSection == null || activeSection.isEmpty() ? "messages" : activeSection);
            }

            @Override
            public void onError(String message) {
                store.clear();
                api.setToken("");
                showAuth("login");
                setStatus("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
            }
        });
    }

    private void showAuth(String mode) {
        root = baseRoot();
        addHero(root);
        root.addView(authCard(mode));
        setContentView(scroll(root));
    }

    private LinearLayout authCard(String mode) {
        LinearLayout card = card();
        card.addView(label("TÀI KHOẢN BẢO MẬT"));
        card.addView(title("login".equals(mode) ? "Đăng nhập XPAY Chat" : "Tài khoản XPAY Chat"));

        LinearLayout tabs = row();
        tabs.addView(authTab("Đăng nhập", "login", mode));
        tabs.addView(authTab("Đăng ký", "register", mode));
        tabs.addView(authTab("Quên mật khẩu", "forgot", mode));
        card.addView(tabs);

        if ("register".equals(mode)) {
            renderRegisterForm(card);
        } else if ("forgot".equals(mode)) {
            renderForgotForm(card);
        } else {
            renderLoginForm(card);
        }
        statusView = status();
        card.addView(statusView);
        card.addView(paragraph("OTP email sẽ được gửi duy nhất từ Email: admin@gatewayxpay.com"));
        return card;
    }

    private Button authTab(String text, String targetMode, String currentMode) {
        Button button = currentMode.equals(targetMode) ? primaryButton(text) : secondaryButton(text);
        button.setTextSize(12);
        button.setOnClickListener(view -> showAuth(targetMode));
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(0, dp(42), 1);
        params.setMargins(dp(2), dp(8), dp(2), dp(10));
        button.setLayoutParams(params);
        return button;
    }

    private void renderLoginForm(LinearLayout card) {
        EditText phoneInput = input("Số điện thoại");
        phoneInput.setInputType(InputType.TYPE_CLASS_PHONE);
        phoneInput.setText(store.phone());
        card.addView(phoneInput);

        EditText passwordInput = input("Mật khẩu");
        passwordInput.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
        card.addView(passwordInput);

        card.addView(primaryAction("Đăng nhập", view -> {
            String phone = phoneInput.getText().toString().trim();
            String password = passwordInput.getText().toString();
            if (phone.isEmpty() || password.isEmpty()) {
                setStatus("Vui lòng nhập số điện thoại và mật khẩu.");
                return;
            }
            setStatus("Đang đăng nhập...");
            api.login(phone, password, new NexaApi.Callback() {
                @Override
                public void onSuccess(JSONObject data) {
                    String token = data.optString("token", "");
                    JSONObject user = data.optJSONObject("user");
                    String accountPhone = user == null ? phone : user.optString("accountPhone", phone);
                    if (token.isEmpty()) {
                        setStatus("Máy chủ chưa trả về token đăng nhập.");
                        return;
                    }
                    store.save(token, accountPhone);
                    store.setPushEnabled(true);
                    api.setToken(token);
                    lastSync = data;
                    applyAiHistoryReset();
                    syncAndShowHome("messages");
                }

                @Override
                public void onError(String message) {
                    setStatus(message);
                }
            });
        }));
    }

    private void renderRegisterForm(LinearLayout card) {
        EditText phoneInput = input("Số điện thoại");
        phoneInput.setInputType(InputType.TYPE_CLASS_PHONE);
        EditText nameInput = input("Họ và tên");
        EditText emailInput = input("Email duy nhất");
        emailInput.setInputType(InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS);
        EditText passwordInput = input("Mật khẩu mạnh");
        passwordInput.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
        EditText otpInput = input("Mã OTP email");
        otpInput.setInputType(InputType.TYPE_CLASS_NUMBER);
        card.addView(phoneInput);
        card.addView(nameInput);
        card.addView(emailInput);
        card.addView(passwordInput);
        card.addView(otpInput);
        card.addView(secondaryAction("Gửi OTP đăng ký", view -> {
            setStatus("Đang gửi OTP...");
            api.requestOtp(phoneInput.getText().toString().trim(), emailInput.getText().toString().trim(), "register", new BasicCallback("Đã gửi OTP đăng ký.", null));
        }));
        card.addView(primaryAction("Tạo tài khoản", view -> {
            setStatus("Đang tạo tài khoản...");
            api.register(
                phoneInput.getText().toString().trim(),
                emailInput.getText().toString().trim(),
                nameInput.getText().toString().trim(),
                passwordInput.getText().toString(),
                otpInput.getText().toString().trim(),
                new BasicCallback("Đã tạo tài khoản. Anh có thể đăng nhập.", () -> showAuth("login"))
            );
        }));
    }

    private void renderForgotForm(LinearLayout card) {
        EditText phoneInput = input("Số điện thoại");
        phoneInput.setInputType(InputType.TYPE_CLASS_PHONE);
        EditText emailInput = input("Email nhận OTP");
        emailInput.setInputType(InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS);
        EditText passwordInput = input("Mật khẩu mới");
        passwordInput.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
        EditText otpInput = input("Mã OTP email");
        otpInput.setInputType(InputType.TYPE_CLASS_NUMBER);
        card.addView(phoneInput);
        card.addView(emailInput);
        card.addView(passwordInput);
        card.addView(otpInput);
        card.addView(secondaryAction("Gửi OTP khôi phục", view -> {
            setStatus("Đang gửi OTP...");
            api.requestOtp(phoneInput.getText().toString().trim(), emailInput.getText().toString().trim(), "forgot", new BasicCallback("Đã gửi OTP khôi phục.", null));
        }));
        card.addView(primaryAction("Đặt lại mật khẩu", view -> {
            setStatus("Đang đặt lại mật khẩu...");
            api.resetPassword(
                phoneInput.getText().toString().trim(),
                emailInput.getText().toString().trim(),
                passwordInput.getText().toString(),
                otpInput.getText().toString().trim(),
                new BasicCallback("Đã đặt lại mật khẩu. Anh có thể đăng nhập.", () -> showAuth("login"))
            );
        }));
    }

    private void syncAndShowHome(String section) {
        activeSection = section == null ? activeSection : section;
        boolean hasSnapshot = lastSync != null;
        if (!hasSnapshot) showLoading("Đang mở dữ liệu...");
        api.sync(new NexaApi.Callback() {
            @Override
            public void onSuccess(JSONObject data) {
                applyUnreadTracking(data);
                lastSync = data;
                applyAiHistoryReset();
                boolean handledCallAction = handlePendingNotificationCallAction();
                if (!handledCallAction && !showIncomingCallIfNeeded()) showHome();
                if (store.pushEnabled()) ensurePushNotifications(false);
                startForegroundSync();
            }

            @Override
            public void onError(String message) {
                showHome();
                setStatus("Không cập nhật được: " + message);
                startForegroundSync();
            }
        });
    }

    private void startForegroundSync() {
        if (foregroundSyncing || store == null || store.token().isEmpty()) return;
        foregroundSyncing = true;
        scheduleForegroundSync(FOREGROUND_SYNC_DELAY_MS);
    }

    private void stopForegroundSync() {
        foregroundSyncing = false;
        syncHandler.removeCallbacksAndMessages(null);
    }

    private void scheduleForegroundSync(long delayMs) {
        if (!foregroundSyncing || store == null || store.token().isEmpty()) return;
        syncHandler.removeCallbacks(foregroundSyncRunnable);
        syncHandler.postDelayed(foregroundSyncRunnable, delayMs);
    }

    private void runForegroundSync() {
        if (!foregroundSyncing || store == null || store.token().isEmpty()) return;
        if (callPolling) {
            scheduleForegroundSync(FOREGROUND_SYNC_WHILE_CALL_MS);
            return;
        }
        api.sync(new NexaApi.Callback() {
            @Override
            public void onSuccess(JSONObject data) {
                applyUnreadTracking(data);
                lastSync = data;
                applyAiHistoryReset();
                if (!showIncomingCallIfNeeded()) refreshVisibleSection();
                scheduleForegroundSync(FOREGROUND_SYNC_DELAY_MS);
            }

            @Override
            public void onError(String message) {
                scheduleForegroundSync(7000);
            }
        });
    }

    private boolean showIncomingCallIfNeeded() {
        if (!activeCallId.isEmpty()) return false;
        JSONArray calls = calls();
        for (int i = 0; i < calls.length(); i++) {
            JSONObject call = calls.optJSONObject(i);
            if (call == null) continue;
            if ("incoming".equals(call.optString("direction", "")) && "ringing".equals(call.optString("status", ""))) {
                showNativeCall(call);
                return true;
            }
        }
        return false;
    }

    private void refreshVisibleSection() {
        if (content == null) return;
        if (!activeFriendPhone.isEmpty()) return;
        if (
            "profile".equals(activeSection) ||
            "settings".equals(activeSection) ||
            "admin".equals(activeSection) ||
            "search".equals(activeSection) ||
            "addFriend".equals(activeSection) ||
            "qr".equals(activeSection) ||
            "themes".equals(activeSection) ||
            "ai".equals(activeSection)
        ) return;
        String nextSignature = sectionSignature(activeSection);
        if (nextSignature.equals(renderSignature)) return;
        renderSection(activeSection);
        renderSignature = nextSignature;
    }

    private String sectionSignature(String section) {
        if (lastSync == null) return "";
        if ("nearby".equals(section)) return "nearby:" + nearby().toString().hashCode();
        if ("businesses".equals(section)) return "businesses:" + businesses().toString().hashCode();
        if ("journals".equals(section)) return "journals:" + posts().toString().hashCode();
        if ("calls".equals(section)) return "calls:" + calls().toString().hashCode();
        if ("friends".equals(section)) return "friends:" + friends().toString().hashCode();
        if ("addFriend".equals(section)) return "addFriend";
        if ("themes".equals(section)) return "theme:" + activeTheme;
        if ("ai".equals(section)) return "ai:" + aiRules().toString().hashCode();
        return "messages:" + conversations().toString().hashCode() + ":unread:" + unreadJson().toString().hashCode();
    }

    private void showHome() {
        root = baseRoot();
        if ("ai".equals(activeSection)) root.setPadding(dp(12), dp(32), dp(12), 0);
        root.addView(profileStrip());
        if (!"search".equals(activeSection)) root.addView(searchStrip());
        root.addView(quickActions());
        root.addView(tabStrip());

        statusView = status();
        root.addView(statusView);

        if ("ai".equals(activeSection)) {
            showAiHome();
            renderSignature = sectionSignature(activeSection);
            return;
        }

        content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        root.addView(content);

        renderSection(activeSection);
        renderSignature = sectionSignature(activeSection);
        setContentView(scroll(root));
        root.requestFocus();
    }

    private void showAiHome() {
        ScrollView aiScroll = new ScrollView(this);
        aiScroll.setFillViewport(false);
        aiScroll.setBackgroundColor(themeBackground());
        LinearLayout aiContent = new LinearLayout(this);
        aiContent.setOrientation(LinearLayout.VERTICAL);
        aiContent.setPadding(0, 0, 0, dp(10));
        aiScroll.addView(aiContent);
        content = aiContent;
        appScroll = aiScroll;

        aiContent.addView(sectionTitle("XPAY AI"));
        aiContent.addView(aiHeroCard());
        LinearLayout chatCard = card();
        chatCard.addView(label("LỊCH SỬ TRÒ CHUYỆN"));
        LinearLayout historyList = new LinearLayout(this);
        historyList.setOrientation(LinearLayout.VERTICAL);
        historyList.setPadding(0, dp(4), 0, dp(8));
        fillAiHistory(historyList);
        chatCard.addView(historyList);
        aiContent.addView(chatCard);

        root.addView(aiScroll, new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            0,
            1
        ));
        LinearLayout composer = aiComposer(historyList);
        root.addView(composer);
        setContentView(root);
        root.requestFocus();
        installKeyboardLift(root, composer);
        scrollAiComposerIntoView();
    }

    private LinearLayout profileStrip() {
        LinearLayout strip = new LinearLayout(this);
        strip.setOrientation(LinearLayout.HORIZONTAL);
        strip.setGravity(Gravity.CENTER_VERTICAL);
        strip.setPadding(dp(12), dp(10), dp(10), dp(10));
        strip.setBackground(stroked(COLOR_SURFACE, Color.rgb(224, 233, 242), 18));
        elevate(strip, 1.5f);
        LinearLayout.LayoutParams stripParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        stripParams.setMargins(0, 0, 0, dp(10));
        strip.setLayoutParams(stripParams);

        JSONObject user = user();
        String name = user.optString("fullName", user.optString("name", "Nexa User"));
        View avatar = avatarView(user, name, dp(44), 15);
        LinearLayout.LayoutParams avatarParams = new LinearLayout.LayoutParams(dp(44), dp(44));
        avatarParams.setMargins(0, 0, dp(12), 0);
        strip.addView(avatar, avatarParams);

        LinearLayout identity = new LinearLayout(this);
        identity.setOrientation(LinearLayout.VERTICAL);
        LinearLayout nameRow = row();
        TextView nameText = text(name, 18, COLOR_INK, true);
        nameText.setSingleLine(true);
        nameRow.addView(nameText);
        addBadgesToRow(nameRow, user);
        identity.addView(nameRow);
        TextView presence = text(userPhone() + " • " + user.optString("presenceStatus", "Online"), 13, COLOR_MUTED, false);
        presence.setSingleLine(true);
        identity.addView(presence);
        strip.addView(identity, new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1));

        strip.addView(squareAction("add-user", view -> openHomeSection("addFriend")));
        strip.addView(squareAction("settings", view -> openHomeSection("settings")));
        strip.addView(squareAction("logout", view -> logoutCurrentDevice()));
        return strip;
    }

    private LinearLayout searchStrip() {
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.HORIZONTAL);
        card.setGravity(Gravity.CENTER_VERTICAL);
        card.setPadding(dp(14), dp(9), dp(14), dp(9));
        card.setBackground(stroked(Color.WHITE, Color.rgb(211, 224, 236), 22));
        elevate(card, 1.2f);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        params.setMargins(0, 0, 0, dp(10));
        card.setLayoutParams(params);
        ImageView icon = iconImage("search", 22, themePrimary());
        LinearLayout.LayoutParams iconParams = new LinearLayout.LayoutParams(dp(24), dp(24));
        iconParams.setMargins(0, 0, dp(8), 0);
        card.addView(icon, iconParams);
        TextView hint = text("  Tìm bạn bè, tin nhắn, doanh nghiệp", 14, COLOR_MUTED, false);
        card.addView(hint);
        card.setOnClickListener(view -> {
            activeSection = "search";
            showHome();
        });
        return card;
    }

    private LinearLayout quickActions() {
        LinearLayout actions = row();
        actions.setPadding(0, 0, 0, dp(8));
        actions.addView(quickAction("Doanh nghiệp", "business", "businesses", view -> openHomeSection("businesses")));
        actions.addView(quickAction("Bạn bè", "users", "friends", view -> openHomeSection("friends")));
        actions.addView(quickAction("Quét QR", "qr", "qr", view -> openHomeSection("qr")));
        actions.addView(quickAction("Cá nhân", "profile", "profile", view -> openHomeSection("profile")));
        actions.addView(quickAction("Cuộc gọi", "phone", "calls", view -> openHomeSection("calls")));
        if (isAppAdminAccount()) {
            actions.addView(quickAction("Quản trị", "shield", "admin", view -> openHomeSection("admin")));
        }
        return actions;
    }

    private void openHomeSection(String section) {
        activeSection = section;
        activeFriendPhone = "";
        pendingReplyText = "";
        showHome();
    }

    private LinearLayout homeHeader() {
        LinearLayout header = card();
        header.setBackground(gradient(new int[] { Color.rgb(10, 44, 63), Color.rgb(15, 118, 110), Color.rgb(37, 99, 235) }, 22));

        TextView mark = new TextView(this);
        mark.setText("AI");
        mark.setTextSize(22);
        mark.setTypeface(Typeface.DEFAULT_BOLD);
        mark.setTextColor(Color.WHITE);
        mark.setGravity(Gravity.CENTER);
        mark.setBackground(rounded(Color.argb(70, 255, 255, 255), 48));
        LinearLayout.LayoutParams markParams = new LinearLayout.LayoutParams(dp(64), dp(64));
        markParams.bottomMargin = dp(10);
        header.addView(mark, markParams);

        JSONObject user = user();
        String name = user.optString("fullName", user.optString("name", "XPAY Chat"));
        TextView title = new TextView(this);
        title.setText("XPAY Chat");
        title.setTextColor(Color.WHITE);
        title.setTextSize(25);
        title.setTypeface(Typeface.DEFAULT_BOLD);
        header.addView(title);

        TextView subtitle = new TextView(this);
        subtitle.setText(name + " · " + user.optString("presenceStatus", "Online"));
        subtitle.setTextColor(Color.rgb(219, 234, 254));
        subtitle.setTextSize(15);
        subtitle.setPadding(0, dp(4), 0, dp(12));
        header.addView(subtitle);

        LinearLayout stats = row();
        stats.addView(chip("Bạn bè " + friends().length()));
        stats.addView(chip("Chat " + conversations().length()));
        stats.addView(chip("Nhật ký " + posts().length()));
        header.addView(stats);
        return header;
    }

    private LinearLayout tabStrip() {
        LinearLayout tabs = row();
        tabs.setPadding(dp(3), dp(3), dp(3), dp(3));
        tabs.setBackground(stroked(Color.WHITE, Color.rgb(221, 231, 240), 17));
        elevate(tabs, 1.0f);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        params.setMargins(0, 0, 0, dp(8));
        tabs.setLayoutParams(params);
        tabs.addView(tabButton("Tin nhắn", "messages"));
        tabs.addView(tabButton("Quanh đây", "nearby"));
        tabs.addView(tabButton("Nhật ký", "journals"));
        tabs.addView(tabButton("XPAY AI", "ai"));
        return tabs;
    }

    private void renderSection(String section) {
        activeSection = section;
        activeFriendPhone = "";
        pendingReplyText = "";
        if (content == null) return;
        content.removeAllViews();
        if ("addFriend".equals(section)) renderAddFriend();
        else if ("friends".equals(section)) renderFriends();
        else if ("nearby".equals(section)) renderNearby();
        else if ("businesses".equals(section)) renderBusinesses();
        else if ("journals".equals(section)) renderJournals();
        else if ("calls".equals(section)) renderCalls();
        else if ("ai".equals(section)) renderAi();
        else if ("qr".equals(section)) renderQr();
        else if ("admin".equals(section)) renderAppAdmin();
        else if ("themes".equals(section)) renderThemes();
        else if ("profile".equals(section)) renderProfile();
        else if ("settings".equals(section)) renderSettings();
        else if ("search".equals(section)) renderSearch();
        else renderMessages();
    }

    private void renderSearch() {
        content.addView(sectionTitle("Tìm kiếm"));
        LinearLayout searchCard = card();
        EditText queryInput = input("Tìm bạn bè, tin nhắn, doanh nghiệp");
        LinearLayout results = new LinearLayout(this);
        results.setOrientation(LinearLayout.VERTICAL);
        searchCard.addView(queryInput);
        queryInput.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence text, int start, int count, int after) {
            }

            @Override
            public void onTextChanged(CharSequence text, int start, int before, int count) {
                fillSearchResults(results, text == null ? "" : text.toString());
            }

            @Override
            public void afterTextChanged(Editable editable) {
            }
        });
        content.addView(searchCard);
        content.addView(results);
        fillSearchResults(results, "");
        queryInput.requestFocus();
    }

    private void fillSearchResults(LinearLayout results, String query) {
        results.removeAllViews();
        String keyword = (query == null ? "" : query.trim()).toLowerCase(Locale.ROOT);
        Set<String> addedPhones = new HashSet<>();
        JSONArray friends = friends();
        for (int i = 0; i < friends.length(); i++) {
            JSONObject friend = friends.optJSONObject(i);
            if (friend == null) continue;
            String phone = friend.optString("accountPhone", friend.optString("phone", ""));
            String haystack = (displayName(friend, phone) + " " + phone + " " + friend.optString("interests", "")).toLowerCase(Locale.ROOT);
            if ((keyword.isEmpty() || haystack.contains(keyword)) && addedPhones.add(phone)) {
                results.addView(friendCard(phone, displayName(friend, phone), friend.optString("presenceStatus", "Bạn bè")));
            }
        }
        JSONArray conversations = conversations();
        for (int i = 0; i < conversations.length(); i++) {
            JSONObject conversation = conversations.optJSONObject(i);
            if (conversation == null) continue;
            String phone = conversation.optString("friendPhone", "");
            JSONArray messages = conversation.optJSONArray("messages");
            boolean matched = false;
            for (int j = 0; messages != null && j < messages.length(); j++) {
                JSONObject message = messages.optJSONObject(j);
                if (message != null && message.optString("text", "").toLowerCase(Locale.ROOT).contains(keyword)) {
                    matched = true;
                    break;
                }
            }
            if (!keyword.isEmpty() && matched && addedPhones.add(phone)) {
                JSONObject friend = findFriend(phone);
                results.addView(conversationCard(phone, friend, conversation));
            }
        }
        JSONArray businessMatches = businessSearchResults(keyword);
        if (!keyword.isEmpty() && businessMatches.length() > 0) {
            results.addView(sectionTitle("Doanh nghiệp phù hợp"));
            for (int i = 0; i < businessMatches.length() && i < 6; i++) {
                JSONObject business = businessMatches.optJSONObject(i);
                if (business != null) results.addView(businessCard(business));
            }
        }
        if (results.getChildCount() == 0) {
            results.addView(infoCard("Không tìm thấy", "Chưa có bạn bè, tin nhắn hoặc doanh nghiệp phù hợp với nội dung đang nhập."));
        }
    }

    private void renderMessages() {
        activeSection = "messages";
        content.removeAllViews();
        if (activeFriendPhone.isEmpty()) {
            JSONArray conversations = conversations();
            int visibleCount = 0;
            if (conversations.length() == 0) {
                content.addView(infoCard("Chưa có hội thoại", "Vào Bạn bè để mở cuộc trò chuyện, hoặc thêm bạn bằng số điện thoại."));
            } else {
                for (int i = 0; i < conversations.length(); i++) {
                    JSONObject conversation = conversations.optJSONObject(i);
                    if (conversation == null) continue;
                    String friendPhone = conversation.optString("friendPhone", "");
                    if (shouldHideConversation(friendPhone, conversation)) continue;
                    JSONObject friend = findFriend(friendPhone);
                    content.addView(conversationCard(friendPhone, friend, conversation));
                    visibleCount += 1;
                }
                if (visibleCount == 0) {
                    content.addView(infoCard("Chưa có hội thoại", "Vào Bạn bè để mở cuộc trò chuyện, hoặc thêm bạn bằng số điện thoại."));
                }
            }
            content.addView(secondaryAction("Làm mới", view -> syncAndShowHome("messages")));
            return;
        }
        showConversationScreen();
    }

    private void showConversationScreen() {
        markConversationRead(activeFriendPhone);
        JSONObject friend = findFriend(activeFriendPhone);
        root = baseRoot();
        root.setPadding(dp(10), dp(30), dp(10), dp(0));
        root.addView(conversationHeader(friend));
        statusView = status();
        root.addView(statusView);

        ScrollView messageScroll = new ScrollView(this);
        messageScroll.setFillViewport(false);
        messageScroll.setBackgroundColor(themeBackground());
        LinearLayout messageList = new LinearLayout(this);
        messageList.setOrientation(LinearLayout.VERTICAL);
        messageList.setPadding(0, dp(4), 0, dp(10));
        messageScroll.addView(messageList);
        activeMessageList = messageList;
        root.addView(messageScroll, new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            0,
            1
        ));
        appScroll = messageScroll;

        JSONObject conversation = findConversation(activeFriendPhone);
        JSONArray messages = conversation == null ? new JSONArray() : conversation.optJSONArray("messages");
        if (messages == null || messages.length() == 0) {
            messageList.addView(infoCard("Chưa có tin nhắn", "Hãy gửi lời chào đầu tiên."));
        } else {
            for (int i = 0; i < messages.length(); i++) {
                JSONObject message = messages.optJSONObject(i);
                if (message != null) messageList.addView(messageRow(message));
            }
        }

        if (!pendingReplyText.isEmpty()) {
            root.addView(replyPreview());
        }
        LinearLayout composer = chatComposer();
        root.addView(composer);
        setContentView(root);
        installKeyboardLift(root, composer);
        scrollConversationToBottom(messageScroll);
    }

    private void installKeyboardLift(View rootView, View composer) {
        ViewGroup.LayoutParams initialParams = composer.getLayoutParams();
        final int baseBottomMargin = initialParams instanceof ViewGroup.MarginLayoutParams
            ? ((ViewGroup.MarginLayoutParams) initialParams).bottomMargin
            : dp(42);
        rootView.getViewTreeObserver().addOnGlobalLayoutListener(() -> {
            Rect visible = new Rect();
            rootView.getWindowVisibleDisplayFrame(visible);
            int rootHeight = rootView.getRootView().getHeight();
            if (rootHeight <= 0) rootHeight = rootView.getHeight();
            int coveredBottom = Math.max(0, rootHeight - visible.bottom);
            boolean keyboardOpen = coveredBottom > dp(140);
            int targetBottomMargin = keyboardOpen ? coveredBottom + dp(8) : baseBottomMargin;

            ViewGroup.LayoutParams layoutParams = composer.getLayoutParams();
            if (layoutParams instanceof ViewGroup.MarginLayoutParams) {
                ViewGroup.MarginLayoutParams marginParams = (ViewGroup.MarginLayoutParams) layoutParams;
                if (marginParams.bottomMargin != targetBottomMargin || composer.getTranslationY() != 0f) {
                    marginParams.bottomMargin = targetBottomMargin;
                    composer.setTranslationY(0f);
                    composer.setLayoutParams(marginParams);
                }
            } else if (composer.getTranslationY() != 0f) {
                composer.setTranslationY(0f);
            }
            if (keyboardOpen) scrollConversationToBottom(appScroll);
        });
    }

    private LinearLayout conversationHeader(JSONObject friend) {
        LinearLayout header = new LinearLayout(this);
        header.setOrientation(LinearLayout.HORIZONTAL);
        header.setGravity(Gravity.CENTER_VERTICAL);
        header.setPadding(dp(8), dp(8), dp(8), dp(8));
        header.setBackground(stroked(COLOR_SURFACE, Color.rgb(224, 233, 242), 18));
        elevate(header, 1.5f);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        params.setMargins(0, 0, 0, dp(6));
        header.setLayoutParams(params);
        header.addView(iconFrame("back", 40, 40, 18, view -> {
            activeFriendPhone = "";
            pendingReplyText = "";
            showHome();
        }));
        View avatar = avatarView(friend, displayName(friend, activeFriendPhone), dp(36), 13);
        LinearLayout.LayoutParams avatarParams = new LinearLayout.LayoutParams(dp(36), dp(36));
        avatarParams.setMargins(dp(8), 0, 0, 0);
        header.addView(avatar, avatarParams);
        LinearLayout identity = new LinearLayout(this);
        identity.setOrientation(LinearLayout.VERTICAL);
        identity.setPadding(dp(9), 0, dp(4), 0);
        identity.addView(text(displayName(friend, activeFriendPhone), 16, COLOR_INK, true));
        identity.addView(text(friend == null ? "Bạn bè XPAY Chat" : friend.optString("presenceStatus", "Bạn bè"), 12, COLOR_MUTED, false));
        header.addView(identity, new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1));
        header.addView(headerIcon("info", view -> showFriendInfo(friend, activeFriendPhone)));
        header.addView(headerIcon("phone", view -> startCall(activeFriendPhone, "voice")));
        header.addView(headerIcon("video", view -> startCall(activeFriendPhone, "video")));
        return header;
    }

    private void showFriendInfo(JSONObject friend, String fallbackPhone) {
        JSONObject person = friend == null ? new JSONObject() : friend;
        String name = displayName(person, fallbackPhone);
        String phone = person.optString("phone", person.optString("accountPhone", fallbackPhone));
        String birthDate = person.optString("birthDate", "");
        String interests = person.optString("interests", "");
        String badges = accountBadges(person);
        String status = person.optString("presenceStatus", "Bạn bè");
        StringBuilder body = new StringBuilder();
        body.append("Họ và tên: ").append(name);
        if (phone != null && !phone.isEmpty()) body.append("\nSố điện thoại: ").append(phone);
        if (!birthDate.isEmpty()) body.append("\nNgày sinh: ").append(formatDateText(birthDate));
        if (!interests.isEmpty()) body.append("\nSở thích: ").append(interests);
        body.append("\nTrạng thái: ").append(status);
        if (!badges.isEmpty()) body.append("\nPhân loại: ").append(badges);
        new AlertDialog.Builder(this)
            .setTitle("Thông tin bạn bè")
            .setMessage(body.toString())
            .setPositiveButton("Nhắn tin", (dialog, which) -> openChat(fallbackPhone))
            .setNegativeButton("Đóng", null)
            .show();
    }

    private LinearLayout chatComposer() {
        EditText messageInput = chatMessageInput("Nhập tin nhắn");
        LinearLayout composer = composerCard();

        LinearLayout inputRow = row();
        inputRow.setGravity(Gravity.CENTER_VERTICAL);
        inputRow.addView(composerIcon("plus", view -> pickMedia(REQ_CHAT_MEDIA, "image/*,video/*")));
        inputRow.addView(composerIcon("location", view -> sendCurrentLocationMessage()));
        inputRow.addView(composerIcon("emoji", view -> showEmojiPicker(messageInput)));
        LinearLayout.LayoutParams inputParams = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1);
        inputParams.setMargins(0, 0, dp(8), 0);
        messageInput.setLayoutParams(inputParams);
        inputRow.addView(messageInput);
        inputRow.addView(sendButton(view -> sendTextMessage(messageInput)));
        composer.addView(inputRow);
        messageInput.setOnFocusChangeListener((view, hasFocus) -> {
            if (hasFocus) scrollConversationToBottom(appScroll);
        });
        messageInput.setOnClickListener(view -> scrollConversationToBottom(appScroll));
        composer.postDelayed(() -> scrollConversationToBottom(appScroll), 150);
        if (focusComposerAfterSync) {
            focusComposerAfterSync = false;
            messageInput.postDelayed(() -> {
                messageInput.requestFocus();
                showKeyboard(messageInput);
                scrollConversationToBottom(appScroll);
            }, 120);
        }
        return composer;
    }

    private void showEmojiPicker(EditText messageInput) {
        String[] emojis = new String[] { "😀", "😍", "😂", "😮", "😢", "😡", "👍", "❤️", "🎉", "🙏" };
        new AlertDialog.Builder(this)
            .setTitle("Cảm xúc nhanh")
            .setItems(emojis, (dialog, which) -> {
                int start = Math.max(0, messageInput.getSelectionStart());
                int end = Math.max(0, messageInput.getSelectionEnd());
                messageInput.getText().replace(Math.min(start, end), Math.max(start, end), emojis[which]);
                messageInput.requestFocus();
            })
            .show();
    }

    private View conversationCard(String phone, JSONObject friend, JSONObject conversation) {
        int unread = unreadCount(conversation);
        boolean highlightUnread = unread > 0 && uiSetting("setting_unread_highlight", true);
        int deleteWidth = dp(76);
        FrameLayout shell = new FrameLayout(this);
        LinearLayout.LayoutParams shellParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        shellParams.setMargins(0, 0, 0, dp(5));
        shell.setLayoutParams(shellParams);

        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER_VERTICAL);
        row.setPadding(dp(9), dp(7), dp(9), dp(7));
        row.setBackground(stroked(
            highlightUnread ? Color.rgb(236, 253, 245) : COLOR_SURFACE,
            highlightUnread ? themePrimary() : Color.rgb(236, 242, 248),
            14
        ));
        elevate(row, 0.8f);
        row.setLayoutParams(new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.WRAP_CONTENT
        ));

        String name = displayName(friend, phone);
        Button deleteButton = swipeDeleteButton(view -> confirmDeleteConversation(phone, name));
        FrameLayout.LayoutParams deleteParams = new FrameLayout.LayoutParams(deleteWidth, dp(58), Gravity.END | Gravity.CENTER_VERTICAL);
        shell.addView(deleteButton, deleteParams);

        View avatar = avatarView(friend, name, dp(44), 15);
        LinearLayout.LayoutParams avatarParams = new LinearLayout.LayoutParams(dp(44), dp(44));
        avatarParams.setMargins(0, 0, dp(9), 0);
        row.addView(avatar, avatarParams);

        LinearLayout main = new LinearLayout(this);
        main.setOrientation(LinearLayout.VERTICAL);
        LinearLayout titleRow = row();
        TextView title = text(name, 15, COLOR_INK, true);
        title.setSingleLine(true);
        titleRow.addView(title, new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1));
        addBadgesToRow(titleRow, friend);
        main.addView(titleRow);
        TextView body = text(lastMessagePreview(conversation), 13, COLOR_MUTED, false);
        body.setSingleLine(true);
        main.addView(body);
        row.addView(main, new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1));

        LinearLayout meta = new LinearLayout(this);
        meta.setOrientation(LinearLayout.VERTICAL);
        meta.setGravity(Gravity.END);
        TextView timeView = text(lastMessageTime(conversation), 11, COLOR_MUTED, true);
        timeView.setGravity(Gravity.END);
        timeView.setSingleLine(true);
        meta.addView(timeView, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT));
        if (unread > 0) {
            TextView badge = text(unread > 99 ? "99+" : String.valueOf(unread), 11, Color.WHITE, true);
            badge.setGravity(Gravity.CENTER);
            badge.setPadding(dp(7), 0, dp(7), 0);
            badge.setBackground(rounded(Color.rgb(14, 165, 165), 999));
            LinearLayout.LayoutParams badgeParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                dp(20)
            );
            badgeParams.topMargin = dp(4);
            meta.addView(badge, badgeParams);
        }
        row.addView(meta, new LinearLayout.LayoutParams(dp(50), LinearLayout.LayoutParams.WRAP_CONTENT));
        row.setOnClickListener(view -> {
            if (Math.abs(row.getTranslationX()) > dp(12)) {
                closeConversationSwipe(row, deleteButton);
                return;
            }
            openChat(phone);
        });
        attachConversationSwipe(row, deleteButton, deleteWidth);
        shell.addView(row);
        return shell;
    }

    private Button swipeDeleteButton(View.OnClickListener listener) {
        Button button = new Button(this);
        button.setText("Xoá");
        button.setTextColor(Color.rgb(159, 74, 74));
        button.setTextSize(13);
        button.setTypeface(Typeface.DEFAULT_BOLD);
        button.setAllCaps(false);
        button.setMinWidth(0);
        button.setMinHeight(0);
        button.setMinimumWidth(0);
        button.setMinimumHeight(0);
        button.setPadding(dp(8), 0, dp(8), 0);
        button.setAlpha(0f);
        button.setVisibility(View.INVISIBLE);
        button.setBackground(stroked(Color.rgb(255, 241, 242), Color.rgb(254, 202, 202), 14));
        button.setOnClickListener(listener);
        attachPressFeedback(button);
        return button;
    }

    private void attachConversationSwipe(View row, View deleteButton, int deleteWidth) {
        final float[] startRawX = { 0f };
        final float[] startRawY = { 0f };
        final float[] startTranslation = { 0f };
        final boolean[] swiping = { false };
        row.setOnTouchListener((target, event) -> {
            if (event.getAction() == MotionEvent.ACTION_DOWN) {
                startRawX[0] = event.getRawX();
                startRawY[0] = event.getRawY();
                startTranslation[0] = target.getTranslationX();
                swiping[0] = false;
                return false;
            }
            if (event.getAction() == MotionEvent.ACTION_MOVE) {
                float dx = event.getRawX() - startRawX[0];
                float dy = Math.abs(event.getRawY() - startRawY[0]);
                if (!swiping[0] && Math.abs(dx) > dp(12) && Math.abs(dx) > dy * 1.15f) {
                    swiping[0] = true;
                    requestParentsDoNotIntercept(target, true);
                }
                if (swiping[0]) {
                    float next = Math.max(-deleteWidth, Math.min(0, startTranslation[0] + dx));
                    target.setTranslationX(next);
                    revealConversationDelete(deleteButton, Math.abs(next) / Math.max(1f, deleteWidth));
                    return true;
                }
                return false;
            }
            if (event.getAction() == MotionEvent.ACTION_UP || event.getAction() == MotionEvent.ACTION_CANCEL) {
                if (swiping[0]) {
                    requestParentsDoNotIntercept(target, false);
                    if (target.getTranslationX() <= -deleteWidth * 0.42f) openConversationSwipe(target, deleteButton, deleteWidth);
                    else closeConversationSwipe(target, deleteButton);
                    return true;
                }
                return false;
            }
            return false;
        });
    }

    private void requestParentsDoNotIntercept(View view, boolean disallow) {
        android.view.ViewParent parent = view.getParent();
        while (parent != null) {
            parent.requestDisallowInterceptTouchEvent(disallow);
            parent = parent.getParent();
        }
    }

    private void revealConversationDelete(View deleteButton, float progress) {
        if (deleteButton == null) return;
        float alpha = Math.max(0f, Math.min(1f, progress));
        deleteButton.setVisibility(alpha > 0.04f ? View.VISIBLE : View.INVISIBLE);
        deleteButton.setAlpha(alpha * 0.86f);
    }

    private void openConversationSwipe(View row, View deleteButton, int deleteWidth) {
        revealConversationDelete(deleteButton, 1f);
        row.animate().translationX(-deleteWidth).setDuration(130).start();
    }

    private void closeConversationSwipe(View row, View deleteButton) {
        row.animate().translationX(0).setDuration(130).start();
        if (deleteButton != null) {
            deleteButton.animate().alpha(0f).setDuration(120).withEndAction(() -> deleteButton.setVisibility(View.INVISIBLE)).start();
        }
    }

    private void confirmDeleteConversation(String phone, String name) {
        if (phone == null || phone.isEmpty()) return;
        new AlertDialog.Builder(this)
            .setTitle("Xoá đoạn chat")
            .setMessage("Xoá toàn bộ đoạn chat với " + name + " khỏi danh sách tin nhắn trên tài khoản này?")
            .setPositiveButton("Xoá", (dialog, which) -> deleteConversation(phone))
            .setNegativeButton("Huỷ", null)
            .show();
    }

    private void deleteConversation(String phone) {
        if (phone == null || phone.isEmpty()) return;
        setStatus("Đang xoá đoạn chat...");
        api.deleteConversation(phone, new NexaApi.Callback() {
            @Override
            public void onSuccess(JSONObject data) {
                activeFriendPhone = "";
                markConversationRead(phone);
                setStatus("Đã xoá đoạn chat khỏi danh sách tin nhắn.");
                toast("Đã xoá đoạn chat.");
                syncAndShowHome("messages");
            }

            @Override
            public void onError(String message) {
                setStatus(message);
            }
        });
    }

    private LinearLayout messageRow(JSONObject message) {
        LinearLayout wrapper = new LinearLayout(this);
        wrapper.setOrientation(LinearLayout.VERTICAL);
        boolean mine = "me".equals(message.optString("from", ""));
        boolean recalled = message.optBoolean("recalled", false);
        String text = message.optString("text", "");
        JSONObject media = message.optJSONObject("media");
        if (recalled) {
            text = "Tin nhắn đã được thu hồi";
            media = null;
        }
        if (text.isEmpty() && media != null) text = media.optString("type", "").startsWith("video/") ? "[Video]" : "[Hình ảnh]";
        if (text.isEmpty()) text = "[Tin nhắn]";

        Bitmap mediaBitmap = media != null && media.optString("type", "").startsWith("image/")
            ? bitmapFromDataUri(media.optString("data", ""))
            : null;
        if (mediaBitmap != null) {
            ImageView image = new ImageView(this);
            image.setImageBitmap(mediaBitmap);
            image.setScaleType(ImageView.ScaleType.CENTER_CROP);
            image.setBackground(rounded(mine ? themePrimary() : COLOR_SURFACE, 18));
            LinearLayout.LayoutParams imageParams = new LinearLayout.LayoutParams(dp(220), dp(156));
            imageParams.gravity = mine ? Gravity.END : Gravity.START;
            imageParams.setMargins(0, dp(3), 0, dp(3));
            wrapper.addView(image, imageParams);
        }

        TextView bubble = text(text, 15, recalled ? COLOR_MUTED : (mine ? Color.WHITE : COLOR_INK), false);
        bubble.setMaxWidth(dp(290));
        bubble.setBackground(rounded(recalled ? COLOR_PANEL : (mine ? themePrimary() : COLOR_SURFACE), 20));
        bubble.setPadding(dp(13), dp(9), dp(13), dp(9));
        LinearLayout.LayoutParams bubbleParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        bubbleParams.gravity = mine ? Gravity.END : Gravity.START;
        bubbleParams.setMargins(0, dp(2), 0, dp(2));
        wrapper.addView(bubble, bubbleParams);
        bubble.setOnLongClickListener(view -> {
            showMessageActions(message);
            return true;
        });
        return wrapper;
    }

    private void sendTextMessage(EditText messageInput) {
        String text = messageInput.getText().toString().trim();
        if (text.isEmpty()) {
            setStatus("Tin nhắn đang trống.");
            return;
        }
        JSONObject friend = findFriend(activeFriendPhone);
        if (friend != null && (friend.optBoolean("blockedByMe", false) || friend.optBoolean("blockedMe", false))) {
            String message = friend.optBoolean("blockedByMe", false)
                ? "Anh đang chặn người này. Hãy bỏ chặn trước khi nhắn tin."
                : "Người này hiện không nhận tin nhắn.";
            setStatus(message);
            toast(message);
            return;
        }
        if (!pendingReplyText.isEmpty()) {
            text = "Trả lời: " + shorten(pendingReplyText, 80) + "\n" + text;
        }
        String friendPhone = activeFriendPhone;
        String outgoingText = text;
        setStatus("Đang gửi tin nhắn...");
        api.sendMessage(friendPhone, outgoingText, new NexaApi.Callback() {
            @Override
            public void onSuccess(JSONObject data) {
                messageInput.setText("");
                pendingReplyText = "";
                setStatus("Đã gửi.");
                appendSentMessageWithoutRebuild(friendPhone, data.optJSONObject("message"), outgoingText, messageInput);
                syncChatStateQuietly(friendPhone);
            }

            @Override
            public void onError(String message) {
                setStatus(message);
            }
        });
    }

    private void appendSentMessageWithoutRebuild(String friendPhone, JSONObject sentMessage, String fallbackText, EditText messageInput) {
        JSONObject message = sentMessage == null ? localSentMessage(fallbackText) : sentMessage;
        int previousCount = appendMessageToCachedConversation(friendPhone, message);
        if (normalizePhone(friendPhone).equals(activeFriendPhone) && activeMessageList != null) {
            if (previousCount == 0) activeMessageList.removeAllViews();
            if (previousCount >= 0) activeMessageList.addView(messageRow(message));
            scrollConversationToBottom(appScroll);
        }
        messageInput.post(() -> {
            messageInput.requestFocus();
            showKeyboard(messageInput);
            scrollConversationToBottom(appScroll);
        });
    }

    private JSONObject localSentMessage(String text) {
        JSONObject message = new JSONObject();
        try {
            message.put("id", "local-" + System.currentTimeMillis());
            message.put("from", "me");
            message.put("text", text == null ? "" : text);
            message.put("time", "");
            SimpleDateFormat formatter = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
            formatter.setTimeZone(TimeZone.getTimeZone("UTC"));
            message.put("createdAt", formatter.format(new Date()));
            message.put("canRecall", false);
        } catch (Exception ignored) {
        }
        return message;
    }

    private int appendMessageToCachedConversation(String friendPhone, JSONObject message) {
        if (message == null) return -1;
        String cleanFriend = normalizePhone(friendPhone);
        JSONArray conversations = mutableConversations();
        JSONObject conversation = findConversation(cleanFriend);
        JSONArray messages = conversation == null ? null : conversation.optJSONArray("messages");
        String messageId = message.optString("id", "");
        if (!messageId.isEmpty() && messages != null) {
            for (int i = 0; i < messages.length(); i++) {
                JSONObject existing = messages.optJSONObject(i);
                if (existing != null && messageId.equals(existing.optString("id", ""))) return -1;
            }
        }
        int previousCount = messages == null ? 0 : messages.length();
        try {
            if (conversation == null) {
                conversation = new JSONObject();
                conversation.put("friendPhone", cleanFriend);
                messages = new JSONArray();
                conversation.put("messages", messages);
                conversation.put("updatedAt", message.optString("createdAt", ""));
                conversations.put(conversation);
            } else if (messages == null) {
                messages = new JSONArray();
                conversation.put("messages", messages);
            }
            messages.put(message);
            String createdAt = message.optString("createdAt", "");
            if (!createdAt.isEmpty()) conversation.put("updatedAt", createdAt);
            renderSignature = "";
        } catch (Exception ignored) {
            return -1;
        }
        return previousCount;
    }

    private JSONArray mutableConversations() {
        if (lastSync == null) lastSync = new JSONObject();
        JSONArray conversations = lastSync.optJSONArray("conversations");
        if (conversations == null) {
            conversations = new JSONArray();
            try {
                lastSync.put("conversations", conversations);
            } catch (Exception ignored) {
            }
        }
        return conversations;
    }

    private void syncChatStateQuietly(String friendPhone) {
        api.sync(new NexaApi.Callback() {
            @Override
            public void onSuccess(JSONObject data) {
                applyUnreadTracking(data);
                markConversationRead(friendPhone);
                lastSync = data;
                applyAiHistoryReset();
                if (!normalizePhone(friendPhone).equals(activeFriendPhone)) refreshVisibleSection();
            }

            @Override
            public void onError(String message) {
                setStatus("Đã gửi, nhưng chưa làm mới được: " + message);
            }
        });
    }

    private void showMessageActions(JSONObject message) {
        String[] actions = message.optBoolean("canRecall", false)
            ? new String[] { "Trả lời", "Sao chép tin nhắn", "Chuyển tiếp", "Báo cáo tin nhắn", "Xoá ở phía tôi", "Thu hồi" }
            : new String[] { "Trả lời", "Sao chép tin nhắn", "Chuyển tiếp", "Báo cáo tin nhắn", "Xoá ở phía tôi" };
        new AlertDialog.Builder(this)
            .setTitle("Thao tác tin nhắn")
            .setItems(actions, (dialog, which) -> {
                String action = actions[which];
                if ("Trả lời".equals(action)) {
                    pendingReplyText = messageTextForAction(message);
                    showConversationScreen();
                    setStatus("Đã chọn tin nhắn để trả lời.");
                } else if ("Sao chép tin nhắn".equals(action)) {
                    copyText("Tin nhắn", messageTextForAction(message));
                } else if ("Chuyển tiếp".equals(action)) {
                    showForwardTargets(messageTextForAction(message));
                } else if ("Báo cáo tin nhắn".equals(action)) {
                    promptReportContent("message", message.optString("id", ""), activeFriendPhone, messageTextForAction(message));
                } else if ("Thu hồi".equals(action)) {
                    recallMessage(message.optString("id", ""));
                } else {
                    deleteMessage(message.optString("id", ""));
                }
            })
            .show();
    }

    private void showForwardTargets(String text) {
        JSONArray friends = friends();
        if (friends.length() == 0) {
            setStatus("Chưa có bạn bè để chuyển tiếp.");
            return;
        }
        String[] labels = new String[friends.length()];
        String[] phones = new String[friends.length()];
        for (int i = 0; i < friends.length(); i++) {
            JSONObject friend = friends.optJSONObject(i);
            if (friend == null) friend = new JSONObject();
            phones[i] = friend.optString("accountPhone", friend.optString("phone", ""));
            labels[i] = displayName(friend, phones[i]);
        }
        new AlertDialog.Builder(this)
            .setTitle("Chuyển tiếp đến")
            .setItems(labels, (dialog, which) -> {
                if (phones[which].isEmpty()) return;
                api.sendMessage(phones[which], text, new BasicCallback("Đã chuyển tiếp tin nhắn.", () -> syncAndShowHome("messages")));
            })
            .show();
    }

    private String messageTextForAction(JSONObject message) {
        String text = message.optString("text", "");
        if (!text.isEmpty()) return text;
        JSONObject media = message.optJSONObject("media");
        if (media != null) return media.optString("type", "").startsWith("video/") ? "[Video]" : "[Hình ảnh]";
        return "[Tin nhắn]";
    }

    private LinearLayout replyPreview() {
        LinearLayout preview = compactCard();
        preview.setBackground(stroked(Color.rgb(236, 253, 245), Color.rgb(94, 234, 212), 14));
        preview.addView(text("Đang trả lời", 12, themePrimary(), true));
        preview.addView(text(shorten(pendingReplyText, 110), 13, COLOR_MUTED, false));
        preview.setOnClickListener(view -> {
            pendingReplyText = "";
            showConversationScreen();
        });
        return preview;
    }

    private void deleteMessage(String messageId) {
        if (messageId.isEmpty()) return;
        api.deleteMessage(activeFriendPhone, messageId, new BasicCallback("Đã xoá tin nhắn.", () -> syncAndReturnToChat(activeFriendPhone)));
    }

    private void recallMessage(String messageId) {
        if (messageId.isEmpty()) return;
        api.recallMessage(activeFriendPhone, messageId, new BasicCallback("Đã thu hồi tin nhắn.", () -> syncAndReturnToChat(activeFriendPhone)));
    }

    private void renderAddFriend() {
        content.addView(sectionTitle("Thêm bạn"));
        LinearLayout addCard = card();
        EditText friendInput = input("Nhập số điện thoại để kết bạn");
        friendInput.setInputType(InputType.TYPE_CLASS_PHONE);
        friendInput.setImeOptions(EditorInfo.IME_ACTION_DONE);
        addCard.addView(label("KẾT BẠN"));
        addCard.addView(paragraph("Nhập đầy đủ số điện thoại, sau đó bấm Thêm bạn để kết nối tài khoản XPAY Chat."));
        addCard.addView(friendInput);
        addCard.addView(primaryAction("Thêm bạn", view -> {
            String phone = friendInput.getText().toString().trim();
            if (phone.isEmpty()) {
                setStatus("Vui lòng nhập số điện thoại.");
                return;
            }
            setStatus("Đang gửi yêu cầu kết bạn...");
            requestFriend(phone, "friends");
        }));
        content.addView(addCard);
    }

    private void requestFriend(String phone, String returnSection) {
        api.addFriend(phone, new NexaApi.Callback() {
            @Override
            public void onSuccess(JSONObject data) {
                String message = "pending".equals(data.optString("status", ""))
                    ? "Đã gửi yêu cầu kết bạn. Khi người kia chấp nhận, hai bên mới nhắn tin/gọi được."
                    : "Đã kết bạn.";
                setStatus(message);
                toast(message);
                syncAndShowHome(returnSection == null || returnSection.isEmpty() ? "friends" : returnSection);
            }

            @Override
            public void onError(String message) {
                setStatus(message);
                toast(message);
            }
        });
    }

    private void renderFriends() {
        content.addView(sectionTitle("Bạn bè"));
        LinearLayout tools = row();
        tools.addView(rowAction("Thêm bạn mới", view -> openHomeSection("addFriend"), true));
        tools.addView(rowAction("Quét QR", view -> openHomeSection("qr"), false));
        content.addView(tools);
        content.addView(referralCard());
        renderFriendRequests();
        JSONArray friends = friends();
        if (friends.length() == 0) {
            content.addView(infoCard("Chưa có bạn bè", "Anh có thể kết bạn bằng số điện thoại hoặc từ Quanh đây."));
        } else {
            for (int i = 0; i < friends.length(); i++) {
                JSONObject friend = friends.optJSONObject(i);
                if (friend == null) continue;
                String phone = friend.optString("accountPhone", friend.optString("phone", ""));
                String badges = accountBadges(friend);
                String subtitle = friend.optString("presenceStatus", "") + (badges.isEmpty() ? "" : " · " + badges);
                content.addView(friendCard(phone, displayName(friend, phone), subtitle));
            }
        }
    }

    private void renderFriendRequests() {
        JSONArray requests = friendRequests();
        for (int i = 0; i < requests.length(); i++) {
            JSONObject request = requests.optJSONObject(i);
            if (request == null || !"pending".equals(request.optString("status", ""))) continue;
            JSONObject profile = request.optJSONObject("profile");
            String direction = request.optString("direction", "");
            String name = profile == null ? request.optString("requesterPhone", "Nexa User") : displayName(profile, request.optString("requesterPhone", ""));
            LinearLayout card = card();
            card.addView(label("YÊU CẦU KẾT BẠN"));
            card.addView(text(name, 17, COLOR_INK, true));
            card.addView(paragraph("incoming".equals(direction) ? "Người này muốn kết bạn với anh." : "Đang chờ người kia xác nhận."));
            if ("incoming".equals(direction)) {
                LinearLayout actions = row();
                String requestId = request.optString("id", "");
                actions.addView(rowAction("Nhận", view -> respondFriendRequest(requestId, "accept"), true));
                actions.addView(rowAction("Từ chối", view -> respondFriendRequest(requestId, "reject"), false));
                card.addView(actions);
            }
            content.addView(card);
        }
    }

    private void respondFriendRequest(String requestId, String action) {
        api.respondFriendRequest(requestId, action, new BasicCallback("Đã cập nhật yêu cầu kết bạn.", () -> syncAndShowHome("friends")));
    }

    private LinearLayout referralCard() {
        LinearLayout card = card();
        int points = referralPoints();
        card.addView(label("GIỚI THIỆU BẠN MỚI"));
        card.addView(text("Điểm giới thiệu: " + points + " điểm", 16, COLOR_INK, true));
        card.addView(paragraph("Mỗi tài khoản mới đăng ký và xác minh thành công qua link giới thiệu sẽ được tính 1 điểm. Nội dung chia sẻ chỉ dùng link giới thiệu chính thức của XPAY Chat."));
        LinearLayout actions = row();
        actions.addView(rowAction("Tạo link", view -> showReferralLink(), true));
        actions.addView(rowAction("Chia sẻ", view -> shareReferralLink(), false));
        card.addView(actions);
        return card;
    }

    private int referralPoints() {
        JSONObject current = user();
        JSONObject referral = current.optJSONObject("referral");
        if (referral != null) return referral.optInt("points", referral.optInt("referralPoints", 0));
        return current.optInt("referralPoints", current.optInt("invitePoints", 0));
    }

    private String referralLink() {
        String phone = normalizePhone(userPhone());
        if (phone.isEmpty()) phone = normalizePhone(store == null ? "" : store.phone());
        return API_BASE_URL + "/?ref=" + Uri.encode(phone);
    }

    private void showReferralLink() {
        String link = referralLink();
        copyText("Link giới thiệu XPAY Chat", referralShareText());
        new AlertDialog.Builder(this)
            .setTitle("Link giới thiệu")
            .setMessage(referralShareText() + "\n\nNội dung giới thiệu đã được sao chép. Khi người mới đăng ký và xác minh thành công, tài khoản giới thiệu sẽ được cộng điểm theo cơ chế trên máy chủ.")
            .setPositiveButton("Chia sẻ", (dialog, which) -> shareReferralLink())
            .setNegativeButton("Đóng", null)
            .show();
    }

    private void shareReferralLink() {
        Intent intent = new Intent(Intent.ACTION_SEND);
        intent.setType("text/plain");
        intent.putExtra(Intent.EXTRA_SUBJECT, "Mời tham gia XPAY Chat");
        intent.putExtra(Intent.EXTRA_TEXT, referralShareText());
        startActivity(Intent.createChooser(intent, "Chia sẻ link XPAY Chat"));
    }

    private String referralShareText() {
        return "Mời bạn tham gia XPAY Chat qua link giới thiệu của tôi:\n" +
            referralLink() +
            "\n\nHướng dẫn:\n" +
            "1. Mở XPAY Chat bằng trình duyệt hoặc ứng dụng chính thức.\n" +
            "2. Đăng ký tài khoản bằng số điện thoại, email và OTP.\n" +
            "3. Sau khi xác minh, hai bên có thể kết bạn và dùng XPAY Chat.";
    }

    private void copyText(String label, String value) {
        ClipboardManager clipboard = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
        if (clipboard == null) return;
        clipboard.setPrimaryClip(ClipData.newPlainText(label, value));
        String lower = label == null ? "" : label.toLowerCase();
        toast(lower.contains("link") ? "Đã sao chép link giới thiệu." : "Đã sao chép nội dung.");
    }

    private void promptReportContent(String targetType, String targetId, String targetOwnerPhone, String details) {
        EditText reason = input("Lý do báo cáo");
        reason.setSingleLine(false);
        reason.setMinLines(2);
        new AlertDialog.Builder(this)
            .setTitle("Báo cáo nội dung")
            .setMessage("Báo cáo sẽ được gửi tới quản trị viên để xem xét.")
            .setView(reason)
            .setPositiveButton("Gửi báo cáo", (dialog, which) -> {
                String value = reason.getText().toString().trim();
                if (value.isEmpty()) value = "Nội dung không phù hợp";
                api.reportContent(targetType, targetId, targetOwnerPhone, value, details, new BasicCallback("Đã gửi báo cáo.", null));
            })
            .setNegativeButton("Huỷ", null)
            .show();
    }

    private LinearLayout friendCard(String phone, String name, String subtitle) {
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.HORIZONTAL);
        card.setGravity(Gravity.CENTER_VERTICAL);
        card.setPadding(dp(9), dp(6), dp(8), dp(6));
        card.setBackground(stroked(Color.WHITE, Color.rgb(231, 238, 246), 14));
        elevate(card, 0.9f);
        LinearLayout.LayoutParams cardParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        cardParams.setMargins(0, dp(2), 0, dp(5));
        card.setLayoutParams(cardParams);

        View avatar = avatarView(findFriend(phone), name, dp(38), 14);
        LinearLayout.LayoutParams avatarParams = new LinearLayout.LayoutParams(dp(38), dp(38));
        avatarParams.setMargins(0, 0, dp(8), 0);
        card.addView(avatar, avatarParams);

        LinearLayout info = new LinearLayout(this);
        info.setOrientation(LinearLayout.VERTICAL);
        TextView title = text(name, 14, COLOR_INK, true);
        title.setSingleLine(true);
        info.addView(title);
        TextView sub = text(subtitle, 11, COLOR_MUTED, false);
        sub.setSingleLine(true);
        info.addView(sub);
        card.addView(info, new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1));

        LinearLayout actions = row();
        JSONObject friend = findFriend(phone);
        boolean blockedByMe = friend != null && friend.optBoolean("blockedByMe", false);
        boolean blockedMe = friend != null && friend.optBoolean("blockedMe", false);
        if (blockedByMe) {
            actions.addView(slimAction("Bỏ chặn", view -> updateFriendBlock(phone, false), true));
        } else if (blockedMe) {
            actions.addView(slimAction("Bị chặn", view -> toast("Người này hiện không nhận liên hệ."), false));
        } else {
            actions.addView(slimAction("Nhắn", view -> openChat(phone), true));
            actions.addView(actionIcon("phone", view -> startCall(phone, "voice")));
            actions.addView(actionIcon("video", view -> startCall(phone, "video")));
            actions.addView(slimAction("Chặn", view -> updateFriendBlock(phone, true), false));
        }
        card.addView(actions);
        return card;
    }

    private void updateFriendBlock(String phone, boolean blocked) {
        api.updateFriendBlock(phone, blocked, new BasicCallback(
            blocked ? "Đã chặn người dùng này." : "Đã bỏ chặn người dùng này.",
            () -> syncAndShowHome("friends")
        ));
    }

    private void renderNearby() {
        content.addView(sectionTitle("Quanh đây"));
        LinearLayout control = card();
        control.addView(text("Tìm bạn quanh đây", 17, COLOR_INK, true));
        control.addView(paragraph("Cập nhật vị trí thiết bị để danh sách quanh đây luôn theo dữ liệu thật."));
        control.addView(primaryAction("Cập nhật vị trí hiện tại", view -> updateCurrentLocation()));
        content.addView(control);

        JSONArray nearby = nearby();
        if (nearby.length() == 0) {
            content.addView(infoCard("Chưa có dữ liệu quanh đây", "Hãy bật quyền vị trí trên thiết bị và bấm cập nhật vị trí."));
        } else {
            for (int i = 0; i < nearby.length(); i++) {
                JSONObject person = nearby.optJSONObject(i);
                if (person == null) continue;
                String phone = person.optString("accountPhone", person.optString("phone", ""));
                String distance = person.optString("distanceText", person.optString("distance", ""));
                LinearLayout card = compactCard();
                LinearLayout top = row();
                View avatar = avatarView(person, displayName(person, phone), dp(42), 15);
                LinearLayout.LayoutParams avatarParams = new LinearLayout.LayoutParams(dp(42), dp(42));
                avatarParams.setMargins(0, 0, dp(10), 0);
                top.addView(avatar, avatarParams);
                LinearLayout info = new LinearLayout(this);
                info.setOrientation(LinearLayout.VERTICAL);
                info.addView(text(displayName(person, phone), 16, COLOR_INK, true));
                info.addView(text(distance.isEmpty() ? "Người dùng XPAY Chat" : distance, 13, COLOR_MUTED, false));
                top.addView(info, new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1));
                if (isFriendPhone(phone)) {
                    top.addView(slimAction("Nhắn", view -> openChat(phone), true));
                } else {
                    top.addView(slimAction("Kết bạn", view -> requestFriend(phone, "friends"), true));
                }
                card.addView(top);
                content.addView(card);
            }
        }
    }

    private void renderBusinesses() {
        content.addView(sectionTitle("Doanh nghiệp"));
        JSONObject mine = myBusiness();
        if (pendingBusinessLogo == null) {
            JSONObject logo = mine.optJSONObject("logo");
            String logoData = mine.optString("logoData", "");
            if (logo != null) pendingBusinessLogo = logo;
            else if (!logoData.isEmpty()) {
                pendingBusinessLogo = new JSONObject();
                try {
                    pendingBusinessLogo.put("data", logoData);
                    pendingBusinessLogo.put("type", "image/*");
                    pendingBusinessLogo.put("name", "business-logo");
                } catch (Exception ignored) {
                }
            }
        }
        if (pendingBusinessGallery == null) {
            JSONArray existingGallery = mine.optJSONArray("gallery");
            pendingBusinessGallery = existingGallery == null ? new JSONArray() : existingGallery;
        }
        LinearLayout editor = card();
        LinearLayout editorHeader = row();
        LinearLayout editorCopy = new LinearLayout(this);
        editorCopy.setOrientation(LinearLayout.VERTICAL);
        editorCopy.addView(text("Quảng bá doanh nghiệp trên XPAY Chat", 16, COLOR_INK, true));
        editorCopy.addView(text(mine.length() > 0 ? "Trạng thái: " + businessStatusLabel(mine.optString("status", "pending")) : "Bấm để tạo hồ sơ doanh nghiệp", 13, COLOR_MUTED, false));
        editorHeader.addView(editorCopy, new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1));
        editorHeader.addView(slimAction(businessEditorOpen ? "Thu gọn" : "Mở", view -> {
            businessEditorOpen = !businessEditorOpen;
            showHome();
        }, true));
        editor.addView(editorHeader);

        if (!businessEditorOpen) {
            editor.addView(paragraph("Hồ sơ gửi lên sẽ chờ admin duyệt trước khi hiển thị công khai cho người dùng khác."));
            content.addView(editor);
            renderBusinessInbox(myBusiness());
            content.addView(sectionTitle("Doanh nghiệp nổi bật"));
            LinearLayout searchCard = compactCard();
            searchCard.addView(label("TÌM DOANH NGHIỆP"));
            EditText businessSearch = input("Tìm tên, ngành nghề, sản phẩm hoặc khu vực");
            LinearLayout businessResults = new LinearLayout(this);
            businessResults.setOrientation(LinearLayout.VERTICAL);
            searchCard.addView(businessSearch);
            content.addView(searchCard);
            content.addView(businessResults);
            JSONArray businesses = businesses();
            if (businesses.length() == 0) {
                content.addView(infoCard("Chưa có doanh nghiệp", "Khi người dùng tạo hồ sơ, danh sách sẽ xuất hiện tại đây."));
                return;
            }
            businessSearch.addTextChangedListener(new TextWatcher() {
                @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
                @Override public void onTextChanged(CharSequence s, int start, int before, int count) {
                    fillBusinessList(businessResults, s == null ? "" : s.toString());
                }
                @Override public void afterTextChanged(Editable s) {}
            });
            fillBusinessList(businessResults, "");
            return;
        }

        editor.addView(paragraph("Hồ sơ gửi lên sẽ chờ admin duyệt trước khi hiển thị công khai cho người dùng khác."));

        EditText nameInput = input("Tên doanh nghiệp");
        nameInput.setText(mine.optString("name", ""));
        EditText categoryInput = input("Ngành nghề");
        categoryInput.setText(mine.optString("category", ""));
        EditText descriptionInput = chatMessageInput("Mô tả sản phẩm, dịch vụ");
        descriptionInput.setMinLines(2);
        descriptionInput.setText(mine.optString("description", ""));
        EditText addressInput = input("Địa chỉ hoặc khu vực phục vụ");
        addressInput.setText(mine.optString("address", ""));
        EditText phoneInput = input("Số điện thoại liên hệ");
        phoneInput.setInputType(InputType.TYPE_CLASS_PHONE);
        phoneInput.setText(mine.optString("phone", userPhone()));
        EditText websiteInput = input("Website hoặc link mạng xã hội");
        websiteInput.setText(mine.optString("website", ""));
        EditText offerInput = input("Ưu đãi hoặc điểm nổi bật hôm nay");
        offerInput.setText(mine.optString("offer", ""));
        EditText servicesInput = chatMessageInput("Sản phẩm/dịch vụ: phở bò, cơm văn phòng, sửa điện thoại...");
        servicesInput.setMinLines(2);
        servicesInput.setText(mine.optString("services", ""));
        EditText keywordsInput = input("Từ khoá tìm kiếm");
        keywordsInput.setText(mine.optString("keywords", ""));
        JSONObject hours = mine.optJSONObject("hours");
        EditText openInput = input("Giờ mở cửa, ví dụ 08:00");
        openInput.setText(hours == null ? "" : hours.optString("open", ""));
        EditText closeInput = input("Giờ đóng cửa, ví dụ 21:30");
        closeInput.setText(hours == null ? "" : hours.optString("close", ""));
        EditText radiusInput = input("Bán kính phục vụ km");
        radiusInput.setInputType(InputType.TYPE_CLASS_NUMBER | InputType.TYPE_NUMBER_FLAG_DECIMAL);
        radiusInput.setText(mine.optString("serviceRadiusKm", ""));
        CheckBox deliveryInput = new CheckBox(this);
        deliveryInput.setText("Có giao hàng");
        deliveryInput.setTextColor(COLOR_INK);
        deliveryInput.setTextSize(13);
        deliveryInput.setChecked(mine.optBoolean("delivery", false));
        CheckBox bookingInput = new CheckBox(this);
        bookingInput.setText("Nhận đặt lịch");
        bookingInput.setTextColor(COLOR_INK);
        bookingInput.setTextSize(13);
        bookingInput.setChecked(mine.optBoolean("booking", false));

        editor.addView(nameInput);
        editor.addView(categoryInput);
        editor.addView(descriptionInput);
        editor.addView(addressInput);
        editor.addView(phoneInput);
        editor.addView(websiteInput);
        editor.addView(offerInput);
        editor.addView(servicesInput);
        editor.addView(keywordsInput);
        LinearLayout hourRow = row();
        fitRowChild(openInput);
        fitRowChild(closeInput);
        hourRow.addView(openInput);
        hourRow.addView(closeInput);
        editor.addView(hourRow);
        LinearLayout serviceRow = row();
        fitRowChild(radiusInput);
        fitRowChild(deliveryInput);
        fitRowChild(bookingInput);
        serviceRow.addView(radiusInput);
        serviceRow.addView(deliveryInput);
        serviceRow.addView(bookingInput);
        editor.addView(serviceRow);

        LinearLayout locationBox = compactCard();
        locationBox.addView(label("VỊ TRÍ DOANH NGHIỆP"));
        locationBox.addView(text(businessLocationText(mine), 13, COLOR_MUTED, false));
        locationBox.addView(primaryAction("Lấy vị trí hiện tại", view -> {
            Location location = currentLocation();
            if (location == null) {
                setStatus("Chưa lấy được vị trí. Hãy cấp quyền vị trí.");
                return;
            }
            try {
                mine.put("latitude", location.getLatitude());
                mine.put("longitude", location.getLongitude());
            } catch (Exception ignored) {
            }
            setStatus("Đã gắn vị trí doanh nghiệp vào form.");
            showHome();
        }));
        editor.addView(locationBox);

        LinearLayout mediaBox = compactCard();
        mediaBox.addView(label("ẢNH DOANH NGHIỆP"));
        mediaBox.addView(text("Logo hiển thị bên trái tên doanh nghiệp. Ảnh trưng bày tối đa 5 ảnh, dưới 6MB/ảnh.", 13, COLOR_MUTED, false));
        JSONObject logoPreviewSource = new JSONObject();
        try {
            logoPreviewSource.put("logoData", pendingBusinessLogo == null ? "" : pendingBusinessLogo.optString("data", ""));
        } catch (Exception ignored) {
        }
        LinearLayout logoRow = row();
        View logoPreview = businessLogoView(logoPreviewSource, nameInput.getText().toString().trim().isEmpty() ? "DN" : nameInput.getText().toString().trim(), dp(52));
        LinearLayout.LayoutParams logoParams = new LinearLayout.LayoutParams(dp(52), dp(52));
        logoParams.setMargins(0, 0, dp(10), 0);
        logoRow.addView(logoPreview, logoParams);
        logoRow.addView(rowAction("Chọn logo", view -> pickMedia(REQ_BUSINESS_LOGO, "image/*"), true));
        mediaBox.addView(logoRow);
        LinearLayout galleryRow = row();
        galleryRow.addView(rowAction("Chọn tối đa 5 ảnh", view -> pickMedia(REQ_BUSINESS_GALLERY, "image/*", true), false));
        mediaBox.addView(galleryRow);
        if (pendingBusinessGallery != null && pendingBusinessGallery.length() > 0) {
            mediaBox.addView(text("Đã chọn " + pendingBusinessGallery.length() + " ảnh trưng bày.", 13, COLOR_MUTED, true));
            mediaBox.addView(businessGalleryView(pendingBusinessGallery));
        }
        editor.addView(mediaBox);

        CheckBox terms = new CheckBox(this);
        terms.setText("Tôi cam kết thông tin doanh nghiệp là thật; không đăng hàng cấm, lừa đảo, nội dung người lớn, cờ bạc, vay nặng lãi, giấy tờ giả, thuốc/chữa bệnh sai sự thật hoặc link thu thập OTP/mật khẩu.");
        terms.setTextColor(COLOR_INK);
        terms.setTextSize(13);
        terms.setChecked(!mine.optString("termsAcceptedAt", "").isEmpty());
        editor.addView(terms);
        editor.addView(primaryAction(mine.length() > 0 ? "Cập nhật hồ sơ" : "Tạo hồ sơ doanh nghiệp", view -> {
            String name = nameInput.getText().toString().trim();
            if (name.isEmpty()) {
                setStatus("Vui lòng nhập tên doanh nghiệp.");
                return;
            }
            if (!terms.isChecked()) {
                setStatus("Vui lòng đồng ý điều khoản doanh nghiệp.");
                return;
            }
            JSONObject business = new JSONObject();
            try {
                business.put("name", name);
                business.put("category", categoryInput.getText().toString().trim());
                business.put("description", descriptionInput.getText().toString().trim());
                business.put("address", addressInput.getText().toString().trim());
                business.put("phone", phoneInput.getText().toString().trim());
                business.put("website", websiteInput.getText().toString().trim());
                business.put("offer", offerInput.getText().toString().trim());
                business.put("services", servicesInput.getText().toString().trim());
                business.put("keywords", keywordsInput.getText().toString().trim());
                JSONObject hoursPayload = new JSONObject();
                hoursPayload.put("open", openInput.getText().toString().trim());
                hoursPayload.put("close", closeInput.getText().toString().trim());
                business.put("hours", hoursPayload);
                business.put("serviceRadiusKm", radiusInput.getText().toString().trim());
                business.put("delivery", deliveryInput.isChecked());
                business.put("booking", bookingInput.isChecked());
                double latitude = mine.optDouble("latitude", Double.NaN);
                double longitude = mine.optDouble("longitude", Double.NaN);
                if (!Double.isNaN(latitude) && !Double.isNaN(longitude)) {
                    business.put("latitude", latitude);
                    business.put("longitude", longitude);
                }
                business.put("logoData", pendingBusinessLogo == null ? "" : pendingBusinessLogo.optString("data", ""));
                if (pendingBusinessLogo != null) business.put("logo", pendingBusinessLogo);
                business.put("gallery", pendingBusinessGallery == null ? new JSONArray() : pendingBusinessGallery);
            } catch (Exception ignored) {
            }
            setStatus("Đang lưu hồ sơ doanh nghiệp...");
            api.updateBusiness(business, true, new BasicCallback("Đã gửi hồ sơ doanh nghiệp chờ admin duyệt.", () -> syncAndShowHome("businesses")));
        }));
        content.addView(editor);
        renderBusinessInbox(myBusiness());

        content.addView(sectionTitle("Doanh nghiệp nổi bật"));
        LinearLayout searchCard = compactCard();
        searchCard.addView(label("TÌM DOANH NGHIỆP"));
        EditText businessSearch = input("Tìm tên, ngành nghề, sản phẩm hoặc khu vực");
        LinearLayout businessResults = new LinearLayout(this);
        businessResults.setOrientation(LinearLayout.VERTICAL);
        searchCard.addView(businessSearch);
        content.addView(searchCard);
        content.addView(businessResults);
        JSONArray businesses = businesses();
        if (businesses.length() == 0) {
            content.addView(infoCard("Chưa có doanh nghiệp", "Khi người dùng tạo hồ sơ, danh sách sẽ xuất hiện tại đây."));
            return;
        }
        businessSearch.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence text, int start, int count, int after) {
            }

            @Override
            public void onTextChanged(CharSequence text, int start, int before, int count) {
                fillBusinessList(businessResults, text == null ? "" : text.toString());
            }

            @Override
            public void afterTextChanged(Editable editable) {
            }
        });
        fillBusinessList(businessResults, "");
    }

    private JSONObject myBusiness() {
        String phone = normalizePhone(userPhone());
        JSONArray businesses = businesses();
        for (int i = 0; i < businesses.length(); i++) {
            JSONObject business = businesses.optJSONObject(i);
            if (business == null) continue;
            if (business.optBoolean("isMine", false) || phone.equals(normalizePhone(business.optString("ownerPhone", "")))) return business;
        }
        return new JSONObject();
    }

    private JSONArray businessInbox() {
        JSONArray value = lastSync == null ? null : lastSync.optJSONArray("businessInbox");
        return value == null ? new JSONArray() : value;
    }

    private void renderBusinessInbox(JSONObject mine) {
        if (mine == null || mine.length() == 0) return;
        LinearLayout box = compactCard();
        box.addView(label("QUẢN LÝ KHÁCH HÀNG"));
        JSONArray inbox = businessInbox();
        if (inbox.length() == 0) {
            box.addView(text("Chưa có khách liên hệ. Khi khách bấm nhắn doanh nghiệp, danh sách sẽ xuất hiện tại đây.", 13, COLOR_MUTED, false));
            content.addView(box);
            return;
        }
        for (int i = 0; i < inbox.length() && i < 20; i++) {
            JSONObject item = inbox.optJSONObject(i);
            if (item == null) continue;
            LinearLayout row = compactCard();
            String phone = normalizePhone(item.optString("phone", ""));
            row.addView(text(item.optString("name", "Khách hàng Nexa"), 15, COLOR_INK, true));
            row.addView(text(item.optString("statusLabel", "Khách mới") + (item.optString("lastText", "").isEmpty() ? "" : " • " + shorten(item.optString("lastText", ""), 80)), 12, COLOR_MUTED, false));
            LinearLayout actions = row();
            actions.addView(slimAction("Mở chat", view -> openChat(phone), true));
            actions.addView(slimAction("Đang xử lý", view -> updateBusinessCustomerStatus(phone, "handling"), false));
            actions.addView(slimAction("Hoàn tất", view -> updateBusinessCustomerStatus(phone, "done"), false));
            row.addView(actions);
            box.addView(row);
        }
        content.addView(box);
    }

    private void updateBusinessCustomerStatus(String customerPhone, String status) {
        api.updateBusinessCustomerStatus(customerPhone, status, new BasicCallback("Đã cập nhật trạng thái khách.", () -> syncAndShowHome("businesses")));
    }

    private String businessLocationText(JSONObject business) {
        if (business == null) return "Chưa gắn vị trí GPS.";
        double latitude = business.optDouble("latitude", Double.NaN);
        double longitude = business.optDouble("longitude", Double.NaN);
        if (Double.isNaN(latitude) || Double.isNaN(longitude)) return "Chưa gắn vị trí GPS. Vị trí giúp người dùng tìm nơi gần nhất.";
        return String.format(Locale.ROOT, "Vị trí: %.6f, %.6f", latitude, longitude);
    }

    private String plainText(String value) {
        String text = value == null ? "" : value.toLowerCase(Locale.ROOT);
        text = Normalizer.normalize(text, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return text.replace('đ', 'd').replaceAll("\\s+", " ").trim();
    }

    private String businessHaystack(JSONObject business) {
        if (business == null) return "";
        return plainText(
            business.optString("name", "") + " " +
            business.optString("category", "") + " " +
            business.optString("description", "") + " " +
            business.optString("services", "") + " " +
            business.optString("keywords", "") + " " +
            business.optString("address", "") + " " +
            business.optString("phone", "") + " " +
            business.optString("website", "") + " " +
            business.optString("offer", "") + " " +
            business.optString("ownerName", "")
        );
    }

    private int businessSearchScore(JSONObject business, String keyword) {
        if (business == null) return 0;
        String query = plainText(keyword);
        if (query.isEmpty()) return 1;
        String haystack = businessHaystack(business);
        int score = 0;
        if (plainText(business.optString("name", "")).contains(query)) score += 80;
        if (plainText(business.optString("category", "")).contains(query)) score += 56;
        if (haystack.contains(query)) score += 28;
        for (String word : query.split("\\s+")) {
            if (!word.isEmpty() && haystack.contains(word)) score += 8;
        }
        return score;
    }

    private JSONArray businessSearchResults(String query) {
        ArrayList<JSONObject> matches = new ArrayList<>();
        JSONArray all = businesses();
        for (int i = 0; i < all.length(); i++) {
            JSONObject business = all.optJSONObject(i);
            if (business == null) continue;
            if (businessSearchScore(business, query) > 0) matches.add(business);
        }
        matches.sort((left, right) -> {
            Double leftDistance = businessDistance(left);
            Double rightDistance = businessDistance(right);
            if (leftDistance != null || rightDistance != null) {
                return Double.compare(leftDistance == null ? Double.MAX_VALUE : leftDistance, rightDistance == null ? Double.MAX_VALUE : rightDistance);
            }
            return Integer.compare(businessSearchScore(right, query), businessSearchScore(left, query));
        });
        JSONArray results = new JSONArray();
        for (JSONObject business : matches) results.put(business);
        return results;
    }

    private void fillBusinessList(LinearLayout list, String query) {
        list.removeAllViews();
        JSONArray results = businessSearchResults(query);
        String keyword = plainText(query);
        if (!keyword.isEmpty()) {
            list.addView(text("Kết quả phù hợp: " + results.length(), 13, COLOR_MUTED, true));
        }
        if (results.length() == 0) {
            list.addView(infoCard("Không tìm thấy doanh nghiệp", "Thử tìm theo tên, ngành nghề, sản phẩm/dịch vụ hoặc khu vực khác."));
            return;
        }
        for (int i = 0; i < results.length(); i++) {
            JSONObject business = results.optJSONObject(i);
            if (business != null) list.addView(businessCard(business));
        }
    }

    private String businessStatusLabel(String status) {
        if ("published".equals(status)) return "Đã duyệt";
        if ("approved".equals(status)) return "Đã duyệt";
        if ("needs_changes".equals(status)) return "Cần bổ sung";
        if ("restricted".equals(status)) return "Bị hạn chế";
        if ("locked".equals(status)) return "Bị khoá";
        if ("rejected".equals(status)) return "Từ chối";
        if ("hidden".equals(status)) return "Ẩn";
        return "Chờ duyệt";
    }

    private View businessLogoView(JSONObject business, String fallback, int sizePx) {
        String logoData = business == null ? "" : business.optString("logoData", "");
        if (logoData.isEmpty()) {
            JSONObject logo = business == null ? null : business.optJSONObject("logo");
            if (logo != null) logoData = logo.optString("data", "");
        }
        Bitmap bitmap = bitmapFromDataUri(logoData);
        if (bitmap != null) {
            ImageView image = new ImageView(this);
            image.setImageBitmap(bitmap);
            image.setScaleType(ImageView.ScaleType.CENTER_CROP);
            image.setBackground(rounded(Color.rgb(238, 242, 247), 14));
            return image;
        }
        TextView logo = text(initials(fallback), 16, Color.WHITE, true);
        logo.setGravity(Gravity.CENTER);
        logo.setBackground(rounded(themePrimary(), 14));
        return logo;
    }

    private LinearLayout businessGalleryView(JSONArray gallery) {
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setPadding(0, dp(4), 0, dp(4));
        for (int i = 0; gallery != null && i < gallery.length() && i < 5; i++) {
            JSONObject item = gallery.optJSONObject(i);
            Bitmap bitmap = bitmapFromDataUri(item == null ? "" : item.optString("data", ""));
            if (bitmap == null) continue;
            ImageView image = new ImageView(this);
            image.setImageBitmap(bitmap);
            image.setScaleType(ImageView.ScaleType.CENTER_CROP);
            image.setBackground(rounded(Color.rgb(238, 242, 247), 10));
            LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(0, dp(64), 1);
            params.setMargins(i == 0 ? 0 : dp(4), 0, 0, 0);
            row.addView(image, params);
        }
        return row;
    }

    private double distanceKm(double lat1, double lng1, double lat2, double lng2) {
        double earthRadiusKm = 6371.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
            + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
            * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    private Double businessDistance(JSONObject business) {
        if (business == null) return null;
        if (!business.has("latitude") || !business.has("longitude")) return null;
        Location location = currentLocation();
        if (location == null) return null;
        double latitude = business.optDouble("latitude", Double.NaN);
        double longitude = business.optDouble("longitude", Double.NaN);
        if (Double.isNaN(latitude) || Double.isNaN(longitude)) return null;
        return distanceKm(location.getLatitude(), location.getLongitude(), latitude, longitude);
    }

    private String distanceText(double value) {
        if (value < 1) return Math.round(value * 1000) + "m";
        return String.format(Locale.ROOT, "%.1fkm", value);
    }

    private String businessMetaText(JSONObject business) {
        ArrayList<String> items = new ArrayList<>();
        String serverDistance = business.optString("distanceText", "");
        Double localDistance = serverDistance.isEmpty() ? businessDistance(business) : null;
        if (!serverDistance.isEmpty()) items.add(serverDistance);
        else if (localDistance != null) items.add(distanceText(localDistance));
        if (business.optBoolean("delivery", false)) items.add("Có giao hàng");
        if (business.optBoolean("booking", false)) items.add("Nhận đặt lịch");
        String radius = business.optString("serviceRadiusKm", "");
        if (!radius.isEmpty() && !"0".equals(radius)) items.add("Phục vụ " + radius + "km");
        JSONObject hours = business.optJSONObject("hours");
        if (hours != null && !hours.optString("open", "").isEmpty()) {
            items.add(hours.optString("open", "") + "-" + hours.optString("close", ""));
        }
        return String.join(" • ", items);
    }

    private LinearLayout businessCard(JSONObject business) {
        LinearLayout card = compactCard();
        LinearLayout top = row();
        String name = business.optString("name", "Doanh nghiệp Nexa");
        View logo = businessLogoView(business, name, dp(44));
        LinearLayout.LayoutParams logoParams = new LinearLayout.LayoutParams(dp(44), dp(44));
        logoParams.setMargins(0, 0, dp(10), 0);
        top.addView(logo, logoParams);

        LinearLayout info = new LinearLayout(this);
        info.setOrientation(LinearLayout.VERTICAL);
        info.addView(text(name, 16, COLOR_INK, true));
        String category = business.optString("category", "Dịch vụ");
        String badge = businessStatusLabel(business.optString("status", "pending"));
        info.addView(text(category + " · " + badge, 13, COLOR_MUTED, false));
        top.addView(info, new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1));
        card.addView(top);

        String description = business.optString("description", "");
        if (!description.isEmpty()) card.addView(paragraph(description));
        String services = business.optString("services", "");
        if (!services.isEmpty()) card.addView(text("Dịch vụ/sản phẩm: " + services, 13, COLOR_MUTED, false));
        String meta = businessMetaText(business);
        if (!meta.isEmpty()) card.addView(text(meta, 12, themePrimary(), true));
        String offer = business.optString("offer", "");
        if (!offer.isEmpty()) card.addView(text("Ưu đãi: " + offer, 14, themePrimary(), true));
        JSONArray gallery = business.optJSONArray("gallery");
        if (gallery != null && gallery.length() > 0) card.addView(businessGalleryView(gallery));
        String reviewNote = business.optString("reviewNote", "");
        if (!reviewNote.isEmpty()) card.addView(text("Lưu ý admin: " + reviewNote, 13, Color.rgb(146, 64, 14), false));
        String contact = business.optString("address", "");
        String phone = normalizePhone(business.optString("phone", business.optString("ownerPhone", "")));
        if (!phone.isEmpty()) contact = contact.isEmpty() ? phone : contact + " · " + phone;
        if (!contact.isEmpty()) card.addView(text(contact, 13, COLOR_MUTED, false));
        String website = business.optString("website", "");
        if (!website.isEmpty()) card.addView(text(website, 13, themePrimary(), false));

        LinearLayout actions = row();
        if (business.optBoolean("isMine", false)) {
            actions.addView(slimAction("Hồ sơ của tôi", view -> setStatus("Đây là hồ sơ doanh nghiệp của anh."), true));
        } else {
            String ownerPhone = normalizePhone(business.optString("ownerPhone", phone));
            actions.addView(slimAction("Nhắn doanh nghiệp", view -> contactBusiness(business), true));
            if (!ownerPhone.isEmpty() && isFriendPhone(ownerPhone)) {
                actions.addView(slimAction("Mở chat", view -> openChat(ownerPhone), false));
            }
            actions.addView(slimAction("Báo cáo", view -> promptReportContent("business", ownerPhone, ownerPhone, name), false));
        }
        if (!phone.isEmpty()) actions.addView(slimAction("Sao chép SĐT", view -> copyText("Số điện thoại", phone), false));
        card.addView(actions);
        return card;
    }

    private void contactBusiness(JSONObject business) {
        if (business == null) return;
        String ownerPhone = normalizePhone(business.optString("ownerPhone", business.optString("phone", "")));
        if (ownerPhone.isEmpty()) {
            setStatus("Doanh nghiệp chưa có kênh liên hệ.");
            return;
        }
        String name = business.optString("name", "doanh nghiệp");
        String text = "Xin chào " + name + ", tôi muốn được tư vấn về sản phẩm/dịch vụ.";
        setStatus("Đang mở kênh chat với doanh nghiệp...");
        api.contactBusiness(ownerPhone, text, new NexaApi.Callback() {
            @Override
            public void onSuccess(JSONObject data) {
                setStatus("Đã mở kênh chat doanh nghiệp.");
                syncAndReturnToChat(ownerPhone);
            }

            @Override
            public void onError(String message) {
                setStatus(message);
                toast(message);
            }
        });
    }

    private void renderJournals() {
        content.addView(sectionTitle("Nhật ký"));
        LinearLayout composer = card();
        composer.addView(label("ĐĂNG TRẠNG THÁI"));
        EditText textInput = input("Anh đang nghĩ gì?");
        textInput.setSingleLine(false);
        textInput.setMinLines(2);
        textInput.setMaxLines(5);
        composer.addView(textInput);
        LinearLayout postRow = row();
        postRow.addView(rowAction("Bạn bè", view -> createJournal(textInput, "friends", null), true));
        postRow.addView(rowAction("Công khai", view -> createJournal(textInput, "public", null), false));
        postRow.addView(rowAction("Riêng tư", view -> createJournal(textInput, "private", null), false));
        postRow.addView(rowAction("Kèm ảnh", view -> {
            pendingJournalText = textInput.getText().toString().trim();
            pendingJournalPrivacy = "friends";
            if (pendingJournalText.isEmpty()) {
                setStatus("Nhập nội dung nhật ký trước khi chọn ảnh.");
                return;
            }
            pickMedia(REQ_JOURNAL_IMAGE, "image/*");
        }, false));
        composer.addView(postRow);
        content.addView(composer);

        JSONArray posts = posts();
        if (posts.length() == 0) {
            content.addView(infoCard("Chưa có nhật ký", "Các trạng thái của anh và bạn bè sẽ xuất hiện tại đây."));
        } else {
            for (int i = 0; i < posts.length(); i++) {
                JSONObject post = posts.optJSONObject(i);
                if (post != null) content.addView(journalCard(post));
            }
        }
    }

    private LinearLayout journalCard(JSONObject post) {
        LinearLayout card = compactCard();
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER_VERTICAL);

        LinearLayout copy = new LinearLayout(this);
        copy.setOrientation(LinearLayout.VERTICAL);
        copy.addView(text(post.optString("authorName", "XPAY Chat"), 15, COLOR_INK, true));
        copy.addView(text(post.optString("privacy", "friends") + " · " + post.optString("createdAt", ""), 11, COLOR_MUTED, false));
        String body = post.optString("text", "");
        TextView bodyView = text(body.isEmpty() ? "Đã chia sẻ một hình ảnh." : body, 14, COLOR_INK, false);
        bodyView.setLineSpacing(dp(2), 1.0f);
        bodyView.setMaxLines(3);
        copy.addView(bodyView);
        row.addView(copy, new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1));

        JSONObject imageObject = post.optJSONObject("image");
        Bitmap journalBitmap = imageObject == null ? null : bitmapFromDataUri(imageObject.optString("data", ""));
        if (journalBitmap != null) {
            ImageView image = new ImageView(this);
            image.setImageBitmap(journalBitmap);
            image.setScaleType(ImageView.ScaleType.CENTER_CROP);
            image.setBackground(stroked(Color.rgb(248, 250, 252), Color.rgb(226, 232, 240), 14));
            LinearLayout.LayoutParams imageParams = new LinearLayout.LayoutParams(dp(82), dp(82));
            imageParams.setMargins(dp(10), 0, 0, 0);
            row.addView(image, imageParams);
        }
        card.addView(row);
        if (userPhone().equals(post.optString("authorPhone", ""))) {
            card.addView(secondaryAction("Xoá nhật ký", view -> api.deleteJournal(post.optString("id", ""), new BasicCallback("Đã xoá nhật ký.", () -> syncAndShowHome("journals")))));
        } else {
            card.addView(secondaryAction("Báo cáo nhật ký", view -> promptReportContent("journal", post.optString("id", ""), post.optString("authorPhone", ""), post.optString("text", ""))));
        }
        return card;
    }

    private void createJournal(EditText textInput, String privacy, JSONObject image) {
        String text = textInput.getText().toString().trim();
        if (text.isEmpty() && image == null) {
            setStatus("Nhật ký đang trống.");
            return;
        }
        api.createJournal(text, privacy, image, new BasicCallback("Đã đăng nhật ký.", () -> syncAndShowHome("journals")));
    }

    private void renderCalls() {
        content.addView(sectionTitle("Cuộc gọi"));
        content.addView(infoCard("Lịch sử cuộc gọi", "Ưu tiên thống kê gọi đến, gọi đi, gọi nhỡ, máy bận, thời lượng và thời gian cuộc gọi."));
        JSONArray calls = calls();
        content.addView(label("LỊCH SỬ CUỘC GỌI"));
        if (calls.length() == 0) {
            content.addView(infoCard("Chưa có lịch sử cuộc gọi", "Các cuộc gọi đến, gọi đi và trạng thái kết thúc sẽ hiện tại đây."));
        } else {
            for (int i = 0; i < calls.length(); i++) {
                JSONObject call = calls.optJSONObject(i);
                if (call != null) content.addView(callCard(call));
            }
        }
        content.addView(secondaryAction("Làm mới cuộc gọi", view -> syncAndShowHome("calls")));
    }

    private LinearLayout callCard(JSONObject call) {
        LinearLayout card = card();
        JSONObject peer = call.optJSONObject("peer");
        String peerName = displayName(peer, call.optString("peerPhone", ""));
        String mode = "video".equals(call.optString("mode", "")) ? "Video call" : "Gọi thoại";
        card.addView(text(peerName, 17, COLOR_INK, true));
        card.addView(text(
            mode + " · " + callDirectionLabel(call) + " · " + callStatusLabel(call),
            13,
            COLOR_MUTED,
            false
        ));
        card.addView(text("Thời gian: " + callTimeLabel(call) + " · " + callDurationLabel(call), 12, COLOR_MUTED, false));
        LinearLayout actions = row();
        String callId = call.optString("id", "");
        if ("incoming".equals(call.optString("direction", "")) && "ringing".equals(call.optString("status", ""))) {
            actions.addView(slimAction("Nghe máy", view -> acceptIncomingCall(call), true));
            actions.addView(slimAction("Từ chối", view -> respondCall(callId, "reject"), false));
        } else if ("active".equals(call.optString("status", "")) || "ringing".equals(call.optString("status", ""))) {
            actions.addView(slimAction("Mở cuộc gọi", view -> openExistingCall(call), true));
        }
        if ("active".equals(call.optString("status", "")) || "ringing".equals(call.optString("status", ""))) {
            actions.addView(slimAction("Kết thúc", view -> respondCall(callId, "end"), false));
        } else {
            actions.addView(slimAction("Gọi lại", view -> startCall(call.optString("peerPhone", ""), call.optString("mode", "voice")), true));
        }
        actions.addView(slimAction("Chi tiết", view -> showCallDetail(call), false));
        card.addView(actions);
        return card;
    }

    private String callDirectionLabel(JSONObject call) {
        return "outgoing".equals(call.optString("direction", "")) ? "Gọi đi" : "Gọi đến";
    }

    private String callStatusLabel(JSONObject call) {
        String status = call.optString("status", "");
        if ("ringing".equals(status)) return "Đang đổ chuông";
        if ("active".equals(status)) return "Đang gọi";
        if ("ended".equals(status)) return "Đã kết thúc";
        if ("rejected".equals(status)) return "Đã từ chối";
        if ("missed".equals(status)) return "Gọi nhỡ";
        if ("busy".equals(status)) return "Máy bận";
        return status.isEmpty() ? "Chưa rõ" : status;
    }

    private String callTimeLabel(JSONObject call) {
        String value = call.optString("startedAt", "");
        if (value.isEmpty()) value = call.optString("createdAt", "");
        if (value.isEmpty()) value = call.optString("updatedAt", "");
        return value.isEmpty() ? "Chưa có" : formatDateTimeText(value);
    }

    private String callDurationLabel(JSONObject call) {
        long start = parseIsoMillis(call.optString("startedAt", ""));
        long end = parseIsoMillis(call.optString("endedAt", ""));
        if (start <= 0 || end <= 0 || end < start) return "Thời lượng chưa có";
        long seconds = Math.max(1, (end - start) / 1000);
        long minutes = seconds / 60;
        long remain = seconds % 60;
        return minutes > 0 ? minutes + " phút " + remain + " giây" : remain + " giây";
    }

    private void showCallDetail(JSONObject call) {
        JSONObject peer = call.optJSONObject("peer");
        String peerPhone = call.optString("peerPhone", "");
        String mode = "video".equals(call.optString("mode", "")) ? "Video call" : "Gọi thoại";
        String body =
            "Người liên hệ: " + displayName(peer, peerPhone) +
            "\nSố điện thoại: " + peerPhone +
            "\nLoại cuộc gọi: " + mode +
            "\nChiều gọi: " + callDirectionLabel(call) +
            "\nTrạng thái: " + callStatusLabel(call) +
            "\nBắt đầu: " + callTimeLabel(call) +
            "\nKết thúc: " + (call.optString("endedAt", "").isEmpty() ? "Chưa có" : formatDateTimeText(call.optString("endedAt", ""))) +
            "\nThời lượng: " + callDurationLabel(call);
        new AlertDialog.Builder(this)
            .setTitle("Chi tiết cuộc gọi")
            .setMessage(body)
            .setPositiveButton("Gọi lại", (dialog, which) -> startCall(peerPhone, call.optString("mode", "voice")))
            .setNegativeButton("Đóng", null)
            .show();
    }

    private LinearLayout callQuickActions(String phone) {
        LinearLayout actions = row();
        actions.addView(secondaryAction("Gọi thoại", view -> startCall(phone, "voice")));
        actions.addView(secondaryAction("Video call", view -> startCall(phone, "video")));
        return actions;
    }

    private void startCall(String phone, String mode) {
        String cleanPhone = normalizePhone(phone);
        if (cleanPhone.isEmpty()) {
            setStatus("Chưa có số điện thoại để gọi.");
            return;
        }
        JSONObject friend = findFriend(cleanPhone);
        if (friend != null && (friend.optBoolean("blockedByMe", false) || friend.optBoolean("blockedMe", false))) {
            String message = friend.optBoolean("blockedByMe", false)
                ? "Anh đang chặn người này. Hãy bỏ chặn trước khi gọi."
                : "Người này hiện không nhận cuộc gọi.";
            setStatus(message);
            toast(message);
            return;
        }
        ensureCallPermissions(mode, () -> {
            setStatus("Đang tạo cuộc gọi...");
            api.startCall(cleanPhone, mode, new NexaApi.Callback() {
                @Override
                public void onSuccess(JSONObject data) {
                    JSONObject call = data.optJSONObject("call");
                    if (call == null) {
                        setStatus("Máy chủ chưa trả về cuộc gọi.");
                        return;
                    }
                    String status = call.optString("status", "");
                    if ("busy".equals(status) || "missed".equals(status) || "rejected".equals(status) || "ended".equals(status)) {
                        String message = "Cuộc gọi: " + callStatusLabel(call);
                        setStatus(message);
                        toast(message);
                        syncAndShowHome("calls");
                        return;
                    }
                    showNativeCall(call);
                    beginNativeMedia(call, true);
                }

                @Override
                public void onError(String message) {
                    setStatus(message);
                }
            });
        });
    }

    private void respondCall(String id, String action) {
        cancelCallNotification(id);
        if ("accept".equals(action)) {
            JSONObject call = findCallById(id);
            if (call != null) {
                acceptIncomingCall(call);
                return;
            }
        }
        api.respondCall(id, action, new NexaApi.Callback() {
            @Override
            public void onSuccess(JSONObject data) {
                if ("end".equals(action) || "reject".equals(action)) {
                    if (activeCallId.isEmpty()) syncAndShowHome("calls");
                    else closeNativeCall(true);
                } else {
                    syncAndShowHome("calls");
                }
                setStatus("Đã cập nhật cuộc gọi.");
            }

            @Override
            public void onError(String message) {
                setStatus(message);
            }
        });
    }

    private void respondNotificationCall(String id, String action, String mode) {
        cancelCallNotification(id);
        if ("accept".equals(action)) {
            JSONObject call = findCallById(id);
            if (call != null) {
                acceptIncomingCall(call);
                return;
            }
            ensureCallPermissions(mode, () -> {
                setStatus("Đang nhận cuộc gọi...");
                api.respondCall(id, "accept", new NexaApi.Callback() {
                    @Override
                    public void onSuccess(JSONObject data) {
                        JSONObject accepted = data.optJSONObject("call");
                        if (accepted == null) {
                            setStatus("Đã nhận cuộc gọi, đang cập nhật dữ liệu...");
                            syncAndShowHome("calls");
                            return;
                        }
                        showNativeCall(accepted);
                        beginNativeMedia(accepted, false);
                    }

                    @Override
                    public void onError(String message) {
                        clearLockScreenWakeFlags();
                        setStatus(message);
                    }
                });
            });
            return;
        }
        api.respondCall(id, "reject", new NexaApi.Callback() {
            @Override
            public void onSuccess(JSONObject data) {
                clearLockScreenWakeFlags();
                setStatus("Đã từ chối cuộc gọi.");
                syncAndShowHome("calls");
            }

            @Override
            public void onError(String message) {
                clearLockScreenWakeFlags();
                setStatus(message);
            }
        });
    }

    private void acceptIncomingCall(JSONObject call) {
        String callId = call.optString("id", "");
        String mode = call.optString("mode", "voice");
        cancelCallNotification(callId);
        ensureCallPermissions(mode, () -> {
            setStatus("Đang nhận cuộc gọi...");
            api.respondCall(callId, "accept", new NexaApi.Callback() {
                @Override
                public void onSuccess(JSONObject data) {
                    JSONObject accepted = data.optJSONObject("call");
                    if (accepted == null) accepted = call;
                    showNativeCall(accepted);
                    beginNativeMedia(accepted, false);
                }

                @Override
                public void onError(String message) {
                    setStatus(message);
                }
            });
        });
    }

    private void openExistingCall(JSONObject call) {
        String mode = call.optString("mode", "voice");
        ensureCallPermissions(mode, () -> {
            boolean shouldOffer = "outgoing".equals(call.optString("direction", ""));
            showNativeCall(call);
            beginNativeMedia(call, shouldOffer);
        });
    }

    private void showNativeCall(JSONObject call) {
        String returnSection = activeCallId.isEmpty() ? activeSection : sectionBeforeCall;
        String returnFriend = activeCallId.isEmpty() ? activeFriendPhone : friendBeforeCall;
        closeNativeCall(false);
        sectionBeforeCall = returnSection == null || returnSection.isEmpty() ? "messages" : returnSection;
        friendBeforeCall = returnFriend == null ? "" : returnFriend;
        activeCallId = call.optString("id", "");
        activeCallMode = call.optString("mode", "voice");
        activeCallPeerPhone = call.optString("peerPhone", "");
        prepareLockScreenWakeFlags();
        processedCallSignals.clear();
        callEngine = createCallEngine();

        JSONObject peer = call.optJSONObject("peer");
        String peerName = displayName(peer, activeCallPeerPhone);
        String modeLabel = "video".equals(activeCallMode) ? "Video call" : "Gọi thoại";
        String status = call.optString("status", "ringing");
        String direction = call.optString("direction", "");

        LinearLayout layout = baseRoot();
        LinearLayout header = card();
        header.setGravity(Gravity.CENTER_HORIZONTAL);
        header.addView(label(modeLabel.toUpperCase(Locale.ROOT)));
        header.addView(text(peerName, 26, COLOR_INK, true));
        header.addView(text(activeCallPeerPhone, 14, COLOR_MUTED, false));
        callStateView = paragraph(callStatusText(direction, status));
        callStateView.setGravity(Gravity.CENTER);
        header.addView(callStateView);
        layout.addView(header);

        if ("video".equals(activeCallMode)) {
            layout.addView(videoCallPanel());
        } else {
            LinearLayout voiceCard = card();
            voiceCard.setGravity(Gravity.CENTER_HORIZONTAL);
            TextView voiceMark = text("☎", 52, themePrimary(), true);
            voiceMark.setGravity(Gravity.CENTER);
            voiceMark.setBackground(stroked(Color.rgb(236, 253, 245), Color.rgb(187, 247, 208), 80));
            LinearLayout.LayoutParams markParams = new LinearLayout.LayoutParams(dp(112), dp(112));
            markParams.gravity = Gravity.CENTER_HORIZONTAL;
            markParams.setMargins(0, dp(12), 0, dp(12));
            voiceCard.addView(voiceMark, markParams);
            voiceCard.addView(paragraph("Mặc định ưu tiên loa trong. Anh có thể bật loa ngoài hoặc tắt mic khi cần."));
            layout.addView(voiceCard);
        }

        LinearLayout controls = card();
        controls.addView(label("ĐIỀU KHIỂN CUỘC GỌI"));
        LinearLayout toggles = row();
        callMicButton = callControlButton("Mic bật", view -> {
            if (callEngine == null) return;
            callEngine.toggleMic();
            updateCallControlLabels();
        });
        callSpeakerButton = callControlButton("Loa trong", view -> {
            if (callEngine == null) return;
            callEngine.toggleSpeaker();
            updateCallControlLabels();
        });
        toggles.addView(callMicButton);
        toggles.addView(callSpeakerButton);
        if ("video".equals(activeCallMode)) {
            callCameraButton = callControlButton("Camera bật", view -> {
                if (callEngine == null) return;
                callEngine.toggleCamera();
                updateCallControlLabels();
            });
            toggles.addView(callCameraButton);
        }
        if (!("incoming".equals(direction) && "ringing".equals(status))) {
            toggles.addView(callEndButton("Kết thúc", view -> respondCall(activeCallId, "end")));
        }
        controls.addView(toggles);

        if ("incoming".equals(direction) && "ringing".equals(status)) {
            LinearLayout callActions = row();
            callActions.addView(callPrimaryButton("Nghe máy", view -> acceptIncomingCall(call)));
            callActions.addView(callRejectButton("Từ chối", view -> respondCall(activeCallId, "reject")));
            controls.addView(callActions);
        }
        layout.addView(controls);

        statusView = status();
        layout.addView(statusView);
        setContentView(scroll(layout));
        updateOutgoingRingback(direction, status);
        updateCallControlLabels();
    }

    private FrameLayout videoCallPanel() {
        FrameLayout frame = new FrameLayout(this);
        frame.setBackgroundColor(Color.rgb(2, 6, 23));
        LinearLayout.LayoutParams frameParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            dp(360)
        );
        frameParams.setMargins(0, dp(8), 0, dp(8));
        frame.setLayoutParams(frameParams);

        remoteCallVideo = new SurfaceViewRenderer(this);
        remoteCallVideo.init(callEngine.eglContext(), null);
        remoteCallVideo.setScalingType(RendererCommon.ScalingType.SCALE_ASPECT_FILL);
        remoteCallVideo.setEnableHardwareScaler(true);
        frame.addView(remoteCallVideo, new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ));

        localCallVideo = new SurfaceViewRenderer(this);
        localCallVideo.init(callEngine.eglContext(), null);
        localCallVideo.setScalingType(RendererCommon.ScalingType.SCALE_ASPECT_FILL);
        localCallVideo.setMirror(true);
        localCallVideo.setEnableHardwareScaler(true);
        FrameLayout.LayoutParams localParams = new FrameLayout.LayoutParams(dp(112), dp(148));
        localParams.gravity = Gravity.BOTTOM | Gravity.RIGHT;
        localParams.setMargins(0, 0, dp(12), dp(12));
        frame.addView(localCallVideo, localParams);
        callEngine.setRenderers(localCallVideo, remoteCallVideo);
        return frame;
    }

    private NexaCallEngine createCallEngine() {
        return new NexaCallEngine(this, new NexaCallEngine.Listener() {
            @Override
            public void onSignal(String type, JSONObject payload) {
                if (activeCallId.isEmpty()) return;
                api.sendCallSignal(activeCallId, type, payload, new SilentCallCallback());
            }

            @Override
            public void onState(String state) {
                updateCallState(state);
            }

            @Override
            public void onError(String message) {
                updateCallState(message);
                setStatus(message);
            }
        });
    }

    private void beginNativeMedia(JSONObject call, boolean createOffer) {
        if (callEngine == null) return;
        updateCallState(createOffer ? "Đang chuẩn bị cuộc gọi..." : "Đang nhận tín hiệu cuộc gọi...");
        api.rtcConfig(new NexaApi.Callback() {
            @Override
            public void onSuccess(JSONObject data) {
                try {
                    callEngine.start(activeCallMode, data.optJSONArray("iceServers"), createOffer);
                    processCallSignals(call);
                    startCallPolling();
                } catch (Exception error) {
                    String message = error.getMessage() == null ? "Không mở được cuộc gọi." : error.getMessage();
                    updateCallState(message);
                    setStatus(message);
                }
            }

            @Override
            public void onError(String message) {
                updateCallState("Không lấy được cấu hình cuộc gọi.");
                setStatus(message);
            }
        });
    }

    private void processCallSignals(JSONObject call) {
        if (callEngine == null || call == null) return;
        JSONArray signals = call.optJSONArray("signals");
        for (int i = 0; signals != null && i < signals.length(); i++) {
            JSONObject signal = signals.optJSONObject(i);
            if (signal == null) continue;
            String id = signal.optString("id", signal.optString("type", "") + signal.optString("createdAt", "") + i);
            if (processedCallSignals.add(id)) callEngine.processSignal(signal);
        }
    }

    private void updateOutgoingRingback(String direction, String status) {
        if ("outgoing".equals(direction) && "ringing".equals(status)) {
            startOutgoingRingback();
        } else {
            stopOutgoingRingback();
        }
    }

    private void startOutgoingRingback() {
        if (ringbackPlaying) return;
        ringbackPlaying = true;
        ringbackHandler.removeCallbacksAndMessages(null);
        ringbackHandler.post(ringbackRunnable);
    }

    private void stopOutgoingRingback() {
        ringbackPlaying = false;
        ringbackHandler.removeCallbacksAndMessages(null);
        if (ringbackTone != null) {
            try {
                ringbackTone.stopTone();
                ringbackTone.release();
            } catch (Exception ignored) {
            }
            ringbackTone = null;
        }
    }

    private void startCallPolling() {
        callPolling = true;
        callHandler.removeCallbacksAndMessages(null);
        scheduleCallPoll();
    }

    private void scheduleCallPoll() {
        if (callPolling && !activeCallId.isEmpty()) callHandler.postDelayed(this::pollActiveCall, CALL_POLL_DELAY_MS);
    }

    private void pollActiveCall() {
        if (!callPolling || activeCallId.isEmpty()) return;
        api.sync(new NexaApi.Callback() {
            @Override
            public void onSuccess(JSONObject data) {
                lastSync = data;
                applyAiHistoryReset();
                JSONObject call = findCallById(activeCallId);
                if (call == null) {
                    updateCallState("Cuộc gọi không còn hoạt động.");
                    closeNativeCall(true);
                    return;
                }
                String status = call.optString("status", "");
                updateCallState(callStatusText(call.optString("direction", ""), status));
                updateOutgoingRingback(call.optString("direction", ""), status);
                if ("ended".equals(status) || "rejected".equals(status) || "missed".equals(status)) {
                    closeNativeCall(true);
                    return;
                }
                processCallSignals(call);
                scheduleCallPoll();
            }

            @Override
            public void onError(String message) {
                updateCallState("Đường truyền đang yếu, đang thử lại...");
                scheduleCallPoll();
            }
        });
    }

    private void closeNativeCall(boolean returnHome) {
        callPolling = false;
        callHandler.removeCallbacksAndMessages(null);
        stopOutgoingRingback();
        cancelCallNotification(activeCallId);
        if (callEngine != null) {
            callEngine.release();
            callEngine = null;
        }
        releaseRenderer(localCallVideo);
        releaseRenderer(remoteCallVideo);
        localCallVideo = null;
        remoteCallVideo = null;
        activeCallId = "";
        activeCallPeerPhone = "";
        processedCallSignals.clear();
        clearLockScreenWakeFlags();
        if (returnHome && store != null && !store.token().isEmpty()) {
            returnToScreenBeforeCall();
        } else if (!returnHome) {
            sectionBeforeCall = "";
            friendBeforeCall = "";
        }
    }

    private void returnToScreenBeforeCall() {
        String returnSection = sectionBeforeCall == null || sectionBeforeCall.isEmpty() ? "messages" : sectionBeforeCall;
        String returnFriend = friendBeforeCall == null ? "" : friendBeforeCall;
        sectionBeforeCall = "";
        friendBeforeCall = "";
        activeSection = returnSection;
        activeFriendPhone = returnFriend;
        if (!returnFriend.isEmpty() && "messages".equals(returnSection)) {
            showConversationScreen();
        } else {
            activeFriendPhone = "";
            showHome();
        }
    }

    private void releaseRenderer(SurfaceViewRenderer renderer) {
        if (renderer == null) return;
        try {
            renderer.release();
        } catch (Exception ignored) {
        }
    }

    private void ensureCallPermissions(String mode, Runnable action) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
            action.run();
            return;
        }
        ArrayList<String> permissions = new ArrayList<>();
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            permissions.add(Manifest.permission.RECORD_AUDIO);
        }
        if ("video".equals(mode) && checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            permissions.add(Manifest.permission.CAMERA);
        }
        if (permissions.isEmpty()) {
            action.run();
            return;
        }
        pendingPermissionAction = action;
        requestPermissions(permissions.toArray(new String[0]), REQ_CALL_PERMISSIONS);
    }

    private void updateCallState(String state) {
        if (callStateView != null) callStateView.setText(state);
    }

    private void updateCallControlLabels() {
        if (callEngine == null) return;
        if (callMicButton != null) {
            callMicButton.setText(callEngine.isMicEnabled() ? "Mic bật" : "Mic tắt");
            styleCallToggle(callMicButton, callEngine.isMicEnabled());
        }
        if (callSpeakerButton != null) {
            callSpeakerButton.setText(callEngine.isSpeakerEnabled() ? "Loa ngoài" : "Loa trong");
            styleCallToggle(callSpeakerButton, callEngine.isSpeakerEnabled());
        }
        if (callCameraButton != null) {
            callCameraButton.setText(callEngine.isCameraEnabled() ? "Camera bật" : "Camera tắt");
            styleCallToggle(callCameraButton, callEngine.isCameraEnabled());
        }
    }

    private void styleCallToggle(Button button, boolean active) {
        button.setTextColor(active ? Color.WHITE : COLOR_INK);
        button.setBackground(active
            ? gradient(new int[] { themePrimary(), themeSecondary() }, 16)
            : stroked(Color.rgb(248, 250, 252), Color.rgb(203, 213, 225), 16));
    }

    private String callStatusText(String direction, String status) {
        if ("ringing".equals(status)) return "incoming".equals(direction) ? "Có cuộc gọi đến" : "Đang đổ chuông...";
        if ("active".equals(status)) return "Đang trong cuộc gọi";
        if ("rejected".equals(status)) return "Cuộc gọi đã bị từ chối";
        if ("ended".equals(status)) return "Cuộc gọi đã kết thúc";
        if ("missed".equals(status)) return "Cuộc gọi nhỡ";
        if ("busy".equals(status)) return "Máy bận";
        return status == null || status.isEmpty() ? "Đang chuẩn bị cuộc gọi" : status;
    }

    private LinearLayout aiHeroCard() {
        LinearLayout hero = card();
        hero.setBackground(gradient(new int[] { Color.rgb(6, 78, 102), Color.rgb(13, 148, 136), Color.rgb(37, 99, 235) }, 22));
        hero.addView(text("XPAY Twin AI", 24, Color.WHITE, true));
        TextView heroCopy = text("Trợ lý cá nhân biết gợi ý trả lời, ghi nhớ quy tắc riêng và hỗ trợ công việc hằng ngày.", 14, Color.rgb(224, 242, 254), false);
        heroCopy.setLineSpacing(dp(2), 1.0f);
        heroCopy.setPadding(0, dp(6), 0, dp(10));
        hero.addView(heroCopy);
        LinearLayout chips = row();
        chips.addView(chip("Lịch hẹn"));
        chips.addView(chip("Gợi ý trả lời"));
        chips.addView(chip("Tâm sự"));
        hero.addView(chips);
        return hero;
    }

    private LinearLayout aiComposer(LinearLayout historyList) {
        LinearLayout composer = composerCard();
        composer.setPadding(dp(8), dp(7), dp(8), dp(8));
        LinearLayout promptRow = row();
        promptRow.setGravity(Gravity.CENTER_VERTICAL);
        EditText promptInput = chatMessageInput("Nhắn với XPAY AI");
        promptInput.setMinLines(1);
        promptInput.setMaxLines(3);
        promptInput.setImeOptions(EditorInfo.IME_ACTION_SEND);
        promptInput.setOnEditorActionListener((view, actionId, event) -> {
            if (actionId == EditorInfo.IME_ACTION_SEND) {
                sendAiPrompt(promptInput, historyList);
                return true;
            }
            return false;
        });
        promptInput.setOnFocusChangeListener((view, hasFocus) -> {
            if (hasFocus) scrollAiComposerIntoView();
        });
        promptInput.setOnClickListener(view -> scrollAiComposerIntoView());
        LinearLayout.LayoutParams promptParams = new LinearLayout.LayoutParams(0, dp(48), 1);
        promptParams.setMargins(0, 0, dp(8), 0);
        promptInput.setLayoutParams(promptParams);
        promptRow.addView(promptInput);
        Button aiSend = sendButton(view -> sendAiPrompt(promptInput, historyList));
        LinearLayout.LayoutParams sendParams = new LinearLayout.LayoutParams(dp(68), dp(48));
        sendParams.setMargins(0, 0, 0, 0);
        aiSend.setLayoutParams(sendParams);
        promptRow.addView(aiSend);
        composer.addView(promptRow);
        return composer;
    }

    private LinearLayout aiRulesCard() {
        LinearLayout rulesCard = card();
        rulesCard.addView(label("QUY TẮC RIÊNG"));
        rulesCard.addView(paragraph("Đặt nguyên tắc để XPAY AI trả lời đúng phong cách và giới hạn mong muốn."));
        EditText rulesInput = input("Quy tắc riêng cho XPAY AI");
        rulesInput.setSingleLine(false);
        rulesInput.setMinLines(2);
        rulesInput.setMaxLines(5);
        rulesInput.setText(aiRules().optString("customRules", ""));
        rulesCard.addView(rulesInput);
        LinearLayout rules = row();
        rules.addView(rowAction("Lưu quy tắc", view -> updateAiCustomRules(rulesInput.getText().toString(), "settings".equals(activeSection) ? "settings" : "ai"), true));
        rules.addView(rowAction("Xoá lịch sử", view -> {
            saveAiHistory(new JSONArray());
            syncAndShowHome("ai");
            setStatus("Đã xoá lịch sử chat XPAY AI trên thiết bị này.");
        }, false));
        rulesCard.addView(rules);
        return rulesCard;
    }

    private void renderAi() {
        content.addView(sectionTitle("XPAY AI"));
        content.addView(aiHeroCard());

        LinearLayout chatCard = card();
        chatCard.addView(label("TRÒ CHUYỆN VỚI XPAY AI"));
        LinearLayout historyList = new LinearLayout(this);
        historyList.setOrientation(LinearLayout.VERTICAL);
        historyList.setPadding(0, dp(4), 0, dp(6));
        fillAiHistory(historyList);
        chatCard.addView(historyList);
        LinearLayout promptRow = row();
        promptRow.setGravity(Gravity.CENTER_VERTICAL);
        EditText promptInput = chatMessageInput("Nhắn với XPAY AI");
        promptInput.setMinLines(1);
        promptInput.setMaxLines(3);
        promptInput.setImeOptions(EditorInfo.IME_ACTION_SEND);
        promptInput.setOnEditorActionListener((view, actionId, event) -> {
            if (actionId == EditorInfo.IME_ACTION_SEND) {
                sendAiPrompt(promptInput, historyList);
                return true;
            }
            return false;
        });
        promptInput.setOnFocusChangeListener((view, hasFocus) -> {
            if (hasFocus) scrollAiComposerIntoView();
        });
        promptInput.setOnClickListener(view -> scrollAiComposerIntoView());
        LinearLayout.LayoutParams promptParams = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1);
        promptParams.setMargins(0, dp(6), dp(8), dp(6));
        promptInput.setLayoutParams(promptParams);
        promptRow.addView(promptInput);
        Button aiSend = sendButton(view -> sendAiPrompt(promptInput, historyList));
        LinearLayout.LayoutParams aiSendParams = new LinearLayout.LayoutParams(dp(66), dp(48));
        aiSendParams.setMargins(0, dp(6), 0, dp(6));
        aiSend.setLayoutParams(aiSendParams);
        promptRow.addView(aiSend);
        chatCard.addView(promptRow);
        chatCard.addView(secondaryAction("Xoá lịch sử XPAY AI", view -> {
            saveAiHistory(new JSONArray());
            fillAiHistory(historyList);
            setStatus("Đã xoá lịch sử chat XPAY AI trên thiết bị này.");
        }));
        content.addView(chatCard);

        content.addView(aiRulesCard());
    }

    private void updateAiRules(boolean autoReply, boolean allowContext) {
        JSONObject rules = new JSONObject();
        try {
            rules.put("allowAutoReply", autoReply);
            rules.put("allowContext", allowContext);
            rules.put("allowLiveInfo", true);
            rules.put("customRules", aiRules().optString("customRules", ""));
        } catch (Exception ignored) {
        }
        api.updateAiRules(rules, new BasicCallback("Đã cập nhật quy tắc XPAY AI.", () -> syncAndShowHome("ai")));
    }

    private void sendAiPrompt(EditText promptInput, LinearLayout historyList) {
        String prompt = promptInput.getText().toString().trim();
        if (prompt.isEmpty()) {
            toast("Anh nhập nội dung để XPAY AI trả lời nhé.");
            return;
        }
        hideKeyboard(promptInput);
        promptInput.clearFocus();
        promptInput.setText("");
        JSONArray assistantHistory = aiAssistantRequestHistory();
        appendAiHistory("user", prompt);
        appendAiHistory("assistant", "XPAY AI đang trả lời...");
        fillAiHistory(historyList);
        scrollAiComposerIntoView();
        api.askAi(prompt, assistantHistory, new NexaApi.Callback() {
            @Override
            public void onSuccess(JSONObject data) {
                replaceLastAiAssistant(data.optString("answer", "XPAY AI chưa có phản hồi."));
                fillAiHistory(historyList);
                scrollAiComposerIntoView();
            }

            @Override
            public void onError(String message) {
                replaceLastAiAssistant(message);
                fillAiHistory(historyList);
                scrollAiComposerIntoView();
                toast(message);
            }
        });
    }

    private void scrollAiComposerIntoView() {
        if (appScroll == null) return;
        appScroll.postDelayed(() -> appScroll.fullScroll(View.FOCUS_DOWN), 120);
        appScroll.postDelayed(() -> appScroll.fullScroll(View.FOCUS_DOWN), 320);
    }

    private void fillAiHistory(LinearLayout list) {
        if (list == null) return;
        list.removeAllViews();
        JSONArray history = aiHistory();
        if (history.length() == 0) {
            TextView empty = text("XPAY AI sẵn sàng hỗ trợ công việc, lịch hẹn, đời sống và gợi ý trả lời.", 14, COLOR_MUTED, false);
            empty.setPadding(dp(10), dp(8), dp(10), dp(8));
            empty.setBackground(stroked(Color.rgb(240, 253, 250), Color.rgb(153, 246, 228), 14));
            list.addView(empty);
            return;
        }
        for (int i = 0; i < history.length(); i++) {
            JSONObject item = history.optJSONObject(i);
            if (item == null) continue;
            list.addView(aiMessageRow(item.optString("role", "assistant"), item.optString("text", ""), i, list));
        }
    }

    private LinearLayout aiMessageRow(String role, String value, int index, LinearLayout historyList) {
        LinearLayout wrapper = new LinearLayout(this);
        wrapper.setOrientation(LinearLayout.VERTICAL);
        boolean mine = "user".equals(role);
        View bubble;
        if (mine) {
            TextView textBubble = text(value == null || value.isEmpty() ? "..." : value, 14, Color.WHITE, false);
            textBubble.setLineSpacing(dp(2), 1.0f);
            textBubble.setMaxWidth(dp(292));
            textBubble.setPadding(dp(12), dp(8), dp(12), dp(8));
            textBubble.setBackground(rounded(themePrimary(), 18));
            bubble = textBubble;
        } else {
            bubble = aiAssistantBubble(value == null || value.isEmpty() ? "..." : value);
        }
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        params.gravity = mine ? Gravity.END : Gravity.START;
        params.setMargins(0, dp(2), 0, dp(4));
        wrapper.addView(bubble, params);
        View.OnLongClickListener actionListener = view -> {
            showAiMessageActions(index, value, historyList);
            return true;
        };
        wrapper.setOnLongClickListener(actionListener);
        bubble.setOnLongClickListener(actionListener);
        return wrapper;
    }

    private LinearLayout aiAssistantBubble(String value) {
        LinearLayout bubble = new LinearLayout(this);
        bubble.setOrientation(LinearLayout.VERTICAL);
        bubble.setPadding(dp(12), dp(8), dp(12), dp(8));
        bubble.setBackground(rounded(Color.rgb(240, 253, 250), 18));
        String[] lines = repairAiSingleLineMarkdownTable(value).split("\\r?\\n");
        ArrayList<String> paragraph = new ArrayList<>();
        for (int i = 0; i < lines.length; i++) {
            String line = lines[i] == null ? "" : lines[i];
            if (isMarkdownTableStart(lines, i)) {
                flushAiParagraph(bubble, paragraph);
                ArrayList<String> tableLines = new ArrayList<>();
                while (i < lines.length && lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|")) {
                    tableLines.add(lines[i]);
                    i++;
                }
                i--;
                bubble.addView(aiMarkdownTable(tableLines));
            } else if (line.trim().toLowerCase(Locale.ROOT).startsWith("minh hoạ nhanh:")) {
                flushAiParagraph(bubble, paragraph);
                ArrayList<String> items = new ArrayList<>();
                i++;
                while (i < lines.length && !lines[i].trim().isEmpty()) {
                    items.add(lines[i].replaceFirst("^\\s*[-*]\\s*", "").trim());
                    i++;
                }
                i--;
                bubble.addView(aiVisualBlock(items));
            } else if (line.trim().isEmpty()) {
                flushAiParagraph(bubble, paragraph);
            } else {
                paragraph.add(line);
            }
        }
        flushAiParagraph(bubble, paragraph);
        if (bubble.getChildCount() == 0) bubble.addView(aiParagraph(value));
        return bubble;
    }

    private void flushAiParagraph(LinearLayout parent, ArrayList<String> paragraph) {
        if (paragraph.isEmpty()) return;
        parent.addView(aiParagraph(String.join(" ", paragraph)));
        paragraph.clear();
    }

    private TextView aiParagraph(String value) {
        TextView view = text(cleanInlineMarkdown(value), 14, COLOR_INK, false);
        view.setLineSpacing(dp(2), 1.0f);
        view.setMaxWidth(dp(292));
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        params.setMargins(0, dp(2), 0, dp(5));
        view.setLayoutParams(params);
        return view;
    }

    private HorizontalScrollView aiMarkdownTable(ArrayList<String> lines) {
        HorizontalScrollView scroll = new HorizontalScrollView(this);
        scroll.setHorizontalScrollBarEnabled(false);
        scroll.setFillViewport(false);
        TableLayout table = new TableLayout(this);
        table.setShrinkAllColumns(false);
        table.setStretchAllColumns(false);
        for (int i = 0; i < lines.size(); i++) {
            if (i == 1) continue;
            String[] cells = markdownCells(lines.get(i));
            TableRow row = new TableRow(this);
            row.setBackgroundColor(i == 0 ? Color.rgb(224, 242, 241) : Color.TRANSPARENT);
            for (String cell : cells) {
                TextView cellView = text(cleanInlineMarkdown(cell), 12, COLOR_INK, i == 0);
                cellView.setPadding(dp(8), dp(6), dp(8), dp(6));
                cellView.setMinWidth(dp(82));
                cellView.setBackground(stroked(Color.TRANSPARENT, Color.rgb(204, 251, 241), 4));
                row.addView(cellView);
            }
            table.addView(row);
        }
        scroll.addView(table);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(dp(292), LinearLayout.LayoutParams.WRAP_CONTENT);
        params.setMargins(0, dp(4), 0, dp(7));
        scroll.setLayoutParams(params);
        return scroll;
    }

    private LinearLayout aiVisualBlock(ArrayList<String> items) {
        LinearLayout block = new LinearLayout(this);
        block.setOrientation(LinearLayout.VERTICAL);
        block.setPadding(0, dp(2), 0, dp(4));
        int count = Math.min(4, items.size());
        for (int i = 0; i < count; i++) {
            String item = cleanInlineMarkdown(items.get(i));
            if (item.trim().isEmpty()) continue;
            TextView card = text(item, 12, Color.rgb(15, 118, 110), true);
            card.setPadding(dp(9), dp(7), dp(9), dp(7));
            card.setBackground(stroked(Color.rgb(236, 253, 245), Color.rgb(153, 246, 228), 8));
            LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(dp(292), LinearLayout.LayoutParams.WRAP_CONTENT);
            params.setMargins(0, dp(3), 0, dp(3));
            block.addView(card, params);
        }
        return block;
    }

    private boolean isMarkdownTableStart(String[] lines, int index) {
        if (index + 1 >= lines.length) return false;
        String current = lines[index].trim();
        String next = lines[index + 1].trim();
        return current.startsWith("|") && current.endsWith("|") && next.matches("^\\|?\\s*:?-{3,}:?\\s*(\\|\\s*:?-{3,}:?\\s*)+\\|?$");
    }

    private String[] markdownCells(String line) {
        String clean = line == null ? "" : line.trim();
        if (clean.startsWith("|")) clean = clean.substring(1);
        if (clean.endsWith("|")) clean = clean.substring(0, clean.length() - 1);
        String[] raw = clean.split("\\|");
        for (int i = 0; i < raw.length; i++) raw[i] = raw[i].trim();
        return raw;
    }

    private String repairAiSingleLineMarkdownTable(String value) {
        if (value == null || !value.contains("|") || value.matches("(?s).*\\n\\s*\\|.*")) return value == null ? "" : value;
        String[] rawCells = value.split("\\|");
        ArrayList<String> cells = new ArrayList<>();
        for (String raw : rawCells) {
            String cell = raw.trim();
            if (!cell.isEmpty()) cells.add(cell);
        }
        int dashStart = -1;
        for (int i = 1; i < cells.size(); i++) {
            if (cells.get(i).matches("^:?-{3,}:?$")) {
                dashStart = i;
                break;
            }
        }
        if (dashStart < 1) return value;
        int columnCount = 0;
        while (dashStart + columnCount < cells.size() && cells.get(dashStart + columnCount).matches("^:?-{3,}:?$")) {
            columnCount++;
        }
        if (columnCount < 2) return value;
        int headerStart = dashStart - columnCount;
        if (headerStart < 0) return value;
        ArrayList<String> parts = new ArrayList<>();
        if (headerStart > 0) parts.add(String.join(" | ", cells.subList(0, headerStart)));
        ArrayList<String> table = new ArrayList<>();
        table.add("| " + String.join(" | ", cells.subList(headerStart, dashStart)) + " |");
        table.add("| " + String.join(" | ", java.util.Collections.nCopies(columnCount, "---")) + " |");
        int cursor = dashStart + columnCount;
        while (cursor + columnCount <= cells.size()) {
            java.util.List<String> row = cells.subList(cursor, cursor + columnCount);
            if (String.join(" ", row).length() > 420) break;
            table.add("| " + String.join(" | ", row) + " |");
            cursor += columnCount;
        }
        parts.add(String.join("\n", table));
        if (cursor < cells.size()) parts.add(String.join(" | ", cells.subList(cursor, cells.size())));
        return String.join("\n\n", parts);
    }

    private String cleanInlineMarkdown(String value) {
        return (value == null ? "" : value)
            .replace("**", "")
            .replace("`", "")
            .replace("###", "")
            .replace("---", "")
            .trim();
    }

    private void showAiMessageActions(int index, String value, LinearLayout historyList) {
        String textValue = value == null ? "" : value;
        new AlertDialog.Builder(this)
            .setTitle("Tin nhắn XPAY AI")
            .setItems(new CharSequence[] { "Sao chép", "Báo cáo phản hồi AI", "Xoá tin này" }, (dialog, which) -> {
                if (which == 0) {
                    copyText("Tin nhắn XPAY AI", textValue);
                    return;
                }
                if (which == 1) {
                    promptReportContent("ai_output", "ai-" + index, "", textValue);
                    return;
                }
                deleteAiHistoryMessage(index, historyList);
            })
            .setNegativeButton("Đóng", null)
            .show();
    }

    private void deleteAiHistoryMessage(int index, LinearLayout historyList) {
        JSONArray history = aiHistory();
        if (index < 0 || index >= history.length()) return;
        history.remove(index);
        saveAiHistory(history);
        fillAiHistory(historyList);
        setStatus("Đã xoá tin nhắn XPAY AI khỏi thiết bị này.");
    }

    private JSONArray aiHistory() {
        String key = "ai_history_" + userPhone();
        String raw = getSharedPreferences(PREF_UI, MODE_PRIVATE).getString(key, "[]");
        try {
            return new JSONArray(raw);
        } catch (Exception ignored) {
            return new JSONArray();
        }
    }

    private void saveAiHistory(JSONArray history) {
        String key = "ai_history_" + userPhone();
        getSharedPreferences(PREF_UI, MODE_PRIVATE).edit().putString(key, history == null ? "[]" : history.toString()).apply();
    }

    private void applyAiHistoryReset() {
        JSONObject ai = lastSync == null ? null : lastSync.optJSONObject("ai");
        String resetAt = ai == null ? "" : ai.optString("historyResetAt", "").trim();
        String phone = userPhone();
        if (resetAt.isEmpty() || phone.isEmpty()) return;
        String resetKey = "ai_history_reset_" + phone;
        if (resetAt.equals(getSharedPreferences(PREF_UI, MODE_PRIVATE).getString(resetKey, ""))) return;
        getSharedPreferences(PREF_UI, MODE_PRIVATE)
            .edit()
            .remove("ai_history_" + phone)
            .putString(resetKey, resetAt)
            .apply();
    }

    private void appendAiHistory(String role, String value) {
        JSONArray history = aiHistory();
        JSONObject item = new JSONObject();
        try {
            item.put("role", role);
            item.put("text", value == null ? "" : value);
            item.put("time", System.currentTimeMillis());
            history.put(item);
        } catch (Exception ignored) {
        }
        saveAiHistory(trimAiHistory(history));
    }

    private JSONArray aiAssistantRequestHistory() {
        JSONArray source = aiHistory();
        JSONArray compact = new JSONArray();
        int start = Math.max(0, source.length() - 12);
        for (int i = start; i < source.length(); i++) {
            JSONObject item = source.optJSONObject(i);
            if (item == null) continue;
            String role = item.optString("role", "").trim();
            if (!"user".equals(role) && !"assistant".equals(role)) continue;
            String textValue = item.optString("text", "").trim();
            if (textValue.isEmpty() || "XPAY AI đang trả lời...".equals(textValue)) continue;
            JSONObject entry = new JSONObject();
            try {
                entry.put("role", role);
                entry.put("content", textValue);
                compact.put(entry);
            } catch (Exception ignored) {
            }
        }
        return compact;
    }

    private void replaceLastAiAssistant(String value) {
        JSONArray history = aiHistory();
        for (int i = history.length() - 1; i >= 0; i--) {
            JSONObject item = history.optJSONObject(i);
            if (item != null && "assistant".equals(item.optString("role", ""))) {
                try {
                    item.put("text", value == null ? "" : value);
                } catch (Exception ignored) {
                }
                break;
            }
        }
        saveAiHistory(trimAiHistory(history));
    }

    private JSONArray trimAiHistory(JSONArray history) {
        JSONArray trimmed = new JSONArray();
        int start = Math.max(0, history.length() - 80);
        for (int i = start; i < history.length(); i++) {
            JSONObject item = history.optJSONObject(i);
            if (item != null) trimmed.put(item);
        }
        return trimmed;
    }

    private void updateAiCustomRules(String customRules) {
        updateAiCustomRules(customRules, "ai");
    }

    private void updateAiCustomRules(String customRules, String returnSection) {
        JSONObject rules = aiRules();
        try {
            rules.put("customRules", customRules == null ? "" : customRules.trim());
            rules.put("allowLiveInfo", true);
        } catch (Exception ignored) {
        }
        api.updateAiRules(rules, new BasicCallback("Đã lưu quy tắc XPAY AI.", () -> syncAndShowHome(returnSection == null ? "ai" : returnSection)));
    }

    private void renderProfile() {
        content.addView(sectionTitle("Cá nhân"));
        JSONObject user = user();
        LinearLayout card = card();
        card.addView(label("HỒ SƠ NGƯỜI DÙNG"));
        EditText fullNameInput = input("Họ và tên");
        fullNameInput.setText(user.optString("fullName", user.optString("name", "")));
        EditText birthInput = input("Ngày tháng năm sinh");
        birthInput.setText(user.optString("birthDate", ""));
        birthInput.setFocusable(false);
        birthInput.setOnClickListener(view -> showBirthPicker(birthInput));
        EditText interestsInput = input("Sở thích");
        interestsInput.setText(user.optString("interests", ""));
        card.addView(fullNameInput);
        card.addView(birthInput);
        card.addView(interestsInput);
        card.addView(text("Email: " + user.optString("email", "Chưa có email"), 14, COLOR_MUTED, false));
        TextView profileFeedback = text("Các thay đổi sẽ hiện thông báo ngay khi bấm lưu.", 13, themePrimary(), true);
        profileFeedback.setPadding(dp(10), dp(7), dp(10), dp(7));
        profileFeedback.setBackground(stroked(Color.rgb(240, 253, 250), Color.rgb(153, 246, 228), 14));
        card.addView(profileFeedback);
        LinearLayout profileActions = row();
        profileActions.addView(rowAction("Lưu", view -> {
            profileFeedback.setText("Đang lưu thông tin cá nhân...");
            toast("Đang lưu thông tin cá nhân...");
            JSONObject profile = editableProfile();
            try {
                profile.put("fullName", fullNameInput.getText().toString().trim());
                profile.put("name", fullNameInput.getText().toString().trim());
                profile.put("birthDate", birthInput.getText().toString().trim());
                profile.put("interests", interestsInput.getText().toString().trim());
            } catch (Exception ignored) {
            }
            api.updateProfile(profile, new BasicCallback("Đã lưu hồ sơ.", () -> syncAndShowHome("profile")));
        }, true));
        profileActions.addView(rowAction("Avatar", view -> {
            profileFeedback.setText("Đang mở thư viện ảnh để đổi avatar...");
            toast("Chọn ảnh mới cho avatar.");
            pickMedia(REQ_AVATAR_IMAGE, "image/*");
        }, false));
        profileActions.addView(rowAction("Ẩn", view -> {
            profileFeedback.setText("Đang ẩn thông tin cá nhân...");
            updatePrivacy(false);
        }, false));
        profileActions.addView(rowAction("Hiển thị", view -> {
            profileFeedback.setText("Đang hiển thị thông tin cá nhân...");
            updatePrivacy(true);
        }, false));
        card.addView(profileActions);
        content.addView(card);
    }

    private void showBirthPicker(EditText birthInput) {
        Calendar calendar = Calendar.getInstance();
        calendar.set(1990, Calendar.JANUARY, 1);
        String current = birthInput.getText().toString().trim();
        try {
            String[] parts = current.split("-");
            if (parts.length == 3) {
                calendar.set(Integer.parseInt(parts[0]), Integer.parseInt(parts[1]) - 1, Integer.parseInt(parts[2]));
            }
        } catch (Exception ignored) {
        }
        new DatePickerDialog(
            this,
            (view, year, month, dayOfMonth) -> birthInput.setText(String.format(Locale.ROOT, "%04d-%02d-%02d", year, month + 1, dayOfMonth)),
            calendar.get(Calendar.YEAR),
            calendar.get(Calendar.MONTH),
            calendar.get(Calendar.DAY_OF_MONTH)
        ).show();
    }

    private void updatePrivacy(boolean visible) {
        JSONObject profile = editableProfile();
        JSONObject privacy = new JSONObject();
        try {
            privacy.put("phone", visible);
            privacy.put("birthDate", visible);
            privacy.put("interests", visible);
            privacy.put("avatar", visible);
            profile.put("privacy", privacy);
        } catch (Exception ignored) {
        }
        api.updateProfile(profile, new BasicCallback("Đã cập nhật quyền riêng tư.", () -> syncAndShowHome("profile")));
    }

    private LinearLayout settingsCard(String title, String description) {
        LinearLayout card = card();
        card.addView(text(title, 17, COLOR_INK, true));
        card.addView(paragraph(description));
        return card;
    }

    private Button localSettingToggle(String text, String key, boolean fallback) {
        boolean active = uiSetting(key, fallback);
        return toggleAction(text, active, view -> setUiSettingAndRefresh(
            key,
            !active,
            (!active ? "Đã bật " : "Đã tắt ") + text.toLowerCase(Locale.ROOT) + "."
        ));
    }

    private void updateAiAutoReplyFromSettings(boolean enabled) {
        setUiSetting("setting_ai_auto_reply_simple", enabled);
        JSONObject rules = new JSONObject();
        try {
            JSONObject current = aiRules();
            rules.put("allowAutoReply", enabled);
            rules.put("allowContext", true);
            rules.put("allowLiveInfo", true);
            rules.put("customRules", current.optString("customRules", ""));
        } catch (Exception ignored) {
        }
        api.updateAiRules(rules, new BasicCallback(
            enabled ? "Đã bật XPAY AI tự trả lời chào hỏi." : "Đã tắt XPAY AI tự trả lời.",
            () -> syncAndShowHome("settings")
        ));
    }

    private void renderSettings() {
        content.addView(sectionTitle("Cài đặt"));
        LinearLayout statusCard = settingsCard("Trạng thái hoạt động", "Khi chọn offline, người khác sẽ không thấy khoảng cách và trạng thái online của anh.");
        boolean onlineActive = !"offline".equals(user().optString("presenceMode", "online"));
        LinearLayout presence = row();
        presence.addView(toggleAction("Online", onlineActive, view -> api.updatePresence("online", new BasicCallback("Đã chuyển online.", () -> syncAndShowHome("settings")))));
        presence.addView(toggleAction("Offline", !onlineActive, view -> api.updatePresence("offline", new BasicCallback("Đã chuyển offline.", () -> syncAndShowHome("settings")))));
        statusCard.addView(presence);
        content.addView(statusCard);

        LinearLayout notifyCard = settingsCard("Thông báo", "Tuỳ chỉnh thông báo ngoài màn hình, âm thanh, rung và làm sáng hội thoại chưa đọc.");
        notifyCard.addView(text(
            "Thông báo ngoài màn hình: " + (store.pushEnabled() ? "Đang bật" : "Đang tắt"),
            14,
            COLOR_MUTED,
            false
        ));
        LinearLayout pushRow = row();
        pushRow.addView(toggleAction("Bật", store.pushEnabled(), view -> ensurePushNotifications(true)));
        pushRow.addView(toggleAction("Tắt", !store.pushEnabled(), view -> disablePushNotifications()));
        pushRow.addView(toggleAction("Kiểm tra", false, view -> api.pushStatus(new BasicCallback("Máy chủ đã sẵn sàng gửi thông báo.", null))));
        notifyCard.addView(pushRow);
        LinearLayout messageNotifyRow = row();
        messageNotifyRow.addView(localSettingToggle("Âm tin nhắn", "setting_message_sound", true));
        messageNotifyRow.addView(localSettingToggle("Rung tin nhắn", "setting_message_vibration", true));
        notifyCard.addView(messageNotifyRow);
        LinearLayout unreadRow = row();
        unreadRow.addView(localSettingToggle("Sáng tin chưa đọc", "setting_unread_highlight", true));
        unreadRow.addView(localSettingToggle("Tự đánh dấu đã đọc", "setting_mark_read_on_open", true));
        notifyCard.addView(unreadRow);
        content.addView(notifyCard);

        LinearLayout callCard = settingsCard("Cuộc gọi", "Thiết lập chuông gọi đến, rung và âm báo khi đang gọi đi.");
        LinearLayout callRow = row();
        callRow.addView(localSettingToggle("Chuông gọi", "setting_call_ringtone", true));
        callRow.addView(localSettingToggle("Rung cuộc gọi", "setting_call_vibration", true));
        callCard.addView(callRow);
        LinearLayout ringbackRow = row();
        ringbackRow.addView(localSettingToggle("Âm chờ gọi đi", "setting_call_ringback", true));
        ringbackRow.addView(rowAction("Kiểm tra cuộc gọi", view -> openHomeSection("calls"), false));
        callCard.addView(ringbackRow);
        content.addView(callCard);

        LinearLayout aiCard = settingsCard("XPAY AI", "Cho phép XPAY AI hỗ trợ trả lời chào hỏi đơn giản và mở nhanh khu vực trợ lý cá nhân.");
        boolean aiAuto = aiRules().optBoolean("allowAutoReply", uiSetting("setting_ai_auto_reply_simple", false));
        LinearLayout aiRow = row();
        aiRow.addView(toggleAction("Tự trả lời", aiAuto, view -> updateAiAutoReplyFromSettings(!aiAuto)));
        aiRow.addView(rowAction("Mở XPAY AI", view -> openHomeSection("ai"), false));
        aiCard.addView(aiRow);
        EditText aiRulesInput = input("Quy tắc riêng cho XPAY AI");
        aiRulesInput.setSingleLine(false);
        aiRulesInput.setMinLines(2);
        aiRulesInput.setMaxLines(5);
        aiRulesInput.setText(aiRules().optString("customRules", ""));
        aiCard.addView(aiRulesInput);
        aiCard.addView(rowAction("Lưu quy tắc AI", view -> updateAiCustomRules(aiRulesInput.getText().toString(), "settings"), true));
        content.addView(aiCard);

        LinearLayout account = settingsCard("Tài khoản và quyền riêng tư", "Quản lý dữ liệu cá nhân, chính sách bảo mật và xoá tài khoản.");
        LinearLayout privacyRow = row();
        privacyRow.addView(rowAction("Ẩn thông tin", view -> updatePrivacy(false), false));
        privacyRow.addView(rowAction("Hiển thị thông tin", view -> updatePrivacy(true), true));
        account.addView(privacyRow);
        LinearLayout policyRow = row();
        policyRow.addView(rowAction("Chính sách bảo mật", view -> openPrivacyPolicy(), false));
        policyRow.addView(rowAction("Đăng xuất", view -> logoutCurrentDevice(), false));
        account.addView(policyRow);
        EditText deletePassword = input("Mật khẩu hiện tại để xoá tài khoản");
        deletePassword.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
        EditText deleteConfirm = input("Gõ DELETE để xác nhận");
        account.addView(deletePassword);
        account.addView(deleteConfirm);
        account.addView(secondaryAction("Xoá tài khoản", view -> {
            api.deleteAccount(deletePassword.getText().toString(), deleteConfirm.getText().toString().trim(), new BasicCallback("Đã gửi yêu cầu xoá tài khoản.", () -> {
                store.clear();
                showAuth("login");
            }));
        }));
        content.addView(account);
    }

    private void openPrivacyPolicy() {
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(API_BASE_URL + "/privacy.html"));
            startActivity(intent);
        } catch (Exception error) {
            setStatus("Không mở được chính sách bảo mật.");
        }
    }

    private void renderQr() {
        content.addView(sectionTitle("Quét QR"));
        LinearLayout card = card();
        card.addView(text("Mã QR kết bạn XPAY Chat", 18, COLOR_INK, true));
        card.addView(paragraph("Đưa mã này cho người khác quét, hoặc dùng camera/ảnh QR để kết bạn trực tiếp."));
        ImageView qr = new ImageView(this);
        Bitmap qrBitmap = createQrBitmap(friendPayload(), dp(220));
        if (qrBitmap != null) {
            qr.setImageBitmap(qrBitmap);
            qr.setAdjustViewBounds(true);
            LinearLayout.LayoutParams qrParams = new LinearLayout.LayoutParams(dp(220), dp(220));
            qrParams.gravity = Gravity.CENTER_HORIZONTAL;
            qrParams.setMargins(0, dp(8), 0, dp(10));
            card.addView(qr, qrParams);
        }
        card.addView(text(displayName(user(), userPhone()), 16, COLOR_INK, true));
        card.addView(text(userPhone(), 14, COLOR_MUTED, false));

        EditText qrInput = input("Dán số điện thoại hoặc nội dung mã QR");
        card.addView(qrInput);
        card.addView(primaryAction("Kết bạn từ mã QR", view -> {
            String phone = readQrPhone(qrInput.getText().toString());
            if (phone.isEmpty()) {
                setStatus("Không nhận được số điện thoại XPAY Chat từ nội dung này.");
                return;
            }
            requestFriend(phone, "friends");
        }));
        LinearLayout qrActions = row();
        qrActions.addView(rowAction("Quét bằng camera", view -> scanQrWithCamera(), true));
        qrActions.addView(rowAction("Chọn ảnh QR", view -> pickMedia(REQ_QR_IMAGE, "image/*"), false));
        card.addView(qrActions);
        content.addView(card);
    }

    private void scanQrWithCamera() {
        Intent intent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
        setStatus("Đang mở camera để quét QR...");
        try {
            startActivityForResult(intent, REQ_QR_CAMERA);
        } catch (Exception error) {
            setStatus("Thiết bị chưa có ứng dụng camera để quét QR.");
        }
    }

    private void renderThemes() {
        content.addView(sectionTitle("Giao diện"));
        content.addView(infoCard("Chủ đề XPAY Chat", "Chọn màu giao diện phù hợp dịp sử dụng. Chủ đề được lưu trên thiết bị và có thể đổi lại bất cứ lúc nào."));
        content.addView(themeCard("default", "Mặc định XPAY Chat", "Xanh công nghệ, gọn và dễ nhìn.", Color.rgb(0, 168, 132), Color.rgb(14, 116, 144), Color.rgb(248, 250, 252)));
        content.addView(themeCard("women", "Quốc tế phụ nữ 8/3", "Sắc hồng hiện đại, ấm áp và nổi bật.", Color.rgb(219, 39, 119), Color.rgb(168, 85, 247), Color.rgb(253, 242, 248)));
        content.addView(themeCard("teacher", "Nhà giáo Việt Nam 20/11", "Xanh tri thức kết hợp vàng trang trọng.", Color.rgb(37, 99, 235), Color.rgb(217, 119, 6), Color.rgb(239, 246, 255)));
        content.addView(themeCard("earth", "Ngày Trái Đất", "Xanh lá và xanh dương tự nhiên.", Color.rgb(22, 163, 74), Color.rgb(2, 132, 199), Color.rgb(240, 253, 244)));
        content.addView(themeCard("peace", "Ngày Hòa bình thế giới", "Xanh trời và tím nhẹ, cảm giác rộng mở.", Color.rgb(14, 165, 233), Color.rgb(124, 58, 237), Color.rgb(240, 249, 255)));
        content.addView(themeCard("tet", "Tết Việt Nam", "Đỏ vàng lễ hội, rực rỡ nhưng vẫn gọn mắt.", Color.rgb(220, 38, 38), Color.rgb(234, 179, 8), Color.rgb(255, 247, 237)));
        content.addView(themeCard("superhero", "Siêu nhân", "Mạnh mẽ, tốc độ và năng lượng cao.", Color.rgb(225, 29, 72), Color.rgb(37, 99, 235), Color.rgb(248, 251, 255)));
        content.addView(themeCard("business", "Business", "Chuyên nghiệp, sang và tập trung.", Color.rgb(15, 118, 110), Color.rgb(51, 65, 85), Color.rgb(238, 246, 244)));
        content.addView(themeCard("mystic", "Huyền bí đen bóng", "Đen sâu, ánh tím lam và biểu tượng bí ẩn.", Color.rgb(139, 92, 246), Color.rgb(6, 182, 212), Color.rgb(5, 7, 18)));
        content.addView(themeCard("world", "Thế giới", "Bản đồ toàn cầu, xanh đại dương.", Color.rgb(14, 165, 233), Color.rgb(34, 197, 94), Color.rgb(234, 248, 255)));
        content.addView(themeCard("humanity", "Con người", "Ấm áp, kết nối và gần gũi.", Color.rgb(249, 115, 22), Color.rgb(219, 39, 119), Color.rgb(255, 247, 237)));
        content.addView(themeCard("robot", "Robot AI", "Mạch số, trí tuệ nhân tạo và tương lai.", Color.rgb(37, 99, 235), Color.rgb(20, 184, 166), Color.rgb(238, 246, 255)));
        content.addView(themeCard("apocalypse", "Ngày tận thế", "Tương phản mạnh, kịch tính và cá tính.", Color.rgb(239, 68, 68), Color.rgb(245, 158, 11), Color.rgb(22, 11, 11)));
        content.addView(themeCard("cosmic-ai", "Vũ trụ AI", "Không gian sâu, mạng sao công nghệ cao.", Color.rgb(99, 102, 241), Color.rgb(34, 211, 238), Color.rgb(8, 17, 31)));
    }

    private LinearLayout themeCard(String id, String title, String subtitle, int primary, int secondary, int surface) {
        LinearLayout card = compactCard();
        boolean active = activeTheme.equals(id);
        card.setBackground(stroked(active ? surface : Color.WHITE, active ? primary : Color.rgb(232, 239, 247), 15));
        LinearLayout row = row();
        LinearLayout preview = new LinearLayout(this);
        preview.setBackground(gradient(new int[] { primary, secondary }, 999));
        LinearLayout.LayoutParams previewParams = new LinearLayout.LayoutParams(dp(44), dp(44));
        previewParams.setMargins(0, 0, dp(10), 0);
        row.addView(preview, previewParams);

        LinearLayout info = new LinearLayout(this);
        info.setOrientation(LinearLayout.VERTICAL);
        LinearLayout titleRow = row();
        titleRow.addView(text(title, 15, COLOR_INK, true), new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1));
        if (active) titleRow.addView(accountBadge("✓", primary));
        info.addView(titleRow);
        info.addView(text(subtitle, 12, COLOR_MUTED, false));
        row.addView(info, new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1));
        row.addView(slimAction(active ? "Đang dùng" : "Chọn", view -> setThemeId(id), !active));
        card.addView(row);
        card.setOnClickListener(view -> setThemeId(id));
        return card;
    }

    private void setThemeId(String id) {
        activeTheme = id == null || id.trim().isEmpty() ? "default" : id;
        getSharedPreferences(PREF_UI, MODE_PRIVATE).edit().putString("theme", activeTheme).apply();
        toast("Đã đổi giao diện: " + themeTitle(activeTheme));
        showHome();
    }

    private void renderAppAdmin() {
        content.addView(sectionTitle("Quản trị"));
        if (!isAppAdminAccount()) {
            content.addView(infoCard("Chưa có quyền", "Chỉ tài khoản được cấp quyền quản trị mới xem được dữ liệu người dùng trong app."));
            return;
        }
        LinearLayout loading = infoCard("Đang tải dữ liệu", "Danh sách người dùng sẽ hiển thị ngay sau khi máy chủ phản hồi.");
        content.addView(loading);
        api.appAdminUsers(new NexaApi.Callback() {
            @Override
            public void onSuccess(JSONObject data) {
                content.removeView(loading);
                JSONArray users = data.optJSONArray("users");
                JSONArray businesses = data.optJSONArray("businesses");
                content.addView(text("Tổng người dùng: " + data.optInt("total", users == null ? 0 : users.length()), 15, COLOR_MUTED, true));
                renderAdminBusinesses(businesses == null ? new JSONArray() : businesses);
                if (users == null || users.length() == 0) {
                    content.addView(infoCard("Chưa có dữ liệu", "Máy chủ chưa trả về danh sách người dùng."));
                    return;
                }
                EditText search = input("Tìm tên, số điện thoại, email người dùng");
                LinearLayout list = new LinearLayout(MainActivity.this);
                list.setOrientation(LinearLayout.VERTICAL);
                content.addView(search);
                content.addView(list);
                search.addTextChangedListener(new TextWatcher() {
                    @Override
                    public void beforeTextChanged(CharSequence text, int start, int count, int after) {
                    }

                    @Override
                    public void onTextChanged(CharSequence text, int start, int before, int count) {
                        fillAdminUserList(list, users, text == null ? "" : text.toString());
                    }

                    @Override
                    public void afterTextChanged(Editable editable) {
                    }
                });
                fillAdminUserList(list, users, "");
            }

            @Override
            public void onError(String message) {
                content.removeView(loading);
                content.addView(infoCard("Không tải được", message));
            }
        });
    }

    private void renderAdminBusinesses(JSONArray businesses) {
        content.addView(sectionTitle("Quản lý doanh nghiệp"));
        if (businesses == null || businesses.length() == 0) {
            content.addView(infoCard("Chưa có hồ sơ", "Doanh nghiệp người dùng tạo sẽ chờ admin duyệt tại đây."));
            return;
        }
        for (int i = 0; i < businesses.length() && i < 80; i++) {
            JSONObject business = businesses.optJSONObject(i);
            if (business != null) content.addView(adminBusinessRow(business));
        }
    }

    private LinearLayout adminBusinessRow(JSONObject business) {
        LinearLayout card = compactCard();
        String ownerPhone = normalizePhone(business.optString("ownerPhone", ""));
        card.addView(text(business.optString("name", "Doanh nghiệp Nexa"), 15, COLOR_INK, true));
        card.addView(text(business.optString("category", "Dịch vụ") + " • " + ownerPhone + " • " + businessStatusLabel(business.optString("status", "pending")), 12, COLOR_MUTED, false));
        String description = business.optString("description", "");
        if (!description.isEmpty()) card.addView(paragraph(description));
        String note = business.optString("reviewNote", "");
        if (!note.isEmpty()) card.addView(text("Lý do admin: " + note, 12, Color.rgb(146, 64, 14), false));
        LinearLayout actions = row();
        actions.addView(slimAction("Duyệt", view -> updateAdminBusiness(ownerPhone, "approved", ""), true));
        actions.addView(slimAction("Cần sửa", view -> updateAdminBusiness(ownerPhone, "needs_changes", "Vui lòng bổ sung thông tin hoặc chỉnh nội dung theo điều khoản."), false));
        actions.addView(slimAction("Hạn chế", view -> updateAdminBusiness(ownerPhone, "restricted", "Hồ sơ bị hạn chế hiển thị do cần kiểm tra thêm."), false));
        actions.addView(slimAction("Khoá", view -> updateAdminBusiness(ownerPhone, "locked", "Hồ sơ bị khoá do vi phạm điều khoản doanh nghiệp."), false));
        card.addView(actions);
        return card;
    }

    private void updateAdminBusiness(String ownerPhone, String status, String note) {
        if (ownerPhone.isEmpty()) return;
        api.updateAppAdminBusiness(ownerPhone, status, note, new BasicCallback("Đã cập nhật trạng thái doanh nghiệp.", () -> syncAndShowHome("admin")));
    }

    private void fillAdminUserList(LinearLayout list, JSONArray users, String query) {
        list.removeAllViews();
        String keyword = query == null ? "" : query.trim().toLowerCase(Locale.ROOT);
        int added = 0;
        for (int i = 0; users != null && i < users.length() && added < 120; i++) {
            JSONObject item = users.optJSONObject(i);
            if (item == null) continue;
            String haystack = (
                item.optString("accountPhone", "") + " " +
                item.optString("phone", "") + " " +
                item.optString("fullName", "") + " " +
                item.optString("name", "") + " " +
                item.optString("email", "") + " " +
                item.optString("interests", "")
            ).toLowerCase(Locale.ROOT);
            if (!keyword.isEmpty() && !haystack.contains(keyword)) continue;
            list.addView(adminUserRow(item));
            added++;
        }
        if (added == 0) list.addView(infoCard("Không tìm thấy", "Không có người dùng phù hợp với từ khoá này."));
    }

    private LinearLayout adminUserRow(JSONObject item) {
        LinearLayout card = compactCard();
        card.setPadding(dp(8), dp(5), dp(8), dp(5));
        String phone = item.optString("accountPhone", item.optString("phone", ""));
        String name = item.optString("fullName", item.optString("name", phone));
        LinearLayout title = row();
        title.addView(text(name, 13, COLOR_INK, true), new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1));
        addBadgesToRow(title, item);
        card.addView(title);
        String online = item.optBoolean("presenceOnline", item.optBoolean("online", false)) ? "Online" : "Offline";
        String reason = item.optString("presenceOfflineReasonText", item.optString("offlineReason", ""));
        card.addView(text(phone + " • " + online + (reason.isEmpty() ? "" : " • " + reason), 10, COLOR_MUTED, false));
        card.addView(text("Email: " + item.optString("email", "Chưa có") + " • Sinh: " + item.optString("birthDate", ""), 10, COLOR_MUTED, false));
        card.addView(text("Sở thích: " + item.optString("interests", ""), 10, COLOR_MUTED, false));
        card.addView(text(
            "Bạn bè " + item.optInt("friendsCount", 0) +
                " • Tin " + item.optInt("messagesCount", 0) +
                " • Gọi " + item.optInt("callsCount", 0) +
                " • Nhật ký " + item.optInt("journalsCount", 0) +
                " • Điểm GT " + item.optInt("referralPoints", 0),
            10,
            COLOR_MUTED,
            false
        ));
        card.setOnClickListener(view -> showAdminUserDetail(item));
        return card;
    }

    private void showAdminUserDetail(JSONObject item) {
        if (content == null || item == null) return;
        content.removeAllViews();
        String phone = item.optString("accountPhone", item.optString("phone", ""));
        String name = item.optString("fullName", item.optString("name", phone));
        JSONObject badges = item.optJSONObject("accountBadges");
        boolean verified = badges != null && badges.optBoolean("verified", false);
        boolean vip = badges != null && badges.optBoolean("vip", false);

        content.addView(sectionTitle("Chi tiết người dùng"));
        content.addView(secondaryAction("← Quay lại danh sách", view -> openHomeSection("admin")));
        LinearLayout card = card();
        LinearLayout title = row();
        title.addView(text(name, 18, COLOR_INK, true), new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1));
        addBadgesToRow(title, item);
        card.addView(title);
        card.addView(adminDetailLine("Số tài khoản", phone));
        card.addView(adminDetailLine("Email", item.optString("email", "Chưa có")));
        card.addView(adminDetailLine("Ngày sinh", item.optString("birthDate", "")));
        card.addView(adminDetailLine("Sở thích", item.optString("interests", "")));
        card.addView(adminDetailLine("Trạng thái", item.optString("presenceStatus", "") + " • " + item.optString("presenceOfflineReasonText", "")));
        card.addView(adminDetailLine("Thống kê", "Bạn bè " + item.optInt("friendsCount", 0) + " • Tin " + item.optInt("messagesCount", 0) + " • Gọi " + item.optInt("callsCount", 0) + " • Nhật ký " + item.optInt("journalsCount", 0)));
        card.addView(adminDetailLine("Điểm giới thiệu", item.optInt("referralPoints", 0) + " điểm • " + item.optString("referralTier", "Thường")));
        card.addView(adminDetailLine("Link giới thiệu", item.optString("referralInviteLink", "")));
        card.addView(adminDetailLine("Cập nhật", item.optString("updatedAt", item.optString("createdAt", ""))));

        LinearLayout badgeRow = row();
        badgeRow.addView(rowAction(verified ? "Bỏ tích xanh" : "Tích xanh", view -> updateAdminBadges(phone, !verified, vip), !verified));
        badgeRow.addView(rowAction(vip ? "Bỏ kim cương" : "Kim cương", view -> updateAdminBadges(phone, verified, !vip), !vip));
        card.addView(badgeRow);
        content.addView(card);
    }

    private TextView adminDetailLine(String label, String value) {
        String clean = value == null || value.trim().isEmpty() ? "Chưa cập nhật" : value.trim();
        TextView line = text(label + ": " + clean, 12, COLOR_MUTED, false);
        line.setPadding(0, dp(3), 0, dp(3));
        return line;
    }

    private void updateAdminBadges(String phone, boolean verified, boolean vip) {
        if (phone == null || phone.trim().isEmpty()) {
            setStatus("Thiếu số điện thoại người dùng.");
            return;
        }
        setStatus("Đang cập nhật phân loại người dùng...");
        api.updateAppAdminBadges(phone, verified, vip, new BasicCallback("Đã cập nhật phân loại tài khoản.", () -> syncAndShowHome("admin")));
    }

    private void applyIntentRoute(Intent intent) {
        if (intent == null) return;
        String route = intent.getStringExtra(NexaFirebaseMessagingService.EXTRA_ROUTE);
        if ("calls".equals(route) || "messages".equals(route)) {
            activeSection = route;
        }
    }

    private void captureNotificationAction(Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        String route = intent.getStringExtra(NexaFirebaseMessagingService.EXTRA_ROUTE);
        String callId = intent.getStringExtra(NexaFirebaseMessagingService.EXTRA_CALL_ID);
        if ((NexaFirebaseMessagingService.ACTION_ANSWER_CALL.equals(action) || NexaFirebaseMessagingService.ACTION_REJECT_CALL.equals(action))
            && (!"calls".equals(route) || !validNotificationCallId(callId))) {
            pendingNotificationCallAction = "";
            pendingNotificationCallId = "";
            pendingNotificationCallMode = "voice";
            return;
        }
        if ("calls".equals(route) && callId != null && !callId.isEmpty()) prepareLockScreenWakeFlags();
        if (NexaFirebaseMessagingService.ACTION_ANSWER_CALL.equals(action)) {
            pendingNotificationCallAction = "accept";
            pendingNotificationCallId = callId == null ? "" : callId;
            pendingNotificationCallMode = intent.getStringExtra(NexaFirebaseMessagingService.EXTRA_CALL_MODE);
            if (pendingNotificationCallMode == null || pendingNotificationCallMode.isEmpty()) pendingNotificationCallMode = "voice";
        } else if (NexaFirebaseMessagingService.ACTION_REJECT_CALL.equals(action)) {
            pendingNotificationCallAction = "reject";
            pendingNotificationCallId = callId == null ? "" : callId;
            pendingNotificationCallMode = "voice";
        }
    }

    private boolean validNotificationCallId(String callId) {
        return callId != null && callId.matches("^call-\\d{10,}-[a-f0-9]{8}$");
    }

    private boolean handlePendingNotificationCallAction() {
        if (pendingNotificationCallAction.isEmpty()) return false;
        String action = pendingNotificationCallAction;
        String id = pendingNotificationCallId;
        String mode = pendingNotificationCallMode == null || pendingNotificationCallMode.isEmpty()
            ? "voice"
            : pendingNotificationCallMode;
        pendingNotificationCallAction = "";
        pendingNotificationCallId = "";
        pendingNotificationCallMode = "voice";
        if (id.isEmpty()) {
            clearLockScreenWakeFlags();
            setStatus("Thông báo cuộc gọi thiếu mã cuộc gọi.");
            return false;
        }
        respondNotificationCall(id, action, mode);
        return true;
    }

    private void cancelCallNotification(String callId) {
        Object service = getSystemService(Context.NOTIFICATION_SERVICE);
        if (service instanceof android.app.NotificationManager) {
            ((android.app.NotificationManager) service).cancel(NexaFirebaseMessagingService.callNotificationId(callId));
        }
    }

    private void prepareLockScreenWakeFlags() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        } else {
            getWindow().addFlags(
                android.view.WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                android.view.WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
            );
        }
        getWindow().addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    }

    private void clearLockScreenWakeFlags() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(false);
            setTurnScreenOn(false);
        }
        getWindow().clearFlags(
            android.view.WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
            android.view.WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
            android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
        );
    }

    private void ensurePushNotifications(boolean report) {
        if (store.token().isEmpty()) {
            if (report) setStatus("Vui lòng đăng nhập trước khi bật thông báo.");
            return;
        }
        store.setPushEnabled(true);
        if (!hasNotificationPermission()) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                requestPermissions(new String[] { Manifest.permission.POST_NOTIFICATIONS }, REQ_POST_NOTIFICATIONS);
                if (report) setStatus("Hãy cho phép thông báo để XPAY Chat báo tin nhắn và cuộc gọi.");
            }
            return;
        }
        registerPushToken(report);
    }

    private boolean hasNotificationPermission() {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
            checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
    }

    private void registerPushToken(boolean report) {
        if (store.token().isEmpty() || !store.pushEnabled()) return;
        FirebaseMessaging.getInstance().getToken().addOnCompleteListener(task -> {
            if (!task.isSuccessful() || task.getResult() == null || task.getResult().isEmpty()) {
                if (report) setStatus("Chưa lấy được token thông báo từ Firebase.");
                return;
            }
            String pushToken = task.getResult();
            store.savePushToken(pushToken);
            api.registerPush(pushToken, "android", "fcm", store.deviceId(), new NexaApi.Callback() {
                @Override
                public void onSuccess(JSONObject data) {
                    if (report) {
                        setStatus("Đã bật thông báo ngoài màn hình cho thiết bị này.");
                        syncAndShowHome("settings");
                    }
                }

                @Override
                public void onError(String message) {
                    if (report) setStatus(message);
                }
            });
        });
    }

    private void disablePushNotifications() {
        store.setPushEnabled(false);
        String pushToken = store.pushToken();
        store.savePushToken("");
        api.unregisterPush(pushToken, store.deviceId(), new NexaApi.Callback() {
            @Override
            public void onSuccess(JSONObject data) {
                setStatus("Đã tắt thông báo ngoài màn hình cho thiết bị này.");
                syncAndShowHome("settings");
            }

            @Override
            public void onError(String message) {
                setStatus("Đã tắt trên thiết bị. Máy chủ sẽ cập nhật sau.");
            }
        });
    }

    private void logoutCurrentDevice() {
        if (store.token().isEmpty()) {
            finishLocalLogout();
            return;
        }
        setStatus("Đang đăng xuất...");
        api.logout(store.pushToken(), store.deviceId(), new NexaApi.Callback() {
            @Override
            public void onSuccess(JSONObject data) {
                finishLocalLogout();
            }

            @Override
            public void onError(String message) {
                finishLocalLogout();
            }
        });
    }

    private void finishLocalLogout() {
        stopForegroundSync();
        store.clear();
        api.setToken("");
        lastSync = null;
        activeSection = "messages";
        activeFriendPhone = "";
        showAuth("login");
    }

    private void openChat(String friendPhone) {
        if (friendPhone == null || friendPhone.isEmpty()) {
            setStatus("Không xác định được tài khoản bạn bè.");
            return;
        }
        pendingReplyText = "";
        activeFriendPhone = normalizePhone(friendPhone);
        markConversationRead(activeFriendPhone);
        showConversationScreen();
    }

    private void syncAndReturnToChat(String friendPhone) {
        api.sync(new NexaApi.Callback() {
            @Override
            public void onSuccess(JSONObject data) {
                applyUnreadTracking(data);
                markConversationRead(friendPhone);
                lastSync = data;
                applyAiHistoryReset();
                activeFriendPhone = normalizePhone(friendPhone);
                showConversationScreen();
            }

            @Override
            public void onError(String message) {
                setStatus("Đã gửi, nhưng chưa làm mới được: " + message);
            }
        });
    }

    private void pickMedia(int requestCode, String type) {
        pickMedia(requestCode, type, false);
    }

    private void pickMedia(int requestCode, String type, boolean allowMultiple) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(type.contains(",") ? "*/*" : type);
        if (type.contains(",")) intent.putExtra(Intent.EXTRA_MIME_TYPES, new String[] { "image/*", "video/*" });
        intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, allowMultiple);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        startActivityForResult(Intent.createChooser(intent, "Chọn tệp XPAY Chat"), requestCode);
    }

    private void sendCurrentLocationMessage() {
        if (!hasLocationPermission()) {
            requestLocationPermission(() -> sendCurrentLocationMessage());
            return;
        }
        Location location = currentLocation();
        if (location == null) {
            setStatus("Chưa lấy được vị trí. Hãy cấp quyền vị trí cho ứng dụng.");
            return;
        }
        String link = "Vị trí hiện tại: https://maps.google.com/?q=" + location.getLatitude() + "," + location.getLongitude();
        api.sendMessage(activeFriendPhone, link, new BasicCallback("Đã gửi vị trí.", () -> syncAndReturnToChat(activeFriendPhone)));
    }

    private void updateCurrentLocation() {
        if (!hasLocationPermission()) {
            requestLocationPermission(() -> updateCurrentLocation());
            return;
        }
        Location location = currentLocation();
        if (location == null) {
            setStatus("Chưa lấy được vị trí. Hãy cấp quyền vị trí cho ứng dụng.");
            return;
        }
        api.updateLocation(true, location.getLatitude(), location.getLongitude(), new BasicCallback("Đã cập nhật vị trí.", () -> syncAndShowHome("nearby")));
    }

    private boolean hasLocationPermission() {
        return checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
            checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    private void requestLocationPermission(Runnable action) {
        pendingLocationAction = action;
        requestPermissions(new String[] { Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION }, REQ_LOCATION);
    }

    private Location currentLocation() {
        if (!hasLocationPermission()) return null;
        LocationManager manager = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
        if (manager == null) return null;
        Location network = null;
        Location gps = null;
        try {
            network = manager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER);
            gps = manager.getLastKnownLocation(LocationManager.GPS_PROVIDER);
        } catch (Exception ignored) {
        }
        if (gps == null) return network;
        if (network == null) return gps;
        return gps.getTime() > network.getTime() ? gps : network;
    }

    private JSONObject mediaFromUri(Uri uri, boolean imageOnly) throws Exception {
        return mediaFromUri(uri, imageOnly, MEDIA_LIMIT_BYTES);
    }

    private JSONObject mediaFromUri(Uri uri, boolean imageOnly, int limitBytes) throws Exception {
        String mime = getContentResolver().getType(uri);
        if (mime == null || mime.isEmpty()) mime = imageOnly ? "image/jpeg" : "application/octet-stream";
        boolean isImage = mime.startsWith("image/");
        boolean isVideo = mime.startsWith("video/");
        if (imageOnly && !isImage) throw new Exception("Chỉ hỗ trợ ảnh cho mục này.");
        if (!imageOnly && !isImage && !isVideo) throw new Exception("Chỉ hỗ trợ ảnh hoặc video.");
        byte[] bytes = readLimited(uri, limitBytes);
        JSONObject media = new JSONObject();
        media.put("data", "data:" + mime + ";base64," + Base64.encodeToString(bytes, Base64.NO_WRAP));
        media.put("type", mime);
        media.put("name", displayNameForUri(uri));
        media.put("size", bytes.length);
        return media;
    }

    private byte[] readLimited(Uri uri) throws Exception {
        return readLimited(uri, MEDIA_LIMIT_BYTES);
    }

    private byte[] readLimited(Uri uri, int limitBytes) throws Exception {
        try (InputStream input = getContentResolver().openInputStream(uri);
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            if (input == null) throw new Exception("Không đọc được tệp.");
            byte[] buffer = new byte[8192];
            int total = 0;
            int read;
            while ((read = input.read(buffer)) != -1) {
                total += read;
                if (total > limitBytes) throw new Exception("Tệp vượt quá giới hạn " + Math.max(1, limitBytes / 1024 / 1024) + "MB.");
                output.write(buffer, 0, read);
            }
            return output.toByteArray();
        }
    }

    private String displayNameForUri(Uri uri) {
        try (Cursor cursor = getContentResolver().query(uri, null, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) {
                int index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (index >= 0) return cursor.getString(index);
            }
        } catch (Exception ignored) {
        }
        String fallback = uri.getLastPathSegment();
        return fallback == null ? "xpaychat-file" : fallback;
    }

    private JSONObject user() {
        JSONObject user = lastSync == null ? null : lastSync.optJSONObject("user");
        return user == null ? new JSONObject() : user;
    }

    private String userPhone() {
        return user().optString("accountPhone", user().optString("phone", ""));
    }

    private JSONArray friends() {
        JSONArray value = lastSync == null ? null : lastSync.optJSONArray("friends");
        return value == null ? new JSONArray() : value;
    }

    private JSONArray friendRequests() {
        JSONArray value = lastSync == null ? null : lastSync.optJSONArray("friendRequests");
        return value == null ? new JSONArray() : value;
    }

    private JSONArray conversations() {
        JSONArray value = lastSync == null ? null : lastSync.optJSONArray("conversations");
        return value == null ? new JSONArray() : value;
    }

    private JSONArray posts() {
        JSONArray value = lastSync == null ? null : lastSync.optJSONArray("posts");
        return value == null ? new JSONArray() : value;
    }

    private JSONArray businesses() {
        JSONArray value = lastSync == null ? null : lastSync.optJSONArray("businesses");
        return value == null ? new JSONArray() : value;
    }

    private JSONObject aiRules() {
        JSONObject ai = lastSync == null ? null : lastSync.optJSONObject("ai");
        JSONObject rules = ai == null ? null : ai.optJSONObject("rules");
        return rules == null ? new JSONObject() : rules;
    }

    private JSONArray calls() {
        JSONArray value = lastSync == null ? null : lastSync.optJSONArray("calls");
        return value == null ? new JSONArray() : value;
    }

    private JSONObject findCallById(String id) {
        JSONArray calls = calls();
        for (int i = 0; i < calls.length(); i++) {
            JSONObject call = calls.optJSONObject(i);
            if (call != null && id.equals(call.optString("id", ""))) return call;
        }
        return null;
    }

    private JSONArray nearby() {
        JSONArray value = lastSync == null ? null : lastSync.optJSONArray("nearby");
        return value == null ? new JSONArray() : value;
    }

    private JSONObject findFriend(String phone) {
        JSONArray friends = friends();
        for (int i = 0; i < friends.length(); i++) {
            JSONObject friend = friends.optJSONObject(i);
            if (friend == null) continue;
            String accountPhone = friend.optString("accountPhone", friend.optString("phone", ""));
            if (accountPhone.equals(phone)) return friend;
        }
        return null;
    }

    private boolean isFriendPhone(String phone) {
        return phone != null && !phone.isEmpty() && findFriend(phone) != null;
    }

    private JSONObject findConversation(String friendPhone) {
        JSONArray conversations = conversations();
        for (int i = 0; i < conversations.length(); i++) {
            JSONObject conversation = conversations.optJSONObject(i);
            if (conversation != null && friendPhone.equals(conversation.optString("friendPhone", ""))) return conversation;
        }
        return null;
    }

    private boolean shouldHideConversation(String friendPhone, JSONObject conversation) {
        if (conversationHasVisibleMessages(conversation)) return false;
        String cleanPhone = normalizePhone(friendPhone);
        JSONObject user = user();
        return phoneInArray(user.optJSONArray("hiddenChats"), cleanPhone) ||
            phoneInArray(user.optJSONArray("hiddenChatPhones"), cleanPhone);
    }

    private boolean conversationHasVisibleMessages(JSONObject conversation) {
        JSONArray messages = conversation == null ? null : conversation.optJSONArray("messages");
        return messages != null && messages.length() > 0;
    }

    private boolean phoneInArray(JSONArray values, String phone) {
        if (values == null || phone == null || phone.isEmpty()) return false;
        for (int i = 0; i < values.length(); i++) {
            if (phone.equals(normalizePhone(values.optString(i, "")))) return true;
        }
        return false;
    }

    private JSONObject editableProfile() {
        JSONObject source = user();
        JSONObject profile = new JSONObject();
        try {
            profile.put("fullName", source.optString("fullName", source.optString("name", "")));
            profile.put("name", source.optString("name", source.optString("fullName", "")));
            profile.put("birthDate", source.optString("birthDate", ""));
            profile.put("interests", source.optString("interests", ""));
            profile.put("avatarData", source.optString("avatarData", ""));
            profile.put("privacy", source.optJSONObject("privacy") == null ? new JSONObject() : source.optJSONObject("privacy"));
        } catch (Exception ignored) {
        }
        return profile;
    }

    private String displayName(JSONObject person, String fallbackPhone) {
        if (person == null) return fallbackPhone == null || fallbackPhone.isEmpty() ? "Người dùng" : fallbackPhone;
        String name = person.optString("fullName", person.optString("name", ""));
        return name.isEmpty() ? fallbackPhone : name;
    }

    private String formatDateText(String value) {
        if (value == null) return "";
        String[] parts = value.split("-");
        if (parts.length == 3) return parts[2] + "/" + parts[1] + "/" + parts[0];
        return value;
    }

    private long parseIsoMillis(String value) {
        if (value == null || value.trim().isEmpty()) return 0;
        String clean = value.trim();
        String[] patterns = new String[] {
            "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
            "yyyy-MM-dd'T'HH:mm:ss'Z'",
            "yyyy-MM-dd'T'HH:mm:ss.SSSX",
            "yyyy-MM-dd'T'HH:mm:ssX"
        };
        for (String pattern : patterns) {
            try {
                SimpleDateFormat parser = new SimpleDateFormat(pattern, Locale.US);
                parser.setTimeZone(TimeZone.getTimeZone("UTC"));
                Date date = parser.parse(clean);
                if (date != null) return date.getTime();
            } catch (Exception ignored) {
            }
        }
        return 0;
    }

    private String formatDateTimeText(String value) {
        long millis = parseIsoMillis(value);
        if (millis <= 0) return value == null || value.isEmpty() ? "Chưa có" : value.replace('T', ' ').replace("Z", "");
        SimpleDateFormat formatter = new SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.getDefault());
        return formatter.format(new Date(millis));
    }

    private String accountBadges(JSONObject person) {
        JSONObject badges = person.optJSONObject("accountBadges");
        if (badges == null) return "";
        String text = "";
        if (badges.optBoolean("verified", false)) text += "Tích xanh";
        if (badges.optBoolean("vip", false)) text += text.isEmpty() ? "VIP" : " · VIP";
        return text;
    }

    private void addBadgesToRow(LinearLayout row, JSONObject person) {
        if (person == null) return;
        JSONObject badges = person.optJSONObject("accountBadges");
        if (badges == null) return;
        if (badges.optBoolean("verified", false)) row.addView(accountBadge("✓", Color.rgb(34, 197, 94)));
        if (badges.optBoolean("vip", false)) row.addView(accountBadge("◆", Color.rgb(245, 158, 11)));
    }

    private TextView accountBadge(String value, int color) {
        TextView badge = text(value, 12, Color.WHITE, true);
        badge.setGravity(Gravity.CENTER);
        badge.setBackground(rounded(color, 999));
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(dp(20), dp(20));
        params.setMargins(dp(6), 0, 0, 0);
        badge.setLayoutParams(params);
        return badge;
    }

    private boolean isAppAdminAccount() {
        JSONObject current = user();
        if (current.optBoolean("isAppAdmin", false)) return true;
        JSONArray roles = current.optJSONArray("roles");
        for (int i = 0; roles != null && i < roles.length(); i++) {
            if ("app_admin".equalsIgnoreCase(roles.optString(i, ""))) return true;
        }
        return false;
    }

    private boolean uiSetting(String key, boolean fallback) {
        return getSharedPreferences(PREF_UI, MODE_PRIVATE).getBoolean(key, fallback);
    }

    private void setUiSetting(String key, boolean enabled) {
        getSharedPreferences(PREF_UI, MODE_PRIVATE).edit().putBoolean(key, enabled).apply();
    }

    private JSONObject uiJson(String key) {
        try {
            return new JSONObject(getSharedPreferences(PREF_UI, MODE_PRIVATE).getString(key, "{}"));
        } catch (Exception ignored) {
            return new JSONObject();
        }
    }

    private void setUiJson(String key, JSONObject value) {
        getSharedPreferences(PREF_UI, MODE_PRIVATE).edit().putString(key, value == null ? "{}" : value.toString()).apply();
    }

    private JSONObject unreadJson() {
        return uiJson(KEY_UNREAD_IDS);
    }

    private Set<String> unreadIdsForPhone(String phone) {
        return jsonStringSet(unreadJson().optJSONArray(normalizePhone(phone)));
    }

    private Set<String> jsonStringSet(JSONArray items) {
        Set<String> values = new HashSet<>();
        for (int i = 0; items != null && i < items.length(); i++) {
            String value = items.optString(i, "");
            if (!value.isEmpty()) values.add(value);
        }
        return values;
    }

    private JSONArray jsonArrayFromSet(Set<String> values) {
        JSONArray array = new JSONArray();
        for (String value : values) {
            if (value == null || value.isEmpty()) continue;
            array.put(value);
        }
        return array;
    }

    private boolean isConversationOpenForPhone(String phone) {
        return !activeFriendPhone.isEmpty() && normalizePhone(phone).equals(normalizePhone(activeFriendPhone));
    }

    private Set<String> incomingIdsForConversation(JSONObject conversation) {
        Set<String> ids = new HashSet<>();
        JSONArray messages = conversation == null ? null : conversation.optJSONArray("messages");
        for (int i = 0; messages != null && i < messages.length(); i++) {
            JSONObject message = messages.optJSONObject(i);
            if (message == null) continue;
            String id = message.optString("id", "");
            if (id.isEmpty()) continue;
            if ("me".equals(message.optString("from", ""))) continue;
            if (message.optBoolean("deleted", false) || message.optBoolean("recalled", false)) continue;
            ids.add(id);
        }
        return ids;
    }

    private void putStringSet(JSONObject object, String key, Set<String> values) {
        try {
            object.put(key, jsonArrayFromSet(values));
        } catch (Exception ignored) {
        }
    }

    private void applyUnreadTracking(JSONObject data) {
        JSONArray conversations = data == null ? null : data.optJSONArray("conversations");
        if (conversations == null) return;
        JSONObject known = uiJson(KEY_KNOWN_INCOMING_IDS);
        JSONObject unread = unreadJson();
        boolean knownChanged = false;
        boolean unreadChanged = false;
        for (int i = 0; i < conversations.length(); i++) {
            JSONObject conversation = conversations.optJSONObject(i);
            if (conversation == null) continue;
            String phone = normalizePhone(conversation.optString("friendPhone", ""));
            if (phone.isEmpty()) continue;
            Set<String> currentIncoming = incomingIdsForConversation(conversation);
            boolean primed = known.has(phone);
            Set<String> knownIds = jsonStringSet(known.optJSONArray(phone));
            Set<String> unreadIds = jsonStringSet(unread.optJSONArray(phone));

            Set<String> staleUnread = new HashSet<>(unreadIds);
            staleUnread.removeAll(currentIncoming);
            if (!staleUnread.isEmpty()) {
                unreadIds.removeAll(staleUnread);
                unreadChanged = true;
            }

            if (primed) {
                for (String id : currentIncoming) {
                    if (knownIds.contains(id)) continue;
                    if (uiSetting("setting_mark_read_on_open", true) && isConversationOpenForPhone(phone)) continue;
                    unreadIds.add(id);
                    unreadChanged = true;
                }
            }

            if (uiSetting("setting_mark_read_on_open", true) && isConversationOpenForPhone(phone) && !unreadIds.isEmpty()) {
                unreadIds.clear();
                unreadChanged = true;
            }

            if (!primed || !knownIds.equals(currentIncoming)) {
                putStringSet(known, phone, currentIncoming);
                knownChanged = true;
            }
            if (unreadIds.isEmpty()) {
                if (unread.has(phone)) {
                    unread.remove(phone);
                    unreadChanged = true;
                }
            } else {
                putStringSet(unread, phone, unreadIds);
            }
        }
        if (knownChanged) setUiJson(KEY_KNOWN_INCOMING_IDS, known);
        if (unreadChanged) setUiJson(KEY_UNREAD_IDS, unread);
    }

    private void markConversationRead(String phone) {
        String cleanPhone = normalizePhone(phone);
        if (cleanPhone.isEmpty()) return;
        JSONObject unread = unreadJson();
        if (!unread.has(cleanPhone)) return;
        unread.remove(cleanPhone);
        setUiJson(KEY_UNREAD_IDS, unread);
    }

    private void setUiSettingAndRefresh(String key, boolean enabled, String message) {
        setUiSetting(key, enabled);
        showHome();
        setStatus(message == null || message.isEmpty() ? "Đã lưu cài đặt." : message);
    }

    private int themePrimary() {
        if ("women".equals(activeTheme)) return Color.rgb(219, 39, 119);
        if ("teacher".equals(activeTheme)) return Color.rgb(37, 99, 235);
        if ("earth".equals(activeTheme)) return Color.rgb(22, 163, 74);
        if ("peace".equals(activeTheme)) return Color.rgb(14, 165, 233);
        if ("tet".equals(activeTheme)) return Color.rgb(220, 38, 38);
        if ("superhero".equals(activeTheme)) return Color.rgb(225, 29, 72);
        if ("business".equals(activeTheme)) return Color.rgb(15, 118, 110);
        if ("mystic".equals(activeTheme)) return Color.rgb(139, 92, 246);
        if ("world".equals(activeTheme)) return Color.rgb(14, 165, 233);
        if ("humanity".equals(activeTheme)) return Color.rgb(249, 115, 22);
        if ("robot".equals(activeTheme)) return Color.rgb(37, 99, 235);
        if ("apocalypse".equals(activeTheme)) return Color.rgb(239, 68, 68);
        if ("cosmic-ai".equals(activeTheme)) return Color.rgb(99, 102, 241);
        return COLOR_PRIMARY;
    }

    private int themeSecondary() {
        if ("women".equals(activeTheme)) return Color.rgb(168, 85, 247);
        if ("teacher".equals(activeTheme)) return Color.rgb(217, 119, 6);
        if ("earth".equals(activeTheme)) return Color.rgb(2, 132, 199);
        if ("peace".equals(activeTheme)) return Color.rgb(124, 58, 237);
        if ("tet".equals(activeTheme)) return Color.rgb(234, 179, 8);
        if ("superhero".equals(activeTheme)) return Color.rgb(37, 99, 235);
        if ("business".equals(activeTheme)) return Color.rgb(51, 65, 85);
        if ("mystic".equals(activeTheme)) return Color.rgb(6, 182, 212);
        if ("world".equals(activeTheme)) return Color.rgb(34, 197, 94);
        if ("humanity".equals(activeTheme)) return Color.rgb(219, 39, 119);
        if ("robot".equals(activeTheme)) return Color.rgb(20, 184, 166);
        if ("apocalypse".equals(activeTheme)) return Color.rgb(245, 158, 11);
        if ("cosmic-ai".equals(activeTheme)) return Color.rgb(34, 211, 238);
        return Color.rgb(14, 116, 144);
    }

    private int themeBackground() {
        if ("women".equals(activeTheme)) return Color.rgb(253, 242, 248);
        if ("teacher".equals(activeTheme)) return Color.rgb(239, 246, 255);
        if ("earth".equals(activeTheme)) return Color.rgb(240, 253, 244);
        if ("peace".equals(activeTheme)) return Color.rgb(240, 249, 255);
        if ("tet".equals(activeTheme)) return Color.rgb(255, 247, 237);
        if ("superhero".equals(activeTheme)) return Color.rgb(248, 251, 255);
        if ("business".equals(activeTheme)) return Color.rgb(238, 246, 244);
        if ("mystic".equals(activeTheme)) return Color.rgb(5, 7, 18);
        if ("world".equals(activeTheme)) return Color.rgb(234, 248, 255);
        if ("humanity".equals(activeTheme)) return Color.rgb(255, 247, 237);
        if ("robot".equals(activeTheme)) return Color.rgb(238, 246, 255);
        if ("apocalypse".equals(activeTheme)) return Color.rgb(22, 11, 11);
        if ("cosmic-ai".equals(activeTheme)) return Color.rgb(8, 17, 31);
        return COLOR_BG;
    }

    private String themeTitle(String id) {
        if ("women".equals(id)) return "Quốc tế phụ nữ 8/3";
        if ("teacher".equals(id)) return "Nhà giáo Việt Nam 20/11";
        if ("earth".equals(id)) return "Ngày Trái Đất";
        if ("peace".equals(id)) return "Ngày Hòa bình thế giới";
        if ("tet".equals(id)) return "Tết Việt Nam";
        if ("superhero".equals(id)) return "Siêu nhân";
        if ("business".equals(id)) return "Business";
        if ("mystic".equals(id)) return "Huyền bí đen bóng";
        if ("world".equals(id)) return "Thế giới";
        if ("humanity".equals(id)) return "Con người";
        if ("robot".equals(id)) return "Robot AI";
        if ("apocalypse".equals(id)) return "Ngày tận thế";
        if ("cosmic-ai".equals(id)) return "Vũ trụ AI";
        return "Mặc định XPAY Chat";
    }

    private String lastMessagePreview(JSONObject conversation) {
        JSONArray messages = conversation.optJSONArray("messages");
        if (messages == null || messages.length() == 0) return "Chưa có tin mới";
        JSONObject lastMessage = messages.optJSONObject(messages.length() - 1);
        if (lastMessage == null) return "Chưa có tin mới";
        String text = lastMessage.optString("text", "");
        JSONObject media = lastMessage.optJSONObject("media");
        if (text.isEmpty() && media != null) text = media.optString("type", "").startsWith("video/") ? "[Video]" : "[Hình ảnh]";
        if (text.isEmpty()) text = "Tin nhắn mới";
        String owner = "me".equals(lastMessage.optString("from", "")) ? "Bạn: " : "";
        return owner + text;
    }

    private String lastMessageTime(JSONObject conversation) {
        JSONArray messages = conversation.optJSONArray("messages");
        JSONObject last = messages == null || messages.length() == 0 ? null : messages.optJSONObject(messages.length() - 1);
        if (last == null) return "";
        String time = last.optString("time", "");
        if (!time.isEmpty()) return time;
        String createdAt = last.optString("createdAt", conversation.optString("updatedAt", ""));
        if (createdAt.length() >= 16) return createdAt.substring(11, 16);
        return "";
    }

    private int unreadCount(JSONObject conversation) {
        String phone = conversation.optString("friendPhone", "");
        int localUnread = unreadIdsForPhone(phone).size();
        return Math.max(0, Math.min(99, Math.max(conversation.optInt("unreadCount", 0), localUnread)));
    }

    private String friendPayload() {
        JSONObject payload = new JSONObject();
        try {
            payload.put("type", "xpaychat-friend");
            payload.put("version", 2);
            payload.put("app", "XPAY Chat");
            payload.put("phone", userPhone());
            payload.put("name", displayName(user(), userPhone()));
        } catch (Exception ignored) {
        }
        return payload.toString();
    }

    private String readQrPhone(String value) {
        String raw = value == null ? "" : value.trim();
        if (raw.isEmpty()) return "";
        try {
            JSONObject data = new JSONObject(raw);
            String type = data.optString("type", "");
            if ("xpaychat-contact".equals(type) || "xpaychat-friend".equals(type)) {
                return normalizePhone(data.optString("phone", data.optString("accountPhone", "")));
            }
        } catch (Exception ignored) {
        }
        return normalizePhone(raw);
    }

    private String decodeQrFromUri(Uri uri) throws Exception {
        Bitmap bitmap;
        try (InputStream input = getContentResolver().openInputStream(uri)) {
            bitmap = BitmapFactory.decodeStream(input);
        }
        if (bitmap == null) throw new Exception("Không mở được ảnh QR.");
        return decodeQrFromBitmap(bitmap);
    }

    private String decodeQrFromBitmap(Bitmap bitmap) throws Exception {
        if (bitmap == null) throw new Exception("Không mở được ảnh QR.");
        int width = bitmap.getWidth();
        int height = bitmap.getHeight();
        int[] pixels = new int[width * height];
        bitmap.getPixels(pixels, 0, width, 0, 0, width, height);
        RGBLuminanceSource source = new RGBLuminanceSource(width, height, pixels);
        BinaryBitmap binaryBitmap = new BinaryBitmap(new HybridBinarizer(source));
        Result result = new MultiFormatReader().decode(binaryBitmap);
        if (result == null || result.getText() == null) throw new Exception("Không đọc được mã QR trong ảnh.");
        return result.getText();
    }

    private void handleQrText(String qrText) {
        String phone = readQrPhone(qrText);
        if (phone.isEmpty()) {
            setStatus("Không đọc được số điện thoại XPAY Chat từ mã QR.");
            return;
        }
        setStatus("Đã đọc mã QR, đang kết bạn...");
        requestFriend(phone, "friends");
    }

    private String normalizePhone(String value) {
        return value == null ? "" : value.replaceAll("[^0-9+]", "").trim();
    }

    private Bitmap createQrBitmap(String value, int size) {
        try {
            BitMatrix matrix = new QRCodeWriter().encode(value, BarcodeFormat.QR_CODE, size, size);
            Bitmap bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
            for (int x = 0; x < size; x++) {
                for (int y = 0; y < size; y++) {
                    bitmap.setPixel(x, y, matrix.get(x, y) ? COLOR_INK : Color.WHITE);
                }
            }
            return bitmap;
        } catch (Exception ignored) {
            return null;
        }
    }

    private LinearLayout baseRoot() {
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(dp(12), dp(32), dp(12), dp(72));
        layout.setBackgroundColor(themeBackground());
        layout.setFocusableInTouchMode(true);
        return layout;
    }

    private boolean handleBackNavigation() {
        if (!activeFriendPhone.isEmpty()) {
            activeFriendPhone = "";
            pendingReplyText = "";
            showHome();
            return true;
        }
        if (!"messages".equals(activeSection) && store != null && !store.token().isEmpty()) {
            activeSection = "messages";
            showHome();
            return true;
        }
        return false;
    }

    private ScrollView scroll(View view) {
        ScrollView scrollView = new ScrollView(this);
        scrollView.setFillViewport(true);
        scrollView.setBackgroundColor(themeBackground());
        scrollView.addView(view);
        appScroll = scrollView;
        return scrollView;
    }

    private void scrollConversationToBottom(View target) {
        if (!(target instanceof ScrollView)) return;
        ScrollView scrollView = (ScrollView) target;
        scrollView.postDelayed(() -> scrollView.fullScroll(View.FOCUS_DOWN), 80);
        scrollView.postDelayed(() -> scrollView.fullScroll(View.FOCUS_DOWN), 260);
        scrollView.postDelayed(() -> scrollView.fullScroll(View.FOCUS_DOWN), 560);
    }

    private String shorten(String value, int limit) {
        String clean = value == null ? "" : value.replace('\n', ' ').trim();
        if (clean.length() <= limit) return clean;
        return clean.substring(0, Math.max(0, limit - 3)) + "...";
    }

    private void addHero(LinearLayout layout) {
        LinearLayout hero = card();
        hero.setGravity(Gravity.CENTER_HORIZONTAL);
        hero.setBackground(stroked(Color.WHITE, Color.rgb(232, 238, 246), 8));
        TextView ai = new TextView(this);
        ai.setText("AI");
        ai.setTextSize(26);
        ai.setTypeface(Typeface.DEFAULT_BOLD);
        ai.setTextColor(Color.WHITE);
        ai.setGravity(Gravity.CENTER);
        ai.setBackground(gradient(new int[] { Color.rgb(7, 89, 133), Color.rgb(20, 184, 166), Color.rgb(37, 99, 235) }, 56));
        LinearLayout.LayoutParams aiParams = new LinearLayout.LayoutParams(dp(82), dp(82));
        aiParams.gravity = Gravity.CENTER_HORIZONTAL;
        aiParams.bottomMargin = dp(14);
        hero.addView(ai, aiParams);
        TextView brand = text("XPAY Chat", 34, COLOR_INK, true);
        brand.setGravity(Gravity.CENTER);
        hero.addView(brand);
        TextView copy = text("Mạng xã hội AI cho trò chuyện, gọi, nhật ký và kết nối quanh đây.", 15, COLOR_MUTED, false);
        copy.setGravity(Gravity.CENTER);
        copy.setPadding(0, dp(8), 0, 0);
        hero.addView(copy);
        layout.addView(hero);
    }

    private LinearLayout card() {
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setPadding(dp(14), dp(13), dp(14), dp(13));
        card.setBackground(stroked(COLOR_SURFACE, Color.rgb(230, 238, 246), 16));
        elevate(card, 0.9f);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        params.setMargins(0, dp(6), 0, dp(8));
        card.setLayoutParams(params);
        return card;
    }

    private LinearLayout compactCard() {
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setPadding(dp(12), dp(9), dp(12), dp(9));
        card.setBackground(stroked(COLOR_SURFACE, Color.rgb(232, 239, 247), 15));
        elevate(card, 0.7f);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        params.setMargins(0, dp(3), 0, dp(6));
        card.setLayoutParams(params);
        return card;
    }

    private LinearLayout composerCard() {
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setPadding(dp(8), dp(7), dp(8), dp(8));
        card.setBackground(stroked(Color.WHITE, Color.rgb(207, 219, 231), 18));
        elevate(card, 1.5f);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        params.setMargins(0, dp(8), 0, dp(42));
        card.setLayoutParams(params);
        return card;
    }

    private LinearLayout row() {
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER_VERTICAL);
        return row;
    }

    private LinearLayout infoCard(String title, String body) {
        LinearLayout card = card();
        card.addView(text(title, 16, COLOR_INK, true));
        card.addView(paragraph(body));
        return card;
    }

    private TextView label(String value) {
        TextView view = text(value, 12, themePrimary(), true);
        view.setLetterSpacing(0.08f);
        return view;
    }

    private TextView title(String value) {
        return text(value, 24, COLOR_INK, true);
    }

    private TextView sectionTitle(String value) {
        TextView view = text(value, 20, COLOR_INK, true);
        view.setPadding(dp(2), dp(8), 0, dp(6));
        return view;
    }

    private TextView paragraph(String value) {
        TextView view = text(value, 15, COLOR_MUTED, false);
        view.setLineSpacing(dp(2), 1.0f);
        view.setPadding(0, dp(5), 0, dp(8));
        return view;
    }

    private TextView status() {
        TextView view = text("", 14, themePrimary(), true);
        view.setPadding(dp(4), dp(4), dp(4), dp(6));
        return view;
    }

    private TextView text(String value, int sp, int color, boolean bold) {
        TextView view = new TextView(this);
        view.setText(value);
        view.setTextSize(sp);
        view.setTextColor(color);
        view.setTypeface(Typeface.DEFAULT, bold ? Typeface.BOLD : Typeface.NORMAL);
        return view;
    }

    private View avatarView(JSONObject source, String fallback, int size, int radius) {
        Bitmap bitmap = bitmapFromDataUri(source == null ? "" : source.optString("avatarData", ""));
        if (bitmap != null) {
            ImageView image = new ImageView(this);
            image.setImageBitmap(bitmap);
            image.setScaleType(ImageView.ScaleType.CENTER_CROP);
            image.setBackground(rounded(Color.rgb(238, 242, 247), radius));
            return image;
        }
        TextView avatar = text(initials(fallback), Math.max(15, size / dp(3)), Color.WHITE, true);
        avatar.setGravity(Gravity.CENTER);
        avatar.setBackground(gradient(new int[] { themePrimary(), themeSecondary() }, radius));
        return avatar;
    }

    private Bitmap bitmapFromDataUri(String value) {
        if (value == null || !value.startsWith("data:")) return null;
        int comma = value.indexOf(',');
        if (comma < 0) return null;
        try {
            byte[] bytes = Base64.decode(value.substring(comma + 1), Base64.DEFAULT);
            return BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
        } catch (Exception ignored) {
            return null;
        }
    }

    private TextView chip(String value) {
        TextView view = text(value, 12, Color.WHITE, true);
        view.setPadding(dp(10), dp(6), dp(10), dp(6));
        view.setBackground(rounded(Color.argb(58, 255, 255, 255), 18));
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        params.setMargins(0, 0, dp(8), 0);
        view.setLayoutParams(params);
        return view;
    }

    private View headerIcon(String kind, View.OnClickListener listener) {
        FrameLayout frame = iconFrame(kind, 40, 40, 19, listener, iconFill(kind), iconStroke(kind), iconTint(kind), 14);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(dp(40), dp(40));
        params.setMargins(dp(5), 0, 0, 0);
        frame.setLayoutParams(params);
        return frame;
    }

    private View squareAction(String kind, View.OnClickListener listener) {
        FrameLayout frame = iconFrame(kind, 42, 42, 20, listener, iconFill(kind), iconStroke(kind), iconTint(kind), 14);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(dp(42), dp(42));
        params.setMargins(dp(5), 0, 0, 0);
        frame.setLayoutParams(params);
        return frame;
    }

    private LinearLayout quickAction(String title, String icon, String section, View.OnClickListener listener) {
        boolean active = activeSection.equals(section);
        LinearLayout item = new LinearLayout(this);
        item.setOrientation(LinearLayout.VERTICAL);
        item.setGravity(Gravity.CENTER);
        item.setPadding(dp(2), dp(8), dp(2), dp(7));
        item.setBackground(active
            ? gradient(new int[] { themePrimary(), themeSecondary() }, 15)
            : stroked(Color.WHITE, Color.rgb(226, 235, 244), 15));
        elevate(item, 0.7f);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1);
        params.setMargins(dp(2), 0, dp(2), 0);
        item.setLayoutParams(params);
        View iconView = iconFrame(
            icon,
            34,
            34,
            18,
            null,
            active ? Color.argb(46, 255, 255, 255) : iconFill(icon),
            active ? Color.argb(120, 255, 255, 255) : iconStroke(icon),
            active ? Color.WHITE : iconTint(icon),
            999
        );
        LinearLayout.LayoutParams iconParams = new LinearLayout.LayoutParams(dp(34), dp(34));
        iconParams.gravity = Gravity.CENTER_HORIZONTAL;
        iconParams.setMargins(0, 0, 0, dp(5));
        TextView titleView = text(title, 11, active ? Color.WHITE : COLOR_INK, true);
        titleView.setGravity(Gravity.CENTER);
        titleView.setSingleLine(false);
        titleView.setMaxLines(2);
        titleView.setIncludeFontPadding(false);
        item.addView(iconView, iconParams);
        item.addView(titleView);
        item.setOnClickListener(listener);
        attachPressFeedback(item);
        return item;
    }

    private FrameLayout iconFrame(String kind, int widthDp, int heightDp, int iconDp, View.OnClickListener listener) {
        return iconFrame(kind, widthDp, heightDp, iconDp, listener, Color.rgb(246, 249, 252), COLOR_SOFT, COLOR_INK, 14);
    }

    private FrameLayout iconFrame(String kind, int widthDp, int heightDp, int iconDp, View.OnClickListener listener, int fill, int stroke, int color, int radiusDp) {
        FrameLayout frame = new FrameLayout(this);
        frame.setBackground(stroked(fill, stroke, radiusDp));
        elevate(frame, 0.6f);
        if (listener != null) {
            frame.setOnClickListener(listener);
            frame.setClickable(true);
            attachPressFeedback(frame);
        }
        ImageView image = iconImage(kind, iconDp, color);
        FrameLayout.LayoutParams imageParams = new FrameLayout.LayoutParams(dp(iconDp), dp(iconDp));
        imageParams.gravity = Gravity.CENTER;
        frame.addView(image, imageParams);
        frame.setMinimumWidth(dp(widthDp));
        frame.setMinimumHeight(dp(heightDp));
        return frame;
    }

    private ImageView iconImage(String kind, int sizeDp, int color) {
        ImageView image = new ImageView(this);
        image.setImageDrawable(new LineIconDrawable(kind, dp(sizeDp), color, dp(2)));
        image.setScaleType(ImageView.ScaleType.CENTER);
        return image;
    }

    private int iconTint(String kind) {
        if ("phone".equals(kind) || "video".equals(kind) || "add-user".equals(kind) || "users".equals(kind) || "theme".equals(kind) || "business".equals(kind)) return themePrimary();
        if ("qr".equals(kind) || "search".equals(kind) || "location".equals(kind)) return Color.rgb(14, 116, 144);
        if ("settings".equals(kind) || "shield".equals(kind)) return Color.rgb(37, 99, 235);
        if ("logout".equals(kind)) return Color.rgb(225, 87, 89);
        if ("emoji".equals(kind)) return Color.rgb(217, 119, 6);
        return COLOR_INK;
    }

    private int iconFill(String kind) {
        int tint = iconTint(kind);
        if ("phone".equals(kind) || "video".equals(kind) || "add-user".equals(kind) || "users".equals(kind) || "theme".equals(kind) || "business".equals(kind)) {
            return Color.argb(24, Color.red(themePrimary()), Color.green(themePrimary()), Color.blue(themePrimary()));
        }
        if (tint == Color.rgb(14, 116, 144)) return Color.rgb(236, 254, 255);
        if (tint == Color.rgb(37, 99, 235)) return Color.rgb(239, 246, 255);
        if (tint == Color.rgb(225, 87, 89)) return Color.rgb(254, 242, 242);
        if (tint == Color.rgb(217, 119, 6)) return Color.rgb(255, 251, 235);
        return Color.rgb(246, 249, 252);
    }

    private int iconStroke(String kind) {
        int tint = iconTint(kind);
        if ("phone".equals(kind) || "video".equals(kind) || "add-user".equals(kind) || "users".equals(kind) || "theme".equals(kind) || "business".equals(kind)) {
            return Color.argb(80, Color.red(themePrimary()), Color.green(themePrimary()), Color.blue(themePrimary()));
        }
        if (tint == Color.rgb(14, 116, 144)) return Color.rgb(165, 243, 252);
        if (tint == Color.rgb(37, 99, 235)) return Color.rgb(191, 219, 254);
        if (tint == Color.rgb(225, 87, 89)) return Color.rgb(254, 202, 202);
        if (tint == Color.rgb(217, 119, 6)) return Color.rgb(253, 230, 138);
        return COLOR_SOFT;
    }

    private String initials(String value) {
        String clean = value == null ? "" : value.trim();
        if (clean.isEmpty()) return "N";
        String[] parts = clean.split("\\s+");
        String first = parts[0].substring(0, 1);
        String second = parts.length > 1 ? parts[parts.length - 1].substring(0, 1) : "";
        return (first + second).toUpperCase(Locale.ROOT);
    }

    private void fitRowChild(View view) {
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
            0,
            LinearLayout.LayoutParams.WRAP_CONTENT,
            1
        );
        params.setMargins(dp(2), dp(6), dp(2), dp(10));
        view.setLayoutParams(params);
    }

    private EditText input(String hint) {
        EditText input = new EditText(this);
        input.setHint(hint);
        input.setTextSize(16);
        input.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_CAP_SENTENCES | InputType.TYPE_TEXT_FLAG_AUTO_CORRECT);
        input.setImeOptions(EditorInfo.IME_ACTION_DONE);
        input.setSingleLine(true);
        input.setTextColor(COLOR_INK);
        input.setHintTextColor(Color.rgb(100, 116, 139));
        input.setPadding(dp(14), dp(8), dp(14), dp(8));
        input.setBackground(stroked(Color.WHITE, Color.rgb(203, 213, 225), 16));
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        params.setMargins(0, dp(6), 0, dp(10));
        input.setLayoutParams(params);
        return input;
    }

    private EditText chatMessageInput(String hint) {
        EditText input = input(hint);
        input.setSingleLine(false);
        input.setMinLines(1);
        input.setMaxLines(4);
        input.setGravity(Gravity.CENTER_VERTICAL | Gravity.START);
        input.setHorizontallyScrolling(false);
        input.setInputType(
            InputType.TYPE_CLASS_TEXT |
            InputType.TYPE_TEXT_FLAG_MULTI_LINE |
            InputType.TYPE_TEXT_FLAG_CAP_SENTENCES |
            InputType.TYPE_TEXT_FLAG_AUTO_CORRECT
        );
        input.setImeOptions(EditorInfo.IME_ACTION_NONE);
        return input;
    }

    private Button tabButton(String text, String section) {
        Button button = activeSection.equals(section) ? primaryButton(text) : secondaryButton(text);
        button.setTextSize(13);
        button.setOnClickListener(view -> {
            activeSection = section;
            activeFriendPhone = "";
            showHome();
        });
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(0, dp(44), 1);
        params.setMargins(dp(2), 0, dp(2), 0);
        button.setLayoutParams(params);
        return button;
    }

    private Button primaryAction(String text, View.OnClickListener listener) {
        Button button = primaryButton(text);
        button.setOnClickListener(listener);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            dp(42)
        );
        params.setMargins(dp(3), dp(4), dp(3), dp(4));
        button.setLayoutParams(params);
        return button;
    }

    private Button secondaryAction(String text, View.OnClickListener listener) {
        Button button = secondaryButton(text);
        button.setOnClickListener(listener);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            dp(42)
        );
        params.setMargins(dp(3), dp(4), dp(3), dp(4));
        button.setLayoutParams(params);
        return button;
    }

    private Button slimAction(String text, View.OnClickListener listener, boolean primary) {
        Button button = primary ? primaryButton(text) : secondaryButton(text);
        button.setTextSize(11);
        button.setOnClickListener(listener);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            dp(32)
        );
        params.setMargins(dp(2), dp(2), dp(2), dp(2));
        button.setLayoutParams(params);
        return button;
    }

    private Button rowAction(String text, View.OnClickListener listener, boolean primary) {
        Button button = primary ? primaryButton(text) : secondaryButton(text);
        button.setTextSize(11);
        button.setSingleLine(true);
        button.setPadding(dp(4), 0, dp(4), 0);
        button.setOnClickListener(listener);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(0, dp(40), 1);
        params.setMargins(dp(2), dp(5), dp(2), dp(3));
        button.setLayoutParams(params);
        return button;
    }

    private Button toggleAction(String text, boolean active, View.OnClickListener listener) {
        Button button = rowAction(text, listener, active);
        button.setTextSize(12);
        return button;
    }

    private Button callControlButton(String text, View.OnClickListener listener) {
        Button button = secondaryButton(text);
        button.setTextSize(13);
        button.setPadding(dp(6), 0, dp(6), 0);
        button.setOnClickListener(listener);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(0, dp(58), 1);
        params.setMargins(dp(3), dp(5), dp(3), dp(5));
        button.setLayoutParams(params);
        return button;
    }

    private Button callPrimaryButton(String text, View.OnClickListener listener) {
        Button button = primaryButton(text);
        button.setTextSize(16);
        button.setOnClickListener(listener);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(0, dp(56), 1);
        params.setMargins(dp(3), dp(6), dp(3), dp(2));
        button.setLayoutParams(params);
        return button;
    }

    private Button callRejectButton(String text, View.OnClickListener listener) {
        Button button = callPrimaryButton(text, listener);
        button.setBackground(stroked(Color.rgb(255, 247, 237), Color.rgb(251, 146, 60), 16));
        button.setTextColor(Color.rgb(154, 52, 18));
        return button;
    }

    private Button callEndButton(String text, View.OnClickListener listener) {
        Button button = callControlButton(text, listener);
        button.setTextColor(Color.WHITE);
        button.setBackground(gradient(new int[] { Color.rgb(239, 68, 68), Color.rgb(185, 28, 28) }, 16));
        return button;
    }

    private View actionIcon(String kind, View.OnClickListener listener) {
        FrameLayout frame = iconFrame(kind, 32, 32, 15, listener, iconFill(kind), iconStroke(kind), iconTint(kind), 12);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(dp(32), dp(32));
        params.setMargins(dp(2), 0, 0, 0);
        frame.setLayoutParams(params);
        return frame;
    }

    private Button sendButton(View.OnClickListener listener) {
        Button button = primaryButton("Gửi");
        button.setTextSize(14);
        button.setOnClickListener(listener);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(dp(62), dp(44));
        params.setMargins(0, 0, 0, 0);
        button.setLayoutParams(params);
        return button;
    }

    private View composerIcon(String kind, View.OnClickListener listener) {
        FrameLayout frame = iconFrame(kind, 38, 44, 20, listener);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(dp(38), dp(44));
        params.setMargins(0, 0, dp(5), 0);
        frame.setLayoutParams(params);
        return frame;
    }

    private Button backButton(String text, View.OnClickListener listener) {
        Button button = secondaryButton(text);
        button.setGravity(Gravity.START | Gravity.CENTER_VERTICAL);
        button.setOnClickListener(listener);
        button.setLayoutParams(new LinearLayout.LayoutParams(dp(46), dp(44)));
        return button;
    }

    private Button tinyButton(String text, View.OnClickListener listener) {
        Button button = secondaryButton(text);
        button.setTextSize(11);
        button.setOnClickListener(listener);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        params.setMargins(dp(2), 0, dp(2), dp(4));
        button.setLayoutParams(params);
        return button;
    }

    private Button primaryButton(String value) {
        Button button = new Button(this);
        button.setText(value);
        button.setTextColor(Color.WHITE);
        button.setTextSize(15);
        button.setTypeface(Typeface.DEFAULT_BOLD);
        button.setAllCaps(false);
        button.setMinWidth(0);
        button.setMinHeight(0);
        button.setMinimumWidth(0);
        button.setMinimumHeight(0);
        button.setIncludeFontPadding(false);
        button.setPadding(dp(12), 0, dp(12), 0);
        button.setBackground(gradient(new int[] { themePrimary(), themeSecondary() }, 14));
        elevate(button, 0.7f);
        attachPressFeedback(button);
        return button;
    }

    private Button secondaryButton(String value) {
        Button button = new Button(this);
        button.setText(value);
        button.setTextColor(COLOR_INK);
        button.setTextSize(14);
        button.setAllCaps(false);
        button.setMinWidth(0);
        button.setMinHeight(0);
        button.setMinimumWidth(0);
        button.setMinimumHeight(0);
        button.setIncludeFontPadding(false);
        button.setPadding(dp(12), 0, dp(12), 0);
        button.setBackground(stroked(Color.rgb(247, 250, 253), COLOR_SOFT, 14));
        elevate(button, 0.3f);
        attachPressFeedback(button);
        return button;
    }

    private void attachPressFeedback(View view) {
        view.setOnTouchListener((target, event) -> {
            if (event.getAction() == MotionEvent.ACTION_DOWN) {
                target.setAlpha(0.72f);
                target.setScaleX(0.98f);
                target.setScaleY(0.98f);
            } else if (event.getAction() == MotionEvent.ACTION_UP || event.getAction() == MotionEvent.ACTION_CANCEL) {
                target.setAlpha(1f);
                target.setScaleX(1f);
                target.setScaleY(1f);
            }
            return false;
        });
    }

    private GradientDrawable rounded(int color, int radiusDp) {
        GradientDrawable drawable = new GradientDrawable();
        drawable.setColor(color);
        drawable.setCornerRadius(dp(radiusDp));
        return drawable;
    }

    private GradientDrawable stroked(int fill, int stroke, int radiusDp) {
        GradientDrawable drawable = rounded(fill, radiusDp);
        drawable.setStroke(dp(1), stroke);
        return drawable;
    }

    private GradientDrawable gradient(int[] colors, int radiusDp) {
        GradientDrawable drawable = new GradientDrawable(GradientDrawable.Orientation.TL_BR, colors);
        drawable.setCornerRadius(dp(radiusDp));
        return drawable;
    }

    private void elevate(View view, float valueDp) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            view.setElevation(valueDp * getResources().getDisplayMetrics().density);
        }
    }

    private void showLoading(String message) {
        LinearLayout layout = baseRoot();
        layout.setGravity(Gravity.CENTER);
        layout.addView(title(message));
        setContentView(scroll(layout));
    }

    private void setStatus(String message) {
        if (statusView != null) statusView.setText(message);
    }

    private void toast(String message) {
        if (message == null || message.trim().isEmpty()) return;
        Toast.makeText(this, message, Toast.LENGTH_SHORT).show();
    }

    private View touchedViewAt(View view, int rawX, int rawY) {
        if (view == null || view.getVisibility() != View.VISIBLE) return null;
        Rect bounds = new Rect();
        if (!view.getGlobalVisibleRect(bounds) || !bounds.contains(rawX, rawY)) return null;
        if (view instanceof ViewGroup) {
            ViewGroup group = (ViewGroup) view;
            for (int i = group.getChildCount() - 1; i >= 0; i--) {
                View child = touchedViewAt(group.getChildAt(i), rawX, rawY);
                if (child != null) return child;
            }
        }
        return view;
    }

    private boolean keepsKeyboardOpen(View view) {
        View current = view;
        while (current != null) {
            if (current instanceof EditText || current instanceof Button || current.hasOnClickListeners()) return true;
            ViewParent parent = current.getParent();
            current = parent instanceof View ? (View) parent : null;
        }
        return false;
    }

    private void showKeyboard(View view) {
        InputMethodManager keyboard = (InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE);
        if (keyboard != null && view != null) keyboard.showSoftInput(view, InputMethodManager.SHOW_IMPLICIT);
    }

    private void hideKeyboard(View view) {
        InputMethodManager keyboard = (InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE);
        if (keyboard != null && view != null) keyboard.hideSoftInputFromWindow(view.getWindowToken(), 0);
    }

    private int dp(int value) {
        return (int) (value * getResources().getDisplayMetrics().density + 0.5f);
    }

    private static final class SilentCallCallback implements NexaApi.Callback {
        @Override
        public void onSuccess(JSONObject data) {
        }

        @Override
        public void onError(String message) {
        }
    }

    private static final class LineIconDrawable extends Drawable {
        private final String kind;
        private final int size;
        private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final Path path = new Path();

        LineIconDrawable(String kind, int size, int color, int strokeWidth) {
            this.kind = kind == null ? "" : kind;
            this.size = size;
            paint.setColor(color);
            paint.setStrokeWidth(Math.max(2, strokeWidth));
            paint.setStyle(Paint.Style.STROKE);
            paint.setStrokeCap(Paint.Cap.ROUND);
            paint.setStrokeJoin(Paint.Join.ROUND);
            setBounds(0, 0, size, size);
        }

        @Override
        public int getIntrinsicWidth() {
            return size;
        }

        @Override
        public int getIntrinsicHeight() {
            return size;
        }

        @Override
        public void draw(Canvas canvas) {
            RectF b = new RectF(getBounds());
            if (b.width() <= 0 || b.height() <= 0) b = new RectF(0, 0, size, size);
            canvas.save();
            canvas.translate(b.left, b.top);
            float w = b.width();
            float h = b.height();
            float s = Math.min(w, h);
            canvas.scale(w / s, h / s);
            drawKind(canvas, s);
            canvas.restore();
        }

        private void drawKind(Canvas canvas, float s) {
            float p = s * 0.18f;
            if ("add-user".equals(kind)) {
                canvas.drawCircle(s * 0.42f, s * 0.34f, s * 0.16f, paint);
                canvas.drawArc(new RectF(s * 0.18f, s * 0.52f, s * 0.66f, s * 0.94f), 205, 130, false, paint);
                canvas.drawLine(s * 0.74f, s * 0.32f, s * 0.74f, s * 0.68f, paint);
                canvas.drawLine(s * 0.56f, s * 0.50f, s * 0.92f, s * 0.50f, paint);
                return;
            }
            if ("users".equals(kind)) {
                canvas.drawCircle(s * 0.38f, s * 0.34f, s * 0.14f, paint);
                canvas.drawCircle(s * 0.64f, s * 0.39f, s * 0.11f, paint);
                canvas.drawArc(new RectF(s * 0.16f, s * 0.54f, s * 0.62f, s * 0.92f), 205, 130, false, paint);
                canvas.drawArc(new RectF(s * 0.48f, s * 0.58f, s * 0.86f, s * 0.90f), 205, 120, false, paint);
                return;
            }
            if ("qr".equals(kind)) {
                float l = s * 0.28f;
                corner(canvas, p, p, l, true, true);
                corner(canvas, s - p, p, l, false, true);
                corner(canvas, p, s - p, l, true, false);
                corner(canvas, s - p, s - p, l, false, false);
                canvas.drawLine(s * 0.34f, s * 0.50f, s * 0.66f, s * 0.50f, paint);
                canvas.drawRect(s * 0.43f, s * 0.60f, s * 0.57f, s * 0.74f, paint);
                return;
            }
            if ("profile".equals(kind)) {
                canvas.drawCircle(s * 0.50f, s * 0.34f, s * 0.16f, paint);
                canvas.drawArc(new RectF(s * 0.20f, s * 0.54f, s * 0.80f, s * 0.96f), 200, 140, false, paint);
                return;
            }
            if ("shield".equals(kind)) {
                path.reset();
                path.moveTo(s * 0.50f, s * 0.12f);
                path.lineTo(s * 0.82f, s * 0.28f);
                path.lineTo(s * 0.76f, s * 0.72f);
                path.lineTo(s * 0.50f, s * 0.90f);
                path.lineTo(s * 0.24f, s * 0.72f);
                path.lineTo(s * 0.18f, s * 0.28f);
                path.close();
                canvas.drawPath(path, paint);
                canvas.drawLine(s * 0.36f, s * 0.52f, s * 0.47f, s * 0.63f, paint);
                canvas.drawLine(s * 0.47f, s * 0.63f, s * 0.66f, s * 0.42f, paint);
                return;
            }
            if ("settings".equals(kind)) {
                canvas.drawCircle(s * 0.50f, s * 0.50f, s * 0.15f, paint);
                for (int i = 0; i < 8; i++) {
                    double a = Math.PI * i / 4.0;
                    float x1 = s * 0.50f + (float) Math.cos(a) * s * 0.27f;
                    float y1 = s * 0.50f + (float) Math.sin(a) * s * 0.27f;
                    float x2 = s * 0.50f + (float) Math.cos(a) * s * 0.38f;
                    float y2 = s * 0.50f + (float) Math.sin(a) * s * 0.38f;
                    canvas.drawLine(x1, y1, x2, y2, paint);
                }
                return;
            }
            if ("theme".equals(kind)) {
                canvas.drawCircle(s * 0.50f, s * 0.50f, s * 0.34f, paint);
                canvas.drawCircle(s * 0.38f, s * 0.39f, s * 0.055f, paint);
                canvas.drawCircle(s * 0.61f, s * 0.36f, s * 0.055f, paint);
                canvas.drawCircle(s * 0.63f, s * 0.62f, s * 0.055f, paint);
                canvas.drawArc(new RectF(s * 0.30f, s * 0.52f, s * 0.62f, s * 0.82f), 40, 95, false, paint);
                return;
            }
            if ("business".equals(kind)) {
                path.reset();
                path.moveTo(s * 0.24f, s * 0.88f);
                path.lineTo(s * 0.24f, s * 0.32f);
                path.lineTo(s * 0.52f, s * 0.18f);
                path.lineTo(s * 0.52f, s * 0.88f);
                canvas.drawPath(path, paint);
                canvas.drawLine(s * 0.52f, s * 0.38f, s * 0.78f, s * 0.50f, paint);
                canvas.drawLine(s * 0.78f, s * 0.50f, s * 0.78f, s * 0.88f, paint);
                canvas.drawLine(s * 0.18f, s * 0.88f, s * 0.86f, s * 0.88f, paint);
                canvas.drawLine(s * 0.34f, s * 0.44f, s * 0.40f, s * 0.44f, paint);
                canvas.drawLine(s * 0.34f, s * 0.58f, s * 0.40f, s * 0.58f, paint);
                canvas.drawLine(s * 0.34f, s * 0.72f, s * 0.40f, s * 0.72f, paint);
                canvas.drawLine(s * 0.64f, s * 0.62f, s * 0.70f, s * 0.62f, paint);
                canvas.drawLine(s * 0.64f, s * 0.76f, s * 0.70f, s * 0.76f, paint);
                return;
            }
            if ("logout".equals(kind)) {
                canvas.drawLine(s * 0.20f, s * 0.20f, s * 0.20f, s * 0.80f, paint);
                canvas.drawLine(s * 0.20f, s * 0.20f, s * 0.48f, s * 0.20f, paint);
                canvas.drawLine(s * 0.20f, s * 0.80f, s * 0.48f, s * 0.80f, paint);
                canvas.drawLine(s * 0.42f, s * 0.50f, s * 0.84f, s * 0.50f, paint);
                canvas.drawLine(s * 0.68f, s * 0.34f, s * 0.84f, s * 0.50f, paint);
                canvas.drawLine(s * 0.68f, s * 0.66f, s * 0.84f, s * 0.50f, paint);
                return;
            }
            if ("phone".equals(kind)) {
                path.reset();
                path.moveTo(s * 0.30f, s * 0.18f);
                path.cubicTo(s * 0.18f, s * 0.25f, s * 0.24f, s * 0.52f, s * 0.47f, s * 0.73f);
                path.cubicTo(s * 0.68f, s * 0.94f, s * 0.86f, s * 0.82f, s * 0.82f, s * 0.70f);
                canvas.drawPath(path, paint);
                canvas.drawLine(s * 0.30f, s * 0.18f, s * 0.43f, s * 0.31f, paint);
                canvas.drawLine(s * 0.66f, s * 0.66f, s * 0.82f, s * 0.70f, paint);
                return;
            }
            if ("video".equals(kind)) {
                canvas.drawRoundRect(new RectF(s * 0.18f, s * 0.30f, s * 0.62f, s * 0.72f), s * 0.07f, s * 0.07f, paint);
                path.reset();
                path.moveTo(s * 0.62f, s * 0.44f);
                path.lineTo(s * 0.84f, s * 0.32f);
                path.lineTo(s * 0.84f, s * 0.70f);
                path.lineTo(s * 0.62f, s * 0.58f);
                canvas.drawPath(path, paint);
                return;
            }
            if ("info".equals(kind)) {
                canvas.drawCircle(s * 0.50f, s * 0.50f, s * 0.34f, paint);
                canvas.drawLine(s * 0.50f, s * 0.46f, s * 0.50f, s * 0.68f, paint);
                canvas.drawPoint(s * 0.50f, s * 0.34f, paint);
                return;
            }
            if ("search".equals(kind)) {
                canvas.drawCircle(s * 0.43f, s * 0.43f, s * 0.22f, paint);
                canvas.drawLine(s * 0.60f, s * 0.60f, s * 0.84f, s * 0.84f, paint);
                return;
            }
            if ("back".equals(kind)) {
                canvas.drawLine(s * 0.62f, s * 0.24f, s * 0.36f, s * 0.50f, paint);
                canvas.drawLine(s * 0.36f, s * 0.50f, s * 0.62f, s * 0.76f, paint);
                return;
            }
            if ("plus".equals(kind)) {
                canvas.drawLine(s * 0.50f, s * 0.24f, s * 0.50f, s * 0.76f, paint);
                canvas.drawLine(s * 0.24f, s * 0.50f, s * 0.76f, s * 0.50f, paint);
                return;
            }
            if ("location".equals(kind)) {
                path.reset();
                path.moveTo(s * 0.50f, s * 0.88f);
                path.cubicTo(s * 0.28f, s * 0.62f, s * 0.20f, s * 0.48f, s * 0.20f, s * 0.34f);
                path.cubicTo(s * 0.20f, s * 0.16f, s * 0.34f, s * 0.08f, s * 0.50f, s * 0.08f);
                path.cubicTo(s * 0.66f, s * 0.08f, s * 0.80f, s * 0.16f, s * 0.80f, s * 0.34f);
                path.cubicTo(s * 0.80f, s * 0.48f, s * 0.72f, s * 0.62f, s * 0.50f, s * 0.88f);
                canvas.drawPath(path, paint);
                canvas.drawCircle(s * 0.50f, s * 0.34f, s * 0.10f, paint);
                return;
            }
            if ("emoji".equals(kind)) {
                canvas.drawCircle(s * 0.50f, s * 0.50f, s * 0.34f, paint);
                canvas.drawPoint(s * 0.38f, s * 0.42f, paint);
                canvas.drawPoint(s * 0.62f, s * 0.42f, paint);
                canvas.drawArc(new RectF(s * 0.34f, s * 0.44f, s * 0.66f, s * 0.72f), 25, 130, false, paint);
                return;
            }
            canvas.drawCircle(s * 0.50f, s * 0.50f, s * 0.30f, paint);
        }

        private void corner(Canvas canvas, float x, float y, float l, boolean right, boolean down) {
            canvas.drawLine(x, y, x + (right ? l : -l), y, paint);
            canvas.drawLine(x, y, x, y + (down ? l : -l), paint);
        }

        @Override
        public void setAlpha(int alpha) {
            paint.setAlpha(alpha);
        }

        @Override
        public void setColorFilter(ColorFilter colorFilter) {
            paint.setColorFilter(colorFilter);
        }

        @Override
        public int getOpacity() {
            return PixelFormat.TRANSLUCENT;
        }
    }

    private final class BasicCallback implements NexaApi.Callback {
        private final String successMessage;
        private final Runnable next;

        BasicCallback(String successMessage, Runnable next) {
            this.successMessage = successMessage;
            this.next = next;
        }

        @Override
        public void onSuccess(JSONObject data) {
            setStatus(successMessage);
            toast(successMessage);
            if (next != null) next.run();
        }

        @Override
        public void onError(String message) {
            setStatus(message);
            toast(message);
        }
    }
}
