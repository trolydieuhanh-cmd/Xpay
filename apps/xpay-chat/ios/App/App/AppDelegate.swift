import UIKit
import Capacitor
import UserNotifications
import CoreLocation
import CoreImage
import ImageIO
import AudioToolbox
import AVFoundation
import WebRTC

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        configureNotificationActions()
        UNUserNotificationCenter.current().delegate = self
        window = UIWindow(frame: UIScreen.main.bounds)
        window?.rootViewController = NexaNativeViewController()
        window?.makeKeyAndVisible()
        return true
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
        let token = deviceToken.map { String(format: "%02x", $0) }.joined()
        let store = NexaNativeStore()
        store.pushToken = token
        guard !store.token.isEmpty else { return }
        let api = NexaNativeApi()
        api.token = store.token
        api.post("/api/push/register", body: [
            "token": token,
            "platform": "ios",
            "provider": "apns",
            "deviceId": store.deviceId,
            "enabled": true
        ], auth: true) { _ in }
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }

    func application(_ application: UIApplication, didReceiveRemoteNotification userInfo: [AnyHashable: Any], fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void) {
        guard let controller = window?.rootViewController as? NexaNativeViewController else {
            completionHandler(.noData)
            return
        }
        controller.handlePushRoute(userInfo: userInfo, action: "") {
            completionHandler(.newData)
        }
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner, .list, .sound, .badge])
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void) {
        let action: String
        switch response.actionIdentifier {
        case "XPAYCHAT_ANSWER_CALL": action = "accept"
        case "XPAYCHAT_REJECT_CALL": action = "reject"
        default: action = ""
        }
        guard let controller = window?.rootViewController as? NexaNativeViewController else {
            completionHandler()
            return
        }
        controller.handlePushRoute(userInfo: response.notification.request.content.userInfo, action: action, completion: completionHandler)
    }

    private func configureNotificationActions() {
        let answer = UNNotificationAction(identifier: "XPAYCHAT_ANSWER_CALL", title: "Nghe máy", options: [.foreground])
        let reject = UNNotificationAction(identifier: "XPAYCHAT_REJECT_CALL", title: "Từ chối", options: [.destructive, .foreground])
        let call = UNNotificationCategory(identifier: "XPAYCHAT_CALL", actions: [answer, reject], intentIdentifiers: [], options: [.customDismissAction])
        let message = UNNotificationCategory(identifier: "XPAYCHAT_MESSAGE", actions: [], intentIdentifiers: [], options: [])
        UNUserNotificationCenter.current().setNotificationCategories([call, message])
    }
}

final class NexaNativeViewController: UIViewController, UIImagePickerControllerDelegate, UINavigationControllerDelegate, UITextFieldDelegate, CLLocationManagerDelegate {
    private let api = NexaNativeApi()
    private let store = NexaNativeStore()
    private let bg = UIColor(red: 248/255, green: 250/255, blue: 252/255, alpha: 1)
    private let ink = UIColor(red: 15/255, green: 23/255, blue: 42/255, alpha: 1)
    private let muted = UIColor(red: 102/255, green: 112/255, blue: 133/255, alpha: 1)
    private let primary = UIColor(red: 0, green: 168/255, blue: 132/255, alpha: 1)
    private let panel = UIColor(red: 241/255, green: 245/255, blue: 249/255, alpha: 1)
    private let softBorder = UIColor(red: 226/255, green: 232/255, blue: 240/255, alpha: 1)

    private var state: [String: Any] = [:]
    private var activeSection = "messages"
    private var activeFriendPhone = ""
    private var statusLabel = UILabel()
    private var rootScroll = UIScrollView()
    private var rootStack = UIStackView()
    private var aiHistory: [[String: String]] = []
    private var businessEditorOpen = false
    private var pendingAvatarData = ""
    private var pendingLogoData = ""
    private var pendingGalleryData: [String] = []
    private var pendingJournalImage: [String: Any]?
    private var pendingJournalDraftText = ""
    private var pendingJournalPrivacy = "friends"
    private var pendingReplyText = ""
    private var imagePickTarget = "logo"
    private let locationManager = CLLocationManager()
    private var lastKnownLocation: CLLocation?
    private let smokeMode = CommandLine.arguments.contains("--nexa-smoke")
    private var focusComposerAfterRender = false
    private var focusAiComposerAfterRender = false
    private let unreadIdsKey = "xpaychat.native.ios.unread.ids"
    private let knownIncomingIdsKey = "xpaychat.native.ios.known.incoming.ids"
    private let foregroundSyncDelay: TimeInterval = 1.3
    private var foregroundSyncTimer: Timer?
    private var foregroundSyncInFlight = false
    private var renderSignature = ""
    private var keyboardVisible = false
    private var keyboardOverlap: CGFloat = 0
    private var activeComposerBottomConstraint: NSLayoutConstraint?
    private var activeComposerHeight: CGFloat = 0
    private var sectionHistory: [String] = []
    private var sectionBeforeChat = "messages"
    private var sectionBeforeCall = "calls"
    private var activeCallId = ""
    private var activeCallStatus = ""
    private var activeCallMode = "voice"
    private var callMicMuted = false
    private var callSpeakerOn = false
    private var callCameraOff = false
    private var callMicButton: UIButton?
    private var callSpeakerButton: UIButton?
    private var callCameraButton: UIButton?
    private var ringbackTimer: Timer?
    private let nativeRtc = NexaNativeWebRTC()

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = bg
        api.token = store.token
        locationManager.delegate = self
        NotificationCenter.default.addObserver(self, selector: #selector(keyboardWillChange(_:)), name: UIResponder.keyboardWillChangeFrameNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(appDidBecomeActive), name: UIApplication.didBecomeActiveNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(appWillResignActive), name: UIApplication.willResignActiveNotification, object: nil)
        let backSwipe = UIScreenEdgePanGestureRecognizer(target: self, action: #selector(handleBackSwipe(_:)))
        backSwipe.edges = .left
        view.addGestureRecognizer(backSwipe)
        if smokeMode {
            runSmokeHarness()
            return
        }
        if store.token.isEmpty {
            renderAuth(mode: "login")
        } else {
            restoreSession()
        }
    }

    deinit {
        stopForegroundSync()
        stopRingback()
        nativeRtc.stop()
        NotificationCenter.default.removeObserver(self)
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        lastKnownLocation = locations.last
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        setStatus("Chưa lấy được vị trí. Hãy cấp quyền vị trí.")
    }

    @objc private func keyboardWillChange(_ notification: Notification) {
        guard let frame = notification.userInfo?[UIResponder.keyboardFrameEndUserInfoKey] as? CGRect else { return }
        let overlap = max(0, view.bounds.maxY - frame.minY)
        keyboardOverlap = overlap
        keyboardVisible = overlap > 0
        if let bottom = activeComposerBottomConstraint {
            let duration = notification.userInfo?[UIResponder.keyboardAnimationDurationUserInfoKey] as? TimeInterval ?? 0.25
            updateFixedComposerForKeyboard(bottom: bottom, duration: duration)
        } else {
            rootScroll.contentInset.bottom = overlap + 8
            rootScroll.verticalScrollIndicatorInsets.bottom = overlap + 8
        }
        if overlap > 0, !activeFriendPhone.isEmpty || activeSection == "ai" {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.08) {
                self.rootScroll.scrollToBottom(animated: false)
            }
        }
    }

    @objc private func appDidBecomeActive() {
        guard !store.token.isEmpty, !smokeMode else { return }
        api.token = store.token
        startForegroundSync()
        pollForegroundSync()
    }

    @objc private func appWillResignActive() {
        stopForegroundSync()
    }

    func textFieldShouldReturn(_ textField: UITextField) -> Bool {
        textField.resignFirstResponder()
        return true
    }

