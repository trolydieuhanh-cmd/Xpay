package com.gatewayxpay.chatnative;

import android.content.Context;
import android.media.AudioAttributes;
import android.media.AudioDeviceInfo;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;

import org.json.JSONArray;
import org.json.JSONObject;
import org.webrtc.AudioSource;
import org.webrtc.AudioTrack;
import org.webrtc.Camera1Enumerator;
import org.webrtc.Camera2Enumerator;
import org.webrtc.CameraEnumerator;
import org.webrtc.DataChannel;
import org.webrtc.DefaultVideoDecoderFactory;
import org.webrtc.DefaultVideoEncoderFactory;
import org.webrtc.EglBase;
import org.webrtc.IceCandidate;
import org.webrtc.MediaConstraints;
import org.webrtc.MediaStream;
import org.webrtc.MediaStreamTrack;
import org.webrtc.PeerConnection;
import org.webrtc.PeerConnectionFactory;
import org.webrtc.RtpReceiver;
import org.webrtc.RtpTransceiver;
import org.webrtc.SessionDescription;
import org.webrtc.SurfaceTextureHelper;
import org.webrtc.SurfaceViewRenderer;
import org.webrtc.VideoCapturer;
import org.webrtc.VideoSource;
import org.webrtc.VideoTrack;
import org.webrtc.audio.AudioDeviceModule;
import org.webrtc.audio.JavaAudioDeviceModule;
import org.webrtc.SdpObserver;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

final class NexaCallEngine {
    interface Listener {
        void onSignal(String type, JSONObject payload);
        void onState(String state);
        void onError(String message);
    }

    private static boolean initialized;

    private final Context context;
    private final Listener listener;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final EglBase eglBase = EglBase.create();
    private final AudioManager audioManager;

    private AudioDeviceModule audioDeviceModule;
    private PeerConnectionFactory factory;
    private PeerConnection peerConnection;
    private AudioSource audioSource;
    private AudioTrack audioTrack;
    private VideoSource videoSource;
    private VideoTrack videoTrack;
    private VideoCapturer videoCapturer;
    private SurfaceTextureHelper surfaceTextureHelper;
    private SurfaceViewRenderer localRenderer;
    private SurfaceViewRenderer remoteRenderer;
    private final List<IceCandidate> pendingRemoteCandidates = new ArrayList<>();
    private int previousAudioMode = AudioManager.MODE_NORMAL;
    private boolean previousSpeaker;
    private AudioFocusRequest audioFocusRequest;
    private boolean micEnabled = true;
    private boolean speakerEnabled;
    private boolean cameraEnabled = true;
    private boolean videoMode;
    private boolean remoteDescriptionReady;

    NexaCallEngine(Context context, Listener listener) {
        this.context = context.getApplicationContext();
        this.listener = listener;
        this.audioManager = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
    }

    EglBase.Context eglContext() {
        return eglBase.getEglBaseContext();
    }

    void setRenderers(SurfaceViewRenderer localRenderer, SurfaceViewRenderer remoteRenderer) {
        this.localRenderer = localRenderer;
        this.remoteRenderer = remoteRenderer;
        if (videoTrack != null && localRenderer != null) videoTrack.addSink(localRenderer);
    }

    void start(String mode, JSONArray iceServersJson, boolean createOffer) throws Exception {
        videoMode = "video".equals(mode);
        remoteDescriptionReady = false;
        pendingRemoteCandidates.clear();
        prepareAudioRoute();
        ensureFactory();
        createPeerConnection(iceServersJson);
        addLocalMedia();
        postState(createOffer ? "Đang tạo tín hiệu gọi..." : "Đang chờ tín hiệu gọi...");
        if (createOffer) createOffer();
    }