    private func resetRoot() {
        view.subviews.forEach { $0.removeFromSuperview() }
        activeComposerBottomConstraint = nil
        activeComposerHeight = 0
        callMicButton = nil
        callSpeakerButton = nil
        callCameraButton = nil
        rootScroll = UIScrollView()
        rootScroll.translatesAutoresizingMaskIntoConstraints = false
        rootScroll.alwaysBounceVertical = true
        rootScroll.keyboardDismissMode = .none
        view.addSubview(rootScroll)
        let tap = UITapGestureRecognizer(target: self, action: #selector(backgroundTap(_:)))
        tap.cancelsTouchesInView = false
        rootScroll.addGestureRecognizer(tap)

        rootStack = UIStackView()
        rootStack.axis = .vertical
        rootStack.spacing = 8
        rootStack.translatesAutoresizingMaskIntoConstraints = false
        rootStack.layoutMargins = UIEdgeInsets(top: 10, left: 10, bottom: 24, right: 10)
        rootStack.isLayoutMarginsRelativeArrangement = true
        rootScroll.addSubview(rootStack)

        NSLayoutConstraint.activate([
            rootScroll.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            rootScroll.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            rootScroll.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            rootScroll.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            rootStack.topAnchor.constraint(equalTo: rootScroll.contentLayoutGuide.topAnchor),
            rootStack.leadingAnchor.constraint(equalTo: rootScroll.contentLayoutGuide.leadingAnchor),
            rootStack.trailingAnchor.constraint(equalTo: rootScroll.contentLayoutGuide.trailingAnchor),
            rootStack.bottomAnchor.constraint(equalTo: rootScroll.contentLayoutGuide.bottomAnchor),
            rootStack.widthAnchor.constraint(equalTo: rootScroll.frameLayoutGuide.widthAnchor)
        ])
    }

    private func installFixedComposer(_ composer: UIView, estimatedHeight: CGFloat = 58) {
        composer.translatesAutoresizingMaskIntoConstraints = false
        composer.layer.shadowColor = UIColor.black.cgColor
        composer.layer.shadowOpacity = 0.06
        composer.layer.shadowRadius = 10
        composer.layer.shadowOffset = CGSize(width: 0, height: -2)
        view.addSubview(composer)
        let bottom = composer.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -6)
        activeComposerBottomConstraint = bottom
        activeComposerHeight = estimatedHeight
        NSLayoutConstraint.activate([
            composer.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 10),
            composer.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -10),
            composer.heightAnchor.constraint(greaterThanOrEqualToConstant: estimatedHeight),
            bottom
        ])
        rootStack.layoutMargins.bottom = max(rootStack.layoutMargins.bottom, estimatedHeight + 22)
        let inset = keyboardOverlap + estimatedHeight + 12
        rootScroll.contentInset.bottom = inset
        rootScroll.verticalScrollIndicatorInsets.bottom = inset
        updateFixedComposerForKeyboard(bottom: bottom, duration: 0)
    }

    private func updateFixedComposerForKeyboard(bottom: NSLayoutConstraint, duration: TimeInterval) {
        let safeBottom = view.safeAreaInsets.bottom
        let target = keyboardOverlap > 0 ? -max(4, keyboardOverlap - safeBottom + 4) : -6
        let inset = max(0, keyboardOverlap) + activeComposerHeight + 12
        rootScroll.contentInset.bottom = inset
        rootScroll.verticalScrollIndicatorInsets.bottom = inset
        bottom.constant = target
        let work = { self.view.layoutIfNeeded() }
        if duration > 0 {
            UIView.animate(withDuration: duration, animations: work)
        } else {
            work()
        }
    }

    @objc private func handleBackSwipe(_ gesture: UIScreenEdgePanGestureRecognizer) {
        guard gesture.state == .ended else { return }
        let translation = gesture.translation(in: view)
        if translation.x > 48 { navigateBack() }
    }

    private func navigateBack() {
        view.endEditing(true)
        if !activeCallId.isEmpty {
            stopRingback()
            activeCallId = ""
            activeCallStatus = ""
            activeSection = sectionBeforeCall
            renderHome()
            return
        }
        if !activeFriendPhone.isEmpty {
            activeFriendPhone = ""
            pendingReplyText = ""
            activeSection = sectionBeforeChat
            renderHome()
            return
        }
        guard activeSection != "messages" else { return }
        activeSection = sectionHistory.popLast() ?? "messages"
        renderHome()
    }

    private func openHomeSection(_ section: String, remember: Bool = true) {
        view.endEditing(true)
        let current = activeSection
        if remember, current != section, !current.isEmpty {
            sectionHistory.append(current)
            sectionHistory = Array(sectionHistory.suffix(20))
        }
        activeFriendPhone = ""
        pendingReplyText = ""
        activeSection = section
        renderHome()
    }

    @objc private func backgroundTap(_ gesture: UITapGestureRecognizer) {
        let point = gesture.location(in: view)
        guard let touched = view.hitTest(point, with: nil) else { return }
        if touched is UIControl || touched is UITextField || touched.superview is UIControl { return }
        view.endEditing(true)
    }

    private func runSmokeHarness() {
        api.token = "smoke-token"
        store.user = smokeUser()
        state = smokeState()
        let allSteps: [(String, () -> Void)] = [
            ("login", { self.renderAuth(mode: "login") }),
            ("register", { self.renderAuth(mode: "register") }),
            ("forgot", { self.renderAuth(mode: "forgot") }),
            ("messages", { self.activeSection = "messages"; self.renderHome() }),
            ("chat", { self.openChat("0901111222", focusComposer: false) }),
            ("chat-focus", { self.openChat("0901111222", focusComposer: true) }),
            ("nearby", { self.activeSection = "nearby"; self.renderHome() }),
            ("journals", { self.activeSection = "journals"; self.renderHome() }),
            ("ai", { self.activeSection = "ai"; self.renderHome() }),
            ("businesses", { self.businessEditorOpen = false; self.activeSection = "businesses"; self.renderHome() }),
            ("business-form", { self.businessEditorOpen = true; self.activeSection = "businesses"; self.renderHome() }),
            ("friends", { self.activeSection = "friends"; self.renderHome() }),
            ("addFriend", { self.activeSection = "addFriend"; self.renderHome() }),
            ("profile", { self.activeSection = "profile"; self.renderHome() }),
            ("calls", { self.activeSection = "calls"; self.renderHome() }),
            ("search", { self.activeSection = "search"; self.renderHome() }),
            ("qr", { self.activeSection = "qr"; self.renderHome() }),
            ("settings", { self.activeSection = "settings"; self.renderHome() }),
            ("admin", { self.activeSection = "admin"; self.renderHome() }),
            ("mass-messages", { self.state = self.smokeMassState(); self.activeSection = "messages"; self.renderHome() }),
            ("mass-calls", { self.state = self.smokeMassState(); self.activeSection = "calls"; self.renderHome() }),
            ("call-notice", { self.showNativeCallNotice(self.smokeCall()) }),
            ("call-notice-video", { self.showNativeCallNotice(self.smokeCall(mode: "video")) }),
            ("native-webrtc-selftest", { self.runNativeWebRTCSelfTest() }),
            ("tab-cycle", {
                ["messages", "nearby", "journals", "ai", "messages"].forEach { section in
                    self.activeSection = section
                    self.renderHome()
                }
            }),
            ("back-section", {
                self.activeSection = "messages"
                self.renderHome()
                self.openHomeSection("nearby")
                self.navigateBack()
            }),
            ("chat-send-local", {
                self.openChat("0901111222", focusComposer: true)
                self.sendMessage("Smoke test tin nhắn iOS")
            })
        ]
        if let requested = smokeStepArgument() {
            let step = allSteps.first { $0.0 == requested } ?? allSteps[0]
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) {
                step.1()
                self.setStatus("Smoke step \(step.0) hoàn tất.")
            }
            return
        }
        let steps: [(TimeInterval, () -> Void)] = allSteps.enumerated().map { index, step in
            (0.05 + TimeInterval(index) * 0.15, step.1)
        } + [
            (3.05, {
                self.activeSection = "messages"
                self.renderHome()
                self.setStatus("Smoke test hoàn tất.")
            })
        ]
        steps.forEach { delay, work in
            DispatchQueue.main.asyncAfter(deadline: .now() + delay, execute: work)
        }
    }

    private func smokeStepArgument() -> String? {
        CommandLine.arguments.first { $0.hasPrefix("--nexa-smoke-step=") }?.replacingOccurrences(of: "--nexa-smoke-step=", with: "")
    }

    private func runNativeWebRTCSelfTest() {
        showNativeCallNotice(smokeCall(mode: "video"))
        nativeRtc.start(
            callId: "smoke-native-webrtc",
            mode: "video",
            isCaller: true,
            sendSignal: { [weak self] type, _ in
                self?.setStatus("Native WebRTC self-test: \(type)")
            },
            onStatus: { [weak self] statusText in
                self?.setStatus(statusText)
            }
        )
        DispatchQueue.main.asyncAfter(deadline: .now() + 3.0) { [weak self] in
            self?.nativeRtc.stop()
            self?.setStatus("Native WebRTC self-test hoàn tất.")
        }
    }

    private func smokeUser() -> [String: Any] {
        [
            "accountPhone": "0909999888",
            "phone": "0909999888",
            "fullName": "Benjamin Demo",
            "email": "demo@xpaychat.vn",
            "presenceStatus": "Online",
            "isAppAdmin": false,
            "accountBadges": ["verified": true, "vip": true]
        ]
    }

    private func smokeState() -> [String: Any] {
        let friend: [String: Any] = [
            "accountPhone": "0901111222",
            "phone": "0901111222",
            "fullName": "Linh Tran",
            "presenceStatus": "Online",
            "interests": "Ẩm thực, kinh doanh"
        ]
        let business: [String: Any] = [
            "ownerPhone": "0901111222",
            "name": "Bếp Nhà Nexa",
            "category": "Món ăn gia đình",
            "description": "Cơm văn phòng, đồ ăn theo yêu cầu và giao trong khu vực gần nhất.",
            "services": "cơm văn phòng, phở bò, đặt tiệc nhỏ",
            "keywords": "ăn trưa, giao hàng, món Việt",
            "address": "Quận 1, TP.HCM",
            "phone": "0901111222",
            "website": "https://xpaychat.vn",
            "offer": "Giảm 10% cho đơn đầu tiên",
            "status": "approved",
            "distanceText": "1.2 km",
            "delivery": true,
            "booking": true,
            "serviceRadiusKm": "5",
            "hours": ["open": "08:00", "close": "21:30"]
        ]
        return [
            "user": smokeUser(),
            "friends": [friend],
            "nearby": [friend.merging(["distanceText": "800 m"]) { current, _ in current }],
            "conversations": [[
                "friendPhone": "0901111222",
                "unreadCount": 2,
                "messages": [
                    ["from": "friend", "text": "Chào anh, mình trao đổi đơn hàng nhé?", "createdAt": "2026-05-30T09:15:00Z"],
                    ["from": "me", "text": "Được, gửi giúp mình thông tin chi tiết.", "createdAt": "2026-05-30T09:16:00Z"]
                ]
            ]],
            "businesses": [business.merging(["isMine": false]) { current, _ in current }, business.merging(["ownerPhone": "0909999888", "isMine": true, "status": "pending"]) { current, _ in current }],
            "businessInbox": [["phone": "0901111222", "name": "Linh Tran", "statusLabel": "Khách mới", "lastText": "Cần tư vấn dịch vụ"]],
            "posts": [["authorName": "Linh Tran", "body": "Hôm nay có món mới trên XPAY Chat."]],
            "calls": [smokeCall(), smokeCall(mode: "video")],
            "friendRequests": [["id": "smoke-request", "status": "pending", "direction": "incoming", "requesterPhone": "0902222333", "profile": ["fullName": "Minh Nguyen"]]],
            "aiRules": ["customRules": "Trả lời ngắn gọn, rõ ý, không nhắc tên model."]
        ]
    }

    private func smokeCall(mode: String = "voice") -> [String: Any] {
        [
            "id": mode == "video" ? "smoke-video-call" : "smoke-call",
            "peerPhone": "0901111222",
            "peerName": "Linh Tran",
            "peer": ["fullName": "Linh Tran"],
            "mode": mode,
            "direction": "incoming",
            "status": "ringing",
            "createdAt": "2026-05-30T09:20:00Z",
            "durationSeconds": 0
        ]
    }

    private func smokeMassState() -> [String: Any] {
        var next = smokeState()
        var friends: [[String: Any]] = []
        var conversations: [[String: Any]] = []
        var nearby: [[String: Any]] = []

        for index in 1...100 {
            let phone = "090555\(String(format: "%04d", index))"
            let friend: [String: Any] = [
                "accountPhone": phone,
                "phone": phone,
                "fullName": "QA User \(index)",
                "presenceStatus": index % 3 == 0 ? "Vừa hoạt động" : "Online",
                "interests": index % 2 == 0 ? "Dịch vụ, món ăn, kinh doanh" : "Chat, quanh đây, nhật ký"
            ]
            friends.append(friend)
            if index <= 20 {
                var near = friend
                near["distanceText"] = "\(index * 80) m"
                nearby.append(near)
            }
            conversations.append([
                "friendPhone": phone,
                "unreadCount": index <= 20 ? 1 : 0,
                "messages": [
                    [
                        "id": "qa-in-\(index)",
                        "from": "friend",
                        "text": "Tin nhắn test \(index) từ \(phone)",
                        "createdAt": "2026-06-01T02:00:00Z"
                    ],
                    [
                        "id": "qa-out-\(index)",
                        "from": "me",
                        "text": "Trả lời test \(index) từ tài khoản chính.",
                        "createdAt": "2026-06-01T02:01:00Z"
                    ]
                ]
            ])
        }

        var calls: [[String: Any]] = []
        for index in 1...5 {
            let phone = "090555\(String(format: "%04d", index))"
            calls.append([
                "id": "qa-voice-\(index)",
                "peerPhone": phone,
                "peerName": "QA User \(index)",
                "peer": ["fullName": "QA User \(index)"],
                "mode": "voice",
                "direction": index % 2 == 0 ? "outgoing" : "incoming",
                "status": index == 1 ? "ringing" : (index == 2 ? "active" : "ended"),
                "createdAt": "2026-06-01T02:10:00Z",
                "startedAt": index == 1 ? "" : "2026-06-01T02:10:05Z",
                "endedAt": index <= 2 ? "" : "2026-06-01T02:11:00Z",
                "durationSeconds": index <= 2 ? 0 : 55
            ])
            calls.append([
                "id": "qa-video-\(index)",
                "peerPhone": phone,
                "peerName": "QA User \(index)",
                "peer": ["fullName": "QA User \(index)"],
                "mode": "video",
                "direction": index % 2 == 0 ? "incoming" : "outgoing",
                "status": index == 1 ? "ringing" : (index == 2 ? "active" : "ended"),
                "createdAt": "2026-06-01T02:20:00Z",
                "startedAt": index == 1 ? "" : "2026-06-01T02:20:05Z",
                "endedAt": index <= 2 ? "" : "2026-06-01T02:21:00Z",
                "durationSeconds": index <= 2 ? 0 : 55
            ])
        }

        next["friends"] = friends
        next["nearby"] = nearby
        next["conversations"] = conversations
        next["calls"] = calls
        return next
    }

    private func renderAuth(mode: String) {
        stopForegroundSync()
        stopRingback()
        resetRoot()
        activeFriendPhone = ""
        rootStack.spacing = 8
        let hero = card()
        hero.alignment = .center
        hero.backgroundColor = UIColor(red: 6/255, green: 78/255, blue: 102/255, alpha: 1)
        let mark = avatar("AI", size: 54, corner: 18)
        hero.addArrangedSubview(mark)
        hero.addArrangedSubview(label("XPAY Chat", size: 30, color: .white, weight: .bold, align: .center))
        hero.addArrangedSubview(label("Mạng xã hội AI cho trò chuyện, gọi, nhật ký và kết nối quanh đây.", size: 13, color: UIColor(red: 224/255, green: 242/255, blue: 254/255, alpha: 1), align: .center, lines: 0))
        rootStack.addArrangedSubview(hero)

        let form = card()
        form.addArrangedSubview(label("TÀI KHOẢN BẢO MẬT", size: 12, color: primary, weight: .bold))
        form.addArrangedSubview(label(mode == "login" ? "Đăng nhập XPAY Chat" : "Tài khoản XPAY Chat", size: 22, weight: .bold))
        let tabs = hstack(spacing: 8)
        tabs.distribution = .fillEqually
        tabs.addArrangedSubview(actionButton("Đăng nhập", primary: mode == "login") { self.renderAuth(mode: "login") })
        tabs.addArrangedSubview(actionButton("Đăng ký", primary: mode == "register") { self.renderAuth(mode: "register") })
        tabs.addArrangedSubview(actionButton("Quên mật khẩu", primary: mode == "forgot") { self.renderAuth(mode: "forgot") })
        form.addArrangedSubview(tabs)

        let phone = input("Số điện thoại", text: store.phone)
        let email = input(mode == "forgot" ? "Email nhận OTP" : "Email duy nhất")
        let name = input("Họ và tên")
        let password = input(mode == "register" ? "Mật khẩu mạnh" : (mode == "forgot" ? "Mật khẩu mới" : "Mật khẩu"), secure: true)
        let otp = input("Mã OTP email")
        form.addArrangedSubview(phone)
        if mode == "register" { form.addArrangedSubview(name) }
        if mode != "login" { form.addArrangedSubview(email) }
        form.addArrangedSubview(password)
        if mode != "login" { form.addArrangedSubview(otp) }
        if mode != "login" {
            form.addArrangedSubview(actionButton(mode == "register" ? "Gửi OTP đăng ký" : "Gửi OTP khôi phục", primary: false) {
                self.setStatus("Đang gửi OTP...")
                self.api.post("/api/auth/otp/request", body: [
                    "phone": phone.textValue,
                    "email": email.textValue,
                    "purpose": mode == "register" ? "register" : "forgot"
                ], auth: false) { result in
                    self.handle(result, ok: "Đã gửi OTP.")
                }
            })
        }
        let title = mode == "login" ? "Đăng nhập" : (mode == "register" ? "Tạo tài khoản" : "Đặt lại mật khẩu")
        form.addArrangedSubview(actionButton(title, primary: true) {
            if mode == "login" {
                guard !phone.textValue.isEmpty, !password.textValue.isEmpty else {
                    self.setStatus("Vui lòng nhập số điện thoại và mật khẩu.")
                    return
                }
                self.login(phone: phone.textValue, password: password.textValue)
            } else if mode == "register" {
                self.setStatus("Đang tạo tài khoản...")
                self.api.post("/api/auth/register", body: [
                    "phone": phone.textValue, "email": email.textValue, "name": name.textValue,
                    "password": password.textValue, "otp": otp.textValue
                ], auth: false) { result in
                    self.handle(result, ok: "Đã tạo tài khoản. Anh có thể đăng nhập.")
                    if case .success = result { self.renderAuth(mode: "login") }
                }
            } else {
                self.setStatus("Đang đặt lại mật khẩu...")
                self.api.post("/api/auth/reset-password", body: [
                    "phone": phone.textValue, "email": email.textValue,
                    "password": password.textValue, "otp": otp.textValue
                ], auth: false) { result in
                    self.handle(result, ok: "Đã đặt lại mật khẩu.")
                    if case .success = result { self.renderAuth(mode: "login") }
                }
            }
        })
        statusLabel = label("", size: 13, color: primary, weight: .semibold)
        form.addArrangedSubview(statusLabel)
        form.addArrangedSubview(label("OTP email sẽ được gửi duy nhất từ Email: admin@gatewayxpay.com", size: 13, color: muted, lines: 0))
        rootStack.addArrangedSubview(form)
    }

    private func login(phone: String, password: String) {
        setStatus("Đang đăng nhập...")
        api.post("/api/auth/login", body: ["phone": phone, "password": password], auth: false) { result in
            switch result {
            case .success(let data):
                let token = data["token"] as? String ?? ""
                guard !token.isEmpty else {
                    self.setStatus("Máy chủ chưa trả về token đăng nhập.")
                    return
                }
                self.store.token = token
                self.store.user = data["user"] as? [String: Any] ?? [:]
                self.store.phone = string(self.store.user["accountPhone"], phone)
                self.api.token = token
                self.state = data
                self.registerStoredPushTokenIfNeeded(report: false)
                self.startForegroundSync()
                self.syncAndShow("messages")
            case .failure(let error):
                self.setStatus(error.localizedDescription)
            }
        }
    }

    private func restoreSession() {
        resetRoot()
        rootStack.addArrangedSubview(label("Đang mở XPAY Chat...", size: 17, color: muted, align: .center))
        api.post("/api/session/restore", body: [:], auth: true) { result in
            switch result {
            case .success(let data):
                self.state = data
                if let user = data["user"] as? [String: Any] { self.store.user = user }
                self.registerStoredPushTokenIfNeeded(report: false)
                self.startForegroundSync()
                self.syncAndShow("messages")
            case .failure:
                self.store.clear()
                self.api.token = ""
                self.renderAuth(mode: "login")
            }
        }
    }

    private func syncAndShow(_ section: String? = nil) {
        if let section { activeSection = section }
        api.post("/api/sync", body: [:], auth: true) { result in
            switch result {
            case .success(let data):
                self.applyUnreadTracking(data)
                self.state = data
                if let user = data["user"] as? [String: Any] { self.store.user = user }
                self.startForegroundSync()
                if !self.showIncomingCallIfNeeded() {
                    self.renderHome()
                }
            case .failure(let error):
                self.setStatus(error.localizedDescription)
                self.renderHome()
            }
        }
    }

    private func startForegroundSync() {
        guard foregroundSyncTimer == nil, !store.token.isEmpty, !smokeMode else { return }
        let timer = Timer(timeInterval: foregroundSyncDelay, repeats: true) { [weak self] _ in
            self?.pollForegroundSync()
        }
        foregroundSyncTimer = timer
        RunLoop.main.add(timer, forMode: .common)
    }

    private func stopForegroundSync() {
        foregroundSyncTimer?.invalidate()
        foregroundSyncTimer = nil
        foregroundSyncInFlight = false
    }

    private func pollForegroundSync() {
        guard !foregroundSyncInFlight, !store.token.isEmpty, !smokeMode else { return }
        foregroundSyncInFlight = true
        api.post("/api/sync", body: [:], auth: true, timeout: 12) { result in
            self.foregroundSyncInFlight = false
            guard case .success(let data) = result else { return }
            self.applyUnreadTracking(data)
            self.state = data
            if let user = data["user"] as? [String: Any] { self.store.user = user }
            if self.updateActiveCallFromSync() { return }
            if self.showIncomingCallIfNeeded() { return }

            if !self.activeFriendPhone.isEmpty {
                let next = self.chatSignature(self.activeFriendPhone)
                if next != self.renderSignature, !self.keyboardVisible {
                    self.openChat(self.activeFriendPhone)
                } else {
                    self.renderSignature = next
                }
                return
            }

            let next = self.sectionSignature(self.activeSection)
            if next != self.renderSignature, self.canAutoRefresh(section: self.activeSection) {
                self.renderHome()
            } else {
                self.renderSignature = next
            }
        }
    }

    private func showIncomingCallIfNeeded() -> Bool {
        guard activeCallId.isEmpty else { return false }
        guard let call = array(state["calls"]).first(where: {
            string($0["direction"], "") == "incoming" && string($0["status"], "") == "ringing"
        }) else { return false }
        showNativeCallNotice(call)
        return true
    }

    private func updateActiveCallFromSync() -> Bool {
        guard !activeCallId.isEmpty else { return false }
        guard let call = array(state["calls"]).first(where: { string($0["id"], "") == activeCallId }) else {
            stopRingback()
            activeCallId = ""
            activeCallStatus = ""
            activeCallMode = "voice"
            activeSection = "calls"
            renderHome()
            return true
        }
        let status = string(call["status"], "")
        if ["ended", "rejected", "missed", "busy"].contains(status) {
            stopRingback()
            nativeRtc.stop()
            activeCallId = ""
            activeCallStatus = status
            activeCallMode = string(call["mode"], activeCallMode)
            activeSection = "calls"
            renderHome()
            setStatus("Cuộc gọi: \(callStatusLabel(call))")
            return true
        }
        updateNativeRtc(call)
        if status != activeCallStatus {
            showNativeCallNotice(call)
            return true
        }
        return true
    }

    func handlePushRoute(userInfo: [AnyHashable: Any], action: String, completion: @escaping () -> Void) {
        api.token = store.token
        let type = string(userInfo["type"], "")
        let callId = string(userInfo["callId"], "")
        let mode = string(userInfo["mode"], "voice")
        guard !api.token.isEmpty else {
            completion()
            return
        }
        if !action.isEmpty, !callId.isEmpty {
            api.post("/api/calls/respond", body: ["id": callId, "action": action], auth: true) { _ in
                self.activeSection = "calls"
                self.syncAndShow("calls")
                completion()
            }
            return
        }
        if type == "call" || type == "call_update" || !callId.isEmpty {
            activeCallId = action.isEmpty ? "" : callId
            activeSection = "calls"
            syncAndShow("calls")
        } else {
            activeSection = "messages"
            syncAndShow("messages")
        }
        _ = mode
        completion()
    }

    private func canAutoRefresh(section: String) -> Bool {
        !["profile", "settings", "admin", "search", "addFriend", "qr", "ai"].contains(section)
    }

    private func sectionSignature(_ section: String) -> String {
        switch section {
        case "nearby": return "nearby:\(payloadSignature(state["nearby"]))"
        case "businesses": return "businesses:\(payloadSignature(state["businesses"])):\(payloadSignature(state["businessInbox"]))"
        case "journals": return "journals:\(payloadSignature(state["posts"]))"
        case "calls": return "calls:\(payloadSignature(state["calls"]))"
        case "friends": return "friends:\(payloadSignature(state["friends"])):\(payloadSignature(state["friendRequests"]))"
        default: return "messages:\(payloadSignature(state["conversations"])):\(payloadSignature(UserDefaults.standard.dictionary(forKey: unreadIdsKey)))"
        }
    }

    private func chatSignature(_ phone: String) -> String {
        "chat:\(normalizePhone(phone)):\(payloadSignature(conversationByPhone(phone)["messages"]))"
    }

    private func payloadSignature(_ value: Any?) -> String {
        String(describing: value).hashValue.description
    }

    private func renderHome() {
        UIView.performWithoutAnimation {
            resetRoot()
            activeFriendPhone = ""
            pendingReplyText = ""
            rootStack.addArrangedSubview(profileStrip())
            if activeSection != "search" { rootStack.addArrangedSubview(searchStrip()) }
            rootStack.addArrangedSubview(quickActions())
            rootStack.addArrangedSubview(tabStrip())
            addStatus()
            renderSection()
            renderSignature = sectionSignature(activeSection)
            view.layoutIfNeeded()
        }
    }

    private func profileStrip() -> UIStackView {
        let box = card()
        box.axis = .horizontal
        box.alignment = .center
        box.spacing = 8
        box.layer.cornerRadius = 20
        box.layoutMargins = UIEdgeInsets(top: 9, left: 10, bottom: 9, right: 10)
        let user = currentUser()
        box.addArrangedSubview(avatarView(user, fallback: displayName(user, fallback: "NX"), size: 48, corner: 17))
        let copy = vstack(spacing: 2)
        let nameLine = hstack(spacing: 4)
        nameLine.addArrangedSubview(label(displayName(user, fallback: "Nexa User"), size: 16, weight: .bold))
        nameLine.addArrangedSubview(badge("✓", color: UIColor(red: 34/255, green: 197/255, blue: 94/255, alpha: 1), textColor: .white))
        copy.addArrangedSubview(nameLine)
        copy.addArrangedSubview(label("\(userPhone()) • \(string(user["presenceStatus"], "Online"))", size: 12, color: muted))
        box.addArrangedSubview(copy)
        let spacer = UIView()
        spacer.setContentHuggingPriority(.defaultLow, for: .horizontal)
        box.addArrangedSubview(spacer)
        box.addArrangedSubview(topIconButton("add-user", tint: primary) { self.openHomeSection("addFriend") })
        box.addArrangedSubview(topIconButton("settings", tint: UIColor(red: 37/255, green: 99/255, blue: 235/255, alpha: 1)) { self.openHomeSection("settings") })
        box.addArrangedSubview(topIconButton("logout", tint: UIColor(red: 225/255, green: 87/255, blue: 89/255, alpha: 1)) {
            self.stopForegroundSync()
            self.stopRingback()
            self.store.clear()
            self.api.token = ""
            self.renderAuth(mode: "login")
        })
        return box
    }

    private func searchStrip() -> UIStackView {
        let box = card()
        box.axis = .horizontal
        box.alignment = .center
        box.spacing = 8
        box.layer.cornerRadius = 18
        box.layoutMargins = UIEdgeInsets(top: 8, left: 12, bottom: 8, right: 12)
        box.heightAnchor.constraint(greaterThanOrEqualToConstant: 46).isActive = true
        box.addArrangedSubview(label("⌕", size: 18, color: primary, weight: .bold))
        box.addArrangedSubview(label("Tìm bạn bè, tin nhắn, doanh nghiệp", size: 13, color: muted))
        box.isUserInteractionEnabled = true
        box.addGestureRecognizer(UITapGestureRecognizer(target: self, action: #selector(openSearch)))
        return box
    }

    @objc private func openSearch() {
        openHomeSection("search")
    }

    private func quickActions() -> UIView {
        let hasAdmin = isAppAdminAccount()
        let scroll = UIScrollView()
        scroll.showsHorizontalScrollIndicator = false
        scroll.heightAnchor.constraint(equalToConstant: 82).isActive = true
        let stack = hstack(spacing: 8)
        stack.distribution = hasAdmin ? .fill : .fillEqually
        stack.translatesAutoresizingMaskIntoConstraints = false
        scroll.addSubview(stack)
        var constraints = [
            stack.topAnchor.constraint(equalTo: scroll.contentLayoutGuide.topAnchor),
            stack.leadingAnchor.constraint(equalTo: scroll.contentLayoutGuide.leadingAnchor),
            stack.trailingAnchor.constraint(equalTo: scroll.contentLayoutGuide.trailingAnchor),
            stack.bottomAnchor.constraint(equalTo: scroll.contentLayoutGuide.bottomAnchor),
            stack.heightAnchor.constraint(equalTo: scroll.frameLayoutGuide.heightAnchor)
        ]
        if !hasAdmin {
            constraints.append(stack.widthAnchor.constraint(equalTo: scroll.frameLayoutGuide.widthAnchor))
        }
        NSLayoutConstraint.activate(constraints)
        [
            ("business", "Doanh nghiệp", "businesses", primary),
            ("users", "Bạn bè", "friends", primary),
            ("qr", "Quét QR", "qr", UIColor(red: 14/255, green: 116/255, blue: 144/255, alpha: 1)),
            ("profile", "Cá nhân", "profile", ink),
            ("phone", "Cuộc gọi", "calls", primary)
        ].forEach { icon, title, section, tint in
            stack.addArrangedSubview(quickTile(icon: icon, title: title, section: section, tint: tint))
        }
        if hasAdmin {
            stack.addArrangedSubview(quickTile(icon: "shield", title: "Quản trị", section: "admin", tint: UIColor(red: 124/255, green: 58/255, blue: 237/255, alpha: 1)))
        }
        return scroll
    }

    private func homeHeader() -> UIStackView {
        let box = card()
        box.backgroundColor = UIColor(red: 10/255, green: 44/255, blue: 63/255, alpha: 1)
        box.addArrangedSubview(label("XPAY Chat", size: 25, color: .white, weight: .bold))
        box.addArrangedSubview(label("\(displayName(currentUser(), fallback: "XPAY Chat")) · Demo 08 Native iOS", size: 15, color: UIColor(red: 219/255, green: 234/255, blue: 254/255, alpha: 1)))
        let stats = hstack(spacing: 6)
        stats.addArrangedSubview(chip("Bạn bè \(friends().count)"))
        stats.addArrangedSubview(chip("Chat \(conversations().count)"))
        stats.addArrangedSubview(chip("Nhật ký \(posts().count)"))
        box.addArrangedSubview(stats)
        return box
    }

    private func tabStrip() -> UIStackView {
        let tabs = hstack(spacing: 6)
        tabs.distribution = .fillEqually
        tabs.alignment = .fill
        tabs.heightAnchor.constraint(equalToConstant: 44).isActive = true
        tabs.addArrangedSubview(sectionButton("Tin nhắn", "messages"))
        tabs.addArrangedSubview(sectionButton("Quanh đây", "nearby"))
        tabs.addArrangedSubview(sectionButton("Nhật ký", "journals"))
        tabs.addArrangedSubview(sectionButton("XPAY AI", "ai"))
        return tabs
    }

    private func sectionButton(_ title: String, _ section: String) -> UIButton {
        let button = actionButton(title, primary: activeSection == section) {
            self.openHomeSection(section)
        }
        button.heightAnchor.constraint(equalToConstant: 42).isActive = true
        button.titleLabel?.textAlignment = .center
        button.titleLabel?.numberOfLines = 1
        button.titleLabel?.minimumScaleFactor = 0.72
        return button
    }

    private func renderSection() {
        switch activeSection {
        case "nearby": renderNearby()
        case "journals": renderJournals()
        case "ai": renderAi()
        case "businesses": renderBusinesses()
        case "friends": renderFriends()
        case "addFriend": renderAddFriend()
        case "profile": renderProfile()
        case "calls": renderCalls()
        case "search": renderSearch()
        case "qr": renderQr()
        case "settings": renderSettings()
        case "admin": renderAppAdmin()
        default: renderMessages()
        }
    }

    private func renderMessages() {
        rootStack.spacing = 6
        let list = conversations().filter { conversation in
            !shouldHideConversation(friendPhone: string(conversation["friendPhone"], ""), conversation: conversation)
        }
        if list.isEmpty {
            rootStack.addArrangedSubview(infoCard("Chưa có hội thoại", "Vào Bạn bè để mở cuộc trò chuyện, hoặc thêm bạn bằng số điện thoại."))
            rootStack.addArrangedSubview(actionButton("Làm mới", primary: false) { self.syncAndShow("messages") })
            return
        }
        list.prefix(80).forEach { conversation in
            let phone = string(conversation["friendPhone"], "")
            let friend = friendByPhone(phone)
            let unread = unreadCount(conversation)
            let row = card()
            row.axis = .horizontal
            row.alignment = .center
            row.spacing = 8
            row.layer.cornerRadius = 16
            if unread > 0, localSetting("setting_unread_highlight", true) {
                row.backgroundColor = UIColor(red: 236/255, green: 253/255, blue: 245/255, alpha: 1)
                row.layer.borderColor = primary.cgColor
            }
            row.layoutMargins = UIEdgeInsets(top: 7, left: 10, bottom: 7, right: 10)
            row.addArrangedSubview(avatarView(friend, fallback: displayName(friend, fallback: phone), size: 46, corner: 16))
            let copy = vstack(spacing: 1)
            copy.addArrangedSubview(label(displayName(friend, fallback: phone), size: 15, weight: .semibold))
            copy.addArrangedSubview(label(lastMessagePreview(conversation), size: 13, color: muted, lines: 1))
            row.addArrangedSubview(copy)
            let spacer = UIView()
            spacer.setContentHuggingPriority(.defaultLow, for: .horizontal)
            row.addArrangedSubview(spacer)
            row.addArrangedSubview(label(lastMessageTime(conversation), size: 11, color: muted, weight: .semibold, align: .right))
            if unread > 0 { row.addArrangedSubview(badge(unread > 99 ? "99+" : "\(unread)", color: primary, textColor: .white)) }
            row.addArrangedSubview(actionButton("Xoá", primary: false) {
                self.confirmDeleteConversation(phone: phone, name: self.displayName(friend, fallback: phone))
            })
            row.isUserInteractionEnabled = true
            row.addGestureRecognizer(NexaTapGesture { self.openChat(phone) })
            row.addGestureRecognizer(NexaConversationGesture(phone: phone, name: displayName(friend, fallback: phone), target: self, action: #selector(conversationLongPress(_:))))
            rootStack.addArrangedSubview(row)
        }
    }

    private func openChat(_ phone: String, focusComposer: Bool = false) {
        let cleanPhone = normalizePhone(phone)
        if activeFriendPhone.isEmpty {
            sectionBeforeChat = activeSection.isEmpty ? "messages" : activeSection
        }
        if normalizePhone(activeFriendPhone) != cleanPhone { pendingReplyText = "" }
        activeFriendPhone = cleanPhone
        markConversationRead(cleanPhone)
        resetRoot()
        rootStack.spacing = 6
        let friend = friendByPhone(cleanPhone)
        let header = card()
        header.axis = .horizontal
        header.alignment = .center
        header.spacing = 6
        header.layoutMargins = UIEdgeInsets(top: 7, left: 8, bottom: 7, right: 8)
        header.addArrangedSubview(iconButton("‹") { self.navigateBack() })
        header.addArrangedSubview(avatarView(friend, fallback: displayName(friend, fallback: cleanPhone), size: 34, corner: 12))
        let copy = vstack(spacing: 2)
        copy.addArrangedSubview(label(displayName(friend, fallback: cleanPhone), size: 15, weight: .semibold))
        copy.addArrangedSubview(label(string(friend["presenceStatus"], "Bạn bè XPAY Chat"), size: 11, color: muted))
        header.addArrangedSubview(copy)
        let spacer = UIView()
        spacer.setContentHuggingPriority(.defaultLow, for: .horizontal)
        header.addArrangedSubview(spacer)
        header.addArrangedSubview(iconButton("i") { self.showFriendInfo(friend, fallbackPhone: cleanPhone) })
        header.addArrangedSubview(iconButton("☎") { self.startCall(phone: cleanPhone, mode: "voice") })
        header.addArrangedSubview(iconButton("▣") { self.startCall(phone: cleanPhone, mode: "video") })
        header.addArrangedSubview(iconButton("⌫") { self.confirmDeleteConversation(phone: cleanPhone, name: self.displayName(friend, fallback: cleanPhone)) })
        rootStack.addArrangedSubview(header)

        let messages = array(conversationByPhone(cleanPhone)["messages"])
        if messages.isEmpty {
            rootStack.addArrangedSubview(infoCard("Chưa có tin nhắn", "Hãy gửi lời chào đầu tiên."))
        } else {
            messages.forEach { rootStack.addArrangedSubview(messageBubble($0)) }
        }

        if !pendingReplyText.isEmpty {
            rootStack.addArrangedSubview(replyPreview())
        }

        let composer = card()
        composer.axis = .horizontal
        composer.alignment = .center
        composer.spacing = 6
        composer.layoutMargins = UIEdgeInsets(top: 7, left: 8, bottom: 7, right: 8)
        let field = input("Nhập tin nhắn")
        composer.addArrangedSubview(iconButton("+") { self.pickImage(target: "chat") })
        composer.addArrangedSubview(iconButton("⌖") { self.sendCurrentLocationMessage() })
        composer.addArrangedSubview(iconButton("☺") { self.showEmojiPicker(field: field) })
        composer.addArrangedSubview(field)
        composer.addArrangedSubview(actionButton("Gửi", primary: true) {
            let messageText = field.textValue
            guard !messageText.isEmpty else {
                self.setStatus("Tin nhắn đang trống.")
                field.becomeFirstResponder()
                return
            }
            field.text = ""
            field.becomeFirstResponder()
            DispatchQueue.main.async {
                self.sendMessage(messageText)
            }
        })
        addStatus()
        installFixedComposer(composer)
        let shouldFocusComposer = focusComposer || focusComposerAfterRender
        focusComposerAfterRender = false
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
            self.rootScroll.scrollToBottom(animated: false)
            if shouldFocusComposer { field.becomeFirstResponder() }
        }
        renderSignature = chatSignature(cleanPhone)
    }

    private func showFriendInfo(_ friend: [String: Any], fallbackPhone: String) {
        let name = displayName(friend, fallback: fallbackPhone)
        let phone = string(friend["phone"], string(friend["accountPhone"], fallbackPhone))
        var lines = ["Họ và tên: \(name)"]
        if !phone.isEmpty { lines.append("Số điện thoại: \(phone)") }
        let birthDate = string(friend["birthDate"], "")
        if !birthDate.isEmpty { lines.append("Ngày sinh: \(birthDate)") }
        let interests = string(friend["interests"], "")
        if !interests.isEmpty { lines.append("Sở thích: \(interests)") }
        lines.append("Trạng thái: \(string(friend["presenceStatus"], "Bạn bè"))")
        let alert = UIAlertController(title: "Thông tin bạn bè", message: lines.joined(separator: "\n"), preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "Nhắn tin", style: .default) { _ in self.openChat(fallbackPhone) })
        alert.addAction(UIAlertAction(title: "Đóng", style: .cancel))
        present(alert, animated: true)
    }

    private func showEmojiPicker(field: UITextField) {
        let alert = UIAlertController(title: "Cảm xúc nhanh", message: nil, preferredStyle: .actionSheet)
        ["😀", "😍", "😂", "😮", "😢", "😡", "👍", "❤️", "🎉", "🙏"].forEach { emoji in
            alert.addAction(UIAlertAction(title: emoji, style: .default) { _ in
                field.text = (field.text ?? "") + emoji
                field.becomeFirstResponder()
            })
        }
        alert.addAction(UIAlertAction(title: "Đóng", style: .cancel))
        present(alert, animated: true)
    }

    private func messageBubble(_ message: [String: Any]) -> UIView {
        let mine = string(message["from"], "") == "me"
        let recalled = bool(message["recalled"], false)
        let media = message["media"] as? [String: Any]
        let mediaType = string(media?["type"], "")
        var textValue = string(message["text"], "")
        if recalled { textValue = "Tin nhắn đã được thu hồi" }
        if textValue.isEmpty, media != nil { textValue = mediaType.hasPrefix("video/") ? "[Video]" : "[Hình ảnh]" }
        if textValue.isEmpty { textValue = "[Tin nhắn]" }
        let content = vstack(spacing: 4)
        content.alignment = mine ? .trailing : .leading
        if !recalled, let imageData = media?["data"], mediaType.hasPrefix("image/"), let image = imageFromDataUri(string(imageData, ""), maxPixel: 640) {
            let imageView = UIImageView(image: image)
            imageView.translatesAutoresizingMaskIntoConstraints = false
            imageView.contentMode = .scaleAspectFill
            imageView.clipsToBounds = true
            imageView.layer.cornerRadius = 16
            imageView.layer.borderWidth = 1
            imageView.layer.borderColor = softBorder.cgColor
            imageView.widthAnchor.constraint(equalToConstant: min(view.bounds.width * 0.68, 236)).isActive = true
            imageView.heightAnchor.constraint(equalToConstant: 160).isActive = true
            content.addArrangedSubview(imageView)
        }
        let labelView = label(textValue, size: 14, color: recalled ? muted : (mine ? .white : ink), lines: 0)
        labelView.backgroundColor = recalled ? panel : (mine ? primary : .white)
        labelView.layer.cornerRadius = 14
        labelView.layer.borderWidth = mine && !recalled ? 0 : 1
        labelView.layer.borderColor = softBorder.cgColor
        labelView.clipsToBounds = true
        (labelView as? NexaPaddedLabel)?.textInsets = UIEdgeInsets(top: 6, left: 10, bottom: 6, right: 10)
        content.addArrangedSubview(labelView)
        let wrap = hstack(spacing: 0)
        if mine { wrap.addArrangedSubview(UIView()) }
        wrap.addArrangedSubview(content)
        if !mine { wrap.addArrangedSubview(UIView()) }
        let maxBubbleWidth = max(180, min(view.bounds.width * 0.72, 320))
        labelView.widthAnchor.constraint(lessThanOrEqualToConstant: maxBubbleWidth).isActive = true
        wrap.addGestureRecognizer(NexaMessageGesture(message: message, target: self, action: #selector(messageLongPress(_:))))
        wrap.accessibilityValue = textValue
        return wrap
    }

    @objc private func messageLongPress(_ gesture: UILongPressGestureRecognizer) {
        guard gesture.state == .began else { return }
        let message = (gesture as? NexaMessageGesture)?.message ?? [:]
        let text = messageTextForAction(message)
        let messageId = string(message["id"], "")
        let canRecall = bool(message["canRecall"], false) || string(message["from"], "") == "me"
        let alert = UIAlertController(title: "Thao tác tin nhắn", message: nil, preferredStyle: .actionSheet)
        alert.addAction(UIAlertAction(title: "Sao chép tin nhắn", style: .default) { _ in
            UIPasteboard.general.string = text
            self.setStatus("Đã sao chép tin nhắn.")
        })
        alert.addAction(UIAlertAction(title: "Trả lời", style: .default) { _ in
            self.pendingReplyText = text
            self.openChat(self.activeFriendPhone, focusComposer: true)
            self.setStatus("Đã chọn tin nhắn để trả lời.")
        })
        alert.addAction(UIAlertAction(title: "Chuyển tiếp", style: .default) { _ in
            self.showForwardTargets(text)
        })
        if !messageId.isEmpty {
            alert.addAction(UIAlertAction(title: "Xoá ở phía tôi", style: .destructive) { _ in
                self.deleteMessage(messageId: messageId)
            })
            if canRecall {
                alert.addAction(UIAlertAction(title: "Thu hồi", style: .destructive) { _ in
                    self.recallMessage(messageId: messageId)
                })
            }
        }
        alert.addAction(UIAlertAction(title: "Báo cáo tin nhắn", style: .default) { _ in
            self.promptReportContent(type: "message", id: messageId, ownerPhone: self.activeFriendPhone, details: text)
        })
        alert.addAction(UIAlertAction(title: "Đóng", style: .cancel))
        present(alert, animated: true)
    }

    @objc private func conversationLongPress(_ gesture: UILongPressGestureRecognizer) {
        guard gesture.state == .began, let action = gesture as? NexaConversationGesture else { return }
        confirmDeleteConversation(phone: action.phone, name: action.displayName)
    }

    private func messageTextForAction(_ message: [String: Any]) -> String {
        let text = string(message["text"], "")
        if !text.isEmpty { return text }
        let media = message["media"] as? [String: Any]
        let type = string(media?["type"], "")
        if type.hasPrefix("video/") { return "[Video]" }
        if media != nil { return "[Hình ảnh]" }
        return "[Tin nhắn]"
    }

    private func replyPreview() -> UIStackView {
        let preview = card()
        preview.accessibilityIdentifier = "nexa-reply-preview"
        preview.backgroundColor = UIColor(red: 236/255, green: 253/255, blue: 245/255, alpha: 1)
        preview.layer.borderColor = UIColor(red: 94/255, green: 234/255, blue: 212/255, alpha: 1).cgColor
        preview.addArrangedSubview(label("Đang trả lời", size: 12, color: primary, weight: .bold))
        preview.addArrangedSubview(label(shorten(pendingReplyText, limit: 110), size: 13, color: muted, lines: 2))
        preview.isUserInteractionEnabled = true
        preview.addGestureRecognizer(NexaTapGesture {
            self.pendingReplyText = ""
            self.openChat(self.activeFriendPhone, focusComposer: true)
        })
        return preview
    }

    private func showForwardTargets(_ text: String) {
        let targets = friends()
        guard !targets.isEmpty else {
            setStatus("Chưa có bạn bè để chuyển tiếp.")
            return
        }
        let alert = UIAlertController(title: "Chuyển tiếp đến", message: nil, preferredStyle: .actionSheet)
        targets.prefix(60).forEach { friend in
            let phone = string(friend["accountPhone"], string(friend["phone"], ""))
            let title = displayName(friend, fallback: phone)
            alert.addAction(UIAlertAction(title: title, style: .default) { _ in
                guard !phone.isEmpty else { return }
                self.api.post("/api/messages/send", body: ["friendPhone": phone, "message": ["text": text, "time": ""]], auth: true) { result in
                    self.handle(result, ok: "Đã chuyển tiếp tin nhắn.")
                    if case .success = result { self.syncAndShow("messages") }
                }
            })
        }
        alert.addAction(UIAlertAction(title: "Đóng", style: .cancel))
        present(alert, animated: true)
    }

    private func deleteMessage(messageId: String) {
        guard !messageId.isEmpty, !activeFriendPhone.isEmpty else {
            setStatus("Chưa chọn được tin nhắn để xoá.")
            return
        }
        let phone = activeFriendPhone
        setStatus("Đang xoá tin nhắn...")
        api.post("/api/messages/delete", body: ["friendPhone": phone, "messageId": messageId], auth: true) { result in
            switch result {
            case .success:
                self.removeMessageLocally(messageId: messageId, phone: phone)
                self.setStatus("Đã xoá tin nhắn.")
                self.syncAndShowChat(phone)
            case .failure(let error):
                self.setStatus(error.localizedDescription)
            }
        }
    }

    private func recallMessage(messageId: String) {
        guard !messageId.isEmpty, !activeFriendPhone.isEmpty else {
            setStatus("Chưa chọn được tin nhắn để thu hồi.")
            return
        }
        let phone = activeFriendPhone
        setStatus("Đang thu hồi tin nhắn...")
        api.post("/api/messages/recall", body: ["friendPhone": phone, "messageId": messageId], auth: true) { result in
            switch result {
            case .success:
                self.setStatus("Đã thu hồi tin nhắn.")
                self.syncAndShowChat(phone)
            case .failure(let error):
                self.setStatus(error.localizedDescription)
            }
        }
    }

    private func removeMessageLocally(messageId: String, phone: String) {
        var list = conversations()
        guard let index = list.firstIndex(where: { normalizePhone(string($0["friendPhone"], "")) == normalizePhone(phone) }) else { return }
        var conversation = list[index]
        conversation["messages"] = array(conversation["messages"]).filter { string($0["id"], "") != messageId }
        list[index] = conversation
        state["conversations"] = list
    }

    private func confirmDeleteConversation(phone: String, name: String) {
        guard !phone.isEmpty else { return }
        let alert = UIAlertController(title: "Xoá đoạn chat", message: "Xoá toàn bộ đoạn chat với \(name) khỏi danh sách tin nhắn trên tài khoản này?", preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "Huỷ", style: .cancel))
        alert.addAction(UIAlertAction(title: "Xoá", style: .destructive) { _ in
            self.deleteConversation(phone: phone)
        })
        present(alert, animated: true)
    }

    private func deleteConversation(phone: String) {
        guard !phone.isEmpty else { return }
        setStatus("Đang xoá đoạn chat...")
        api.post("/api/conversations/delete", body: ["friendPhone": phone, "hide": true], auth: true) { result in
            switch result {
            case .success:
                self.activeFriendPhone = ""
                self.state["conversations"] = self.conversations().filter { normalizePhone(string($0["friendPhone"], "")) != normalizePhone(phone) }
                self.setStatus("Đã xoá đoạn chat khỏi danh sách tin nhắn.")
                self.syncAndShow("messages")
            case .failure(let error):
                self.setStatus(error.localizedDescription)
            }
        }
    }

    private func reportContent(type: String, id: String, ownerPhone: String, details: String) {
        api.post("/api/reports/create", body: [
            "targetType": type,
            "targetId": id,
            "targetOwnerPhone": ownerPhone,
            "reason": "Người dùng báo cáo từ iOS",
            "details": details
        ], auth: true) { result in
            self.handle(result, ok: "Đã gửi báo cáo.")
        }
    }

    private func promptReportContent(type: String, id: String, ownerPhone: String, details: String) {
        let alert = UIAlertController(title: "Báo cáo nội dung", message: "Báo cáo sẽ được gửi tới quản trị viên để xem xét.", preferredStyle: .alert)
        alert.addTextField { field in
            field.placeholder = "Lý do báo cáo"
        }
        alert.addAction(UIAlertAction(title: "Huỷ", style: .cancel))
        alert.addAction(UIAlertAction(title: "Gửi báo cáo", style: .default) { _ in
            let reason = alert.textFields?.first?.text?.trimmingCharacters(in: .whitespacesAndNewlines)
            self.api.post("/api/reports/create", body: [
                "targetType": type,
                "targetId": id,
                "targetOwnerPhone": ownerPhone,
                "reason": (reason?.isEmpty == false ? reason! : "Nội dung không phù hợp"),
                "details": details
            ], auth: true) { result in
                self.handle(result, ok: "Đã gửi báo cáo.")
            }
        })
        present(alert, animated: true)
    }

    private func sendMessage(_ text: String) {
        var clean = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !clean.isEmpty else { setStatus("Tin nhắn đang trống."); return }
        let phone = activeFriendPhone
        guard !phone.isEmpty else { setStatus("Chưa chọn hội thoại."); return }
        let friend = friendByPhone(phone)
        if bool(friend["blockedByMe"], false) || bool(friend["blockedMe"], false) {
            setStatus(bool(friend["blockedByMe"], false) ? "Anh đang chặn người này. Hãy bỏ chặn trước khi nhắn tin." : "Người này hiện không nhận tin nhắn.")
            return
        }
        if !pendingReplyText.isEmpty {
            clean = "Trả lời: \(shorten(pendingReplyText, limit: 80))\n\(clean)"
            pendingReplyText = ""
            rootStack.arrangedSubviews
                .filter { $0.accessibilityIdentifier == "nexa-reply-preview" }
                .forEach { view in
                    rootStack.removeArrangedSubview(view)
                    view.removeFromSuperview()
                }
        }
        let localMessage: [String: Any] = ["id": "local-\(Int(Date().timeIntervalSince1970 * 1000))", "from": "me", "text": clean, "createdAt": isoNow(), "time": shortClock(), "canRecall": false]
        appendLocalMessage(localMessage, to: phone)
        insertLiveChatBubble(localMessage)
        setStatus("Đang gửi tin nhắn...")
        api.post("/api/messages/send", body: ["friendPhone": phone, "message": ["text": clean, "time": ""]], auth: true) { result in
            switch result {
            case .success:
                self.setStatus("Đã gửi.")
                self.refreshStateSilently()
            case .failure(let error):
                self.setStatus(error.localizedDescription)
            }
        }
    }

    private func syncAndShowChat(_ phone: String, keepKeyboard: Bool = false) {
        api.post("/api/sync", body: [:], auth: true) { result in
            if case .success(let data) = result { self.state = data }
            self.openChat(phone, focusComposer: keepKeyboard)
        }
    }

    private func refreshStateSilently() {
        api.post("/api/sync", body: [:], auth: true) { result in
            if case .success(let data) = result {
                self.applyUnreadTracking(data)
                self.state = data
            }
        }
    }

    private func applyUnreadTracking(_ data: [String: Any]) {
        var knownIncoming = phoneIdMap(forKey: knownIncomingIdsKey)
        var unread = phoneIdMap(forKey: unreadIdsKey)
        var visiblePhones = Set<String>()

        array(data["conversations"]).forEach { conversation in
            let phone = normalizePhone(string(conversation["friendPhone"], ""))
            guard !phone.isEmpty else { return }
            visiblePhones.insert(phone)

            let incomingIds = array(conversation["messages"])
                .filter { string($0["from"], "") != "me" && !bool($0["deleted"], false) && !bool($0["recalled"], false) }
                .map { string($0["id"], "") }
                .filter { !$0.isEmpty }

            if let previous = knownIncoming[phone] {
                let previousIds = Set(previous)
                let newIds = incomingIds.filter { !previousIds.contains($0) }
                if !newIds.isEmpty {
                    if localSetting("setting_mark_read_on_open", true), normalizePhone(activeFriendPhone) == phone {
                        unread[phone] = []
                    } else {
                        var merged = unread[phone] ?? []
                        var existing = Set(merged)
                        newIds.forEach { id in
                            if !existing.contains(id) {
                                merged.append(id)
                                existing.insert(id)
                            }
                        }
                        unread[phone] = Array(merged.suffix(99))
                    }
                }
            }
            knownIncoming[phone] = Array(incomingIds.suffix(500))
        }

        knownIncoming = knownIncoming.filter { visiblePhones.contains($0.key) || !$0.value.isEmpty }
        unread = unread.filter { visiblePhones.contains($0.key) && !$0.value.isEmpty }
        savePhoneIdMap(knownIncoming, forKey: knownIncomingIdsKey)
        savePhoneIdMap(unread, forKey: unreadIdsKey)
    }

    private func shouldHideConversation(friendPhone: String, conversation: [String: Any]) -> Bool {
        let phone = normalizePhone(friendPhone)
        guard !phone.isEmpty else { return false }
        if hiddenConversationPhones().contains(phone) { return true }
        let me = normalizePhone(userPhone())
        if !me.isEmpty, normalizedPhoneSet(conversation["deletedFor"]).contains(me) { return true }
        if !me.isEmpty, normalizedPhoneSet(conversation["hiddenFor"]).contains(me) { return true }
        return false
    }

    private func unreadCount(_ conversation: [String: Any]) -> Int {
        guard localSetting("setting_unread_highlight", true) else { return 0 }
        let phone = normalizePhone(string(conversation["friendPhone"], ""))
        let localUnread = phoneIdMap(forKey: unreadIdsKey)[phone] ?? []
        if !localUnread.isEmpty { return localUnread.count }
        return max(0, int(conversation["unreadCount"], int(conversation["unreadHint"], 0)))
    }

    private func markConversationRead(_ phone: String) {
        guard localSetting("setting_mark_read_on_open", true) else { return }
        let cleanPhone = normalizePhone(phone)
        guard !cleanPhone.isEmpty else { return }

        var unread = phoneIdMap(forKey: unreadIdsKey)
        if !(unread[cleanPhone] ?? []).isEmpty {
            unread[cleanPhone] = []
            savePhoneIdMap(unread, forKey: unreadIdsKey)
        }

        var list = conversations()
        if let index = list.firstIndex(where: { normalizePhone(string($0["friendPhone"], "")) == cleanPhone }) {
            var conversation = list[index]
            conversation["unreadCount"] = 0
            conversation["unreadHint"] = 0
            list[index] = conversation
            state["conversations"] = list
        }
    }

    private func hiddenConversationPhones() -> Set<String> {
        let user = currentUser()
        return normalizedPhoneSet(user["hiddenChats"]).union(normalizedPhoneSet(user["hiddenChatPhones"]))
    }

    private func phoneIdMap(forKey key: String) -> [String: [String]] {
        let raw = UserDefaults.standard.dictionary(forKey: key) ?? [:]
        var result: [String: [String]] = [:]
        raw.forEach { phone, value in
            let cleanPhone = normalizePhone(phone)
            let ids = stringList(value)
            if !cleanPhone.isEmpty { result[cleanPhone] = ids }
        }
        return result
    }

    private func savePhoneIdMap(_ map: [String: [String]], forKey key: String) {
        let clean = map.reduce(into: [String: [String]]()) { result, entry in
            let phone = normalizePhone(entry.key)
            let ids = entry.value.filter { !$0.isEmpty }
            if !phone.isEmpty { result[phone] = ids }
        }
        UserDefaults.standard.set(clean, forKey: key)
    }

    private func normalizedPhoneSet(_ value: Any?) -> Set<String> {
        Set(stringList(value).map { normalizePhone($0) }.filter { !$0.isEmpty })
    }

    private func stringList(_ value: Any?) -> [String] {
        if let values = value as? [String] { return values.map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }.filter { !$0.isEmpty } }
        if let values = value as? [Any] { return values.map { string($0, "").trimmingCharacters(in: .whitespacesAndNewlines) }.filter { !$0.isEmpty } }
        return []
    }

    private func shorten(_ value: String, limit: Int) -> String {
        let clean = value.trimmingCharacters(in: .whitespacesAndNewlines)
        guard clean.count > limit else { return clean }
        return String(clean.prefix(max(1, limit - 3))).trimmingCharacters(in: .whitespacesAndNewlines) + "..."
    }

    private func insertLiveChatBubble(_ message: [String: Any]) {
        guard !activeFriendPhone.isEmpty else { return }
        let bubble = messageBubble(message)
        let statusIndex = rootStack.arrangedSubviews.firstIndex(of: statusLabel)
        let insertIndex = statusIndex ?? max(1, rootStack.arrangedSubviews.count)
        rootStack.insertArrangedSubview(bubble, at: min(insertIndex, rootStack.arrangedSubviews.count))
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) {
            self.rootScroll.scrollToBottom(animated: false)
        }
    }

    private func appendLocalMessage(_ message: [String: Any], to phone: String) {
        var list = conversations()
        if let index = list.firstIndex(where: { normalizePhone(string($0["friendPhone"], "")) == normalizePhone(phone) }) {
            var conversation = list[index]
            var messages = array(conversation["messages"])
            messages.append(message)
            conversation["messages"] = messages
            conversation["friendPhone"] = phone
            conversation["unreadCount"] = 0
            list.remove(at: index)
            list.insert(conversation, at: 0)
        } else {
            list.insert(["friendPhone": phone, "unreadCount": 0, "messages": [message]], at: 0)
        }
        state["conversations"] = list
    }

    private func renderBusinesses() {
        rootStack.addArrangedSubview(sectionTitle("Doanh nghiệp"))
        let mine = myBusiness()
        let editor = card()
        editor.axis = .horizontal
        editor.alignment = .center
        let copy = vstack(spacing: 3)
        copy.addArrangedSubview(label("Quảng bá doanh nghiệp trên XPAY Chat", size: 16, weight: .semibold))
        let status = mine.isEmpty ? "Bấm để tạo hồ sơ doanh nghiệp" : "Trạng thái: \(businessStatusLabel(string(mine["status"], "pending")))"
        copy.addArrangedSubview(label(status, size: 13, color: muted))
        editor.addArrangedSubview(copy)
        editor.addArrangedSubview(actionButton(businessEditorOpen ? "Thu gọn" : "Mở", primary: true) {
            self.businessEditorOpen.toggle()
            self.renderHome()
        })
        rootStack.addArrangedSubview(editor)
        if !businessEditorOpen {
            rootStack.addArrangedSubview(label("Hồ sơ gửi lên sẽ chờ admin duyệt trước khi hiển thị công khai cho người dùng khác.", size: 13, color: muted, lines: 0))
        } else {
            rootStack.addArrangedSubview(businessForm())
        }
        renderBusinessInbox(mine)
        rootStack.addArrangedSubview(sectionTitle("Doanh nghiệp nổi bật"))
        let searchCard = card()
        searchCard.addArrangedSubview(label("TÌM DOANH NGHIỆP", size: 12, color: primary, weight: .bold))
        let search = input("Tìm tên, ngành nghề, sản phẩm hoặc khu vực")
        let results = vstack(spacing: 8)
        search.addAction(UIAction { _ in self.fillBusinessList(results, query: search.textValue) }, for: .editingChanged)
        searchCard.addArrangedSubview(search)
        rootStack.addArrangedSubview(searchCard)
        rootStack.addArrangedSubview(results)
        fillBusinessList(results, query: "")
    }

    private func businessForm() -> UIStackView {
        let box = card()
        let mine = myBusiness()
        let name = input("Tên doanh nghiệp", text: string(mine["name"], ""))
        let category = input("Ngành nghề", text: string(mine["category"], ""))
        let description = input("Mô tả sản phẩm, dịch vụ", text: string(mine["description"], ""))
        let address = input("Địa chỉ hoặc khu vực phục vụ", text: string(mine["address"], ""))
        let phone = input("Số điện thoại liên hệ", text: string(mine["phone"], userPhone()))
        let website = input("Website hoặc link mạng xã hội", text: string(mine["website"], ""))
        let offer = input("Ưu đãi hoặc điểm nổi bật hôm nay", text: string(mine["offer"], ""))
        let services = input("Sản phẩm/dịch vụ: phở bò, cơm văn phòng, sửa điện thoại...", text: string(mine["services"], ""))
        let keywords = input("Từ khoá tìm kiếm", text: string(mine["keywords"], ""))
        let hours = mine["hours"] as? [String: Any] ?? [:]
        let open = input("Giờ mở cửa, ví dụ 08:00", text: string(hours["open"], ""))
        let close = input("Giờ đóng cửa, ví dụ 21:30", text: string(hours["close"], ""))
        let radius = input("Bán kính phục vụ km", text: string(mine["serviceRadiusKm"], ""))
        let delivery = UISwitch()
        delivery.isOn = bool(mine["delivery"], false)
        let booking = UISwitch()
        booking.isOn = bool(mine["booking"], false)
        [name, category, description, address, phone, website, offer, services, keywords].forEach { box.addArrangedSubview($0) }
        let hoursRow = hstack(spacing: 8)
        hoursRow.addArrangedSubview(open)
        hoursRow.addArrangedSubview(close)
        box.addArrangedSubview(hoursRow)
        let serviceRow = hstack(spacing: 8)
        serviceRow.addArrangedSubview(radius)
        serviceRow.addArrangedSubview(toggleRow("Có giao hàng", delivery))
        serviceRow.addArrangedSubview(toggleRow("Nhận đặt lịch", booking))
        box.addArrangedSubview(serviceRow)
        let locationBox = card()
        locationBox.addArrangedSubview(label("VỊ TRÍ DOANH NGHIỆP", size: 12, color: primary, weight: .bold))
        locationBox.addArrangedSubview(label(businessLocationText(mine), size: 13, color: muted, lines: 0))
        locationBox.addArrangedSubview(actionButton("Lấy vị trí hiện tại", primary: true) {
            self.locationManager.requestWhenInUseAuthorization()
            self.locationManager.requestLocation()
            self.setStatus("Đang lấy vị trí hiện tại...")
        })
        box.addArrangedSubview(locationBox)
        let mediaBox = card()
        mediaBox.addArrangedSubview(label("ẢNH DOANH NGHIỆP", size: 12, color: primary, weight: .bold))
        mediaBox.addArrangedSubview(label("Logo hiển thị bên trái tên doanh nghiệp. Ảnh trưng bày tối đa 5 ảnh, dưới 6MB/ảnh.", size: 13, color: muted, lines: 0))
        let mediaRow = hstack(spacing: 8)
        mediaRow.addArrangedSubview(actionButton("Chọn logo", primary: false) { self.pickImage(target: "logo") })
        mediaRow.addArrangedSubview(actionButton("Chọn tối đa 5 ảnh", primary: false) { self.pickImage(target: "gallery") })
        mediaBox.addArrangedSubview(mediaRow)
        if !pendingLogoData.isEmpty { box.addArrangedSubview(label("Đã chọn logo.", size: 13, color: primary, weight: .semibold)) }
        if !pendingGalleryData.isEmpty { mediaBox.addArrangedSubview(label("Đã chọn \(pendingGalleryData.count) ảnh trưng bày.", size: 13, color: primary, weight: .semibold)) }
        box.addArrangedSubview(mediaBox)
        let terms = UISwitch()
        terms.isOn = !string(mine["termsAcceptedAt"], "").isEmpty
        box.addArrangedSubview(toggleRow("Tôi cam kết thông tin doanh nghiệp là thật; không đăng hàng cấm, lừa đảo, nội dung người lớn, cờ bạc, vay nặng lãi, giấy tờ giả, thuốc/chữa bệnh sai sự thật hoặc link thu thập OTP/mật khẩu.", terms))
        box.addArrangedSubview(actionButton(mine.isEmpty ? "Tạo hồ sơ doanh nghiệp" : "Cập nhật hồ sơ", primary: true) {
            guard !name.textValue.isEmpty else { self.setStatus("Vui lòng nhập tên doanh nghiệp."); return }
            guard terms.isOn else { self.setStatus("Vui lòng đồng ý điều khoản doanh nghiệp."); return }
            var business: [String: Any] = [
                "name": name.textValue, "category": category.textValue, "description": description.textValue,
                "address": address.textValue, "phone": phone.textValue, "website": website.textValue,
                "offer": offer.textValue, "services": services.textValue, "keywords": keywords.textValue,
                "hours": ["open": open.textValue, "close": close.textValue],
                "serviceRadiusKm": radius.textValue, "delivery": delivery.isOn, "booking": booking.isOn
            ]
            if let location = self.locationManager.location ?? self.lastKnownLocation {
                business["latitude"] = location.coordinate.latitude
                business["longitude"] = location.coordinate.longitude
            }
            if !self.pendingLogoData.isEmpty { business["logoData"] = self.pendingLogoData }
            if !self.pendingGalleryData.isEmpty { business["gallery"] = self.pendingGalleryData.map { ["data": $0] } }
            self.setStatus("Đang lưu hồ sơ doanh nghiệp...")
            self.api.post("/api/businesses/upsert", body: ["business": business, "acceptTerms": true], auth: true) { result in
                self.handle(result, ok: "Đã gửi hồ sơ doanh nghiệp chờ admin duyệt.")
                if case .success = result { self.syncAndShow("businesses") }
            }
        })
        return box
    }

    private func pickImage(target: String) {
        imagePickTarget = target
        if target == "gallery", pendingGalleryData.count >= 5 {
            setStatus("Chỉ được chọn tối đa 5 ảnh.")
            return
        }
        let picker = UIImagePickerController()
        picker.sourceType = .photoLibrary
        picker.delegate = self
        present(picker, animated: true)
    }

    func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey : Any]) {
        picker.dismiss(animated: true)
        guard let image = info[.originalImage] as? UIImage, let data = image.jpegData(compressionQuality: 0.72) else { return }
        if imagePickTarget == "scanQR" {
            handleScannedQrImage(image)
            return
        }
        if data.count > 6 * 1024 * 1024 {
            setStatus("Ảnh vượt quá 6MB.")
            return
        }
        let uri = "data:image/jpeg;base64," + data.base64EncodedString()
        if imagePickTarget == "chat" {
            sendMediaMessage(dataUri: uri)
            return
        }
        if imagePickTarget == "avatar" {
            pendingAvatarData = uri
        } else if imagePickTarget == "logo" {
            pendingLogoData = uri
        } else if imagePickTarget == "journal" {
            pendingJournalImage = ["data": uri, "type": "image/jpeg", "name": "xpaychat-journal.jpg"]
        } else {
            pendingGalleryData.append(uri)
        }
        renderHome()
    }

    private func sendMediaMessage(dataUri: String) {
        guard !activeFriendPhone.isEmpty else { return }
        let media: [String: Any] = ["data": dataUri, "type": "image/*", "name": "xpaychat-image"]
        let message: [String: Any] = ["text": "", "time": "", "media": media]
        let phone = activeFriendPhone
        let localMessage: [String: Any] = ["id": "local-\(Int(Date().timeIntervalSince1970 * 1000))", "from": "me", "text": "", "media": media, "createdAt": isoNow(), "time": shortClock()]
        appendLocalMessage(localMessage, to: phone)
        insertLiveChatBubble(localMessage)
        setStatus("Đang gửi ảnh...")
        api.post("/api/messages/send", body: ["friendPhone": phone, "message": message], auth: true) { result in
            switch result {
            case .success:
                self.setStatus("Đã gửi ảnh.")
                self.refreshStateSilently()
            case .failure(let error):
                self.setStatus(error.localizedDescription)
            }
        }
    }

    private func sendCurrentLocationMessage() {
        locationManager.requestWhenInUseAuthorization()
        if let location = locationManager.location ?? lastKnownLocation {
            let text = "Vị trí hiện tại: https://maps.google.com/?q=\(location.coordinate.latitude),\(location.coordinate.longitude)"
            sendMessage(text)
        } else {
            locationManager.requestLocation()
            setStatus("Đang lấy vị trí hiện tại...")
        }
    }

    private func businessCard(_ business: [String: Any]) -> UIStackView {
        let box = card()
        let top = hstack(spacing: 10)
        top.alignment = .center
        let name = string(business["name"], "Doanh nghiệp Nexa")
        top.addArrangedSubview(businessLogoView(business, fallback: name, size: 44))
        let copy = vstack(spacing: 2)
        copy.addArrangedSubview(label(name, size: 16, weight: .semibold))
        copy.addArrangedSubview(label("\(string(business["category"], "Dịch vụ")) · \(businessStatusLabel(string(business["status"], "pending")))", size: 13, color: muted))
        top.addArrangedSubview(copy)
        box.addArrangedSubview(top)
        let description = string(business["description"], "")
        if !description.isEmpty { box.addArrangedSubview(label(description, size: 14, color: ink, lines: 0)) }
        let services = string(business["services"], "")
        if !services.isEmpty { box.addArrangedSubview(label("Dịch vụ/sản phẩm: \(services)", size: 13, color: muted)) }
        let meta = businessMetaText(business)
        if !meta.isEmpty { box.addArrangedSubview(label(meta, size: 12, color: primary, weight: .semibold, lines: 0)) }
        let offer = string(business["offer"], "")
        if !offer.isEmpty { box.addArrangedSubview(label("Ưu đãi: \(offer)", size: 14, color: primary, weight: .semibold)) }
        let gallery = array(business["gallery"])
        if !gallery.isEmpty { box.addArrangedSubview(businessGalleryView(gallery)) }
        let reviewNote = string(business["reviewNote"], "")
        if !reviewNote.isEmpty { box.addArrangedSubview(label("Lưu ý admin: \(reviewNote)", size: 13, color: UIColor(red: 146/255, green: 64/255, blue: 14/255, alpha: 1), lines: 0)) }
        let contact = [string(business["address"], ""), string(business["phone"], "")].filter { !$0.isEmpty }.joined(separator: " • ")
        if !contact.isEmpty { box.addArrangedSubview(label(contact, size: 13, color: muted)) }
        let website = string(business["website"], "")
        if !website.isEmpty { box.addArrangedSubview(label(website, size: 13, color: primary)) }
        let actions = hstack(spacing: 8)
        if bool(business["isMine"], false) {
            actions.addArrangedSubview(actionButton("Hồ sơ của tôi", primary: true) { self.setStatus("Đây là hồ sơ doanh nghiệp của anh.") })
        } else {
            actions.addArrangedSubview(actionButton("Nhắn doanh nghiệp", primary: true) { self.contactBusiness(business) })
            let owner = normalizePhone(string(business["ownerPhone"], string(business["phone"], "")))
            if !owner.isEmpty { actions.addArrangedSubview(actionButton("Mở chat", primary: false) { self.openChat(owner) }) }
            actions.addArrangedSubview(actionButton("Báo cáo", primary: false) {
                self.promptReportContent(type: "business", id: owner, ownerPhone: owner, details: name)
            })
        }
        actions.addArrangedSubview(actionButton("Sao chép SĐT", primary: false) {
            UIPasteboard.general.string = string(business["phone"], "")
            self.setStatus("Đã sao chép số điện thoại.")
        })
        box.addArrangedSubview(actions)
        return box
    }

    private func renderBusinessInbox(_ mine: [String: Any]) {
        if mine.isEmpty { return }
        let box = card()
        box.addArrangedSubview(label("QUẢN LÝ KHÁCH HÀNG", size: 12, color: primary, weight: .bold))
        let inbox = array(state["businessInbox"])
        if inbox.isEmpty {
            box.addArrangedSubview(label("Chưa có khách liên hệ. Khi khách bấm nhắn doanh nghiệp, danh sách sẽ xuất hiện tại đây.", size: 13, color: muted, lines: 0))
            rootStack.addArrangedSubview(box)
            return
        }
        inbox.prefix(20).forEach { item in
            let row = card()
            let phone = normalizePhone(string(item["phone"], ""))
            row.addArrangedSubview(label(string(item["name"], "Khách hàng Nexa"), size: 15, weight: .semibold))
            let last = string(item["lastText"], "")
            row.addArrangedSubview(label(string(item["statusLabel"], "Khách mới") + (last.isEmpty ? "" : " • \(last)"), size: 12, color: muted, lines: 0))
            let actions = hstack(spacing: 8)
            actions.addArrangedSubview(actionButton("Mở chat", primary: true) { self.openChat(phone) })
            actions.addArrangedSubview(actionButton("Đang xử lý", primary: false) { self.updateBusinessCustomerStatus(phone, status: "handling") })
            actions.addArrangedSubview(actionButton("Hoàn tất", primary: false) { self.updateBusinessCustomerStatus(phone, status: "done") })
            row.addArrangedSubview(actions)
            box.addArrangedSubview(row)
        }
        rootStack.addArrangedSubview(box)
    }

    private func updateBusinessCustomerStatus(_ phone: String, status: String) {
        api.post("/api/businesses/customer/status", body: ["customerPhone": phone, "status": status], auth: true) { result in
            self.handle(result, ok: "Đã cập nhật trạng thái khách.")
            if case .success = result { self.syncAndShow("businesses") }
        }
    }

    private func fillBusinessList(_ list: UIStackView, query: String) {
        list.arrangedSubviews.forEach { $0.removeFromSuperview() }
        let matches = businessSearchResults(query)
        if !plainText(query).isEmpty {
            list.addArrangedSubview(label("Kết quả phù hợp: \(matches.count)", size: 13, color: muted, weight: .semibold))
        }
        if matches.isEmpty {
            list.addArrangedSubview(infoCard("Không tìm thấy doanh nghiệp", "Thử tìm theo tên, ngành nghề, sản phẩm/dịch vụ hoặc khu vực khác."))
            return
        }
        matches.prefix(30).forEach { list.addArrangedSubview(businessCard($0)) }
    }

    private func businessSearchResults(_ query: String) -> [[String: Any]] {
        let keyword = plainText(query)
        return businesses().filter { business in
            keyword.isEmpty || businessSearchScore(business, keyword: keyword) > 0
        }.sorted { left, right in
            let leftDistance = businessDistance(left) ?? Double.greatestFiniteMagnitude
            let rightDistance = businessDistance(right) ?? Double.greatestFiniteMagnitude
            if leftDistance != rightDistance { return leftDistance < rightDistance }
            return businessSearchScore(left, keyword: keyword) > businessSearchScore(right, keyword: keyword)
        }
    }

    private func businessSearchScore(_ business: [String: Any], keyword: String) -> Int {
        if keyword.isEmpty { return 1 }
        let haystack = plainText([
            "name", "category", "description", "services", "keywords", "address", "phone", "website", "offer", "ownerName"
        ].map { string(business[$0], "") }.joined(separator: " "))
        var score = 0
        if plainText(string(business["name"], "")).contains(keyword) { score += 80 }
        if plainText(string(business["category"], "")).contains(keyword) { score += 56 }
        if haystack.contains(keyword) { score += 28 }
        keyword.split(separator: " ").forEach { if haystack.contains(String($0)) { score += 8 } }
        return score
    }

    private func businessLocationText(_ business: [String: Any]) -> String {
        let latitude = double(business["latitude"], Double.nan)
        let longitude = double(business["longitude"], Double.nan)
        if latitude.isNaN || longitude.isNaN { return "Chưa gắn vị trí GPS. Vị trí giúp người dùng tìm nơi gần nhất." }
        return String(format: "Vị trí: %.6f, %.6f", latitude, longitude)
    }

    private func businessMetaText(_ business: [String: Any]) -> String {
        var items: [String] = []
        let serverDistance = string(business["distanceText"], "")
        if !serverDistance.isEmpty { items.append(serverDistance) }
        if serverDistance.isEmpty, let distance = businessDistance(business) {
            items.append(String(format: "%.1f km", distance))
        }
        if bool(business["delivery"], false) { items.append("Có giao hàng") }
        if bool(business["booking"], false) { items.append("Nhận đặt lịch") }
        let radius = string(business["serviceRadiusKm"], "")
        if !radius.isEmpty, radius != "0" { items.append("Phục vụ \(radius)km") }
        if let hours = business["hours"] as? [String: Any] {
            let open = string(hours["open"], "")
            if !open.isEmpty { items.append(open + "-" + string(hours["close"], "")) }
        }
        return items.joined(separator: " • ")
    }

    private func businessDistance(_ business: [String: Any]) -> Double? {
        let serverDistance = double(business["distanceKm"], Double.nan)
        if !serverDistance.isNaN { return serverDistance }
        guard let location = locationManager.location ?? lastKnownLocation else { return nil }
        let latitude = double(business["latitude"], Double.nan)
        let longitude = double(business["longitude"], Double.nan)
        if latitude.isNaN || longitude.isNaN { return nil }
        let businessLocation = CLLocation(latitude: latitude, longitude: longitude)
        return location.distance(from: businessLocation) / 1000.0
    }

    private func businessStatusLabel(_ status: String) -> String {
        switch status {
        case "published", "approved": return "Đã duyệt"
        case "needs_changes": return "Cần bổ sung"
        case "restricted": return "Bị hạn chế"
        case "locked": return "Bị khoá"
        case "rejected": return "Từ chối"
        case "hidden": return "Ẩn"
        default: return "Chờ duyệt"
        }
    }

    private func businessLogoView(_ business: [String: Any], fallback: String, size: CGFloat) -> UIView {
        var logoData = string(business["logoData"], "")
        if logoData.isEmpty, let logo = business["logo"] as? [String: Any] { logoData = string(logo["data"], "") }
        if let image = imageFromDataUri(logoData) {
            let imageView = UIImageView(image: image)
            imageView.translatesAutoresizingMaskIntoConstraints = false
            imageView.contentMode = .scaleAspectFill
            imageView.clipsToBounds = true
            imageView.layer.cornerRadius = 14
            imageView.widthAnchor.constraint(equalToConstant: size).isActive = true
            imageView.heightAnchor.constraint(equalToConstant: size).isActive = true
            return imageView
        }
        return avatar(initials(fallback), size: size, corner: 14)
    }

    private func businessGalleryView(_ gallery: [[String: Any]]) -> UIScrollView {
        let scroll = UIScrollView()
        scroll.showsHorizontalScrollIndicator = false
        scroll.heightAnchor.constraint(equalToConstant: 70).isActive = true
        let row = hstack(spacing: 6)
        row.translatesAutoresizingMaskIntoConstraints = false
        scroll.addSubview(row)
        NSLayoutConstraint.activate([
            row.topAnchor.constraint(equalTo: scroll.contentLayoutGuide.topAnchor),
            row.leadingAnchor.constraint(equalTo: scroll.contentLayoutGuide.leadingAnchor),
            row.trailingAnchor.constraint(equalTo: scroll.contentLayoutGuide.trailingAnchor),
            row.bottomAnchor.constraint(equalTo: scroll.contentLayoutGuide.bottomAnchor),
            row.heightAnchor.constraint(equalTo: scroll.frameLayoutGuide.heightAnchor)
        ])
        gallery.prefix(5).forEach { item in
            if let image = imageFromDataUri(string(item["data"], "")) {
                let imageView = UIImageView(image: image)
                imageView.translatesAutoresizingMaskIntoConstraints = false
                imageView.contentMode = .scaleAspectFill
                imageView.clipsToBounds = true
                imageView.layer.cornerRadius = 10
                imageView.widthAnchor.constraint(equalToConstant: 82).isActive = true
                row.addArrangedSubview(imageView)
            }
        }
        return scroll
    }

    private func contactBusiness(_ business: [String: Any]) {
        let owner = string(business["ownerPhone"], string(business["phone"], ""))
        let alert = UIAlertController(title: "Nhắn doanh nghiệp", message: string(business["name"], ""), preferredStyle: .alert)
        alert.addTextField { $0.placeholder = "Nội dung cần trao đổi" }
        alert.addAction(UIAlertAction(title: "Gửi", style: .default) { _ in
            let text = alert.textFields?.first?.text ?? ""
            self.api.post("/api/businesses/contact", body: ["ownerPhone": owner, "text": text, "message": ["text": text, "time": ""]], auth: true) { result in
                self.handle(result, ok: "Đã gửi liên hệ doanh nghiệp.")
            }
        })
        alert.addAction(UIAlertAction(title: "Đóng", style: .cancel))
        present(alert, animated: true)
    }

    private func renderAi() {
        rootStack.addArrangedSubview(sectionTitle("XPAY AI"))
        let hero = card()
        hero.backgroundColor = UIColor(red: 6/255, green: 78/255, blue: 102/255, alpha: 1)
        hero.addArrangedSubview(label("XPAY Twin AI", size: 24, color: .white, weight: .bold))
        hero.addArrangedSubview(label("Trợ lý cá nhân biết gợi ý trả lời, ghi nhớ quy tắc riêng và hỗ trợ công việc hằng ngày.", size: 14, color: UIColor(red: 224/255, green: 242/255, blue: 254/255, alpha: 1), lines: 0))
        let chips = hstack(spacing: 6)
        chips.addArrangedSubview(chip("Lịch hẹn"))
        chips.addArrangedSubview(chip("Gợi ý trả lời"))
        chips.addArrangedSubview(chip("Tâm sự"))
        hero.addArrangedSubview(chips)
        rootStack.addArrangedSubview(hero)
        let chatCard = card()
        chatCard.addArrangedSubview(label("TRÒ CHUYỆN VỚI XPAY AI", size: 12, color: primary, weight: .bold))
        if aiHistory.isEmpty {
            chatCard.addArrangedSubview(label("XPAY AI sẵn sàng hỗ trợ công việc, lịch hẹn, đời sống và gợi ý trả lời.", size: 14, color: muted, lines: 0))
        } else {
            aiHistory.enumerated().forEach { _, item in chatCard.addArrangedSubview(aiMessageBubble(item)) }
        }
        let composer = card()
        composer.axis = .horizontal
        composer.alignment = .center
        composer.spacing = 8
        composer.layoutMargins = UIEdgeInsets(top: 7, left: 8, bottom: 7, right: 8)
        let field = input("Nhắn với XPAY AI")
        composer.addArrangedSubview(field)
        composer.addArrangedSubview(actionButton("Gửi", primary: true) {
            let prompt = field.textValue
            guard !prompt.isEmpty else { self.setStatus("Anh nhập nội dung để XPAY AI trả lời nhé."); return }
            field.text = ""
            field.becomeFirstResponder()
            let userItem = ["role": "user", "text": prompt]
            let loadingItem = ["role": "assistant", "text": "XPAY AI đang trả lời..."]
            self.aiHistory.append(userItem)
            self.aiHistory.append(loadingItem)
            self.aiHistory = Array(self.aiHistory.suffix(40))
            self.setStatus("XPAY AI đang trả lời...")

            let userBubble = self.aiMessageBubble(userItem)
            let loadingBubble = self.aiMessageBubble(loadingItem)
            chatCard.addArrangedSubview(userBubble)
            chatCard.addArrangedSubview(loadingBubble)
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) {
                self.rootScroll.scrollToBottom(animated: false)
            }

            let requestHistory = self.aiHistory.filter { $0["text"] != "XPAY AI đang trả lời..." }
            self.api.post("/api/ai/assistant", body: ["prompt": prompt, "history": requestHistory], auth: true, timeout: 75) { result in
                if loadingBubble.superview != nil { loadingBubble.removeFromSuperview() }
                switch result {
                case .success(let data):
                    if self.aiHistory.last?["text"] == "XPAY AI đang trả lời..." { self.aiHistory.removeLast() }
                    let answerItem = ["role": "assistant", "text": string(data["answer"], "XPAY AI chưa có phản hồi.")]
                    self.aiHistory.append(answerItem)
                    self.aiHistory = Array(self.aiHistory.suffix(40))
                    if chatCard.superview != nil, self.activeSection == "ai" {
                        let answerBubble = self.aiMessageBubble(answerItem)
                        chatCard.addArrangedSubview(answerBubble)
                        self.setStatus("XPAY AI đã trả lời.")
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) { self.rootScroll.scrollToBottom(animated: false) }
                    }
                case .failure(let error):
                    if self.aiHistory.last?["text"] == "XPAY AI đang trả lời..." { self.aiHistory.removeLast() }
                    let errorItem = ["role": "assistant", "text": error.localizedDescription]
                    self.aiHistory.append(errorItem)
                    self.aiHistory = Array(self.aiHistory.suffix(40))
                    if chatCard.superview != nil, self.activeSection == "ai" {
                        let errorBubble = self.aiMessageBubble(errorItem)
                        chatCard.addArrangedSubview(errorBubble)
                        self.setStatus(error.localizedDescription)
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) { self.rootScroll.scrollToBottom(animated: false) }
                    }
                }
            }
        })
        let shouldFocusAi = focusAiComposerAfterRender
        focusAiComposerAfterRender = false
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
            self.rootScroll.scrollToBottom(animated: false)
            if shouldFocusAi { field.becomeFirstResponder() }
        }
        rootStack.addArrangedSubview(chatCard)
        rootStack.addArrangedSubview(actionButton("Xoá lịch sử XPAY AI", primary: false) {
            self.aiHistory.removeAll()
            self.renderHome()
            self.setStatus("Đã xoá lịch sử chat XPAY AI trên thiết bị này.")
        })
        rootStack.addArrangedSubview(aiRulesCard())
        installFixedComposer(composer)
    }

    private func aiMessageBubble(_ item: [String: String]) -> UIView {
        let mine = item["role"] == "user"
        let bubble = label(item["text"] ?? "", size: 14, color: mine ? .white : ink, lines: 0)
        bubble.backgroundColor = mine ? primary : .white
        bubble.layer.cornerRadius = 14
        bubble.layer.borderColor = softBorder.cgColor
        bubble.layer.borderWidth = mine ? 0 : 1
        bubble.clipsToBounds = true
        (bubble as? NexaPaddedLabel)?.textInsets = UIEdgeInsets(top: 6, left: 10, bottom: 6, right: 10)
        bubble.isUserInteractionEnabled = true
        bubble.addGestureRecognizer(NexaTapGesture {
            UIPasteboard.general.string = item["text"] ?? ""
            self.setStatus("Đã sao chép tin nhắn XPAY AI.")
        })
        let wrap = hstack(spacing: 0)
        if mine { wrap.addArrangedSubview(UIView()) }
        wrap.addArrangedSubview(bubble)
        if !mine { wrap.addArrangedSubview(UIView()) }
        let maxBubbleWidth = max(180, min(view.bounds.width * 0.78, 340))
        bubble.widthAnchor.constraint(lessThanOrEqualToConstant: maxBubbleWidth).isActive = true
        return wrap
    }

    private func aiRulesCard() -> UIStackView {
        let card = self.card()
        card.addArrangedSubview(label("QUY TẮC RIÊNG", size: 12, color: primary, weight: .bold))
        card.addArrangedSubview(label("Đặt nguyên tắc để XPAY AI trả lời đúng phong cách và giới hạn mong muốn.", size: 13, color: muted, lines: 0))
        let rulesDict = state["aiRules"] as? [String: Any] ?? [:]
        let rules = input("Quy tắc riêng cho XPAY AI", text: string(rulesDict["customRules"], ""))
        card.addArrangedSubview(rules)
        card.addArrangedSubview(actionButton("Lưu quy tắc", primary: true) {
            let payload: [String: Any] = ["allowAutoReply": true, "allowContext": true, "allowLiveInfo": true, "customRules": rules.textValue]
            self.api.post("/api/ai/rules/update", body: ["rules": payload], auth: true) { result in
                self.handle(result, ok: "Đã cập nhật quy tắc XPAY AI.")
                if case .success = result { self.syncAndShow("ai") }
            }
        })
        return card
    }

    private func renderFriends() {
        rootStack.addArrangedSubview(sectionTitle("Bạn bè"))
        let tools = hstack(spacing: 8)
        tools.addArrangedSubview(actionButton("Thêm bạn mới", primary: true) { self.openHomeSection("addFriend") })
        tools.addArrangedSubview(actionButton("Quét QR", primary: false) { self.openHomeSection("qr") })
        rootStack.addArrangedSubview(tools)
        rootStack.addArrangedSubview(referralCard())
        renderFriendRequests()
        if friends().isEmpty {
            rootStack.addArrangedSubview(infoCard("Chưa có bạn bè", "Anh có thể kết bạn bằng số điện thoại hoặc từ Quanh đây."))
            return
        }
        friends().prefix(100).forEach { friend in
            rootStack.addArrangedSubview(friendRow(friend))
        }
    }

    private func renderAddFriend() {
        rootStack.addArrangedSubview(sectionTitle("Thêm bạn"))
        let add = card()
        add.addArrangedSubview(label("KẾT BẠN", size: 12, color: primary, weight: .bold))
        add.addArrangedSubview(label("Nhập đầy đủ số điện thoại, sau đó bấm Thêm bạn để kết nối tài khoản XPAY Chat.", size: 13, color: muted, lines: 0))
        let phone = input("Nhập số điện thoại để kết bạn")
        add.addArrangedSubview(phone)
        add.addArrangedSubview(actionButton("Thêm bạn", primary: true) {
            guard !phone.textValue.isEmpty else { self.setStatus("Vui lòng nhập số điện thoại."); return }
            self.setStatus("Đang gửi yêu cầu kết bạn...")
            self.api.post("/api/friends/add", body: ["phone": phone.textValue], auth: true) { result in
                self.handle(result, ok: "Đã gửi yêu cầu kết bạn. Khi người kia chấp nhận, hai bên mới nhắn tin/gọi được.")
                if case .success = result { self.syncAndShow("friends") }
            }
        })
        rootStack.addArrangedSubview(add)
    }

    private func renderFriendRequests() {
        array(state["friendRequests"]).forEach { request in
            guard string(request["status"], "") == "pending" else { return }
            let profile = request["profile"] as? [String: Any] ?? [:]
            let direction = string(request["direction"], "")
            let name = displayName(profile, fallback: string(request["requesterPhone"], "Nexa User"))
            let card = self.card()
            card.addArrangedSubview(label("YÊU CẦU KẾT BẠN", size: 12, color: primary, weight: .bold))
            card.addArrangedSubview(label(name, size: 17, weight: .semibold))
            card.addArrangedSubview(label(direction == "incoming" ? "Người này muốn kết bạn với anh." : "Đang chờ người kia xác nhận.", size: 13, color: muted, lines: 0))
            if direction == "incoming" {
                let actions = hstack(spacing: 8)
                let requestId = string(request["id"], "")
                actions.addArrangedSubview(actionButton("Nhận", primary: true) { self.respondFriendRequest(requestId, action: "accept") })
                actions.addArrangedSubview(actionButton("Từ chối", primary: false) { self.respondFriendRequest(requestId, action: "reject") })
                card.addArrangedSubview(actions)
            }
            rootStack.addArrangedSubview(card)
        }
    }

    private func respondFriendRequest(_ requestId: String, action: String) {
        api.post("/api/friends/respond", body: ["requestId": requestId, "action": action], auth: true) { result in
            self.handle(result, ok: "Đã cập nhật yêu cầu kết bạn.")
            if case .success = result { self.syncAndShow("friends") }
        }
    }

    private func friendRow(_ friend: [String: Any]) -> UIStackView {
        let row = card()
        row.axis = .horizontal
        row.alignment = .center
        let phone = string(friend["accountPhone"], string(friend["phone"], ""))
        row.addArrangedSubview(avatarView(friend, fallback: displayName(friend, fallback: phone), size: 42, corner: 15))
        let copy = vstack(spacing: 2)
        copy.addArrangedSubview(label(displayName(friend, fallback: phone), size: 15, weight: .semibold))
        copy.addArrangedSubview(label([string(friend["presenceStatus"], ""), accountBadges(friend)].filter { !$0.isEmpty }.joined(separator: " · "), size: 12, color: muted))
        row.addArrangedSubview(copy)
        let spacer = UIView()
        spacer.setContentHuggingPriority(.defaultLow, for: .horizontal)
        row.addArrangedSubview(spacer)
        let actions = hstack(spacing: 6)
        if bool(friend["blockedByMe"], false) {
            actions.addArrangedSubview(actionButton("Bỏ chặn", primary: true) { self.updateFriendBlock(phone: phone, blocked: false) })
        } else if bool(friend["blockedMe"], false) {
            actions.addArrangedSubview(actionButton("Bị chặn", primary: false) { self.setStatus("Người này hiện không nhận liên hệ.") })
        } else {
            actions.addArrangedSubview(actionButton("Nhắn", primary: true) { self.openChat(phone) })
            actions.addArrangedSubview(iconButton("☎") { self.startCall(phone: phone, mode: "voice") })
            actions.addArrangedSubview(iconButton("▣") { self.startCall(phone: phone, mode: "video") })
            actions.addArrangedSubview(actionButton("Chặn", primary: false) { self.updateFriendBlock(phone: phone, blocked: true) })
        }
        row.addArrangedSubview(actions)
        return row
    }

    private func referralCard() -> UIStackView {
        let box = card()
        box.addArrangedSubview(label("GIỚI THIỆU BẠN MỚI", size: 12, color: primary, weight: .bold))
        box.addArrangedSubview(label("Điểm giới thiệu: \(referralPoints()) điểm", size: 16, weight: .semibold))
        box.addArrangedSubview(label("Mỗi tài khoản mới đăng ký và xác minh thành công qua link giới thiệu sẽ được tính 1 điểm. Nội dung chia sẻ chỉ dùng link giới thiệu chính thức của XPAY Chat.", size: 13, color: muted, lines: 0))
        let actions = hstack(spacing: 8)
        actions.addArrangedSubview(actionButton("Tạo link", primary: true) { self.showReferralLink() })
        actions.addArrangedSubview(actionButton("Chia sẻ", primary: false) { self.shareReferralLink() })
        box.addArrangedSubview(actions)
        return box
    }

    private func referralPoints() -> Int {
        let user = currentUser()
        let referral = user["referral"] as? [String: Any] ?? [:]
        return int(referral["points"], int(referral["referralPoints"], int(user["referralPoints"], int(user["invitePoints"], 0))))
    }

    private func referralLink() -> String {
        let phone = normalizePhone(userPhone().isEmpty ? store.phone : userPhone())
        return "https://gatewayxpay.com/?ref=\(phone)"
    }

    private func referralShareText() -> String {
        return "Mời bạn tham gia XPAY Chat qua link giới thiệu của tôi:\n\(referralLink())\n\nHướng dẫn:\n1. Mở XPAY Chat bằng trình duyệt hoặc ứng dụng chính thức.\n2. Đăng ký tài khoản bằng số điện thoại, email và OTP.\n3. Sau khi xác minh, hai bên có thể kết bạn và dùng XPAY Chat."
    }

    private func showReferralLink() {
        UIPasteboard.general.string = referralShareText()
        let alert = UIAlertController(title: "Link giới thiệu", message: referralShareText() + "\n\nNội dung giới thiệu đã được sao chép. Khi người mới đăng ký và xác minh thành công, tài khoản giới thiệu sẽ được cộng điểm theo cơ chế trên máy chủ.", preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "Chia sẻ", style: .default) { _ in self.shareReferralLink() })
        alert.addAction(UIAlertAction(title: "Đóng", style: .cancel))
        present(alert, animated: true)
    }

    private func shareReferralLink() {
        let controller = UIActivityViewController(activityItems: [referralShareText()], applicationActivities: nil)
        present(controller, animated: true)
    }

    private func updateFriendBlock(phone: String, blocked: Bool) {
        guard !phone.isEmpty else { return }
        api.post("/api/friends/block", body: ["friendPhone": phone, "blocked": blocked], auth: true) { result in
            self.handle(result, ok: blocked ? "Đã chặn người dùng này." : "Đã bỏ chặn người dùng này.")
            if case .success = result { self.syncAndShow("friends") }
        }
    }

    private func renderNearby() {
        rootStack.addArrangedSubview(sectionTitle("Quanh đây"))
        let locationCard = card()
        locationCard.addArrangedSubview(label("VỊ TRÍ", size: 12, color: primary, weight: .bold))
        locationCard.addArrangedSubview(label("Bật vị trí để tìm bạn bè, dịch vụ và doanh nghiệp gần nhất.", size: 13, color: muted, lines: 0))
        locationCard.addArrangedSubview(actionButton("Cập nhật vị trí hiện tại", primary: true) {
            self.updateCurrentLocation()
        })
        rootStack.addArrangedSubview(locationCard)
        array(state["nearby"]).prefix(80).forEach { person in
            let row = card()
            row.axis = .horizontal
            row.alignment = .center
            let phone = string(person["accountPhone"], string(person["phone"], ""))
            row.addArrangedSubview(avatarView(person, fallback: displayName(person, fallback: phone), size: 42, corner: 15))
            let copy = vstack(spacing: 2)
            copy.addArrangedSubview(label(displayName(person, fallback: phone), size: 15, weight: .semibold))
            copy.addArrangedSubview(label([string(person["distanceText"], ""), string(person["presenceStatus"], "Người dùng XPAY Chat")].filter { !$0.isEmpty }.joined(separator: " • "), size: 12, color: muted))
            row.addArrangedSubview(copy)
            let spacer = UIView()
            spacer.setContentHuggingPriority(.defaultLow, for: .horizontal)
            row.addArrangedSubview(spacer)
            row.addArrangedSubview(actionButton("Kết bạn", primary: true) {
                self.api.post("/api/friends/add", body: ["phone": phone], auth: true) { result in
                    self.handle(result, ok: "Đã gửi yêu cầu kết bạn.")
                }
            })
            rootStack.addArrangedSubview(row)
        }
        if array(state["nearby"]).isEmpty { rootStack.addArrangedSubview(infoCard("Chưa có người dùng quanh đây", "Khi có dữ liệu vị trí, danh sách phù hợp sẽ xuất hiện tại đây.")) }
    }

    private func renderJournals() {
        rootStack.addArrangedSubview(sectionTitle("Nhật ký"))
        let composer = card()
        composer.addArrangedSubview(label("ĐĂNG TRẠNG THÁI", size: 12, color: primary, weight: .bold))
        let textInput = input("Anh đang nghĩ gì?", text: pendingJournalDraftText)
        composer.addArrangedSubview(textInput)
        let privacyRow = hstack(spacing: 8)
        [("Bạn bè", "friends"), ("Công khai", "public"), ("Riêng tư", "private")].forEach { title, value in
            privacyRow.addArrangedSubview(actionButton(title, primary: pendingJournalPrivacy == value) {
                self.pendingJournalDraftText = textInput.textValue
                self.pendingJournalPrivacy = value
                self.renderHome()
            })
        }
        composer.addArrangedSubview(privacyRow)
        let actionRow = hstack(spacing: 8)
        actionRow.addArrangedSubview(actionButton("Kèm ảnh", primary: false) {
            self.pendingJournalDraftText = textInput.textValue
            self.pickImage(target: "journal")
        })
        if let image = pendingJournalImage, let preview = imageFromDataUri(string(image["data"], ""), maxPixel: 360) {
            let imagePreview = UIImageView(image: preview)
            imagePreview.translatesAutoresizingMaskIntoConstraints = false
            imagePreview.contentMode = .scaleAspectFill
            imagePreview.clipsToBounds = true
            imagePreview.layer.cornerRadius = 12
            imagePreview.layer.borderWidth = 1
            imagePreview.layer.borderColor = softBorder.cgColor
            imagePreview.widthAnchor.constraint(equalToConstant: 72).isActive = true
            imagePreview.heightAnchor.constraint(equalToConstant: 72).isActive = true
            actionRow.addArrangedSubview(imagePreview)
            actionRow.addArrangedSubview(actionButton("Bỏ ảnh", primary: false) {
                self.pendingJournalImage = nil
                self.pendingJournalDraftText = textInput.textValue
                self.renderHome()
            })
        }
        composer.addArrangedSubview(actionButton("Đăng nhật ký", primary: true) {
            let text = textInput.textValue
            guard !text.isEmpty || self.pendingJournalImage != nil else { self.setStatus("Nhật ký đang trống."); return }
            var post: [String: Any] = ["text": text, "privacy": self.pendingJournalPrivacy, "time": ""]
            if let image = self.pendingJournalImage { post["image"] = image }
            self.setStatus("Đang đăng nhật ký...")
            self.api.post("/api/journals/create", body: ["post": post], auth: true) { result in
                switch result {
                case .success:
                    self.pendingJournalImage = nil
                    self.pendingJournalDraftText = ""
                    self.pendingJournalPrivacy = "friends"
                    self.setStatus("Đã đăng nhật ký.")
                    self.syncAndShow("journals")
                case .failure(let error):
                    self.pendingJournalDraftText = text
                    self.setStatus(error.localizedDescription)
                }
            }
        })
        composer.addArrangedSubview(actionRow)
        rootStack.addArrangedSubview(composer)
        posts().prefix(80).forEach { post in
            rootStack.addArrangedSubview(journalCard(post))
        }
        if posts().isEmpty { rootStack.addArrangedSubview(infoCard("Chưa có nhật ký", "Các bài viết của bạn bè sẽ xuất hiện tại đây.")) }
    }

    private func journalCard(_ post: [String: Any]) -> UIStackView {
        let box = card()
        let row = hstack(spacing: 10)
        row.alignment = .center
        let copy = vstack(spacing: 3)
        copy.addArrangedSubview(label(string(post["authorName"], "XPAY Chat"), size: 15, weight: .semibold))
        let meta = [string(post["privacy"], "friends"), lastMessageTime(["messages": [["createdAt": string(post["createdAt"], "")]]])].filter { !$0.isEmpty }.joined(separator: " · ")
        copy.addArrangedSubview(label(meta, size: 11, color: muted))
        let body = string(post["body"], string(post["text"], ""))
        copy.addArrangedSubview(label(body.isEmpty ? "Đã chia sẻ một hình ảnh mới." : body, size: 14, color: ink, lines: 3))
        row.addArrangedSubview(copy)
        let spacer = UIView()
        spacer.setContentHuggingPriority(.defaultLow, for: .horizontal)
        row.addArrangedSubview(spacer)
        if let imageObject = post["image"] as? [String: Any],
           let image = imageFromDataUri(string(imageObject["data"], ""), maxPixel: 420) {
            let imageView = UIImageView(image: image)
            imageView.translatesAutoresizingMaskIntoConstraints = false
            imageView.contentMode = .scaleAspectFill
            imageView.clipsToBounds = true
            imageView.layer.cornerRadius = 12
            imageView.layer.borderWidth = 1
            imageView.layer.borderColor = softBorder.cgColor
            imageView.widthAnchor.constraint(equalToConstant: 82).isActive = true
            imageView.heightAnchor.constraint(equalToConstant: 82).isActive = true
            row.addArrangedSubview(imageView)
        }
        box.addArrangedSubview(row)
        let id = string(post["id"], "")
        let authorPhone = string(post["authorPhone"], "")
        if normalizePhone(authorPhone) == normalizePhone(userPhone()), !id.isEmpty {
            box.addArrangedSubview(actionButton("Xoá nhật ký", primary: false) {
                self.deleteJournal(id: id)
            })
        } else if !id.isEmpty {
            box.addArrangedSubview(actionButton("Báo cáo nhật ký", primary: false) {
                self.promptReportContent(type: "journal", id: id, ownerPhone: authorPhone, details: string(post["text"], string(post["body"], "")))
            })
        }
        return box
    }

    private func deleteJournal(id: String) {
        guard !id.isEmpty else { return }
        let alert = UIAlertController(title: "Xoá nhật ký", message: "Xoá bài nhật ký này khỏi XPAY Chat?", preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "Huỷ", style: .cancel))
        alert.addAction(UIAlertAction(title: "Xoá", style: .destructive) { _ in
            self.setStatus("Đang xoá nhật ký...")
            self.api.post("/api/journals/delete", body: ["id": id], auth: true) { result in
                switch result {
                case .success:
                    self.setStatus("Đã xoá nhật ký.")
                    self.syncAndShow("journals")
                case .failure(let error):
                    self.setStatus(error.localizedDescription)
                }
            }
        })
        present(alert, animated: true)
    }

    private func renderProfile() {
        rootStack.addArrangedSubview(sectionTitle("Cá nhân"))
        let user = currentUser()
        let box = card()
        box.addArrangedSubview(label("THÔNG TIN CÁ NHÂN", size: 12, color: primary, weight: .bold))
        let avatarRow = hstack(spacing: 10)
        avatarRow.alignment = .center
        let avatarSource = pendingAvatarData.isEmpty ? user : user.merging(["avatarData": pendingAvatarData]) { _, new in new }
        avatarRow.addArrangedSubview(avatarView(avatarSource, fallback: displayName(user, fallback: userPhone()), size: 58, corner: 20))
        let avatarCopy = vstack(spacing: 4)
        avatarCopy.addArrangedSubview(label(displayName(user, fallback: "Nexa User"), size: 16, weight: .semibold))
        avatarCopy.addArrangedSubview(label(userPhone(), size: 12, color: muted))
        avatarCopy.addArrangedSubview(actionButton("Đổi ảnh đại diện", primary: false) { self.pickImage(target: "avatar") })
        avatarRow.addArrangedSubview(avatarCopy)
        box.addArrangedSubview(avatarRow)
        let name = input("Họ tên", text: displayName(user, fallback: ""))
        let display = input("Tên hiển thị", text: string(user["displayName"], ""))
        let email = input("Email", text: string(user["email"], ""))
        let birth = input("Ngày sinh yyyy-mm-dd", text: string(user["birthDate"], ""))
        birth.addAction(UIAction { _ in self.showBirthPicker(field: birth) }, for: .editingDidBegin)
        let gender = input("Giới tính", text: string(user["gender"], ""))
        let address = input("Địa chỉ/khu vực", text: string(user["address"], ""))
        let work = input("Công việc", text: string(user["work"], ""))
        let education = input("Học vấn", text: string(user["education"], ""))
        let website = input("Website/Mạng xã hội", text: string(user["website"], ""))
        let interests = input("Sở thích", text: string(user["interests"], ""))
        let bio = input("Giới thiệu ngắn", text: string(user["bio"], ""))
        [name, display, email, birth, gender, address, work, education, website, interests, bio].forEach { box.addArrangedSubview($0) }
        let privacy = user["privacy"] as? [String: Any] ?? [:]
        let showPhone = UISwitch()
        showPhone.isOn = bool(privacy["phone"], true)
        let showBirth = UISwitch()
        showBirth.isOn = bool(privacy["birthDate"], true)
        let showInterests = UISwitch()
        showInterests.isOn = bool(privacy["interests"], true)
        let showAvatar = UISwitch()
        showAvatar.isOn = bool(privacy["avatar"], true)
        box.addArrangedSubview(label("QUYỀN HIỂN THỊ", size: 12, color: primary, weight: .bold))
        box.addArrangedSubview(toggleRow("Hiển thị số điện thoại khi kết bạn/QR", showPhone))
        box.addArrangedSubview(toggleRow("Hiển thị ngày sinh", showBirth))
        box.addArrangedSubview(toggleRow("Hiển thị sở thích", showInterests))
        box.addArrangedSubview(toggleRow("Hiển thị ảnh đại diện", showAvatar))
        box.addArrangedSubview(actionButton("Lưu hồ sơ", primary: true) {
            var profile: [String: Any] = [
                "fullName": name.textValue,
                "name": name.textValue,
                "displayName": display.textValue,
                "email": email.textValue,
                "birthDate": birth.textValue,
                "gender": gender.textValue,
                "address": address.textValue,
                "work": work.textValue,
                "education": education.textValue,
                "website": website.textValue,
                "interests": interests.textValue,
                "bio": bio.textValue,
                "privacy": [
                    "phone": showPhone.isOn,
                    "birthDate": showBirth.isOn,
                    "interests": showInterests.isOn,
                    "avatar": showAvatar.isOn
                ]
            ]
            if !self.pendingAvatarData.isEmpty { profile["avatarData"] = self.pendingAvatarData }
            self.api.post("/api/profile/update", body: ["profile": profile], auth: true) { result in
                self.handle(result, ok: "Đã cập nhật hồ sơ.")
                if case .success = result {
                    self.pendingAvatarData = ""
                    self.syncAndShow("profile")
                }
            }
        })
        rootStack.addArrangedSubview(box)
    }

    private func showBirthPicker(field: NexaTextField) {
        field.resignFirstResponder()
        let alert = UIAlertController(title: "Ngày tháng năm sinh", message: "\n\n\n\n\n\n\n\n", preferredStyle: .alert)
        let picker = UIDatePicker()
        picker.datePickerMode = .date
        picker.preferredDatePickerStyle = .wheels
        picker.locale = Locale(identifier: "vi_VN")
        picker.maximumDate = Date()
        let parser = DateFormatter()
        parser.locale = Locale(identifier: "en_US_POSIX")
        parser.dateFormat = "yyyy-MM-dd"
        picker.date = parser.date(from: field.textValue) ?? Calendar.current.date(from: DateComponents(year: 1990, month: 1, day: 1)) ?? Date()
        picker.translatesAutoresizingMaskIntoConstraints = false
        alert.view.addSubview(picker)
        NSLayoutConstraint.activate([
            picker.leadingAnchor.constraint(equalTo: alert.view.leadingAnchor, constant: 8),
            picker.trailingAnchor.constraint(equalTo: alert.view.trailingAnchor, constant: -8),
            picker.topAnchor.constraint(equalTo: alert.view.topAnchor, constant: 62),
            picker.heightAnchor.constraint(equalToConstant: 190)
        ])
        alert.addAction(UIAlertAction(title: "Huỷ", style: .cancel))
        alert.addAction(UIAlertAction(title: "Chọn", style: .default) { _ in
            field.text = parser.string(from: picker.date)
        })
        present(alert, animated: true)
    }

    private func renderCalls() {
        rootStack.addArrangedSubview(sectionTitle("Cuộc gọi"))
        rootStack.addArrangedSubview(infoCard("Lịch sử cuộc gọi", "Ưu tiên thống kê gọi đến, gọi đi, gọi nhỡ, máy bận, thời lượng và thời gian cuộc gọi."))
        array(state["calls"]).prefix(80).forEach { call in
            rootStack.addArrangedSubview(callCard(call))
        }
        if array(state["calls"]).isEmpty { rootStack.addArrangedSubview(infoCard("Chưa có lịch sử cuộc gọi", "Các cuộc gọi đến, gọi đi và trạng thái kết thúc sẽ hiện tại đây.")) }
        rootStack.addArrangedSubview(actionButton("Làm mới cuộc gọi", primary: false) { self.syncAndShow("calls") })
    }

    private func callCard(_ call: [String: Any]) -> UIStackView {
        let card = self.card()
        let peer = call["peer"] as? [String: Any] ?? [:]
        let peerPhone = string(call["peerPhone"], string(call["friendPhone"], ""))
        let peerName = displayName(peer, fallback: string(call["peerName"], peerPhone))
        let mode = string(call["mode"], "") == "video" ? "Video call" : "Gọi thoại"
        card.addArrangedSubview(label(peerName, size: 17, weight: .semibold))
        card.addArrangedSubview(label("\(mode) · \(callDirectionLabel(call)) · \(callStatusLabel(call))", size: 13, color: muted))
        card.addArrangedSubview(label("Thời gian: \(callTimeLabel(call)) · \(callDurationLabel(call))", size: 12, color: muted, lines: 0))
        let actions = hstack(spacing: 8)
        let callId = string(call["id"], "")
        let status = string(call["status"], "")
        if string(call["direction"], "") == "incoming", status == "ringing" {
            actions.addArrangedSubview(actionButton("Nghe máy", primary: true) { self.respondCall(id: callId, action: "accept") })
            actions.addArrangedSubview(actionButton("Từ chối", primary: false) { self.respondCall(id: callId, action: "reject") })
        } else if status == "active" || status == "ringing" {
            actions.addArrangedSubview(actionButton("Mở cuộc gọi", primary: true) { self.showNativeCallNotice(call) })
        } else {
            actions.addArrangedSubview(actionButton("Gọi lại", primary: true) { self.startCall(phone: peerPhone, mode: string(call["mode"], "voice")) })
        }
        if status == "active" || status == "ringing" {
            actions.addArrangedSubview(actionButton("Kết thúc", primary: false) { self.respondCall(id: callId, action: "end") })
        }
        actions.addArrangedSubview(actionButton("Chi tiết", primary: false) { self.showCallDetail(call) })
        card.addArrangedSubview(actions)
        return card
    }

    private func startCall(phone: String, mode: String) {
        let clean = normalizePhone(phone)
        guard !clean.isEmpty else { setStatus("Chưa có số điện thoại để gọi."); return }
        sectionBeforeCall = activeFriendPhone.isEmpty ? activeSection : sectionBeforeChat
        requestCallPermissions(mode: mode) { granted in
            guard granted else { return }
            self.activateAudioSession(mode: mode)
            self.createServerCall(phone: clean, mode: mode)
        }
    }

    private func createServerCall(phone: String, mode: String) {
        setStatus("Đang tạo cuộc gọi...")
        api.post("/api/calls/start", body: ["friendPhone": phone, "mode": mode], auth: true) { result in
            switch result {
            case .success(let data):
                let call = data["call"] as? [String: Any] ?? [:]
                let status = string(call["status"], "")
                if ["busy", "missed", "rejected", "ended"].contains(status) {
                    self.stopRingback()
                    self.nativeRtc.stop()
                    self.setStatus("Cuộc gọi: \(self.callStatusLabel(call))")
                    self.syncAndShow("calls")
                } else {
                    self.showNativeCallNotice(call)
                }
            case .failure(let error):
                self.setStatus(error.localizedDescription)
            }
        }
    }

    private func respondCall(id: String, action: String) {
        guard !id.isEmpty else { return }
        if action == "accept" {
            let call = array(state["calls"]).first { string($0["id"], "") == id } ?? [:]
            let mode = string(call["mode"], activeCallMode)
            requestCallPermissions(mode: mode) { granted in
                guard granted else { return }
                self.activateAudioSession(mode: mode)
                self.sendCallResponse(id: id, action: action)
            }
            return
        }
        if action == "end" || action == "reject" { stopRingback() }
        if action == "end" || action == "reject" { deactivateAudioSession() }
        sendCallResponse(id: id, action: action)
    }

    private func sendCallResponse(id: String, action: String) {
        api.post("/api/calls/respond", body: ["id": id, "action": action], auth: true) { result in
            switch result {
            case .success(let data):
                let call = data["call"] as? [String: Any] ?? [:]
                self.setStatus("Đã cập nhật cuộc gọi.")
                if action == "accept", !call.isEmpty {
                    self.showNativeCallNotice(call)
                } else {
                    if action == "end" || action == "reject" { self.nativeRtc.stop() }
                    self.syncAndShow("calls")
                }
            case .failure(let error):
                self.setStatus(error.localizedDescription)
            }
        }
    }

    private func requestCallPermissions(mode: String, completion: @escaping (Bool) -> Void) {
        let needsVideo = mode == "video"
        func requestCameraIfNeeded() {
            guard needsVideo else {
                DispatchQueue.main.async { completion(true) }
                return
            }
            switch AVCaptureDevice.authorizationStatus(for: .video) {
            case .authorized:
                DispatchQueue.main.async { completion(true) }
            case .notDetermined:
                AVCaptureDevice.requestAccess(for: .video) { granted in
                    DispatchQueue.main.async {
                        if !granted { self.setStatus("Cần cấp quyền camera để gọi video.") }
                        completion(granted)
                    }
                }
            default:
                setStatus("Cần cấp quyền camera trong Cài đặt để gọi video.")
                completion(false)
            }
        }

        switch AVCaptureDevice.authorizationStatus(for: .audio) {
        case .authorized:
            requestCameraIfNeeded()
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .audio) { granted in
                DispatchQueue.main.async {
                    if granted {
                        requestCameraIfNeeded()
                    } else {
                        self.setStatus("Cần cấp quyền micro để gọi thoại/video.")
                        completion(false)
                    }
                }
            }
        default:
            setStatus("Cần cấp quyền micro trong Cài đặt để gọi thoại/video.")
            completion(false)
        }
    }

    private func activateAudioSession(mode: String) {
        let session = AVAudioSession.sharedInstance()
        try? session.setCategory(.playAndRecord, mode: mode == "video" ? .videoChat : .voiceChat, options: [.allowBluetooth, .allowBluetoothA2DP])
        try? session.overrideOutputAudioPort(callSpeakerOn ? .speaker : .none)
        try? session.setActive(true)
    }

    private func deactivateAudioSession() {
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }

    private func updateNativeRtc(_ call: [String: Any]) {
        guard !smokeMode else { return }
        let callId = string(call["id"], "")
        let status = string(call["status"], "")
        let direction = string(call["direction"], "")
        guard !callId.isEmpty else { return }
        if ["ended", "rejected", "missed", "busy"].contains(status) {
            nativeRtc.stop()
            return
        }
        let shouldStartMedia = status == "active" || (direction == "outgoing" && status == "ringing")
        guard shouldStartMedia else { return }
        nativeRtc.start(
            callId: callId,
            mode: string(call["mode"], "voice"),
            isCaller: direction == "outgoing",
            sendSignal: { [weak self] type, payload in
                self?.api.post("/api/calls/signal", body: ["id": callId, "type": type, "payload": payload], auth: true) { result in
                    if case .failure(let error) = result { self?.setStatus(error.localizedDescription) }
                }
            },
            onStatus: { [weak self] statusText in
                self?.setStatus(statusText)
            }
        )
        nativeRtc.processSignals(array(call["signals"]))
    }

    private func startRingbackIfNeeded(call: [String: Any]) {
        guard !smokeMode,
              localSetting("setting_call_ringback", true),
              string(call["direction"], "") == "outgoing",
              string(call["status"], "") == "ringing" else {
            stopRingback()
            return
        }
        guard ringbackTimer == nil else { return }
        AudioServicesPlaySystemSound(1151)
        let timer = Timer(timeInterval: 2.4, repeats: true) { _ in
            AudioServicesPlaySystemSound(1151)
        }
        ringbackTimer = timer
        RunLoop.main.add(timer, forMode: .common)
    }

    private func stopRingback() {
        ringbackTimer?.invalidate()
        ringbackTimer = nil
    }

    private func showNativeCallNotice(_ call: [String: Any]) {
        if activeCallId.isEmpty {
            sectionBeforeCall = activeFriendPhone.isEmpty ? activeSection : sectionBeforeChat
        }
        resetRoot()
        activeCallId = string(call["id"], "")
        activeCallStatus = string(call["status"], "")
        activeCallMode = string(call["mode"], "voice")
        startRingbackIfNeeded(call: call)
        updateNativeRtc(call)
        let peer = call["peer"] as? [String: Any] ?? [:]
        let peerPhone = string(call["peerPhone"], "")
        let peerName = displayName(peer, fallback: peerPhone)
        let isVideo = activeCallMode == "video"
        let modeLabel = isVideo ? "VIDEO CALL" : "GỌI THOẠI"
        let header = card()
        header.alignment = .center
        header.addArrangedSubview(label(modeLabel, size: 12, color: primary, weight: .bold, align: .center))
        header.addArrangedSubview(label(peerName, size: 26, weight: .bold, align: .center))
        header.addArrangedSubview(label(peerPhone, size: 14, color: muted, align: .center))
        header.addArrangedSubview(label(callStatusText(direction: string(call["direction"], ""), status: string(call["status"], "ringing")), size: 15, color: primary, weight: .semibold, align: .center))
        rootStack.addArrangedSubview(header)
        rootStack.addArrangedSubview(isVideo ? videoCallPanel(status: call) : voiceCallPanel(status: call))
        let controls = card()
        controls.addArrangedSubview(label("ĐIỀU KHIỂN CUỘC GỌI", size: 12, color: primary, weight: .bold))
        let callId = string(call["id"], "")
        let toggles = hstack(spacing: 8)
        callMicButton = callControlButton("")
        callSpeakerButton = callControlButton("")
        callMicButton?.addAction(UIAction { _ in self.toggleCallMic() }, for: .touchUpInside)
        callSpeakerButton?.addAction(UIAction { _ in self.toggleCallSpeaker() }, for: .touchUpInside)
        toggles.addArrangedSubview(callMicButton!)
        toggles.addArrangedSubview(callSpeakerButton!)
        if isVideo {
            callCameraButton = callControlButton("")
            callCameraButton?.addAction(UIAction { _ in self.toggleCallCamera() }, for: .touchUpInside)
            toggles.addArrangedSubview(callCameraButton!)
        } else {
            callCameraButton = nil
        }
        controls.addArrangedSubview(toggles)
        let actions = hstack(spacing: 8)
        if string(call["direction"], "") == "incoming", string(call["status"], "") == "ringing" {
            actions.addArrangedSubview(actionButton("Nghe máy", primary: true) { self.respondCall(id: callId, action: "accept") })
            actions.addArrangedSubview(actionButton("Từ chối", primary: false) { self.respondCall(id: callId, action: "reject") })
        } else {
            actions.addArrangedSubview(actionButton("Kết thúc", primary: false) { self.respondCall(id: callId, action: "end") })
        }
        controls.addArrangedSubview(actions)
        rootStack.addArrangedSubview(controls)
        addStatus()
        updateCallControlLabels()
    }

    private func voiceCallPanel(status call: [String: Any]) -> UIStackView {
        let body = card()
        body.alignment = .center
        body.addArrangedSubview(iconHero("phone", color: primary))
        let text = string(call["direction"], "") == "outgoing" && string(call["status"], "") == "ringing"
            ? "Đang chờ người kia nghe máy..."
            : "Mặc định ưu tiên loa trong. Anh có thể bật loa ngoài hoặc tắt mic khi cần."
        body.addArrangedSubview(label(text, size: 13, color: muted, align: .center, lines: 0))
        return body
    }

    private func videoCallPanel(status call: [String: Any]) -> UIStackView {
        let body = card()
        body.spacing = 8
        let frame = UIView()
        frame.translatesAutoresizingMaskIntoConstraints = false
        frame.backgroundColor = UIColor(red: 2/255, green: 6/255, blue: 23/255, alpha: 1)
        frame.layer.cornerRadius = 16
        frame.clipsToBounds = true
        frame.heightAnchor.constraint(equalToConstant: 300).isActive = true

        let remoteVideo = nativeRtc.remoteVideoView
        remoteVideo.translatesAutoresizingMaskIntoConstraints = false
        remoteVideo.backgroundColor = UIColor(red: 2/255, green: 6/255, blue: 23/255, alpha: 1)
        if remoteVideo.superview != nil { remoteVideo.removeFromSuperview() }
        let remote = label("Video call", size: 22, color: .white, weight: .bold, align: .center)
        remote.translatesAutoresizingMaskIntoConstraints = false
        let hint = label("Đang đồng bộ tín hiệu cuộc gọi với máy chủ.", size: 13, color: UIColor(red: 203/255, green: 213/255, blue: 225/255, alpha: 1), align: .center, lines: 0)
        hint.translatesAutoresizingMaskIntoConstraints = false
        let local = nativeRtc.localVideoView
        local.translatesAutoresizingMaskIntoConstraints = false
        local.backgroundColor = UIColor(red: 15/255, green: 118/255, blue: 110/255, alpha: 1)
        local.layer.cornerRadius = 12
        local.clipsToBounds = true
        if local.superview != nil { local.removeFromSuperview() }

        frame.addSubview(remoteVideo)
        frame.addSubview(remote)
        frame.addSubview(hint)
        frame.addSubview(local)
        NSLayoutConstraint.activate([
            remoteVideo.leadingAnchor.constraint(equalTo: frame.leadingAnchor),
            remoteVideo.trailingAnchor.constraint(equalTo: frame.trailingAnchor),
            remoteVideo.topAnchor.constraint(equalTo: frame.topAnchor),
            remoteVideo.bottomAnchor.constraint(equalTo: frame.bottomAnchor),
            remote.centerXAnchor.constraint(equalTo: frame.centerXAnchor),
            remote.centerYAnchor.constraint(equalTo: frame.centerYAnchor, constant: -12),
            hint.topAnchor.constraint(equalTo: remote.bottomAnchor, constant: 8),
            hint.leadingAnchor.constraint(equalTo: frame.leadingAnchor, constant: 18),
            hint.trailingAnchor.constraint(equalTo: frame.trailingAnchor, constant: -18),
            local.trailingAnchor.constraint(equalTo: frame.trailingAnchor, constant: -12),
            local.bottomAnchor.constraint(equalTo: frame.bottomAnchor, constant: -12),
            local.widthAnchor.constraint(equalToConstant: 112),
            local.heightAnchor.constraint(equalToConstant: 148)
        ])
        body.addArrangedSubview(frame)
        return body
    }

    private func callControlButton(_ title: String) -> UIButton {
        let button = UIButton(type: .system)
        button.setTitle(title, for: .normal)
        button.titleLabel?.font = .systemFont(ofSize: 13, weight: .semibold)
        button.titleLabel?.adjustsFontSizeToFitWidth = true
        button.titleLabel?.minimumScaleFactor = 0.66
        button.setTitleColor(ink, for: .normal)
        button.backgroundColor = UIColor(red: 247/255, green: 250/255, blue: 253/255, alpha: 1)
        button.contentEdgeInsets = UIEdgeInsets(top: 0, left: 8, bottom: 0, right: 8)
        button.layer.cornerRadius = 12
        button.layer.borderWidth = 1
        button.layer.borderColor = softBorder.cgColor
        button.heightAnchor.constraint(greaterThanOrEqualToConstant: 38).isActive = true
        button.titleLabel?.numberOfLines = 1
        return button
    }

    private func updateCallControlLabels() {
        callMicButton?.setTitle(callMicMuted ? "Mic tắt" : "Mic bật", for: .normal)
        callSpeakerButton?.setTitle(callSpeakerOn ? "Loa ngoài" : "Loa trong", for: .normal)
        callCameraButton?.setTitle(callCameraOff ? "Camera tắt" : "Camera bật", for: .normal)
    }

    private func toggleCallMic() {
        callMicMuted.toggle()
        nativeRtc.setMicMuted(callMicMuted)
        setStatus(callMicMuted ? "Đã tắt mic." : "Đã bật mic.")
        updateCallControlLabels()
    }

    private func toggleCallSpeaker() {
        callSpeakerOn.toggle()
        try? AVAudioSession.sharedInstance().overrideOutputAudioPort(callSpeakerOn ? .speaker : .none)
        setStatus(callSpeakerOn ? "Đã bật loa ngoài." : "Đã chuyển về loa trong.")
        updateCallControlLabels()
    }

    private func toggleCallCamera() {
        callCameraOff.toggle()
        nativeRtc.setCameraOff(callCameraOff)
        setStatus(callCameraOff ? "Đã tắt camera." : "Đã bật camera.")
        updateCallControlLabels()
    }

    private func showCallDetail(_ call: [String: Any]) {
        let peer = call["peer"] as? [String: Any] ?? [:]
        let peerPhone = string(call["peerPhone"], "")
        let mode = string(call["mode"], "") == "video" ? "Video call" : "Gọi thoại"
        let body = [
            "Người liên hệ: \(displayName(peer, fallback: peerPhone))",
            "Số điện thoại: \(peerPhone)",
            "Loại cuộc gọi: \(mode)",
            "Chiều gọi: \(callDirectionLabel(call))",
            "Trạng thái: \(callStatusLabel(call))",
            "Bắt đầu: \(callTimeLabel(call))",
            "Kết thúc: \(string(call["endedAt"], "Chưa có"))",
            "Thời lượng: \(callDurationLabel(call))"
        ].joined(separator: "\n")
        let alert = UIAlertController(title: "Chi tiết cuộc gọi", message: body, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "Gọi lại", style: .default) { _ in self.startCall(phone: peerPhone, mode: string(call["mode"], "voice")) })
        alert.addAction(UIAlertAction(title: "Đóng", style: .cancel))
        present(alert, animated: true)
    }

    private func renderSearch() {
        rootStack.addArrangedSubview(sectionTitle("Tìm kiếm"))
        let searchCard = card()
        let field = input("Tìm bạn bè, tin nhắn, doanh nghiệp")
        let results = vstack(spacing: 8)
        field.addAction(UIAction { _ in self.fillSearchResults(results, query: field.textValue) }, for: .editingChanged)
        searchCard.addArrangedSubview(field)
        rootStack.addArrangedSubview(searchCard)
        rootStack.addArrangedSubview(results)
        fillSearchResults(results, query: "")
        field.becomeFirstResponder()
    }

    private func filterBusinesses(_ keyword: String) {
        let clean = keyword.lowercased()
        resetRoot()
        rootStack.addArrangedSubview(sectionButton("‹ Quay lại", "businesses"))
        let matches = businesses().filter { business in
            ["name", "category", "services", "description", "address", "offer"].contains { key in
                string(business[key], "").lowercased().contains(clean)
            }
        }
        rootStack.addArrangedSubview(label("Kết quả phù hợp: \(matches.count)", size: 14, color: muted, weight: .semibold))
        matches.forEach { rootStack.addArrangedSubview(businessCard($0)) }
        addStatus()
    }

    private func fillSearchResults(_ list: UIStackView, query: String) {
        list.arrangedSubviews.forEach { $0.removeFromSuperview() }
        let keyword = plainText(query)
        var addedPhones = Set<String>()
        friends().forEach { friend in
            let phone = string(friend["accountPhone"], string(friend["phone"], ""))
            let haystack = plainText(displayName(friend, fallback: phone) + " " + phone + " " + string(friend["interests"], ""))
            if (keyword.isEmpty || haystack.contains(keyword)), addedPhones.insert(phone).inserted {
                list.addArrangedSubview(friendRow(friend))
            }
        }
        conversations().forEach { conversation in
            let phone = string(conversation["friendPhone"], "")
            let matched = array(conversation["messages"]).contains { plainText(string($0["text"], "")).contains(keyword) }
            if !keyword.isEmpty, matched, addedPhones.insert(phone).inserted {
                let friend = friendByPhone(phone)
                list.addArrangedSubview(friendRow(friend.isEmpty ? ["phone": phone] : friend))
            }
        }
        let businessMatches = businessSearchResults(query)
        if !keyword.isEmpty, !businessMatches.isEmpty {
            list.addArrangedSubview(sectionTitle("Doanh nghiệp phù hợp"))
            businessMatches.prefix(6).forEach { list.addArrangedSubview(businessCard($0)) }
        }
        if list.arrangedSubviews.isEmpty {
            list.addArrangedSubview(infoCard("Không tìm thấy", "Chưa có bạn bè, tin nhắn hoặc doanh nghiệp phù hợp với nội dung đang nhập."))
        }
    }

    private func renderQr() {
        rootStack.addArrangedSubview(sectionTitle("Quét QR"))
        let card = self.card()
        card.alignment = .center
        card.addArrangedSubview(label("MÃ QR XPAYCHAT", size: 12, color: primary, weight: .bold, align: .center))
        card.addArrangedSubview(label("Đưa mã này cho người khác quét, hoặc dùng camera/ảnh QR để kết bạn trực tiếp.", size: 13, color: muted, align: .center, lines: 0))
        card.addArrangedSubview(label(displayName(currentUser(), fallback: "Nexa User"), size: 18, weight: .bold, align: .center))
        card.addArrangedSubview(label(userPhone(), size: 13, color: muted, align: .center))
        if let image = qrImage(text: "xpaychat://user/\(userPhone())") {
            let imageView = UIImageView(image: image)
            imageView.translatesAutoresizingMaskIntoConstraints = false
            imageView.widthAnchor.constraint(equalToConstant: 190).isActive = true
            imageView.heightAnchor.constraint(equalToConstant: 190).isActive = true
            card.addArrangedSubview(imageView)
        }
        let pasted = input("Dán số điện thoại hoặc nội dung mã QR")
        card.addArrangedSubview(pasted)
        card.addArrangedSubview(actionButton("Kết bạn từ mã QR", primary: true) {
            self.handleQrPayload(pasted.textValue)
        })
        let scanRow = hstack(spacing: 8)
        scanRow.addArrangedSubview(actionButton("Quét bằng camera", primary: true) { self.scanQrWithCamera() })
        scanRow.addArrangedSubview(actionButton("Chọn ảnh QR", primary: false) { self.pickImage(target: "scanQR") })
        card.addArrangedSubview(scanRow)
        let qrTools = hstack(spacing: 8)
        qrTools.addArrangedSubview(actionButton("Chia sẻ QR", primary: false) { self.shareMyQr() })
        qrTools.addArrangedSubview(actionButton("Lưu QR", primary: false) { self.saveMyQr() })
        qrTools.addArrangedSubview(actionButton("Sao chép SĐT", primary: false) {
            UIPasteboard.general.string = self.userPhone()
            self.setStatus("Đã sao chép số điện thoại.")
        })
        card.addArrangedSubview(qrTools)
        rootStack.addArrangedSubview(card)
    }

    private func scanQrWithCamera() {
        guard UIImagePickerController.isSourceTypeAvailable(.camera) else {
            setStatus("Thiết bị chưa mở được camera.")
            return
        }
        imagePickTarget = "scanQR"
        let picker = UIImagePickerController()
        picker.sourceType = .camera
        picker.delegate = self
        setStatus("Đang mở camera để quét QR...")
        present(picker, animated: true)
    }

    private func handleScannedQrImage(_ image: UIImage) {
        guard let payload = decodeQr(from: image) else {
            setStatus("Không đọc được mã QR từ ảnh này.")
            return
        }
        handleQrPayload(payload)
    }

    private func handleQrPayload(_ payload: String) {
        let phone = readQrPhone(payload)
        guard !phone.isEmpty else {
            setStatus("Không nhận được số điện thoại XPAY Chat từ nội dung này.")
            return
        }
        setStatus("Đang gửi yêu cầu kết bạn...")
        api.post("/api/friends/add", body: ["phone": phone], auth: true) { result in
            self.handle(result, ok: "Đã gửi yêu cầu kết bạn từ mã QR.")
            if case .success = result { self.syncAndShow("friends") }
        }
    }

    private func shareMyQr() {
        let payload = "xpaychat://user/\(userPhone())"
        var items: [Any] = [payload]
        if let image = qrImage(text: payload) { items.append(image) }
        let controller = UIActivityViewController(activityItems: items, applicationActivities: nil)
        present(controller, animated: true)
    }

    private func saveMyQr() {
        guard let image = qrImage(text: "xpaychat://user/\(userPhone())") else {
            setStatus("Chưa tạo được QR để lưu.")
            return
        }
        UIImageWriteToSavedPhotosAlbum(image, nil, nil, nil)
        setStatus("Đã gửi QR vào thư viện ảnh.")
    }

    private func decodeQr(from image: UIImage) -> String? {
        let ciImage: CIImage?
        if let existing = image.ciImage {
            ciImage = existing
        } else if let cgImage = image.cgImage {
            ciImage = CIImage(cgImage: cgImage)
        } else {
            ciImage = nil
        }
        guard let ciImage else { return nil }
        let detector = CIDetector(ofType: CIDetectorTypeQRCode, context: nil, options: [CIDetectorAccuracy: CIDetectorAccuracyHigh])
        let features = detector?.features(in: ciImage) as? [CIQRCodeFeature] ?? []
        return features.first?.messageString
    }

    private func readQrPhone(_ value: String) -> String {
        let clean = value.trimmingCharacters(in: .whitespacesAndNewlines)
        if clean.contains("xpaychat://user/"), let last = clean.split(separator: "/").last {
            return normalizePhone(String(last))
        }
        if clean.contains("phone="), let query = URLComponents(string: clean)?.queryItems?.first(where: { $0.name == "phone" })?.value {
            return normalizePhone(query)
        }
        return normalizePhone(clean)
    }

    private func renderSettings() {
        rootStack.addArrangedSubview(sectionTitle("Cài đặt"))
        let presence = settingsCard("Trạng thái hoạt động", "Khi chọn offline, người khác sẽ không thấy khoảng cách và trạng thái online của anh.")
        let onlineActive = string(currentUser()["presenceMode"], "online") != "offline"
        let row = hstack(spacing: 8)
        row.addArrangedSubview(actionButton("Online", primary: onlineActive) { self.updatePresence("online") })
        row.addArrangedSubview(actionButton("Offline", primary: !onlineActive) { self.updatePresence("offline") })
        presence.addArrangedSubview(row)
        rootStack.addArrangedSubview(presence)

        let notifications = settingsCard("Thông báo", "Tuỳ chỉnh thông báo ngoài màn hình, âm thanh, rung và làm sáng hội thoại chưa đọc.")
        let pushRow = hstack(spacing: 8)
        pushRow.addArrangedSubview(actionButton("Bật thông báo", primary: localSetting("setting_push_enabled", false)) { self.requestPushNotifications() })
        pushRow.addArrangedSubview(actionButton("Tắt", primary: false) { self.setLocalSetting("setting_push_enabled", false, status: "Đã tắt thông báo trên thiết bị.") })
        pushRow.addArrangedSubview(actionButton("Kiểm tra", primary: false) { self.checkPushStatus() })
        notifications.addArrangedSubview(pushRow)
        let messageRow = hstack(spacing: 8)
        messageRow.addArrangedSubview(localSettingButton("Âm tin nhắn", key: "setting_message_sound", fallback: true))
        messageRow.addArrangedSubview(localSettingButton("Rung tin nhắn", key: "setting_message_vibration", fallback: true))
        notifications.addArrangedSubview(messageRow)
        let unreadRow = hstack(spacing: 8)
        unreadRow.addArrangedSubview(localSettingButton("Sáng tin chưa đọc", key: "setting_unread_highlight", fallback: true))
        unreadRow.addArrangedSubview(localSettingButton("Tự đánh dấu đã đọc", key: "setting_mark_read_on_open", fallback: true))
        notifications.addArrangedSubview(unreadRow)
        rootStack.addArrangedSubview(notifications)

        let call = settingsCard("Cuộc gọi", "Thiết lập chuông gọi đến, rung và âm báo khi đang gọi đi.")
        let callRow = hstack(spacing: 8)
        callRow.addArrangedSubview(localSettingButton("Chuông gọi", key: "setting_call_ringtone", fallback: true))
        callRow.addArrangedSubview(localSettingButton("Rung cuộc gọi", key: "setting_call_vibration", fallback: true))
        call.addArrangedSubview(callRow)
        let callTools = hstack(spacing: 8)
        callTools.addArrangedSubview(localSettingButton("Âm chờ gọi đi", key: "setting_call_ringback", fallback: true))
        callTools.addArrangedSubview(actionButton("Kiểm tra cuộc gọi", primary: false) { self.openHomeSection("calls") })
        call.addArrangedSubview(callTools)
        rootStack.addArrangedSubview(call)

        let ai = settingsCard("XPAY AI", "Cho phép XPAY AI hỗ trợ trả lời chào hỏi đơn giản và mở nhanh khu vực trợ lý cá nhân.")
        let aiRules = state["aiRules"] as? [String: Any] ?? [:]
        let aiAuto = bool(aiRules["allowAutoReply"], localSetting("setting_ai_auto_reply_simple", false))
        let aiRow = hstack(spacing: 8)
        aiRow.addArrangedSubview(actionButton("Tự trả lời", primary: aiAuto) { self.updateAiAutoReply(!aiAuto) })
        aiRow.addArrangedSubview(actionButton("Mở XPAY AI", primary: false) { self.openHomeSection("ai") })
        ai.addArrangedSubview(aiRow)
        let aiRulesInput = input("Quy tắc riêng cho XPAY AI", text: string(aiRules["customRules"], ""))
        ai.addArrangedSubview(aiRulesInput)
        ai.addArrangedSubview(actionButton("Lưu quy tắc AI", primary: true) {
            let payload: [String: Any] = ["allowAutoReply": aiAuto, "allowContext": true, "allowLiveInfo": true, "customRules": aiRulesInput.textValue]
            self.api.post("/api/ai/rules/update", body: ["rules": payload], auth: true) { result in
                self.handle(result, ok: "Đã cập nhật quy tắc XPAY AI.")
                if case .success = result { self.syncAndShow("settings") }
            }
        })
        rootStack.addArrangedSubview(ai)

        let account = card()
        account.addArrangedSubview(label("TÀI KHOẢN VÀ QUYỀN RIÊNG TƯ", size: 12, color: primary, weight: .bold))
        account.addArrangedSubview(label("Quản lý dữ liệu cá nhân, chính sách bảo mật và xoá tài khoản.", size: 13, color: muted, lines: 0))
        let privacyRow = hstack(spacing: 8)
        privacyRow.addArrangedSubview(actionButton("Ẩn thông tin", primary: false) { self.updatePrivacy(false) })
        privacyRow.addArrangedSubview(actionButton("Hiển thị thông tin", primary: true) { self.updatePrivacy(true) })
        account.addArrangedSubview(privacyRow)
        let accountTools = hstack(spacing: 8)
        accountTools.addArrangedSubview(actionButton("Chính sách bảo mật", primary: false) { self.openPrivacyPolicy() })
        accountTools.addArrangedSubview(actionButton("Điều khoản", primary: false) { self.openTermsPolicy() })
        accountTools.addArrangedSubview(actionButton("Đăng xuất", primary: false) {
            self.stopForegroundSync()
            self.stopRingback()
            self.store.clear()
            self.api.token = ""
            self.renderAuth(mode: "login")
        })
        account.addArrangedSubview(accountTools)
        let deletePassword = input("Mật khẩu hiện tại để xoá tài khoản", secure: true)
        let deleteConfirm = input("Gõ DELETE để xác nhận")
        account.addArrangedSubview(deletePassword)
        account.addArrangedSubview(deleteConfirm)
        account.addArrangedSubview(actionButton("Xoá tài khoản", primary: false) {
            self.deleteAccount(password: deletePassword.textValue, confirmation: deleteConfirm.textValue)
        })
        rootStack.addArrangedSubview(account)
    }

    private func settingsCard(_ title: String, _ detail: String) -> UIStackView {
        let box = card()
        box.addArrangedSubview(label(title, size: 16, weight: .semibold))
        box.addArrangedSubview(label(detail, size: 12, color: muted, lines: 0))
        return box
    }

    private func localSettingButton(_ title: String, key: String, fallback: Bool) -> UIButton {
        let active = localSetting(key, fallback)
        return actionButton(title, primary: active) {
            self.setLocalSetting(key, !active, status: (!active ? "Đã bật " : "Đã tắt ") + title.lowercased() + ".")
        }
    }

    private func localSetting(_ key: String, _ fallback: Bool) -> Bool {
        if UserDefaults.standard.object(forKey: key) == nil { return fallback }
        return UserDefaults.standard.bool(forKey: key)
    }

    private func setLocalSetting(_ key: String, _ value: Bool, status: String) {
        UserDefaults.standard.set(value, forKey: key)
        setStatus(status)
        renderHome()
    }

    private func requestPushNotifications() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, _ in
            DispatchQueue.main.async {
                self.setLocalSetting("setting_push_enabled", granted, status: granted ? "Đã bật thông báo trên thiết bị." : "Thiết bị chưa cấp quyền thông báo.")
                if granted {
                    UIApplication.shared.registerForRemoteNotifications()
                    self.registerStoredPushTokenIfNeeded(report: true)
                }
            }
        }
    }

    private func registerStoredPushTokenIfNeeded(report: Bool) {
        guard localSetting("setting_push_enabled", false), !store.token.isEmpty else { return }
        let token = store.pushToken
        guard !token.isEmpty else {
            if report { setStatus("Đang chờ iOS cấp mã thông báo. Hãy mở lại Cài đặt > Thông báo để kiểm tra sau vài giây.") }
            return
        }
        api.post("/api/push/register", body: [
            "token": token,
            "platform": "ios",
            "provider": "apns",
            "deviceId": store.deviceId,
            "enabled": true
        ], auth: true) { result in
            if report { self.handle(result, ok: "Đã đăng ký thông báo iPhone với máy chủ.") }
        }
    }

    private func checkPushStatus() {
        api.post("/api/push/status", body: [:], auth: true) { result in
            self.handle(result, ok: "Máy chủ đã sẵn sàng gửi thông báo.")
        }
    }

    private func updateAiAutoReply(_ enabled: Bool) {
        UserDefaults.standard.set(enabled, forKey: "setting_ai_auto_reply_simple")
        let current = state["aiRules"] as? [String: Any] ?? [:]
        let payload: [String: Any] = [
            "allowAutoReply": enabled,
            "allowContext": true,
            "allowLiveInfo": true,
            "customRules": string(current["customRules"], "")
        ]
        api.post("/api/ai/rules/update", body: ["rules": payload], auth: true) { result in
            self.handle(result, ok: enabled ? "Đã bật XPAY AI tự trả lời." : "Đã tắt XPAY AI tự trả lời.")
            if case .success = result { self.syncAndShow("settings") }
        }
    }

    private func updatePrivacy(_ visible: Bool) {
        var profile = currentUser()
        profile["privacy"] = ["phone": visible, "birthDate": visible, "interests": visible, "avatar": visible]
        api.post("/api/profile/update", body: ["profile": profile], auth: true) { result in
            self.handle(result, ok: "Đã cập nhật quyền riêng tư.")
            if case .success = result { self.syncAndShow("settings") }
        }
    }

    private func openPrivacyPolicy() {
        guard let url = URL(string: "https://gatewayxpay.com/privacy.html") else { return }
        UIApplication.shared.open(url)
    }

    private func openTermsPolicy() {
        guard let url = URL(string: "https://gatewayxpay.com/terms.html") else { return }
        UIApplication.shared.open(url)
    }

    private func deleteAccount(password: String, confirmation: String) {
        guard confirmation == "DELETE" else {
            setStatus("Vui lòng gõ DELETE để xác nhận xoá tài khoản.")
            return
        }
        api.post("/api/account/delete", body: ["password": password, "confirmation": confirmation], auth: true) { result in
            switch result {
            case .success:
                self.stopForegroundSync()
                self.stopRingback()
                self.store.clear()
                self.api.token = ""
                self.renderAuth(mode: "login")
            case .failure(let error):
                self.setStatus(error.localizedDescription)
            }
        }
    }

    private func updatePresence(_ mode: String) {
        api.post("/api/presence/update", body: ["mode": mode], auth: true) { result in
            self.handle(result, ok: mode == "online" ? "Đã bật trạng thái online." : "Đã chuyển sang offline.")
            if case .success = result { self.syncAndShow("settings") }
        }
    }

    private func renderAppAdmin() {
        rootStack.addArrangedSubview(sectionTitle("Quản trị"))
        guard isAppAdminAccount() else {
            rootStack.addArrangedSubview(infoCard("Chưa có quyền", "Chỉ tài khoản được cấp quyền quản trị mới xem được dữ liệu người dùng trong app."))
            return
        }
        let loading = infoCard("Đang tải dữ liệu", "Danh sách người dùng sẽ hiển thị ngay sau khi máy chủ phản hồi.")
        rootStack.addArrangedSubview(loading)
        api.post("/api/app-admin/users", body: [:], auth: true) { result in
            guard self.activeSection == "admin" else { return }
            loading.removeFromSuperview()
            switch result {
            case .success(let data):
                self.rootStack.addArrangedSubview(self.label("Tổng người dùng: \(int(data["total"], array(data["users"]).count))", size: 15, color: self.muted, weight: .semibold))
                self.renderAdminBusinesses(array(data["businesses"]))
                let users = array(data["users"])
                if users.isEmpty {
                    self.rootStack.addArrangedSubview(self.infoCard("Chưa có dữ liệu", "Máy chủ chưa trả về danh sách người dùng."))
                    return
                }
                let search = self.input("Tìm tên, số điện thoại, email người dùng")
                let list = self.vstack(spacing: 7)
                search.addAction(UIAction { _ in self.fillAdminUserList(list, users: users, query: search.textValue) }, for: .editingChanged)
                self.rootStack.addArrangedSubview(search)
                self.rootStack.addArrangedSubview(list)
                self.fillAdminUserList(list, users: users, query: "")
            case .failure(let error):
                self.rootStack.addArrangedSubview(self.infoCard("Không tải được", error.localizedDescription))
            }
        }
    }

    private func renderAdminBusinesses(_ businesses: [[String: Any]]) {
        rootStack.addArrangedSubview(sectionTitle("Quản lý doanh nghiệp"))
        if businesses.isEmpty {
            rootStack.addArrangedSubview(infoCard("Chưa có hồ sơ", "Doanh nghiệp người dùng tạo sẽ chờ admin duyệt tại đây."))
            return
        }
        businesses.prefix(80).forEach { business in
            let card = self.card()
            let ownerPhone = normalizePhone(string(business["ownerPhone"], ""))
            card.addArrangedSubview(label(string(business["name"], "Doanh nghiệp Nexa"), size: 15, weight: .semibold))
            card.addArrangedSubview(label("\(string(business["category"], "Dịch vụ")) • \(ownerPhone) • \(businessStatusLabel(string(business["status"], "pending")))", size: 12, color: muted, lines: 0))
            let note = string(business["reviewNote"], "")
            if !note.isEmpty { card.addArrangedSubview(label("Lý do admin: \(note)", size: 12, color: UIColor(red: 146/255, green: 64/255, blue: 14/255, alpha: 1), lines: 0)) }
            let actions = hstack(spacing: 8)
            actions.addArrangedSubview(actionButton("Duyệt", primary: true) { self.updateAdminBusiness(ownerPhone, status: "approved", note: "") })
            actions.addArrangedSubview(actionButton("Cần sửa", primary: false) { self.updateAdminBusiness(ownerPhone, status: "needs_changes", note: "Vui lòng bổ sung thông tin hoặc chỉnh nội dung theo điều khoản.") })
            actions.addArrangedSubview(actionButton("Khoá", primary: false) { self.updateAdminBusiness(ownerPhone, status: "locked", note: "Hồ sơ bị khoá do vi phạm điều khoản doanh nghiệp.") })
            card.addArrangedSubview(actions)
            rootStack.addArrangedSubview(card)
        }
    }

    private func updateAdminBusiness(_ ownerPhone: String, status: String, note: String) {
        api.post("/api/app-admin/business/update", body: ["ownerPhone": ownerPhone, "status": status, "reviewNote": note], auth: true) { result in
            self.handle(result, ok: "Đã cập nhật trạng thái doanh nghiệp.")
            if case .success = result { self.syncAndShow("admin") }
        }
    }

    private func fillAdminUserList(_ list: UIStackView, users: [[String: Any]], query: String) {
        list.arrangedSubviews.forEach { view in
            list.removeArrangedSubview(view)
            view.removeFromSuperview()
        }
        let keyword = plainText(query)
        var added = 0
        for item in users {
            if added >= 120 { break }
            let haystack = plainText([
                string(item["accountPhone"], ""),
                string(item["phone"], ""),
                string(item["fullName"], ""),
                string(item["name"], ""),
                string(item["email"], ""),
                string(item["interests"], "")
            ].joined(separator: " "))
            if !keyword.isEmpty, !haystack.contains(keyword) { continue }
            list.addArrangedSubview(adminUserRow(item))
            added += 1
        }
        if added == 0 {
            list.addArrangedSubview(infoCard("Không tìm thấy", "Không có người dùng phù hợp với từ khoá này."))
        }
    }

    private func adminUserRow(_ item: [String: Any]) -> UIStackView {
        let card = self.card()
        let phone = string(item["accountPhone"], string(item["phone"], ""))
        let name = displayName(item, fallback: phone)
        card.addArrangedSubview(label(name + " " + accountBadges(item), size: 13, weight: .semibold, lines: 0))
        let online = bool(item["presenceOnline"], bool(item["online"], false)) ? "Online" : "Offline"
        card.addArrangedSubview(label("\(phone) • \(online)", size: 11, color: muted))
        card.addArrangedSubview(label("Email: \(string(item["email"], "Chưa có")) • Sinh: \(string(item["birthDate"], ""))", size: 11, color: muted, lines: 0))
        card.addArrangedSubview(label("Bạn bè \(int(item["friendsCount"], 0)) • Tin \(int(item["messagesCount"], 0)) • Gọi \(int(item["callsCount"], 0)) • Nhật ký \(int(item["journalsCount"], 0)) • Điểm GT \(int(item["referralPoints"], 0))", size: 11, color: muted, lines: 0))
        card.isUserInteractionEnabled = true
        card.addGestureRecognizer(NexaTapGesture { self.showAdminUserDetail(item) })
        return card
    }

    private func showAdminUserDetail(_ item: [String: Any]) {
        resetRoot()
        rootStack.addArrangedSubview(profileStrip())
        rootStack.addArrangedSubview(quickActions())
        rootStack.addArrangedSubview(tabStrip())
        addStatus()
        let phone = string(item["accountPhone"], string(item["phone"], ""))
        let name = displayName(item, fallback: phone)
        let badges = item["accountBadges"] as? [String: Any] ?? [:]
        let verified = bool(badges["verified"], bool(item["verified"], false))
        let vip = bool(badges["vip"], bool(item["vip"], false))
        rootStack.addArrangedSubview(sectionTitle("Chi tiết người dùng"))
        rootStack.addArrangedSubview(actionButton("← Quay lại danh sách", primary: false) {
            self.activeSection = "admin"
            self.renderHome()
        })
        let card = self.card()
        let title = hstack(spacing: 6)
        title.addArrangedSubview(label(name, size: 18, weight: .bold))
        if verified { title.addArrangedSubview(badge("✓", color: UIColor(red: 34/255, green: 197/255, blue: 94/255, alpha: 1), textColor: .white)) }
        if vip { title.addArrangedSubview(badge("VIP", color: UIColor(red: 245/255, green: 158/255, blue: 11/255, alpha: 1), textColor: .white)) }
        card.addArrangedSubview(title)
        card.addArrangedSubview(adminDetailLine("Số tài khoản", phone))
        card.addArrangedSubview(adminDetailLine("Email", string(item["email"], "Chưa có")))
        card.addArrangedSubview(adminDetailLine("Ngày sinh", string(item["birthDate"], "")))
        card.addArrangedSubview(adminDetailLine("Sở thích", string(item["interests"], "")))
        card.addArrangedSubview(adminDetailLine("Trạng thái", "\(string(item["presenceStatus"], "")) • \(string(item["presenceOfflineReasonText"], ""))"))
        card.addArrangedSubview(adminDetailLine("Thống kê", "Bạn bè \(int(item["friendsCount"], 0)) • Tin \(int(item["messagesCount"], 0)) • Gọi \(int(item["callsCount"], 0)) • Nhật ký \(int(item["journalsCount"], 0))"))
        card.addArrangedSubview(adminDetailLine("Điểm giới thiệu", "\(int(item["referralPoints"], 0)) điểm • \(string(item["referralTier"], "Thường"))"))
        card.addArrangedSubview(adminDetailLine("Link giới thiệu", string(item["referralInviteLink"], "")))
        card.addArrangedSubview(adminDetailLine("Cập nhật", string(item["updatedAt"], string(item["createdAt"], ""))))
        let badgeRow = hstack(spacing: 8)
        badgeRow.addArrangedSubview(actionButton(verified ? "Bỏ tích xanh" : "Tích xanh", primary: !verified) { self.updateAdminBadges(phone: phone, verified: !verified, vip: vip) })
        badgeRow.addArrangedSubview(actionButton(vip ? "Bỏ kim cương" : "Kim cương", primary: !vip) { self.updateAdminBadges(phone: phone, verified: verified, vip: !vip) })
        card.addArrangedSubview(badgeRow)
        rootStack.addArrangedSubview(card)
    }

    private func adminDetailLine(_ title: String, _ value: String) -> UILabel {
        let clean = value.trimmingCharacters(in: .whitespacesAndNewlines)
        return label("\(title): \(clean.isEmpty ? "Chưa cập nhật" : clean)", size: 12, color: muted, lines: 0)
    }

    private func updateAdminBadges(phone: String, verified: Bool, vip: Bool) {
        guard !phone.isEmpty else {
            setStatus("Thiếu số điện thoại người dùng.")
            return
        }
        setStatus("Đang cập nhật phân loại người dùng...")
        api.post("/api/app-admin/user/badges", body: ["phone": phone, "accountBadges": ["verified": verified, "vip": vip]], auth: true) { result in
            self.handle(result, ok: "Đã cập nhật phân loại tài khoản.")
            if case .success = result {
                self.activeSection = "admin"
                self.renderHome()
            }
        }
    }

    private func updateCurrentLocation() {
        locationManager.requestWhenInUseAuthorization()
        if let location = locationManager.location ?? lastKnownLocation {
            api.post("/api/location/update", body: ["enabled": true, "latitude": location.coordinate.latitude, "longitude": location.coordinate.longitude], auth: true) { result in
                self.handle(result, ok: "Đã cập nhật vị trí.")
                if case .success = result { self.syncAndShow("nearby") }
            }
        } else {
            locationManager.requestLocation()
            setStatus("Đang lấy vị trí hiện tại...")
        }
    }

    private func qrImage(text: String) -> UIImage? {
        guard let data = text.data(using: .utf8),
              let filter = CIFilter(name: "CIQRCodeGenerator") else { return nil }
        filter.setValue(data, forKey: "inputMessage")
        filter.setValue("M", forKey: "inputCorrectionLevel")
        guard let output = filter.outputImage else { return nil }
        let scaled = output.transformed(by: CGAffineTransform(scaleX: 10, y: 10))
        return UIImage(ciImage: scaled)
    }

    private func handle(_ result: Result<[String: Any], Error>, ok: String) {
        switch result {
        case .success: setStatus(ok)
        case .failure(let error): setStatus(error.localizedDescription)
        }
    }

    private func addStatus() {
        statusLabel = label("", size: 13, color: primary, weight: .semibold)
        rootStack.addArrangedSubview(statusLabel)
    }

    private func setStatus(_ text: String) {
        DispatchQueue.main.async { self.statusLabel.text = text }
    }

    private func currentUser() -> [String: Any] {
        return state["user"] as? [String: Any] ?? store.user
    }

    private func userPhone() -> String {
        let user = currentUser()
        return string(user["accountPhone"], string(user["phone"], ""))
    }

    private func friends() -> [[String: Any]] { array(state["friends"]) }
    private func conversations() -> [[String: Any]] { array(state["conversations"]) }
    private func businesses() -> [[String: Any]] { array(state["businesses"]) }
    private func posts() -> [[String: Any]] { array(state["posts"]) }

    private func friendByPhone(_ phone: String) -> [String: Any] {
        return friends().first { normalizePhone(string($0["phone"], string($0["accountPhone"], ""))) == normalizePhone(phone) } ?? [:]
    }

    private func conversationByPhone(_ phone: String) -> [String: Any] {
        return conversations().first { normalizePhone(string($0["friendPhone"], "")) == normalizePhone(phone) } ?? [:]
    }

    private func myBusiness() -> [String: Any] {
        let me = normalizePhone(userPhone())
        return businesses().first { normalizePhone(string($0["ownerPhone"], "")) == me || ($0["isMine"] as? Bool == true) } ?? [:]
    }

    private func lastMessagePreview(_ conversation: [String: Any]) -> String {
        guard let last = array(conversation["messages"]).last else { return "Chưa có tin nhắn" }
        let text = string(last["text"], "")
        return text.isEmpty ? "[Tin nhắn]" : text
    }

    private func lastMessageTime(_ conversation: [String: Any]) -> String {
        guard let last = array(conversation["messages"]).last else { return "" }
        let raw = string(last["time"], string(last["createdAt"], ""))
        if raw.count >= 16, raw.contains("T") {
            let start = raw.index(raw.startIndex, offsetBy: 11)
            let end = raw.index(start, offsetBy: 5, limitedBy: raw.endIndex) ?? raw.endIndex
            return String(raw[start..<end])
        }
        return raw.count > 5 ? String(raw.prefix(5)) : raw
    }

    private func callDirectionLabel(_ call: [String: Any]) -> String {
        string(call["direction"], "") == "outgoing" ? "Gọi đi" : "Gọi đến"
    }

    private func callStatusLabel(_ call: [String: Any]) -> String {
        switch string(call["status"], "") {
        case "ringing": return "Đang đổ chuông"
        case "active": return "Đang gọi"
        case "ended": return "Đã kết thúc"
        case "rejected": return "Đã từ chối"
        case "missed": return "Gọi nhỡ"
        case "busy": return "Máy bận"
        default: return string(call["status"], "Chưa rõ")
        }
    }

    private func callStatusText(direction: String, status: String) -> String {
        if status == "ringing" { return direction == "incoming" ? "Có cuộc gọi đến" : "Đang đổ chuông..." }
        if status == "active" { return "Đang trong cuộc gọi" }
        if status == "rejected" { return "Cuộc gọi đã bị từ chối" }
        if status == "ended" { return "Cuộc gọi đã kết thúc" }
        if status == "missed" { return "Cuộc gọi nhỡ" }
        if status == "busy" { return "Máy bận" }
        return status.isEmpty ? "Đang chuẩn bị cuộc gọi" : status
    }

    private func callTimeLabel(_ call: [String: Any]) -> String {
        let value = [string(call["startedAt"], ""), string(call["createdAt"], ""), string(call["updatedAt"], "")].first { !$0.isEmpty } ?? ""
        return value.isEmpty ? "Chưa có" : value
    }

    private func callDurationLabel(_ call: [String: Any]) -> String {
        let seconds = int(call["durationSeconds"], 0)
        if seconds <= 0 { return "Thời lượng chưa có" }
        let minutes = seconds / 60
        let remain = seconds % 60
        return minutes > 0 ? "\(minutes) phút \(remain) giây" : "\(remain) giây"
    }

    private func isoNow() -> String {
        ISO8601DateFormatter().string(from: Date())
    }

    private func shortClock() -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "vi_VN")
        formatter.dateFormat = "HH:mm"
        return formatter.string(from: Date())
    }

    private func displayName(_ dict: [String: Any], fallback: String) -> String {
        let candidates = ["fullName", "name", "displayName", "businessName"]
        for key in candidates {
            let value = string(dict[key], "")
            if !value.isEmpty { return value }
        }
        return fallback
    }

    private func accountBadges(_ item: [String: Any]) -> String {
        let badges = item["accountBadges"] as? [String: Any] ?? [:]
        var values: [String] = []
        if bool(badges["verified"], bool(item["verified"], false)) { values.append("✓") }
        if bool(badges["vip"], bool(item["vip"], false)) { values.append("VIP") }
        return values.joined(separator: " · ")
    }

    private func isAppAdminAccount() -> Bool {
        let user = currentUser()
        if bool(user["isAppAdmin"], false) { return true }
        if let roles = user["roles"] as? [String] {
            return roles.contains { $0.lowercased() == "app_admin" }
        }
        return false
    }

    private func statusText(_ status: String) -> String {
        switch status {
        case "approved": return "Đã duyệt"
        case "rejected": return "Từ chối"
        default: return "Chờ duyệt"
        }
    }

    private func sectionTitle(_ text: String) -> UILabel {
        let title = label(text, size: 18, color: ink, weight: .bold)
        (title as? NexaPaddedLabel)?.textInsets = UIEdgeInsets(top: 12, left: 4, bottom: 6, right: 4)
        return title
    }

    private func card() -> UIStackView {
        let stack = vstack(spacing: 7)
        stack.layoutMargins = UIEdgeInsets(top: 10, left: 10, bottom: 10, right: 10)
        stack.isLayoutMarginsRelativeArrangement = true
        stack.backgroundColor = .white
        stack.layer.cornerRadius = 12
        stack.layer.borderWidth = 1
        stack.layer.borderColor = softBorder.cgColor
        stack.layer.shadowColor = UIColor.black.cgColor
        stack.layer.shadowOpacity = 0.05
        stack.layer.shadowRadius = 8
        stack.layer.shadowOffset = CGSize(width: 0, height: 3)
        return stack
    }

    private func infoCard(_ title: String, _ detail: String) -> UIStackView {
        let box = card()
        box.addArrangedSubview(label(title, size: 16, weight: .semibold))
        box.addArrangedSubview(label(detail, size: 13, color: muted, lines: 0))
        return box
    }

    private func toggleRow(_ text: String, _ toggle: UISwitch) -> UIStackView {
        let row = hstack(spacing: 8)
        row.alignment = .center
        let copy = label(text, size: 13, color: ink, lines: 0)
        row.addArrangedSubview(copy)
        row.addArrangedSubview(toggle)
        return row
    }

    private func actionButton(_ title: String, primary isPrimary: Bool, action: @escaping () -> Void) -> UIButton {
        let button = UIButton(type: .system)
        button.setTitle(title, for: .normal)
        button.titleLabel?.font = .systemFont(ofSize: 13, weight: .semibold)
        button.titleLabel?.adjustsFontSizeToFitWidth = true
        button.titleLabel?.minimumScaleFactor = 0.78
        button.titleLabel?.lineBreakMode = .byTruncatingTail
        button.setTitleColor(isPrimary ? .white : ink, for: .normal)
        button.backgroundColor = isPrimary ? primary : UIColor(red: 247/255, green: 250/255, blue: 253/255, alpha: 1)
        button.contentEdgeInsets = UIEdgeInsets(top: 0, left: 8, bottom: 0, right: 8)
        button.layer.cornerRadius = 12
        button.layer.borderWidth = isPrimary ? 0 : 1
        button.layer.borderColor = softBorder.cgColor
        button.heightAnchor.constraint(greaterThanOrEqualToConstant: 38).isActive = true
        button.addAction(UIAction { _ in action() }, for: .touchUpInside)
        return button
    }

    private func iconButton(_ title: String, action: @escaping () -> Void) -> UIButton {
        let button = actionButton(title, primary: false, action: action)
        if let symbol = symbolName(title) {
            button.setTitle(nil, for: .normal)
            button.setImage(UIImage(systemName: symbol), for: .normal)
            button.tintColor = ink
            button.imageView?.contentMode = .scaleAspectFit
        }
        button.widthAnchor.constraint(equalToConstant: 38).isActive = true
        button.heightAnchor.constraint(equalToConstant: 38).isActive = true
        return button
    }

    private func topIconButton(_ title: String, tint: UIColor, action: @escaping () -> Void) -> UIButton {
        let button = actionButton(title, primary: false, action: action)
        button.setTitleColor(tint, for: .normal)
        if let symbol = symbolName(title) {
            button.setTitle(nil, for: .normal)
            button.setImage(UIImage(systemName: symbol), for: .normal)
            button.tintColor = tint
            button.imageView?.contentMode = .scaleAspectFit
        }
        button.titleLabel?.font = .systemFont(ofSize: 26, weight: .bold)
        button.backgroundColor = tint.withAlphaComponent(0.12)
        button.layer.borderColor = tint.withAlphaComponent(0.25).cgColor
        button.layer.cornerRadius = 14
        button.widthAnchor.constraint(equalToConstant: 40).isActive = true
        button.heightAnchor.constraint(equalToConstant: 40).isActive = true
        return button
    }

    private func quickTile(icon: String, title: String, section: String, tint: UIColor) -> UIStackView {
        let active = activeSection == section
        let tile = card()
        tile.alignment = .center
        tile.spacing = 3
        tile.layer.cornerRadius = 14
        tile.layoutMargins = UIEdgeInsets(top: 6, left: 6, bottom: 6, right: 6)
        tile.widthAnchor.constraint(greaterThanOrEqualToConstant: 72).isActive = true
        tile.heightAnchor.constraint(equalToConstant: 72).isActive = true
        if active {
            tile.backgroundColor = tint == ink ? primary : tint
            tile.layer.borderColor = (tint == ink ? primary : tint).cgColor
        }
        tile.addArrangedSubview(iconCircle(icon, tint: active ? .white : tint, active: active, size: 34, symbolSize: 18))
        let titleView = label(title, size: 11, color: active ? .white : ink, weight: .semibold, align: .center, lines: 2)
        titleView.adjustsFontSizeToFitWidth = true
        titleView.minimumScaleFactor = 0.68
        tile.addArrangedSubview(titleView)
        tile.isUserInteractionEnabled = true
        tile.addGestureRecognizer(NexaTapGesture {
            self.openHomeSection(section)
        })
        return tile
    }

    private func iconCircle(_ kind: String, tint: UIColor, active: Bool, size: CGFloat, symbolSize: CGFloat) -> UIView {
        let container = UIView()
        container.translatesAutoresizingMaskIntoConstraints = false
        container.backgroundColor = active ? UIColor.white.withAlphaComponent(0.18) : iconFillColor(kind)
        container.layer.borderColor = (active ? UIColor.white.withAlphaComponent(0.45) : iconStrokeColor(kind)).cgColor
        container.layer.borderWidth = 1
        container.layer.cornerRadius = size / 2
        container.widthAnchor.constraint(equalToConstant: size).isActive = true
        container.heightAnchor.constraint(equalToConstant: size).isActive = true
        let image = UIImageView(image: UIImage(systemName: symbolName(kind) ?? "circle"))
        image.tintColor = tint
        image.contentMode = .scaleAspectFit
        image.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(image)
        NSLayoutConstraint.activate([
            image.centerXAnchor.constraint(equalTo: container.centerXAnchor),
            image.centerYAnchor.constraint(equalTo: container.centerYAnchor),
            image.widthAnchor.constraint(equalToConstant: symbolSize),
            image.heightAnchor.constraint(equalToConstant: symbolSize)
        ])
        return container
    }

    private func iconHero(_ kind: String, color: UIColor) -> UIView {
        iconCircle(kind, tint: color, active: false, size: 72, symbolSize: 36)
    }

    private func symbolName(_ kind: String) -> String? {
        switch kind {
        case "business", "⌂": return "building.2"
        case "users", "♣": return "person.2"
        case "qr", "▣": return "qrcode"
        case "profile", "☻": return "person.crop.circle"
        case "phone", "☎": return "phone.fill"
        case "video": return "video.fill"
        case "add-user", "⌘": return "person.badge.plus"
        case "settings", "☼": return "gearshape"
        case "logout", "↪": return "rectangle.portrait.and.arrow.right"
        case "shield", "◆": return "shield"
        case "search", "⌕": return "magnifyingglass"
        case "location", "⌖": return "location.fill"
        case "emoji", "☺": return "face.smiling"
        case "plus", "+": return "plus"
        case "back", "‹": return "chevron.left"
        case "delete", "⌫": return "trash"
        case "info", "i": return "info.circle"
        default: return nil
        }
    }

    private func iconFillColor(_ kind: String) -> UIColor {
        switch kind {
        case "business", "users", "phone", "video", "add-user":
            return primary.withAlphaComponent(0.14)
        case "qr", "location":
            return UIColor(red: 236/255, green: 254/255, blue: 255/255, alpha: 1)
        case "settings", "shield":
            return UIColor(red: 239/255, green: 246/255, blue: 255/255, alpha: 1)
        case "logout":
            return UIColor(red: 254/255, green: 242/255, blue: 242/255, alpha: 1)
        case "emoji":
            return UIColor(red: 255/255, green: 251/255, blue: 235/255, alpha: 1)
        default:
            return UIColor(red: 246/255, green: 249/255, blue: 252/255, alpha: 1)
        }
    }

    private func iconStrokeColor(_ kind: String) -> UIColor {
        switch kind {
        case "business", "users", "phone", "video", "add-user":
            return primary.withAlphaComponent(0.35)
        case "qr", "location":
            return UIColor(red: 165/255, green: 243/255, blue: 252/255, alpha: 1)
        case "settings", "shield":
            return UIColor(red: 191/255, green: 219/255, blue: 254/255, alpha: 1)
        case "logout":
            return UIColor(red: 254/255, green: 202/255, blue: 202/255, alpha: 1)
        default:
            return softBorder
        }
    }

    private func input(_ placeholder: String, text: String = "", secure: Bool = false) -> NexaTextField {
        let field = NexaTextField()
        field.placeholder = placeholder
        field.text = text
        field.isSecureTextEntry = secure
        field.delegate = self
        field.textColor = ink
        field.tintColor = primary
        field.font = .systemFont(ofSize: 14, weight: .regular)
        field.attributedPlaceholder = NSAttributedString(string: placeholder, attributes: [.foregroundColor: muted])
        field.backgroundColor = .white
        field.layer.cornerRadius = 12
        field.layer.borderWidth = 1
        field.layer.borderColor = softBorder.cgColor
        field.clearButtonMode = .whileEditing
        field.heightAnchor.constraint(greaterThanOrEqualToConstant: 40).isActive = true
        return field
    }

    private func avatar(_ value: String, size: CGFloat, corner: CGFloat? = nil) -> UILabel {
        let view = label(value, size: 15, color: .white, weight: .bold, align: .center)
        view.backgroundColor = primary
        view.layer.cornerRadius = corner ?? (size / 2)
        view.clipsToBounds = true
        view.widthAnchor.constraint(equalToConstant: size).isActive = true
        view.heightAnchor.constraint(equalToConstant: size).isActive = true
        return view
    }

    private func avatarView(_ source: [String: Any], fallback: String, size: CGFloat, corner: CGFloat? = nil) -> UIView {
        if let image = imageFromDataUri(string(source["avatarData"], "")) {
            let imageView = UIImageView(image: image)
            imageView.translatesAutoresizingMaskIntoConstraints = false
            imageView.contentMode = .scaleAspectFill
            imageView.clipsToBounds = true
            imageView.layer.cornerRadius = corner ?? (size / 2)
            imageView.widthAnchor.constraint(equalToConstant: size).isActive = true
            imageView.heightAnchor.constraint(equalToConstant: size).isActive = true
            return imageView
        }
        return avatar(initials(fallback), size: size, corner: corner)
    }

    private func imageFromDataUri(_ value: String, maxPixel: CGFloat = 512) -> UIImage? {
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty { return nil }
        let base64: String
        if let comma = trimmed.firstIndex(of: ",") {
            base64 = String(trimmed[trimmed.index(after: comma)...])
        } else {
            base64 = trimmed
        }
        guard let data = Data(base64Encoded: base64) else { return nil }
        let options: [CFString: Any] = [
            kCGImageSourceCreateThumbnailFromImageAlways: true,
            kCGImageSourceCreateThumbnailWithTransform: true,
            kCGImageSourceThumbnailMaxPixelSize: max(96, Int(maxPixel))
        ]
        if let source = CGImageSourceCreateWithData(data as CFData, nil),
           let image = CGImageSourceCreateThumbnailAtIndex(source, 0, options as CFDictionary) {
            return UIImage(cgImage: image)
        }
        return UIImage(data: data)
    }

    private func badge(_ text: String, color: UIColor, textColor: UIColor) -> UILabel {
        let view = label(text, size: 12, color: textColor, weight: .bold, align: .center)
        view.backgroundColor = color
        view.layer.cornerRadius = 14
        view.clipsToBounds = true
        view.heightAnchor.constraint(equalToConstant: 28).isActive = true
        view.widthAnchor.constraint(greaterThanOrEqualToConstant: 34).isActive = true
        return view
    }

    private func chip(_ text: String) -> UILabel {
        let view = label(text, size: 12, color: .white, weight: .semibold, align: .center)
        view.backgroundColor = UIColor.white.withAlphaComponent(0.18)
        view.layer.cornerRadius = 12
        view.clipsToBounds = true
        view.heightAnchor.constraint(equalToConstant: 28).isActive = true
        return view
    }

    private func label(_ text: String, size: CGFloat, color: UIColor? = nil, weight: UIFont.Weight = .regular, align: NSTextAlignment = .natural, lines: Int = 1) -> UILabel {
        let view = NexaPaddedLabel()
        view.text = text
        view.textColor = color ?? ink
        view.font = .systemFont(ofSize: size, weight: weight)
        view.textAlignment = align
        view.numberOfLines = lines
        view.lineBreakMode = lines == 1 ? .byTruncatingTail : .byWordWrapping
        return view
    }

    private func vstack(spacing: CGFloat) -> UIStackView {
        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = spacing
        stack.translatesAutoresizingMaskIntoConstraints = false
        return stack
    }

    private func hstack(spacing: CGFloat) -> UIStackView {
        let stack = UIStackView()
        stack.axis = .horizontal
        stack.spacing = spacing
        stack.distribution = .fill
        stack.translatesAutoresizingMaskIntoConstraints = false
        return stack
    }
}

final class NexaNativeWebRTC: NSObject, RTCPeerConnectionDelegate, RTCVideoViewDelegate {
    let remoteVideoView = RTCMTLVideoView(frame: .zero)
    let localVideoView = RTCMTLVideoView(frame: .zero)

    private static let initializeFactoryOnce: Void = {
        RTCPeerConnectionFactory.initialize()
        RTCInitializeSSL()
    }()

    private let factory: RTCPeerConnectionFactory
    private var peerConnection: RTCPeerConnection?
    private var localAudioTrack: RTCAudioTrack?
    private var localVideoTrack: RTCVideoTrack?
    private var cameraCapturer: RTCCameraVideoCapturer?
    private var currentCallId = ""
    private var currentMode = "voice"
    private var isCaller = false
    private var offerSent = false
    private var answerSent = false
    private var handledSignalIds = Set<String>()
    private var pendingRemoteCandidates: [RTCIceCandidate] = []
    private var sendSignal: ((String, [String: Any]) -> Void)?
    private var onStatus: ((String) -> Void)?

    override init() {
        _ = NexaNativeWebRTC.initializeFactoryOnce
        let encoderFactory = RTCDefaultVideoEncoderFactory()
        let decoderFactory = RTCDefaultVideoDecoderFactory()
        factory = RTCPeerConnectionFactory(encoderFactory: encoderFactory, decoderFactory: decoderFactory)
        super.init()
        remoteVideoView.videoContentMode = .scaleAspectFill
        localVideoView.videoContentMode = .scaleAspectFill
        remoteVideoView.delegate = self
        localVideoView.delegate = self
    }