    void processSignal(JSONObject signal) {
        if (peerConnection == null || signal == null) return;
        String type = signal.optString("type", "");
        JSONObject payload = signal.optJSONObject("payload");
        if (payload == null) return;
        if ("offer".equals(type)) {
            if (peerConnection.signalingState() != PeerConnection.SignalingState.STABLE) {
                postState("Đã bỏ qua tín hiệu gọi trùng.");
                return;
            }
            setRemoteDescription(SessionDescription.Type.OFFER, payload.optString("sdp", ""), true);
        } else if ("answer".equals(type)) {
            if (peerConnection.signalingState() != PeerConnection.SignalingState.HAVE_LOCAL_OFFER) {
                postState("Đã bỏ qua tín hiệu trả lời trùng.");
                return;
            }
            setRemoteDescription(SessionDescription.Type.ANSWER, payload.optString("sdp", ""), false);
        } else if ("candidate".equals(type)) {
            String candidate = payload.optString("candidate", "");
            if (candidate.isEmpty()) return;
            IceCandidate iceCandidate = new IceCandidate(
                payload.optString("sdpMid", ""),
                payload.optInt("sdpMLineIndex", 0),
                candidate
            );
            if (remoteDescriptionReady) {
                peerConnection.addIceCandidate(iceCandidate);
            } else {
                pendingRemoteCandidates.add(iceCandidate);
                postState("Đang giữ tín hiệu mạng để nối cuộc gọi...");
            }
        }
    }

    boolean toggleMic() {
        micEnabled = !micEnabled;
        if (audioTrack != null) audioTrack.setEnabled(micEnabled);
        return micEnabled;
    }

    boolean toggleSpeaker() {
        speakerEnabled = !speakerEnabled;
        reinforceAudioRoute();
        return speakerEnabled;
    }

    boolean toggleCamera() {
        cameraEnabled = !cameraEnabled;
        if (videoTrack != null) videoTrack.setEnabled(cameraEnabled);
        return cameraEnabled;
    }

    boolean isSpeakerEnabled() {
        return speakerEnabled;
    }

    boolean isMicEnabled() {
        return micEnabled;
    }

    boolean isCameraEnabled() {
        return cameraEnabled;
    }