    func start(
        callId: String,
        mode: String,
        isCaller: Bool,
        sendSignal: @escaping (String, [String: Any]) -> Void,
        onStatus: @escaping (String) -> Void
    ) {
        guard !callId.isEmpty else { return }
        self.sendSignal = sendSignal
        self.onStatus = onStatus
        if currentCallId == callId, peerConnection != nil {
            processQueuedCandidatesIfPossible()
            if isCaller { makeOfferIfNeeded() }
            return
        }

        stop()
        currentCallId = callId
        currentMode = mode == "video" ? "video" : "voice"
        self.isCaller = isCaller
        self.sendSignal = sendSignal
        self.onStatus = onStatus
        handledSignalIds.removeAll()
        pendingRemoteCandidates.removeAll()
        offerSent = false
        answerSent = false

        let config = RTCConfiguration()
        config.sdpSemantics = .unifiedPlan
        config.continualGatheringPolicy = .gatherContinually
        config.iceServers = [
            RTCIceServer(urlStrings: ["stun:stun.l.google.com:19302"])
        ]
        let constraints = RTCMediaConstraints(mandatoryConstraints: nil, optionalConstraints: nil)
        let connection = factory.peerConnection(with: config, constraints: constraints, delegate: self)
        peerConnection = connection
        addLocalMedia(to: connection)
        onStatus(currentMode == "video" ? "Đã bật Native WebRTC video." : "Đã bật Native WebRTC thoại.")
        if isCaller { makeOfferIfNeeded() }
    }

    func stop() {
        cameraCapturer?.stopCapture()
        cameraCapturer = nil
        localVideoTrack?.remove(localVideoView)
        localAudioTrack = nil
        localVideoTrack = nil
        peerConnection?.close()
        peerConnection = nil
        currentCallId = ""
        offerSent = false
        answerSent = false
        handledSignalIds.removeAll()
        pendingRemoteCandidates.removeAll()
    }

    func setMicMuted(_ muted: Bool) {
        localAudioTrack?.isEnabled = !muted
    }

    func setCameraOff(_ off: Bool) {
        localVideoTrack?.isEnabled = !off
    }

    func processSignals(_ signals: [[String: Any]]) {
        for signal in signals {
            let id = string(signal["id"], "")
            if !id.isEmpty {
                guard !handledSignalIds.contains(id) else { continue }
                handledSignalIds.insert(id)
            }
            let type = string(signal["type"], "")
            guard let payload = signal["payload"] as? [String: Any] else { continue }
            if type == "offer" || type == "answer" {
                applyRemoteDescription(type: type, payload: payload)
            } else if type == "candidate" {
                applyRemoteCandidate(payload)
            }
        }
    }

    private func addLocalMedia(to connection: RTCPeerConnection) {
        let audioSource = factory.audioSource(with: nil)
        let audioTrack = factory.audioTrack(with: audioSource, trackId: "xpaychat-audio")
        localAudioTrack = audioTrack
        connection.add(audioTrack, streamIds: ["xpaychat-stream"])

        guard currentMode == "video" else { return }
        let videoSource = factory.videoSource()
        let videoTrack = factory.videoTrack(with: videoSource, trackId: "xpaychat-video")
        localVideoTrack = videoTrack
        videoTrack.add(localVideoView)
        connection.add(videoTrack, streamIds: ["xpaychat-stream"])

        let capturer = RTCCameraVideoCapturer(delegate: videoSource)
        cameraCapturer = capturer
        guard let device = RTCCameraVideoCapturer.captureDevices().first(where: { $0.position == .front })
            ?? RTCCameraVideoCapturer.captureDevices().first else { return }
        let formats = RTCCameraVideoCapturer.supportedFormats(for: device)
        guard let format = formats.max(by: { lhs, rhs in
            let left = CMVideoFormatDescriptionGetDimensions(lhs.formatDescription)
            let right = CMVideoFormatDescriptionGetDimensions(rhs.formatDescription)
            return Int(left.width) * Int(left.height) < Int(right.width) * Int(right.height)
        }) else { return }
        let maxFps = format.videoSupportedFrameRateRanges.map { Int($0.maxFrameRate) }.max() ?? 30
        capturer.startCapture(with: device, format: format, fps: min(maxFps, 30))
    }