    void release() {
        try {
            if (videoTrack != null && localRenderer != null) videoTrack.removeSink(localRenderer);
        } catch (Exception ignored) {
        }
        try {
            if (videoCapturer != null) videoCapturer.stopCapture();
        } catch (Exception ignored) {
        }
        if (videoCapturer != null) videoCapturer.dispose();
        if (surfaceTextureHelper != null) surfaceTextureHelper.dispose();
        if (videoSource != null) videoSource.dispose();
        if (audioSource != null) audioSource.dispose();
        if (peerConnection != null) {
            peerConnection.close();
            peerConnection.dispose();
        }
        if (factory != null) factory.dispose();
        if (audioDeviceModule != null) audioDeviceModule.release();
        if (audioManager != null) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                audioManager.clearCommunicationDevice();
            }
            audioManager.setSpeakerphoneOn(previousSpeaker);
            audioManager.setMode(previousAudioMode);
            audioManager.setMicrophoneMute(false);
            abandonAudioFocus();
        }
        pendingRemoteCandidates.clear();
        remoteDescriptionReady = false;
        eglBase.release();
        peerConnection = null;
        factory = null;
    }

    private void ensureFactory() {
        if (!initialized) {
            PeerConnectionFactory.initialize(
                PeerConnectionFactory.InitializationOptions.builder(context)
                    .setEnableInternalTracer(false)
                    .createInitializationOptions()
            );
            initialized = true;
        }
        DefaultVideoEncoderFactory encoderFactory = new DefaultVideoEncoderFactory(eglBase.getEglBaseContext(), true, true);
        DefaultVideoDecoderFactory decoderFactory = new DefaultVideoDecoderFactory(eglBase.getEglBaseContext());
        audioDeviceModule = JavaAudioDeviceModule.builder(context)
            .setUseHardwareAcousticEchoCanceler(true)
            .setUseHardwareNoiseSuppressor(true)
            .createAudioDeviceModule();
        factory = PeerConnectionFactory.builder()
            .setAudioDeviceModule(audioDeviceModule)
            .setVideoEncoderFactory(encoderFactory)
            .setVideoDecoderFactory(decoderFactory)
            .createPeerConnectionFactory();
    }

    private void createPeerConnection(JSONArray iceServersJson) throws Exception {
        PeerConnection.RTCConfiguration configuration = new PeerConnection.RTCConfiguration(parseIceServers(iceServersJson));
        configuration.sdpSemantics = PeerConnection.SdpSemantics.UNIFIED_PLAN;
        configuration.continualGatheringPolicy = PeerConnection.ContinualGatheringPolicy.GATHER_CONTINUALLY;
        peerConnection = factory.createPeerConnection(configuration, new PeerConnection.Observer() {
            @Override
            public void onSignalingChange(PeerConnection.SignalingState signalingState) {
            }

            @Override
            public void onIceConnectionChange(PeerConnection.IceConnectionState state) {
                if (state == PeerConnection.IceConnectionState.CONNECTED || state == PeerConnection.IceConnectionState.COMPLETED) {
                    applyAudioRoute();
                }
                postState(connectionText(state));
            }

            @Override
            public void onIceConnectionReceivingChange(boolean receiving) {
            }

            @Override
            public void onIceGatheringChange(PeerConnection.IceGatheringState iceGatheringState) {
            }

            @Override
            public void onIceCandidate(IceCandidate candidate) {
                JSONObject payload = new JSONObject();
                put(payload, "candidate", candidate.sdp);
                put(payload, "sdpMid", candidate.sdpMid);
                put(payload, "sdpMLineIndex", candidate.sdpMLineIndex);
                postSignal("candidate", payload);
            }

            @Override
            public void onIceCandidatesRemoved(IceCandidate[] iceCandidates) {
            }

            @Override
            public void onAddStream(MediaStream stream) {
                attachRemoteStream(stream);
            }

            @Override
            public void onRemoveStream(MediaStream stream) {
            }

            @Override
            public void onDataChannel(DataChannel dataChannel) {
            }

            @Override
            public void onRenegotiationNeeded() {
            }

            @Override
            public void onAddTrack(RtpReceiver receiver, MediaStream[] mediaStreams) {
                MediaStreamTrack track = receiver.track();
                if (track instanceof AudioTrack) {
                    ((AudioTrack) track).setEnabled(true);
                    reinforceAudioRoute();
                    postState("Đã nhận luồng âm thanh.");
                }
                if (track instanceof VideoTrack && remoteRenderer != null) {
                    ((VideoTrack) track).addSink(remoteRenderer);
                }
            }

            @Override
            public void onTrack(RtpTransceiver transceiver) {
                if (transceiver == null || transceiver.getReceiver() == null) return;
                MediaStreamTrack track = transceiver.getReceiver().track();
                if (track instanceof AudioTrack) {
                    ((AudioTrack) track).setEnabled(true);
                    reinforceAudioRoute();
                    postState("Đã nhận luồng âm thanh.");
                }
                if (track instanceof VideoTrack && remoteRenderer != null) {
                    ((VideoTrack) track).addSink(remoteRenderer);
                }
            }
        });
        if (peerConnection == null) throw new IllegalStateException("Không tạo được kênh WebRTC.");
    }

    private void addLocalMedia() throws Exception {
        MediaConstraints audioConstraints = new MediaConstraints();
        audioSource = factory.createAudioSource(audioConstraints);
        audioTrack = factory.createAudioTrack("nexa-audio", audioSource);
        audioTrack.setEnabled(micEnabled);
        peerConnection.addTrack(audioTrack, Collections.singletonList("xpaychat"));
        reinforceAudioRoute();

        if (!videoMode) return;
        videoCapturer = createCameraCapturer();
        if (videoCapturer == null) throw new IllegalStateException("Không mở được camera.");
        surfaceTextureHelper = SurfaceTextureHelper.create("NexaVideoCapture", eglBase.getEglBaseContext());
        videoSource = factory.createVideoSource(false);
        videoCapturer.initialize(surfaceTextureHelper, context, videoSource.getCapturerObserver());
        videoCapturer.startCapture(640, 480, 24);
        videoTrack = factory.createVideoTrack("nexa-video", videoSource);
        videoTrack.setEnabled(cameraEnabled);
        if (localRenderer != null) videoTrack.addSink(localRenderer);
        peerConnection.addTrack(videoTrack, Collections.singletonList("xpaychat"));
    }

    private VideoCapturer createCameraCapturer() {
        CameraEnumerator enumerator = Camera2Enumerator.isSupported(context)
            ? new Camera2Enumerator(context)
            : new Camera1Enumerator(false);
        String[] names = enumerator.getDeviceNames();
        for (String name : names) {
            if (enumerator.isFrontFacing(name)) {
                VideoCapturer capturer = enumerator.createCapturer(name, null);
                if (capturer != null) return capturer;
            }
        }
        for (String name : names) {
            VideoCapturer capturer = enumerator.createCapturer(name, null);
            if (capturer != null) return capturer;
        }
        return null;
    }

    private void createOffer() {
        peerConnection.createOffer(new LocalSdpObserver(SessionDescription.Type.OFFER), offerConstraints());
    }

    private void createAnswer() {
        peerConnection.createAnswer(new LocalSdpObserver(SessionDescription.Type.ANSWER), offerConstraints());
    }

    private void setRemoteDescription(SessionDescription.Type type, String sdp, boolean answerAfterSet) {
        if (sdp.isEmpty()) return;
        SessionDescription description = new SessionDescription(type, sdp);
        peerConnection.setRemoteDescription(new SdpObserver() {
            @Override
            public void onCreateSuccess(SessionDescription sessionDescription) {
            }

            @Override
            public void onSetSuccess() {
                remoteDescriptionReady = true;
                flushPendingRemoteCandidates();
                reinforceAudioRoute();
                postState(answerAfterSet ? "Đã nhận cuộc gọi, đang trả lời..." : "Đã nối tín hiệu thoại.");
                if (answerAfterSet) createAnswer();
            }

            @Override
            public void onCreateFailure(String error) {
            }

            @Override
            public void onSetFailure(String error) {
                postError("Không nhận được tín hiệu cuộc gọi: " + error);
            }
        }, description);
    }

    private void flushPendingRemoteCandidates() {
        if (peerConnection == null || pendingRemoteCandidates.isEmpty()) return;
        for (IceCandidate candidate : new ArrayList<>(pendingRemoteCandidates)) {
            peerConnection.addIceCandidate(candidate);
        }
        pendingRemoteCandidates.clear();
    }

    private MediaConstraints offerConstraints() {
        MediaConstraints constraints = new MediaConstraints();
        constraints.mandatory.add(new MediaConstraints.KeyValuePair("OfferToReceiveAudio", "true"));
        constraints.mandatory.add(new MediaConstraints.KeyValuePair("OfferToReceiveVideo", videoMode ? "true" : "false"));
        return constraints;
    }

    private List<PeerConnection.IceServer> parseIceServers(JSONArray items) {
        List<PeerConnection.IceServer> servers = new ArrayList<>();
        for (int i = 0; items != null && i < items.length(); i++) {
            JSONObject item = items.optJSONObject(i);
            if (item == null) continue;
            List<String> urls = new ArrayList<>();
            Object rawUrls = item.opt("urls");
            if (rawUrls instanceof JSONArray) {
                JSONArray array = (JSONArray) rawUrls;
                for (int j = 0; j < array.length(); j++) {
                    String value = array.optString(j, "");
                    if (!value.isEmpty()) urls.add(value);
                }
            } else {
                String value = item.optString("urls", "");
                if (!value.isEmpty()) urls.add(value);
            }
            if (urls.isEmpty()) continue;
            PeerConnection.IceServer.Builder builder = PeerConnection.IceServer.builder(urls);
            String username = item.optString("username", "");
            String credential = item.optString("credential", "");
            if (!username.isEmpty()) builder.setUsername(username);
            if (!credential.isEmpty()) builder.setPassword(credential);
            servers.add(builder.createIceServer());
        }
        if (servers.isEmpty()) {
            servers.add(PeerConnection.IceServer.builder("stun:stun.l.google.com:19302").createIceServer());
        }
        return servers;
    }

    private void attachRemoteStream(MediaStream stream) {
        if (stream == null || stream.videoTracks.isEmpty() || remoteRenderer == null) return;
        stream.videoTracks.get(0).addSink(remoteRenderer);
    }

    private void prepareAudioRoute() {
        if (audioManager == null) return;
        previousAudioMode = audioManager.getMode();
        previousSpeaker = audioManager.isSpeakerphoneOn();
        speakerEnabled = false;
        requestAudioFocus();
        audioManager.setMicrophoneMute(false);
        audioManager.setMode(AudioManager.MODE_IN_COMMUNICATION);
        bumpCallVolumeIfMuted();
        reinforceAudioRoute();
    }

    private void requestAudioFocus() {
        if (audioManager == null) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            AudioAttributes attributes = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION)
                .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                .build();
            audioFocusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
                .setAudioAttributes(attributes)
                .setAcceptsDelayedFocusGain(false)
                .setOnAudioFocusChangeListener(focusChange -> {
                }, mainHandler)
                .build();
            audioManager.requestAudioFocus(audioFocusRequest);
        } else {
            audioManager.requestAudioFocus(null, AudioManager.STREAM_VOICE_CALL, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT);
        }
    }

    private void abandonAudioFocus() {
        if (audioManager == null) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && audioFocusRequest != null) {
            audioManager.abandonAudioFocusRequest(audioFocusRequest);
            audioFocusRequest = null;
        } else {
            audioManager.abandonAudioFocus(null);
        }
    }

    private void applyAudioRoute() {
        if (audioManager == null) return;
        audioManager.setMode(AudioManager.MODE_IN_COMMUNICATION);
        audioManager.setMicrophoneMute(false);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            AudioDeviceInfo target = preferredCommunicationDevice(speakerEnabled);
            if (target != null) {
                audioManager.setCommunicationDevice(target);
            } else if (!speakerEnabled) {
                audioManager.clearCommunicationDevice();
            }
        }
        audioManager.setSpeakerphoneOn(speakerEnabled);
    }

    private void reinforceAudioRoute() {
        applyAudioRoute();
        mainHandler.postDelayed(this::applyAudioRoute, 180);
        mainHandler.postDelayed(this::applyAudioRoute, 650);
        mainHandler.postDelayed(this::applyAudioRoute, 1400);
    }

    private void bumpCallVolumeIfMuted() {
        if (audioManager == null) return;
        try {
            int max = audioManager.getStreamMaxVolume(AudioManager.STREAM_VOICE_CALL);
            int current = audioManager.getStreamVolume(AudioManager.STREAM_VOICE_CALL);
            if (max > 0 && current == 0) {
                audioManager.setStreamVolume(AudioManager.STREAM_VOICE_CALL, Math.max(1, max / 2), 0);
            }
        } catch (Exception ignored) {
        }
    }

    private AudioDeviceInfo preferredCommunicationDevice(boolean speaker) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S || audioManager == null) return null;
        int targetType = speaker ? AudioDeviceInfo.TYPE_BUILTIN_SPEAKER : AudioDeviceInfo.TYPE_BUILTIN_EARPIECE;
        for (AudioDeviceInfo device : audioManager.getAvailableCommunicationDevices()) {
            if (device.getType() == targetType) return device;
        }
        return null;
    }

    private String connectionText(PeerConnection.IceConnectionState state) {
        if (state == PeerConnection.IceConnectionState.CONNECTED || state == PeerConnection.IceConnectionState.COMPLETED) {
            return "Đã nối âm thanh thời gian thực.";
        }
        if (state == PeerConnection.IceConnectionState.CHECKING) return "Đang kiểm tra đường truyền...";
        if (state == PeerConnection.IceConnectionState.DISCONNECTED) return "Tín hiệu đang yếu, đang nối lại...";
        if (state == PeerConnection.IceConnectionState.FAILED) return "Không nối được âm thanh. Hãy thử gọi lại.";
        return "Đang giữ cuộc gọi.";
    }

    private void postSignal(String type, JSONObject payload) {
        mainHandler.post(() -> listener.onSignal(type, payload));
    }

    private void postState(String state) {
        mainHandler.post(() -> listener.onState(state));
    }

    private void postError(String message) {
        mainHandler.post(() -> listener.onError(message));
    }

    private static void put(JSONObject body, String key, Object value) {
        try {
            body.put(key, value);
        } catch (Exception ignored) {
        }
    }

    private final class LocalSdpObserver implements SdpObserver {
        private final SessionDescription.Type type;

        LocalSdpObserver(SessionDescription.Type type) {
            this.type = type;
        }

        @Override
        public void onCreateSuccess(SessionDescription description) {
            peerConnection.setLocalDescription(new SdpObserver() {
                @Override
                public void onCreateSuccess(SessionDescription sessionDescription) {
                }

                @Override
                public void onSetSuccess() {
                    JSONObject payload = new JSONObject();
                    put(payload, "type", description.type.canonicalForm());
                    put(payload, "sdp", description.description);
                    postSignal(type == SessionDescription.Type.OFFER ? "offer" : "answer", payload);
                    postState(type == SessionDescription.Type.OFFER ? "Đang đổ chuông..." : "Đã trả lời cuộc gọi.");
                }

                @Override
                public void onCreateFailure(String error) {
                }

                @Override
                public void onSetFailure(String error) {
                    postError("Không đặt được tín hiệu cuộc gọi: " + error);
                }
            }, description);
        }

        @Override
        public void onSetSuccess() {
        }

        @Override
        public void onCreateFailure(String error) {
            postError("Không tạo được tín hiệu cuộc gọi: " + error);
        }

        @Override
        public void onSetFailure(String error) {
            postError("Không đặt được tín hiệu cuộc gọi: " + error);
        }
    }
}