    private func makeOfferIfNeeded() {
        guard isCaller, !offerSent, let connection = peerConnection else { return }
        offerSent = true
        let constraints = RTCMediaConstraints(
            mandatoryConstraints: ["OfferToReceiveAudio": "true", "OfferToReceiveVideo": currentMode == "video" ? "true" : "false"],
            optionalConstraints: nil
        )
        connection.offer(for: constraints) { [weak self] description, error in
            guard let self else { return }
            if let error {
                self.onStatus?("Lỗi tạo WebRTC offer: \(error.localizedDescription)")
                return
            }
            guard let description else { return }
            connection.setLocalDescription(description) { [weak self] error in
                guard let self else { return }
                if let error {
                    self.onStatus?("Lỗi lưu WebRTC offer: \(error.localizedDescription)")
                    return
                }
                self.sendSignal?("offer", ["type": "offer", "sdp": description.sdp])
            }
        }
    }

    private func makeAnswerIfNeeded() {
        guard !isCaller, !answerSent, let connection = peerConnection else { return }
        answerSent = true
        let constraints = RTCMediaConstraints(
            mandatoryConstraints: ["OfferToReceiveAudio": "true", "OfferToReceiveVideo": currentMode == "video" ? "true" : "false"],
            optionalConstraints: nil
        )
        connection.answer(for: constraints) { [weak self] description, error in
            guard let self else { return }
            if let error {
                self.onStatus?("Lỗi tạo WebRTC answer: \(error.localizedDescription)")
                return
            }
            guard let description else { return }
            connection.setLocalDescription(description) { [weak self] error in
                guard let self else { return }
                if let error {
                    self.onStatus?("Lỗi lưu WebRTC answer: \(error.localizedDescription)")
                    return
                }
                self.sendSignal?("answer", ["type": "answer", "sdp": description.sdp])
            }
        }
    }

    private func applyRemoteDescription(type: String, payload: [String: Any]) {
        guard let connection = peerConnection else { return }
        let sdp = string(payload["sdp"], "")
        guard !sdp.isEmpty else { return }
        let remoteType: RTCSdpType = type == "offer" ? .offer : .answer
        let description = RTCSessionDescription(type: remoteType, sdp: sdp)
        connection.setRemoteDescription(description) { [weak self] error in
            guard let self else { return }
            if let error {
                self.onStatus?("Lỗi nhận tín hiệu WebRTC: \(error.localizedDescription)")
                return
            }
            self.processQueuedCandidatesIfPossible()
            if type == "offer" { self.makeAnswerIfNeeded() }
        }
    }

    private func applyRemoteCandidate(_ payload: [String: Any]) {
        let sdp = string(payload["candidate"], string(payload["sdp"], ""))
        guard !sdp.isEmpty else { return }
        let candidate = RTCIceCandidate(
            sdp: sdp,
            sdpMLineIndex: Int32(int(payload["sdpMLineIndex"], 0)),
            sdpMid: string(payload["sdpMid"], "0")
        )
        guard let connection = peerConnection, connection.remoteDescription != nil else {
            pendingRemoteCandidates.append(candidate)
            return
        }
        connection.add(candidate)
    }

    private func processQueuedCandidatesIfPossible() {
        guard let connection = peerConnection, connection.remoteDescription != nil else { return }
        let candidates = pendingRemoteCandidates
        pendingRemoteCandidates.removeAll()
        candidates.forEach { candidate in
            connection.add(candidate)
        }
    }

    func peerConnection(_ peerConnection: RTCPeerConnection, didChange stateChanged: RTCSignalingState) {}
    func peerConnection(_ peerConnection: RTCPeerConnection, didAdd stream: RTCMediaStream) {
        stream.videoTracks.first?.add(remoteVideoView)
    }
    func peerConnection(_ peerConnection: RTCPeerConnection, didRemove stream: RTCMediaStream) {}
    func peerConnectionShouldNegotiate(_ peerConnection: RTCPeerConnection) {}
    func peerConnection(_ peerConnection: RTCPeerConnection, didChange newState: RTCIceConnectionState) {
        if newState == .connected || newState == .completed {
            onStatus?(currentMode == "video" ? "Video call đã kết nối WebRTC." : "Cuộc gọi thoại đã kết nối WebRTC.")
        } else if newState == .failed {
            onStatus?("Kết nối WebRTC yếu, cần kiểm tra TURN/STUN.")
        }
    }
    func peerConnection(_ peerConnection: RTCPeerConnection, didChange newState: RTCIceGatheringState) {}
    func peerConnection(_ peerConnection: RTCPeerConnection, didGenerate candidate: RTCIceCandidate) {
        sendSignal?("candidate", [
            "candidate": candidate.sdp,
            "sdp": candidate.sdp,
            "sdpMid": candidate.sdpMid ?? "0",
            "sdpMLineIndex": Int(candidate.sdpMLineIndex)
        ])
    }
    func peerConnection(_ peerConnection: RTCPeerConnection, didRemove candidates: [RTCIceCandidate]) {}
    func peerConnection(_ peerConnection: RTCPeerConnection, didOpen dataChannel: RTCDataChannel) {}
    func peerConnection(_ peerConnection: RTCPeerConnection, didStartReceivingOn transceiver: RTCRtpTransceiver) {
        (transceiver.receiver.track as? RTCVideoTrack)?.add(remoteVideoView)
    }
    func videoView(_ videoView: RTCVideoRenderer, didChangeVideoSize size: CGSize) {}
}

final class NexaNativeApi {
    var token = ""
    private let baseURL = URL(string: "https://gatewayxpay.com")!

    func post(_ path: String, body: [String: Any], auth: Bool, timeout: TimeInterval = 20, completion: @escaping (Result<[String: Any], Error>) -> Void) {
        var request = URLRequest(url: baseURL.appendingPathComponent(path))
        request.httpMethod = "POST"
        request.timeoutInterval = timeout
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if auth, !token.isEmpty { request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        request.httpBody = try? JSONSerialization.data(withJSONObject: body, options: [])
        URLSession.shared.dataTask(with: request) { data, response, error in
            DispatchQueue.main.async {
                if let error { completion(.failure(error)); return }
                guard let http = response as? HTTPURLResponse else {
                    completion(.failure(NexaError("Không nhận được phản hồi máy chủ.")))
                    return
                }
                guard let data else {
                    completion(.failure(NexaError("Phản hồi máy chủ trống.")))
                    return
                }
                let json = (try? JSONSerialization.jsonObject(with: data, options: [])) as? [String: Any] ?? [:]
                if http.statusCode >= 200 && http.statusCode < 300 {
                    completion(.success(json))
                } else {
                    let message = string(json["message"], string(json["error"], "Lỗi máy chủ \(http.statusCode)."))
                    completion(.failure(NexaError(message)))
                }
            }
        }.resume()
    }
}

final class NexaNativeStore {
    private let defaults = UserDefaults.standard
    private let tokenKey = "xpaychat.native.ios.token"
    private let userKey = "xpaychat.native.ios.user"
    private let phoneKey = "xpaychat.native.ios.phone"
    private let deviceIdKey = "xpaychat.native.ios.device.id"
    private let pushTokenKey = "xpaychat.native.ios.push.token"

    var token: String {
        get { defaults.string(forKey: tokenKey) ?? "" }
        set { defaults.set(newValue, forKey: tokenKey) }
    }

    var user: [String: Any] {
        get {
            guard let data = defaults.data(forKey: userKey),
                  let json = try? JSONSerialization.jsonObject(with: data, options: []) as? [String: Any] else { return [:] }
            return json
        }
        set {
            let data = try? JSONSerialization.data(withJSONObject: newValue, options: [])
            defaults.set(data, forKey: userKey)
        }
    }

    var phone: String {
        get { defaults.string(forKey: phoneKey) ?? "" }
        set { defaults.set(newValue, forKey: phoneKey) }
    }

    var deviceId: String {
        if let existing = defaults.string(forKey: deviceIdKey), !existing.isEmpty { return existing }
        let value = "ios-\(UUID().uuidString)"
        defaults.set(value, forKey: deviceIdKey)
        return value
    }

    var pushToken: String {
        get { defaults.string(forKey: pushTokenKey) ?? "" }
        set { defaults.set(newValue, forKey: pushTokenKey) }
    }

    func clear() {
        let existingDeviceId = deviceId
        defaults.removeObject(forKey: tokenKey)
        defaults.removeObject(forKey: userKey)
        defaults.removeObject(forKey: phoneKey)
        defaults.set(existingDeviceId, forKey: deviceIdKey)
    }
}

final class NexaTextField: UITextField {
    var textValue: String { (text ?? "").trimmingCharacters(in: .whitespacesAndNewlines) }
    override func textRect(forBounds bounds: CGRect) -> CGRect { bounds.insetBy(dx: 13, dy: 8) }
    override func editingRect(forBounds bounds: CGRect) -> CGRect { bounds.insetBy(dx: 13, dy: 8) }
    override func placeholderRect(forBounds bounds: CGRect) -> CGRect { bounds.insetBy(dx: 13, dy: 8) }
}

final class NexaPaddedLabel: UILabel {
    var textInsets = UIEdgeInsets.zero
    override func drawText(in rect: CGRect) { super.drawText(in: rect.inset(by: textInsets)) }
    override var intrinsicContentSize: CGSize {
        let size = super.intrinsicContentSize
        return CGSize(width: size.width + textInsets.left + textInsets.right, height: size.height + textInsets.top + textInsets.bottom)
    }
}

final class NexaTapGesture: UITapGestureRecognizer {
    private let action: () -> Void
    init(_ action: @escaping () -> Void) {
        self.action = action
        super.init(target: nil, action: nil)
        addTarget(self, action: #selector(run))
    }
    @objc private func run() { action() }
}

final class NexaMessageGesture: UILongPressGestureRecognizer {
    let message: [String: Any]
    init(message: [String: Any], target: Any?, action: Selector?) {
        self.message = message
        super.init(target: target, action: action)
    }
}

final class NexaConversationGesture: UILongPressGestureRecognizer {
    let phone: String
    let displayName: String
    init(phone: String, name: String, target: Any?, action: Selector?) {
        self.phone = phone
        self.displayName = name
        super.init(target: target, action: action)
    }
}

struct NexaError: LocalizedError {
    let message: String
    init(_ message: String) { self.message = message }
    var errorDescription: String? { message }
}

private func array(_ value: Any?) -> [[String: Any]] {
    return value as? [[String: Any]] ?? []
}

private func string(_ value: Any?, _ fallback: String) -> String {
    if let value = value as? String { return value }
    if let value = value { return "\(value)" }
    return fallback
}

private func int(_ value: Any?, _ fallback: Int) -> Int {
    if let value = value as? Int { return value }
    if let value = value as? NSNumber { return value.intValue }
    if let value = value as? String, let parsed = Int(value) { return parsed }
    return fallback
}

private func double(_ value: Any?, _ fallback: Double) -> Double {
    if let value = value as? Double { return value }
    if let value = value as? NSNumber { return value.doubleValue }
    if let value = value as? String, let parsed = Double(value) { return parsed }
    return fallback
}

private func bool(_ value: Any?, _ fallback: Bool) -> Bool {
    if let value = value as? Bool { return value }
    if let value = value as? NSNumber { return value.boolValue }
    if let value = value as? String {
        let clean = value.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if ["true", "1", "yes", "y"].contains(clean) { return true }
        if ["false", "0", "no", "n"].contains(clean) { return false }
    }
    return fallback
}

private func plainText(_ value: String) -> String {
    let folded = value.folding(options: [.diacriticInsensitive, .caseInsensitive], locale: Locale(identifier: "vi_VN"))
    return folded.replacingOccurrences(of: "đ", with: "d").replacingOccurrences(of: "Đ", with: "D").lowercased()
}

private func normalizePhone(_ value: String) -> String {
    return value.filter { $0.isNumber }
}

private func initials(_ value: String) -> String {
    let parts = value.split(separator: " ").map(String.init)
    let letters = parts.prefix(2).compactMap { $0.first }.map { String($0).uppercased() }
    return letters.isEmpty ? "NX" : letters.joined()
}

private extension UIScrollView {
    func scrollToBottom(animated: Bool = true) {
        let y = max(0, contentSize.height - bounds.height + adjustedContentInset.bottom)
        setContentOffset(CGPoint(x: 0, y: y), animated: animated)
    }
}
