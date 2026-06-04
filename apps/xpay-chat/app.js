const samplePeople = [
  {
    id: "an",
    name: "An Nhiên",
    phone: "090 221 4567",
    birthDate: "1998-04-12",
    interests: "Cafe công nghệ, thiết kế sản phẩm, cộng đồng startup.",
    privacy: { phone: true, birthDate: true, interests: true, avatar: true },
    distance: 1.2,
    status: "Đang online",
    avatar: "A",
    color: "linear-gradient(135deg, #00a7c7, #15b97a)",
    messages: [
      { from: "them", text: "Chào bạn, mình thấy bạn cũng ở gần khu trung tâm.", time: "19:10" },
      { from: "me", text: "Ừ, mình đang thử XPAY Chat. Giao diện khá mượt đó.", time: "19:11" },
      { from: "them", text: "Khi nào rảnh mình lập nhóm cafe công nghệ nhé.", time: "19:12" }
    ]
  },
  {
    id: "minh",
    name: "Minh Khoa",
    phone: "091 884 2026",
    birthDate: "1995-09-24",
    interests: "AI, bảo mật, chạy bộ buổi sáng.",
    privacy: { phone: true, birthDate: false, interests: true, avatar: true },
    distance: 2.4,
    status: "Vừa hoạt động",
    avatar: "M",
    color: "linear-gradient(135deg, #2563eb, #00a7c7)",
    messages: [
      { from: "them", text: "Bạn có đang tham gia cộng đồng startup gần đây không?", time: "18:44" },
      { from: "me", text: "Có, mình quan tâm mảng sản phẩm số và AI.", time: "18:46" }
    ]
  },
  {
    id: "linh",
    name: "Linh Đan",
    phone: "093 667 8890",
    birthDate: "1997-01-18",
    interests: "Âm nhạc, chụp ảnh, du lịch cuối tuần.",
    privacy: { phone: false, birthDate: true, interests: true, avatar: true },
    distance: 3.1,
    status: "Đang online",
    avatar: "L",
    color: "linear-gradient(135deg, #ff6b5f, #f4b740)",
    messages: [
      { from: "them", text: "Mình mới tạo tài khoản bằng số điện thoại, nhanh thật.", time: "17:25" },
      { from: "them", text: "Tính năng quanh đây nhìn rất hợp để kết bạn địa phương.", time: "17:26" }
    ]
  },
  {
    id: "tuan",
    name: "Tuấn Anh",
    phone: "098 552 7711",
    birthDate: "1994-12-05",
    interests: "Meetup công nghệ, fintech, sách kinh doanh.",
    privacy: { phone: true, birthDate: false, interests: false, avatar: true },
    distance: 4.8,
    status: "Cách đây 12 phút",
    avatar: "T",
    color: "linear-gradient(135deg, #101828, #2563eb)",
    messages: [
      { from: "them", text: "Tối nay có buổi meetup về bảo mật tài khoản đó.", time: "16:08" }
    ]
  }
];

const storageKey = "xpaychat.user";
const usersKey = "xpaychat.users";
const chatKey = "xpaychat.people";
const journalKey = "xpaychat.journal";
const businessKey = "xpaychat.businesses";
const aiAssistantKey = "xpaychat.aiAssistant";
const aiSettingsKey = "xpaychat.aiSettings";
const aiAutoReplyKey = "xpaychat.aiAutoReplies";
const aiAgentStateKey = "xpaychat.aiAgentState";
const aiServerStateKey = "xpaychat.aiServerState";
const appSettingsKey = "xpaychat.appSettings";
const unreadStateKey = "xpaychat.unreadState";
const deviceKeyStorageKey = "xpaychat.deviceSecret";
const authTokenKey = "xpaychat.authToken";
const appVersionKey = "xpaychat.appVersion";
const pushTokenStorageKey = "xpaychat.pushToken";
const pushDeviceIdStorageKey = "xpaychat.pushDeviceId";
const uiThemeKey = "xpaychat.uiTheme";
const hiddenChatsKey = "xpaychat.hiddenChats";
const hiddenChatMetaKey = "xpaychat.hiddenChatsMeta";
const aiAssistantResetKey = "xpaychat.aiAssistantReset";
const appVersion = "1.0.0-store-rc1";
const productionOrigin = "https://gatewayxpay.com";
const apiBasePath = String(window.XPAY_CHAT_API_BASE || (location.pathname.startsWith("/chat-app") ? "/chat-api" : "")).replace(/\/+$/, "");
const messageReactionOptions = ["❤️", "👍", "😂", "😮", "😢", "🙏"];
const hiddenChatSyncGraceMs = 5 * 60 * 1000;

const authScreen = document.querySelector("#authScreen");
const chatApp = document.querySelector("#chatApp");
const loginForm = document.querySelector("#loginForm");
const authTitle = document.querySelector("#authTitle");
const phoneInput = document.querySelector("#phoneInput");
const emailField = document.querySelector("#emailField");
const emailInput = document.querySelector("#emailInput");
const nameField = document.querySelector("#nameField");
const nameInput = document.querySelector("#nameInput");
const passwordField = document.querySelector("#passwordField");
const passwordLabel = document.querySelector("#passwordLabel");
const passwordInput = document.querySelector("#passwordInput");
const confirmPasswordField = document.querySelector("#confirmPasswordField");
const confirmPasswordInput = document.querySelector("#confirmPasswordInput");
const otpPanel = document.querySelector("#otpPanel");
const otpInput = document.querySelector("#otpInput");
const otpLocalCode = document.querySelector("#otpLocalCode");
const authSubmitBtn = document.querySelector("#authSubmitBtn");
const resendOtpBtn = document.querySelector("#resendOtpBtn");
const authStatus = document.querySelector("#authStatus");
const profileBtn = document.querySelector("#profileBtn");
const friendBtn = document.querySelector("#friendBtn");
const settingsBtn = document.querySelector("#settingsBtn");
const appAdminBtn = document.querySelector("#appAdminBtn");
const callShortcutBtn = document.querySelector("#callShortcutBtn");
const logoutBtn = document.querySelector("#logoutBtn");
const myName = document.querySelector("#myName");
const myPhone = document.querySelector("#myPhone");
const myAvatar = document.querySelector("#myAvatar");
const chatList = document.querySelector("#chatList");
const nearbyList = document.querySelector("#nearbyList");
const peopleNearby = document.querySelector("#peopleNearby");
const businessList = document.querySelector("#businessList");
const journalList = document.querySelector("#journalList");
const aiAssistantList = document.querySelector("#aiAssistantList");
const aiAssistantBrief = document.querySelector("#aiAssistantBrief");
const aiAutoReplyToggle = document.querySelector("#aiAutoReplyToggle");
const aiAgentBoard = document.querySelector("#aiAgentBoard");
const aiRulesForm = document.querySelector("#aiRulesForm");
const aiRulesInput = document.querySelector("#aiRulesInput");
const aiRulesStatus = document.querySelector("#aiRulesStatus");
const journalForm = document.querySelector("#journalForm");
const journalTextInput = document.querySelector("#journalTextInput");
const journalPrivacyInput = document.querySelector("#journalPrivacyInput");
const journalPrivacyButtons = document.querySelectorAll("[data-journal-privacy]");
const journalImageInput = document.querySelector("#journalImageInput");
const journalPreview = document.querySelector("#journalPreview");
const journalPosts = document.querySelector("#journalPosts");
const messageStage = document.querySelector("#messageStage");
const messageForm = document.querySelector("#messageForm");
const messageInput = document.querySelector("#messageInput");
const conversationSection = document.querySelector(".conversation");
const attachMediaBtn = document.querySelector("#attachMediaBtn");
const sendLocationBtn = document.querySelector("#sendLocationBtn");
const emojiBtn = document.querySelector("#emojiBtn");
const emojiPanel = document.querySelector("#emojiPanel");
const chatMediaInput = document.querySelector("#chatMediaInput");
const backToListBtn = document.querySelector("#backToListBtn");
const friendInfoBtn = document.querySelector("#friendInfoBtn");
const clearConversationBtn = document.querySelector("#clearConversationBtn");
const voiceCallBtn = document.querySelector("#voiceCallBtn");
const videoCallBtn = document.querySelector("#videoCallBtn");
const aiTwinBtn = document.querySelector("#aiTwinBtn");
const aiPanel = document.querySelector("#aiPanel");
const closeAiPanelBtn = document.querySelector("#closeAiPanelBtn");
const aiSummary = document.querySelector("#aiSummary");
const aiSuggestion = document.querySelector("#aiSuggestion");
let isMessageComposing = false;
const aiConversationState = document.querySelector("#aiConversationState");
const aiCommon = document.querySelector("#aiCommon");
const aiSafety = document.querySelector("#aiSafety");
const aiOpener = document.querySelector("#aiOpener");
const aiMoodPill = document.querySelector("#aiMoodPill");
const aiIntentPill = document.querySelector("#aiIntentPill");
const aiUrgencyPill = document.querySelector("#aiUrgencyPill");
const aiReplyGrid = document.querySelector("#aiReplyGrid");
const aiActions = document.querySelector("#aiActions");
const aiMemory = document.querySelector("#aiMemory");
const useAiSuggestionBtn = document.querySelector("#useAiSuggestionBtn");
const useAiOpenerBtn = document.querySelector("#useAiOpenerBtn");
const refreshAiBtn = document.querySelector("#refreshAiBtn");
const callOverlay = document.querySelector("#callOverlay");
const remoteAudio = document.querySelector("#remoteAudio");
const remoteVideo = document.querySelector("#remoteVideo");
const localVideo = document.querySelector("#localVideo");
const callVideoStage = document.querySelector("#callVideoStage");
const remotePlaceholder = document.querySelector("#remotePlaceholder");
const callAvatar = document.querySelector("#callAvatar");
const callModeLabel = document.querySelector("#callModeLabel");
const callState = document.querySelector("#callState");
const callName = document.querySelector("#callName");
const callTimer = document.querySelector("#callTimer");
const callHint = document.querySelector("#callHint");
const muteBtn = document.querySelector("#muteBtn");
const cameraBtn = document.querySelector("#cameraBtn");
const answerCallBtn = document.querySelector("#answerCallBtn");
const speakerBtn = document.querySelector("#speakerBtn");
let keyboardViewportRaf = 0;
const endCallBtn = document.querySelector("#endCallBtn");
const friendOverlay = document.querySelector("#friendOverlay");
const closeFriendBtn = document.querySelector("#closeFriendBtn");
const phoneFriendPanel = document.querySelector("#phoneFriendPanel");
const friendPhoneInput = document.querySelector("#friendPhoneInput");
const friendNameInput = document.querySelector("#friendNameInput");
const qrFriendPanel = document.querySelector("#qrFriendPanel");
const scanFriendPanel = document.querySelector("#scanFriendPanel");
const myQrCanvas = document.querySelector("#myQrCanvas");
const qrOwnerName = document.querySelector("#qrOwnerName");
const qrOwnerPhone = document.querySelector("#qrOwnerPhone");
const qrScanVideo = document.querySelector("#qrScanVideo");
const qrScanCanvas = document.querySelector("#qrScanCanvas");
const startScanBtn = document.querySelector("#startScanBtn");
const stopScanBtn = document.querySelector("#stopScanBtn");
const qrImageInput = document.querySelector("#qrImageInput");
const friendStatus = document.querySelector("#friendStatus");
const profileOverlay = document.querySelector("#profileOverlay");
const profileForm = document.querySelector("#profileForm");
const closeProfileBtn = document.querySelector("#closeProfileBtn");
const profileAvatarPreview = document.querySelector("#profileAvatarPreview");
const profileAvatarInput = document.querySelector("#profileAvatarInput");
const profileFullNameInput = document.querySelector("#profileFullNameInput");
const profileEmailInput = document.querySelector("#profileEmailInput");
const profileBirthInput = document.querySelector("#profileBirthInput");
const profileBirthDayInput = document.querySelector("#profileBirthDayInput");
const profileBirthMonthInput = document.querySelector("#profileBirthMonthInput");
const profileBirthYearInput = document.querySelector("#profileBirthYearInput");
const profileInterestsInput = document.querySelector("#profileInterestsInput");
const privacyPhoneInput = document.querySelector("#privacyPhoneInput");
const privacyBirthInput = document.querySelector("#privacyBirthInput");
const privacyInterestsInput = document.querySelector("#privacyInterestsInput");
const privacyAvatarInput = document.querySelector("#privacyAvatarInput");
const profileStatus = document.querySelector("#profileStatus");
const friendInfoOverlay = document.querySelector("#friendInfoOverlay");
const closeFriendInfoBtn = document.querySelector("#closeFriendInfoBtn");
const friendInfoAvatar = document.querySelector("#friendInfoAvatar");
const friendInfoName = document.querySelector("#friendInfoName");
const friendInfoStatus = document.querySelector("#friendInfoStatus");
const friendInfoList = document.querySelector("#friendInfoList");
const friendsOverlay = document.querySelector("#friendsOverlay");
const closeFriendsBtn = document.querySelector("#closeFriendsBtn");
const friendsDirectoryList = document.querySelector("#friendsDirectoryList");
const themeOverlay = document.querySelector("#themeOverlay");
const closeThemeBtn = document.querySelector("#closeThemeBtn");
const themeGrid = document.querySelector("#themeGrid");
const themeStatus = document.querySelector("#themeStatus");
const appAdminOverlay = document.querySelector("#appAdminOverlay");
const closeAppAdminBtn = document.querySelector("#closeAppAdminBtn");
const refreshAppAdminBtn = document.querySelector("#refreshAppAdminBtn");
const appAdminSearchInput = document.querySelector("#appAdminSearchInput");
const appAdminUsersList = document.querySelector("#appAdminUsersList");
const appAdminDetail = document.querySelector("#appAdminDetail");
const appAdminStatus = document.querySelector("#appAdminStatus");
const settingsOverlay = document.querySelector("#settingsOverlay");
const closeSettingsBtn = document.querySelector("#closeSettingsBtn");
const presenceOnlineSetting = document.querySelector("#presenceOnlineSetting");
const presenceOfflineSetting = document.querySelector("#presenceOfflineSetting");
const pushNotificationSetting = document.querySelector("#pushNotificationSetting");
const messageSoundSetting = document.querySelector("#messageSoundSetting");
const messageVibrationSetting = document.querySelector("#messageVibrationSetting");
const unreadHighlightSetting = document.querySelector("#unreadHighlightSetting");
const markReadOnOpenSetting = document.querySelector("#markReadOnOpenSetting");
const callRingtoneSetting = document.querySelector("#callRingtoneSetting");
const callVibrationSetting = document.querySelector("#callVibrationSetting");
const callRingbackSetting = document.querySelector("#callRingbackSetting");
const settingsAiAutoReplyToggle = document.querySelector("#settingsAiAutoReplyToggle");
const markAllReadBtn = document.querySelector("#markAllReadBtn");
const openAiSettingsBtn = document.querySelector("#openAiSettingsBtn");
const settingsStatus = document.querySelector("#settingsStatus");
const deleteAccountBtn = document.querySelector("#deleteAccountBtn");
const profileDeleteAccountBtn = document.querySelector("#profileDeleteAccountBtn");
const accountDeleteOverlay = document.querySelector("#accountDeleteOverlay");
const accountDeleteForm = document.querySelector("#accountDeleteForm");
const closeAccountDeleteBtn = document.querySelector("#closeAccountDeleteBtn");
const accountDeletePasswordInput = document.querySelector("#accountDeletePasswordInput");
const accountDeleteConfirmInput = document.querySelector("#accountDeleteConfirmInput");
const accountDeleteStatus = document.querySelector("#accountDeleteStatus");
const forcePasswordOverlay = document.querySelector("#forcePasswordOverlay");
const forcePasswordForm = document.querySelector("#forcePasswordForm");
const forceCurrentPasswordInput = document.querySelector("#forceCurrentPasswordInput");
const forceNewPasswordInput = document.querySelector("#forceNewPasswordInput");
const forceConfirmPasswordInput = document.querySelector("#forceConfirmPasswordInput");
const forcePasswordStatus = document.querySelector("#forcePasswordStatus");
const forcePasswordLogoutBtn = document.querySelector("#forcePasswordLogoutBtn");
const activeName = document.querySelector("#activeName");
const activeMeta = document.querySelector("#activeMeta");
const activeAvatar = document.querySelector("#activeAvatar");
const e2eeStatus = document.querySelector("#e2eeStatus");
const conversationSearch = document.querySelector("#conversationSearch");
const locateBtn = document.querySelector("#locateBtn");
const locationStatus = document.querySelector("#locationStatus");
const quickActions = document.querySelector(".quick-actions");
const callHistoryOverlay = document.querySelector("#callHistoryOverlay");
const callHistoryList = document.querySelector("#callHistoryList");
const closeCallHistoryBtn = document.querySelector("#closeCallHistoryBtn");
const refreshCallHistoryBtn = document.querySelector("#refreshCallHistoryBtn");
const referralPointsText = document.querySelector("#referralPointsText");
const referralStatus = document.querySelector("#referralStatus");
const createReferralBtn = document.querySelector("#createReferralBtn");
const shareReferralBtn = document.querySelector("#shareReferralBtn");

migrateClientStorage();

let currentUser = null;
let people = loadPeople();
let journals = loadJournals();
let businessProfiles = loadBusinessProfiles();
let businessInbox = [];
let aiAssistantMessages = loadAiAssistantMessages();
let aiSettings = loadAiSettings();
let aiAgentState = loadAiAgentState();
let aiServerState = loadAiServerState();
let appSettings = loadAppSettings();
let unreadState = loadUnreadState();
let hiddenChatMap = loadHiddenChatMap();
let hiddenChatMetaMap = loadHiddenChatMetaMap();
let nearbyPeople = [];
let activeId = people[0]?.id || "";
let currentFilter = "";
let businessSearchQuery = "";
let businessSearchRadiusKm = 5;
let businessSearchOpenNow = false;
let businessSearchNearMe = false;
let businessComposerOpen = false;
let pendingBusinessLogo = null;
let pendingBusinessGallery = null;
let pendingBusinessLocation = null;
let currentView = "chats";
let appAdminUsers = [];
let appAdminFilteredUsers = [];
let appAdminSelectedPhone = "";
let appAdminBusinesses = [];
let appAdminReports = [];
let friendRequests = [];
let serverCallHistory = [];
let localStream = null;
let callStartedAt = null;
let callTimerId = null;
let activeCallMode = "voice";
let qrScanStream = null;
let qrScanFrameId = null;
let qrScanLocked = false;
let pendingAvatarData = "";
let pendingJournalImage = null;
let pendingOtp = null;
let pendingOtpPhone = "";
let pendingOtpEmail = "";
let pendingOtpExpiresAt = 0;
let pendingOtpPurpose = "";
let authMode = "login";
let deviceCryptoKeyPromise = null;
let serverSyncTimer = null;
let serverSyncInFlight = false;
let serverSyncPrimed = false;
let renderedConversationPhone = "";
let forceConversationScrollBottom = true;
let activeServerCallId = "";
let activeCallDirection = "outgoing";
let activeCallPeerPhone = "";
let answeringCallId = "";
let peerConnection = null;
let remoteStream = null;
let handledSignalIds = new Set();
let pendingIceCandidates = [];
let rtcConfigCache = null;
let callSyncTimerId = null;
let ringtoneContext = null;
let ringtoneTimerId = null;
let ringtoneActive = false;
let ringtoneAudio = null;
let ringbackTimerId = null;
let ringbackActive = false;
let callAudioUnlocked = false;
let messageAudioContext = null;
let callMicEnabled = true;
let callCameraEnabled = true;
let callSpeakerEnabled = false;
let pushListenersBound = false;
let pushRegistrationInFlight = false;
let lastAiSuggestion = "";
let lastAiOpener = "";
let lastAiReplies = [];
let currentLanguage = "vi";
let currentUiTheme = loadUiTheme();
let birthDateControlsBound = false;
let messageLongPressTimer = null;
let messageLongPressTarget = null;
let globalBackSwipeStart = null;
let lastGlobalBackSwipeAt = 0;
let chatRowSwipe = null;
let suppressNextChatClick = false;

const translations = {
  vi: {
    loginTitle: "Đăng nhập",
    forgotTitle: "Quên mật khẩu",
    authSecureAccount: "Tài khoản bảo mật",
    loginTab: "Đăng nhập",
    forgotTab: "Quên mật khẩu",
    phone: "Số điện thoại",
    phonePlaceholder: "Ví dụ: 090 123 4567",
    emailOtp: "Email nhận OTP",
    displayName: "Tên hiển thị",
    displayNamePlaceholder: "Tên của bạn",
    password: "Mật khẩu",
    newPassword: "Mật khẩu mới",
    passwordPlaceholder: "Nhập mật khẩu",
    confirmPassword: "Nhập lại mật khẩu",
    confirmPasswordPlaceholder: "Nhập lại mật khẩu",
    otpCode: "Mã OTP",
    otpPlaceholder: "Nhập 6 số OTP",
    loginSubmit: "Đăng nhập",
    forgotSubmit: "Gửi OTP khôi phục",
    resendOtp: "Gửi lại mã",
    authLoginStatus: "Đăng nhập bằng số điện thoại và mật khẩu được Admin XPAY cấp sau khi kích hoạt gói dịch vụ.",
    authForgotStatus: "Nhập số điện thoại, email nhận OTP và mật khẩu mới để lấy lại quyền đăng nhập XPAY Chat.",
    otpEmailNotice: "OTP email sẽ được gửi duy nhất từ Email: admin@gatewayxpay.com",
    privacyPolicy: "Chính sách quyền riêng tư",
    heroLead: "Trò chuyện, gọi video, nhật ký và kết nối quanh đây trong một trải nghiệm số được thiết kế cho thời đại AI.",
    otpSecurity: "Bảo mật OTP",
    nearbySearch: "Tìm quanh đây",
    activeNow: "Đang hoạt động",
    theme: "Giao diện",
    friends: "Bạn bè",
    scanQr: "Quét QR",
    profile: "Cá nhân",
    callsShortcut: "Cuộc gọi",
    appAdmin: "Quản trị",
    searchPlaceholder: "Tìm bạn bè, tin nhắn, doanh nghiệp",
    chats: "Tin nhắn",
    nearby: "Quanh đây",
    journal: "Nhật ký",
    turnOnNearby: "Bật quanh đây",
    locationStatus: "Bật vị trí để tìm tài khoản XPAY Chat gần bạn",
    journalPlaceholder: "Bạn đang nghĩ gì?",
    journalPublic: "Công khai",
    journalFriends: "Bạn bè",
    journalPrivate: "Chỉ mình tôi",
    image: "Ảnh",
    postJournal: "Đăng nhật ký",
    aiAssistantPrivate: "Trợ lý riêng",
    aiAutoReply: "Tự trả lời chào hỏi",
    aiRules: "Quy tắc riêng cho XPAY AI",
    saveRules: "Lưu quy tắc",
    schedule: "Lịch hẹn",
    tasks: "Công việc",
    weekend: "Cuối tuần",
    backToChats: "Quay lại danh sách chat",
    e2eeOn: "Đang bật mã hoá đầu cuối",
    messagePlaceholder: "Nhập tin nhắn...",
    profileTitle: "Thông tin người dùng",
    changeAvatar: "Đổi avatar",
    fullName: "Họ và tên",
    fullNamePlaceholder: "Nhập họ và tên",
    accountEmail: "Email tài khoản",
    emailReadonlyNote: "Email dùng để nhận OTP và không thể đổi trong hồ sơ cá nhân.",
    birthDate: "Ngày tháng năm sinh",
    interests: "Sở thích",
    interestsPlaceholder: "Ví dụ: công nghệ, du lịch, âm nhạc...",
    privacyTitle: "Hiển thị thông tin cho người khác",
    privacyNote: "Những mục bật sẽ được chia sẻ qua mã QR kết bạn.",
    saveProfile: "Lưu hồ sơ",
    profileStatusLocal: "Thông tin hồ sơ sẽ được cập nhật sau khi lưu.",
    profileStatusServer: "Thông tin hồ sơ sẽ được cập nhật sau khi lưu.",
    settingsSetup: "Thiết lập",
    settingsTitle: "Cài đặt",
    statusTitle: "Trạng thái",
    statusDesc: "Hiển thị online/offline và quyền chia sẻ khoảng cách",
    onlineDesc: "Online - cho bạn bè biết bạn đang hoạt động",
    offlineDesc: "Offline - ẩn trạng thái và khoảng cách",
    notifications: "Thông báo",
    notificationsDesc: "Thông báo khi tắt màn hình, âm báo, rung và dấu hiệu tin mới",
    pushNotifications: "Thông báo ngoài màn hình cho tin nhắn và cuộc gọi",
    msgSound: "Âm báo khi có tin nhắn mới",
    msgVibration: "Rung khi có tin nhắn mới",
    unreadHighlight: "Làm sáng hội thoại chưa đọc",
    messagesTitle: "Tin nhắn",
    messagesDesc: "Quản lý trạng thái đã đọc",
    markReadOnOpen: "Tự đánh dấu đã đọc khi mở hội thoại",
    markAllRead: "Đánh dấu tất cả đã đọc",
    callsTitle: "Cuộc gọi",
    callsDesc: "Âm chuông, rung và âm chờ",
    callRingtone: "Đổ chuông khi có cuộc gọi đến",
    callVibration: "Rung khi có cuộc gọi đến",
    callRingback: "Phát âm chờ khi gọi đi",
    aiDesc: "Trợ lý cá nhân theo quy tắc của chủ tài khoản",
    aiAutoReplySimple: "Tự trả lời các lời chào hỏi đơn giản",
    openAi: "Mở XPAY AI",
    accountPrivacyTitle: "Tài khoản và quyền riêng tư",
    accountPrivacyDesc: "Quản lý dữ liệu cá nhân, chính sách bảo mật và xoá tài khoản",
    viewPrivacyPolicy: "Xem chính sách quyền riêng tư",
    deleteAccount: "Xoá tài khoản",
    deleteAccountProfileDesc: "Yêu cầu xoá tài khoản vĩnh viễn khỏi XPAY Chat.",
    deleteAccountSecurity: "Bảo mật tài khoản",
    deleteAccountTitle: "Xoá tài khoản XPAY Chat",
    deleteAccountWarningTitle: "Thao tác này không thể hoàn tác",
    deleteAccountWarning: "Tài khoản, hồ sơ, bạn bè, tin nhắn, cuộc gọi và nhật ký liên quan sẽ được xoá khỏi hệ thống.",
    currentPassword: "Mật khẩu hiện tại",
    deleteConfirmLabel: "Gõ DELETE để xác nhận",
    deleteForever: "Xoá vĩnh viễn tài khoản",
    deleteAccountStatus: "Chỉ chủ tài khoản đã đăng nhập mới có thể thực hiện thao tác này.",
    deleteAccountConfirmError: "Vui lòng gõ DELETE để xác nhận xoá tài khoản.",
    deleteAccountWorking: "Đang xoá tài khoản...",
    deleteAccountDone: "Tài khoản đã được xoá khỏi hệ thống.",
    settingsStatus: "Các thay đổi sẽ được áp dụng ngay.",
    settingsSaved: "Đã lưu cài đặt.",
    day: "Ngày",
    month: "Tháng",
    year: "Năm"
  }
};

const uiThemes = [
  {
    id: "default",
    title: "Mặc định XPAY Chat",
    description: "Xanh công nghệ, gọn và dễ nhìn.",
    primary: "#00a884",
    secondary: "#0e7490",
    surface: "#ffffff",
    background: "#f8fafc"
  },
  {
    id: "women",
    title: "Quốc tế phụ nữ 8/3",
    description: "Hồng hiện đại, mềm và sáng.",
    primary: "#ec4899",
    secondary: "#7c3aed",
    surface: "#fff7fb",
    background: "#fdf2f8"
  },
  {
    id: "teacher",
    title: "Nhà giáo Việt Nam 20/11",
    description: "Xanh tri thức, điểm vàng ấm.",
    primary: "#2563eb",
    secondary: "#d97706",
    surface: "#f8fbff",
    background: "#eff6ff"
  },
  {
    id: "earth",
    title: "Ngày Trái Đất",
    description: "Xanh thiên nhiên, thân thiện.",
    primary: "#16a34a",
    secondary: "#0284c7",
    surface: "#f7fff9",
    background: "#ecfdf5"
  },
  {
    id: "peace",
    title: "Ngày Hòa bình thế giới",
    description: "Xanh trời, tím nhẹ toàn cầu.",
    primary: "#0ea5e9",
    secondary: "#8b5cf6",
    surface: "#f8fbff",
    background: "#f0f9ff"
  },
  {
    id: "tet",
    title: "Tết Việt Nam",
    description: "Đỏ lễ hội, vàng may mắn.",
    primary: "#dc2626",
    secondary: "#f59e0b",
    surface: "#fff8f1",
    background: "#fff7ed"
  },
  {
    id: "superhero",
    title: "Siêu nhân",
    description: "Mạnh mẽ, tốc độ và năng lượng cao.",
    primary: "#e11d48",
    secondary: "#2563eb",
    surface: "#fff9fb",
    background: "#f8fbff"
  },
  {
    id: "business",
    title: "Business",
    description: "Chuyên nghiệp, sang và tập trung.",
    primary: "#0f766e",
    secondary: "#334155",
    surface: "#f8fafc",
    background: "#eef6f4"
  },
  {
    id: "mystic",
    title: "Huyền bí đen bóng",
    description: "Đen sâu, ánh tím lam và biểu tượng bí ẩn.",
    primary: "#8b5cf6",
    secondary: "#06b6d4",
    surface: "rgba(255,255,255,0.94)",
    background: "#050712"
  },
  {
    id: "world",
    title: "Thế giới",
    description: "Bản đồ toàn cầu, xanh đại dương.",
    primary: "#0ea5e9",
    secondary: "#22c55e",
    surface: "rgba(255,255,255,0.94)",
    background: "#eaf8ff"
  },
  {
    id: "humanity",
    title: "Con người",
    description: "Ấm áp, kết nối và gần gũi.",
    primary: "#f97316",
    secondary: "#db2777",
    surface: "rgba(255,255,255,0.94)",
    background: "#fff7ed"
  },
  {
    id: "robot",
    title: "Robot AI",
    description: "Mạch số, trí tuệ nhân tạo và tương lai.",
    primary: "#2563eb",
    secondary: "#14b8a6",
    surface: "rgba(255,255,255,0.94)",
    background: "#eef6ff"
  },
  {
    id: "apocalypse",
    title: "Ngày tận thế",
    description: "Tương phản mạnh, kịch tính và cá tính.",
    primary: "#ef4444",
    secondary: "#f59e0b",
    surface: "rgba(255,255,255,0.93)",
    background: "#160b0b"
  },
  {
    id: "cosmic-ai",
    title: "Vũ trụ AI",
    description: "Không gian sâu, mạng sao công nghệ cao.",
    primary: "#6366f1",
    secondary: "#22d3ee",
    surface: "rgba(255,255,255,0.94)",
    background: "#08111f"
  }
];

const aiStopWords = new Set([
  "ban", "minh", "toi", "anh", "chi", "em", "voi", "cua", "cho", "dang", "duoc", "khong", "nay", "kia",
  "mình", "bạn", "tôi", "anh", "chị", "em", "với", "của", "cho", "đang", "được", "không", "này", "kia",
  "nhung", "những", "cac", "các", "mot", "một", "trong", "tren", "trên", "nexa", "xpaychat", "tin", "nhắn"
]);

document.addEventListener("click", (event) => {
  const button = event.target.closest("#aiTwinBtn, #closeAiPanelBtn, #refreshAiBtn, #useAiSuggestionBtn, #useAiOpenerBtn, .ai-reply-btn");
  if (!button) return;

  event.preventDefault();
  if (button.id === "aiTwinBtn") openAiPanel();
  if (button.id === "closeAiPanelBtn") closeAiPanel();
  if (button.id === "refreshAiBtn") renderAiTwinPanel();
  if (button.id === "useAiSuggestionBtn") useAiText(lastAiSuggestion);
  if (button.id === "useAiOpenerBtn") useAiText(lastAiOpener);
  if (button.classList.contains("ai-reply-btn")) {
    useAiText(lastAiReplies[Number(button.dataset.aiReply || 0)] || "");
  }
});

function isQuotaError(error) {
  return error?.name === "QuotaExceededError" || error?.code === 22 || /quota/i.test(error?.message || "");
}

function clearLargeLocalCache(exceptKey = "") {
  [chatKey, journalKey, usersKey, storageKey].forEach((key) => {
    if (key !== exceptKey) {
      try {
        localStorage.removeItem(key);
      } catch {}
    }
  });
}

function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    if (!isQuotaError(error)) throw error;
    try {
      localStorage.removeItem(key);
    } catch {}
    clearLargeLocalCache(key);
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }
}

function safeRemoveItem(key) {
  try {
    localStorage.removeItem(key);
  } catch {}
}

function compactUserForStorage(user) {
  const normalized = normalizeUser(user);
  return {
    ...normalized,
    avatarData: ""
  };
}

function normalizeReferral(referral = {}, user = {}) {
  const phone = normalizePhone(user.accountPhone || user.phone || "");
  const inviteLink = referral.inviteLink || `${productionOrigin}/?ref=${encodeURIComponent(phone)}`;
  const androidDownloadUrl = referral.androidDownloadUrl || "";
  const webDownloadUrl = referral.webDownloadUrl || "";
  const installGuide = Array.isArray(referral.installGuide)
    ? referral.installGuide
    : [
        "1. Mở XPAY Chat bằng trình duyệt hoặc ứng dụng chính thức.",
        "2. Chọn gói dịch vụ tại gatewayxpay.com và thanh toán QR.",
        "3. Sau khi Admin XPAY kích hoạt, dùng số điện thoại và mật khẩu được cấp để đăng nhập."
      ];
  return {
    points: Math.max(0, Number(referral.points ?? user.referralPoints ?? 0) || 0),
    inviteCode: referral.inviteCode || phone,
    inviteLink,
    androidDownloadUrl,
    webDownloadUrl,
    installGuide,
    shareText: [
      "Mời bạn tham gia XPAY Chat qua link giới thiệu của tôi:",
      inviteLink,
      "",
      "Hướng dẫn:",
      ...installGuide
    ].join("\n"),
    verifiedEligible: Boolean(referral.verifiedEligible),
    vipEligible: Boolean(referral.vipEligible)
  };
}

function hasServerSession() {
  return Boolean(localStorage.getItem(authTokenKey));
}

function isNativeRuntime() {
  return Boolean(window.Capacitor?.isNativePlatform?.()) || ["capacitor:", "ionic:"].includes(location.protocol);
}

function nativePlatform() {
  return window.Capacitor?.getPlatform?.() || (isNativeRuntime() ? "native" : "web");
}

function isServerRuntime() {
  return isNativeRuntime() || location.protocol === "https:" || location.hostname === "gatewayxpay.com";
}

function apiUrl(path = "") {
  if (apiBasePath && String(path).startsWith("/api/")) return `${apiBasePath}${path}`;
  if (isNativeRuntime() && String(path).startsWith("/api/")) return `${productionOrigin}${path}`;
  return path;
}

function isCompactLayout() {
  return isNativeRuntime() || window.matchMedia?.("(max-width: 860px)")?.matches || window.innerWidth <= 860;
}

function migrateClientStorage() {
  let previousVersion = "";
  try {
    previousVersion = localStorage.getItem(appVersionKey) || "";
  } catch {}

  if (isServerRuntime()) {
    safeRemoveItem(chatKey);
    safeRemoveItem(journalKey);
    safeRemoveItem(usersKey);
    if (!hasServerSession()) safeRemoveItem(storageKey);
  }

  if (previousVersion !== appVersion) safeSetItem(appVersionKey, appVersion);
}

async function apiRequest(path, body = {}, options = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = localStorage.getItem(authTokenKey);
  if (token && options.auth !== false) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(apiUrl(path), {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });
  } catch (error) {
    error.network = true;
    throw error;
  }

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json().catch(() => ({})) : {};
  if (!response.ok) {
    const error = new Error(data.message || "Không thể kết nối máy chủ.");
    error.status = response.status;
    error.payload = data;
    throw error;
  }
  if (!contentType.includes("application/json")) {
    throw new Error("Không nhận được dữ liệu hợp lệ từ hệ thống.");
  }
  return data;
}

function pushPlugin() {
  return window.Capacitor?.Plugins?.PushNotifications || null;
}

function pushProviderForPlatform(platform = nativePlatform()) {
  return platform === "ios" ? "apns" : "fcm";
}

function pushDeviceId() {
  let id = "";
  try {
    id = localStorage.getItem(pushDeviceIdStorageKey) || "";
  } catch {}
  if (id) return id;
  id = `device-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  safeSetItem(pushDeviceIdStorageKey, id);
  return id;
}

async function registerPushToken(tokenValue = "") {
  const token = String(tokenValue || "").trim();
  if (!token || !hasServerSession()) return;
  const platform = nativePlatform();
  safeSetItem(pushTokenStorageKey, token);
  await apiRequest("/api/push/register", {
    token,
    platform,
    provider: pushProviderForPlatform(platform),
    deviceId: pushDeviceId()
  }).catch((error) => {
    updateSettingsStatus(error.message || "Chưa đồng bộ được token thông báo.");
  });
}

async function unregisterPushToken() {
  const token = localStorage.getItem(pushTokenStorageKey) || "";
  if (!hasServerSession() || (!token && !pushDeviceId())) return;
  await apiRequest("/api/push/unregister", {
    token,
    deviceId: pushDeviceId()
  }).catch(() => undefined);
  safeRemoveItem(pushTokenStorageKey);
}

async function serverPushReadyForPlatform() {
  if (!hasServerSession()) return false;
  try {
    const data = await apiRequest("/api/push/status");
    const platform = nativePlatform();
    const push = data.push || {};
    if (!push.enabled) return false;
    return platform === "ios" ? Boolean(push.apns) : Boolean(push.fcm);
  } catch {
    return false;
  }
}

async function ensurePushChannels(plugin) {
  if (nativePlatform() !== "android" || typeof plugin?.createChannel !== "function") return;
  await Promise.allSettled([
    plugin.createChannel({
      id: "xpaychat_messages",
      name: "Tin nhắn XPAY Chat",
      description: "Thông báo khi có tin nhắn mới",
      importance: 4,
      visibility: 1,
      sound: "default",
      vibration: true
    }),
    plugin.createChannel({
      id: "xpaychat_calls",
      name: "Cuộc gọi XPAY Chat",
      description: "Thông báo khi có cuộc gọi đến",
      importance: 5,
      visibility: 1,
      sound: "default",
      vibration: true
    })
  ]);
}

function bindPushListeners(plugin) {
  if (pushListenersBound || !plugin) return;
  pushListenersBound = true;
  plugin.addListener("registration", (token) => {
    registerPushToken(token?.value || "");
  });
  plugin.addListener("registrationError", (error) => {
    updateSettingsStatus(error?.error || "Thiết bị chưa cho phép thông báo.");
  });
  plugin.addListener("pushNotificationReceived", () => {
    syncServerData();
  });
  plugin.addListener("pushNotificationActionPerformed", () => {
    syncServerData();
    currentView = "chats";
    document.querySelectorAll(".nav-tab").forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.view === "chats");
    });
    renderAll();
  });
}

async function setupPushNotifications(options = {}) {
  if (!isNativeRuntime() || !hasServerSession() || !appSettings.pushNotifications || pushRegistrationInFlight) return;
  const plugin = pushPlugin();
  if (!plugin) {
    updateSettingsStatus("Đã lưu tuỳ chọn thông báo. Bản mobile này chưa có plugin thông báo native.");
    return;
  }
  pushRegistrationInFlight = true;
  try {
    bindPushListeners(plugin);
    await ensurePushChannels(plugin);
    let permission = await plugin.checkPermissions();
    if (permission.receive === "prompt" || options.forcePermission) {
      permission = await plugin.requestPermissions();
    }
    if (permission.receive !== "granted") {
      updateSettingsStatus("Thiết bị chưa cấp quyền thông báo. Hãy bật Thông báo trong cài đặt điện thoại.");
      return;
    }
    const pushReady = await serverPushReadyForPlatform();
    if (!pushReady) {
      updateSettingsStatus("Đã lưu tuỳ chọn thông báo. Cần cấu hình Firebase/APNs trên máy chủ để nhận tin khi tắt màn hình.");
      return;
    }
    await plugin.register();
    updateSettingsStatus("Đã bật thông báo ngoài màn hình cho thiết bị này.");
  } catch (error) {
    updateSettingsStatus(error.message || "Chưa bật được thông báo ngoài màn hình.");
  } finally {
    pushRegistrationInFlight = false;
  }
}

function loadUsers() {
  const saved = localStorage.getItem(usersKey);
  if (!saved) return {};

  try {
    return JSON.parse(saved);
  } catch {
    return {};
  }
}

function saveUsers(users) {
  safeSetItem(usersKey, JSON.stringify(users));
}

function loadJournals() {
  const saved = localStorage.getItem(journalKey);
  if (!saved) return [];

  try {
    return JSON.parse(saved);
  } catch {
    return [];
  }
}

function loadBusinessProfiles() {
  const saved = localStorage.getItem(businessKey);
  if (!saved) return [];

  try {
    return JSON.parse(saved);
  } catch {
    return [];
  }
}

function saveBusinessProfiles() {
  safeSetItem(businessKey, JSON.stringify(businessProfiles));
}

function loadPeople() {
  const saved = localStorage.getItem(chatKey);
  if (!saved) return isServerRuntime() ? [] : structuredClone(samplePeople);

  try {
    return JSON.parse(saved);
  } catch {
    return isServerRuntime() ? [] : structuredClone(samplePeople);
  }
}

function defaultAiAssistantMessages() {
  return [
    {
      from: "them",
      text: "Chào bạn, mình là XPAY Twin AI Agent. Mình có thể tự lập kế hoạch, tạo việc/lịch, soạn nháp trả lời, quét an toàn và tạo nháp nhật ký trong XPAY Chat.",
      time: nowTime()
    }
  ];
}

function currentUserPhoneForStorage() {
  const phone = normalizePhone(currentUser?.accountPhone || currentUser?.phone || "");
  if (phone) return phone;
  try {
    const savedUser = JSON.parse(localStorage.getItem(storageKey) || "{}");
    return normalizePhone(savedUser.accountPhone || savedUser.phone || "");
  } catch {
    return "";
  }
}

function activeAiAssistantKey() {
  const phone = currentUserPhoneForStorage();
  return phone ? `${aiAssistantKey}.${phone}` : aiAssistantKey;
}

function activeAiAssistantResetKey() {
  const phone = currentUserPhoneForStorage();
  return phone ? `${aiAssistantResetKey}.${phone}` : aiAssistantResetKey;
}

function loadAiAssistantMessages() {
  const saved = localStorage.getItem(activeAiAssistantKey()) || localStorage.getItem(aiAssistantKey);
  if (!saved) return defaultAiAssistantMessages();

  try {
    const messages = JSON.parse(saved);
    return Array.isArray(messages) ? messages : [];
  } catch {
    return [];
  }
}

function saveAiAssistantMessages() {
  safeSetItem(activeAiAssistantKey(), JSON.stringify(aiAssistantMessages.slice(-80)));
}

function loadAiSettings() {
  const defaults = { autoReplySimple: false };
  const saved = localStorage.getItem(aiSettingsKey);
  if (!saved) return defaults;

  try {
    return { ...defaults, ...JSON.parse(saved) };
  } catch {
    return defaults;
  }
}

function saveAiSettings() {
  safeSetItem(aiSettingsKey, JSON.stringify(aiSettings));
}

function defaultAppSettings() {
  return {
    presenceMode: "online",
    pushNotifications: false,
    messageSound: true,
    messageVibration: true,
    unreadHighlight: true,
    markReadOnOpen: true,
    callRingtone: true,
    callVibration: true,
    callRingback: true
  };
}

function loadAppSettings() {
  const defaults = defaultAppSettings();
  const saved = localStorage.getItem(appSettingsKey);
  if (!saved) return defaults;

  try {
    return { ...defaults, ...JSON.parse(saved) };
  } catch {
    return defaults;
  }
}

function saveAppSettings() {
  safeSetItem(appSettingsKey, JSON.stringify(appSettings));
}

function normalizePhoneList(values = []) {
  return [...new Set((Array.isArray(values) ? values : [])
    .map((value) => normalizePhone(value))
    .filter(Boolean))];
}

function loadHiddenChatMap() {
  const saved = localStorage.getItem(hiddenChatsKey);
  if (!saved) return {};

  try {
    const parsed = JSON.parse(saved);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed)
        .map(([ownerPhone, phones]) => [normalizePhone(ownerPhone), normalizePhoneList(phones)])
        .filter(([ownerPhone]) => Boolean(ownerPhone))
    );
  } catch {
    return {};
  }
}

function saveHiddenChatMap() {
  safeSetItem(hiddenChatsKey, JSON.stringify(hiddenChatMap));
}

function loadHiddenChatMetaMap() {
  const saved = localStorage.getItem(hiddenChatMetaKey);
  if (!saved) return {};

  try {
    const parsed = JSON.parse(saved);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed)
        .map(([ownerPhone, phones]) => {
          const cleanOwner = normalizePhone(ownerPhone);
          const phoneMeta = phones && typeof phones === "object" && !Array.isArray(phones) ? phones : {};
          const normalizedPhones = Object.fromEntries(
            Object.entries(phoneMeta)
              .map(([phone, meta]) => {
                const cleanPhone = normalizePhone(phone);
                const hiddenAt = Number(meta?.hiddenAt || meta || 0);
                return cleanPhone && Number.isFinite(hiddenAt) && hiddenAt > 0
                  ? [cleanPhone, { hiddenAt }]
                  : null;
              })
              .filter(Boolean)
          );
          return cleanOwner ? [cleanOwner, normalizedPhones] : null;
        })
        .filter(Boolean)
    );
  } catch {
    return {};
  }
}

function saveHiddenChatMetaMap() {
  safeSetItem(hiddenChatMetaKey, JSON.stringify(hiddenChatMetaMap));
}

function loadUnreadState() {
  const defaults = { conversations: {} };
  const saved = localStorage.getItem(unreadStateKey);
  if (!saved) return defaults;

  try {
    const parsed = JSON.parse(saved);
    return {
      conversations: parsed && typeof parsed.conversations === "object" ? parsed.conversations : {}
    };
  } catch {
    return defaults;
  }
}

function saveUnreadState() {
  safeSetItem(unreadStateKey, JSON.stringify(unreadState));
}

function loadAiAgentState() {
  const defaults = { tasks: [], schedule: [], notes: [], lastRunAt: "" };
  const saved = localStorage.getItem(aiAgentStateKey);
  if (!saved) return defaults;

  try {
    const parsed = JSON.parse(saved);
    return {
      ...defaults,
      ...parsed,
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      schedule: Array.isArray(parsed.schedule) ? parsed.schedule : [],
      notes: Array.isArray(parsed.notes) ? parsed.notes : []
    };
  } catch {
    return defaults;
  }
}

function saveAiAgentState() {
  aiAgentState.tasks = (aiAgentState.tasks || []).slice(-80);
  aiAgentState.schedule = (aiAgentState.schedule || []).slice(-80);
  aiAgentState.notes = (aiAgentState.notes || []).slice(-80);
  safeSetItem(aiAgentStateKey, JSON.stringify(aiAgentState));
}

function defaultAiServerState() {
  return {
    rules: {
      customRules: "",
      tone: "ấm áp, rõ ràng, tôn trọng quyền riêng tư",
      allowLiveInfo: true,
      allowContext: true,
      allowAutoReply: false
    },
    reminders: []
  };
}

function loadAiServerState() {
  const defaults = defaultAiServerState();
  const saved = localStorage.getItem(aiServerStateKey);
  if (!saved) return defaults;

  try {
    const parsed = JSON.parse(saved);
    return {
      ...defaults,
      ...parsed,
      rules: { ...defaults.rules, ...(parsed.rules || {}) },
      reminders: Array.isArray(parsed.reminders) ? parsed.reminders : []
    };
  } catch {
    return defaults;
  }
}

function saveAiServerState() {
  safeSetItem(aiServerStateKey, JSON.stringify(aiServerState));
}

function applyAiServerState(ai = {}) {
  if (!ai || typeof ai !== "object") return;
  maybeResetAiAssistantHistory(ai.historyResetAt);
  const defaults = defaultAiServerState();
  aiServerState = {
    ...defaults,
    ...ai,
    rules: { ...defaults.rules, ...(ai.rules || {}) },
    reminders: Array.isArray(ai.reminders) ? ai.reminders : []
  };
  aiSettings.autoReplySimple = Boolean(aiServerState.rules.allowAutoReply);
  saveAiSettings();
  saveAiServerState();
  if (aiRulesInput && document.activeElement !== aiRulesInput) {
    aiRulesInput.value = aiServerState.rules.customRules || "";
  }
}

function maybeResetAiAssistantHistory(resetAt = "") {
  const marker = String(resetAt || "").trim();
  if (!marker) return;
  const resetKey = activeAiAssistantResetKey();
  if (localStorage.getItem(resetKey) === marker) return;
  safeRemoveItem(activeAiAssistantKey());
  safeRemoveItem(aiAssistantKey);
  aiAssistantMessages = defaultAiAssistantMessages();
  saveAiAssistantMessages();
  safeSetItem(resetKey, marker);
}

async function loadAiAccountState() {
  if (!hasServerSession()) return;
  try {
    const data = await apiRequest("/api/ai/state");
    applyAiServerState(data.ai || {});
    renderAiAssistantList();
  } catch {}
}

function loadAutoReplyIds() {
  const saved = localStorage.getItem(aiAutoReplyKey);
  if (!saved) return new Set();

  try {
    const ids = JSON.parse(saved);
    return new Set(Array.isArray(ids) ? ids : []);
  } catch {
    return new Set();
  }
}

function saveAutoReplyIds(ids) {
  safeSetItem(aiAutoReplyKey, JSON.stringify([...ids].slice(-240)));
}

function savePeople() {
  if (hasServerSession()) return;
  safeSetItem(chatKey, JSON.stringify(people));
}

function saveJournals() {
  if (hasServerSession()) return;
  safeSetItem(journalKey, JSON.stringify(journals));
}

function bytesToBase64(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}

function base64ToBytes(value) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

function getDeviceSecret() {
  let secret = localStorage.getItem(deviceKeyStorageKey);
  if (!secret) {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    secret = bytesToBase64(bytes);
    safeSetItem(deviceKeyStorageKey, secret);
  }
  return secret;
}

async function getDeviceCryptoKey() {
  if (!deviceCryptoKeyPromise) {
    const secretBytes = base64ToBytes(getDeviceSecret());
    const digest = await crypto.subtle.digest("SHA-256", secretBytes);
    deviceCryptoKeyPromise = crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, [
      "encrypt",
      "decrypt"
    ]);
  }
  return deviceCryptoKeyPromise;
}

async function encryptPayload(payload) {
  if (!crypto?.subtle) return null;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(payload));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await getDeviceCryptoKey(), encoded);
  return {
    e2ee: true,
    algorithm: "AES-GCM",
    iv: bytesToBase64(iv),
    payload: bytesToBase64(encrypted)
  };
}

async function decryptPayload(box) {
  if (!box?.e2ee) return null;
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(box.iv) },
    await getDeviceCryptoKey(),
    base64ToBytes(box.payload)
  );
  return JSON.parse(new TextDecoder().decode(decrypted));
}

function updateE2eeStatus() {
  if (!e2eeStatus) return;
  if (isAiAssistantView()) {
    e2eeStatus.textContent = "AI riêng theo tài khoản";
    return;
  }
  e2eeStatus.textContent = crypto?.subtle ? t("e2eeOn") : "Chưa hỗ trợ mã hoá";
}

function normalizePhone(phone) {
  return String(phone || "").replace(/[^\d+]/g, "");
}

function isAppAdminAccount(user = currentUser) {
  const roles = Array.isArray(user?.roles) ? user.roles : [];
  return Boolean(user?.isAppAdmin || roles.map((role) => String(role).toLowerCase()).includes("app_admin"));
}

function normalizeEmail(email = "") {
  return String(email || "").trim().toLowerCase();
}

function loadUiTheme() {
  try {
    return localStorage.getItem(uiThemeKey) || "default";
  } catch {
    return "default";
  }
}

function findUiTheme(id = "") {
  return uiThemes.find((theme) => theme.id === id) || uiThemes[0];
}

function renderThemeOptions() {
  if (!themeGrid) return;
  const activeTheme = findUiTheme(currentUiTheme);
  themeGrid.innerHTML = uiThemes
    .map(
      (theme) => `
        <button class="theme-option ${theme.id === activeTheme.id ? "active" : ""}" type="button" data-theme-id="${escapeHtml(theme.id)}">
          <span class="theme-swatch" style="--theme-primary:${escapeHtml(theme.primary)};--theme-secondary:${escapeHtml(theme.secondary)}"></span>
          <strong>${escapeHtml(theme.title)}</strong>
          <small>${escapeHtml(theme.description)}</small>
        </button>
      `
    )
    .join("");
  if (themeStatus) themeStatus.textContent = `Đang dùng: ${activeTheme.title}`;
}

function applyUiTheme(id = currentUiTheme, options = {}) {
  const theme = findUiTheme(id);
  currentUiTheme = theme.id;
  document.body.dataset.uiTheme = theme.id;
  document.documentElement.style.setProperty("--sync-primary", theme.primary);
  document.documentElement.style.setProperty("--sync-secondary", theme.secondary);
  document.documentElement.style.setProperty("--sync-surface", theme.surface);
  document.documentElement.style.setProperty("--sync-bg", theme.background);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme.primary);
  if (options.persist !== false) safeSetItem(uiThemeKey, theme.id);
  renderThemeOptions();
}

function openThemeModal() {
  renderThemeOptions();
  themeOverlay?.classList.remove("hidden");
}

function closeThemeModal() {
  themeOverlay?.classList.add("hidden");
}

function t(key) {
  return translations[currentLanguage]?.[key] || translations.vi[key] || key;
}

function setText(selector, key) {
  const element = document.querySelector(selector);
  if (element) element.textContent = t(key);
}

function setAttr(selector, attr, key) {
  const element = document.querySelector(selector);
  if (element) element.setAttribute(attr, t(key));
}

function setLabelText(inputSelector, key) {
  const input = document.querySelector(inputSelector);
  const label = input?.closest("label");
  const text = label?.querySelector("span");
  if (text) text.textContent = t(key);
}

function applyStaticLanguage() {
  currentLanguage = "vi";
  document.documentElement.lang = "vi";

  setText(".login-card > div .eyebrow", "authSecureAccount");
  setText('[data-auth-mode="login"]', "loginTab");
  setText('[data-auth-mode="forgot"]', "forgotTab");
  setText("#resendOtpBtn", "resendOtp");
  setText("#otpEmailNoticeText", "otpEmailNotice");
  setText("#privacyPolicyLink", "privacyPolicy");
  setText(".brand-panel .lead", "heroLead");
  setText(".trust-row span:nth-child(2)", "otpSecurity");
  setText(".trust-row span:nth-child(3)", "nearbySearch");
  setText('[data-quick-action="theme"] span', "theme");
  setText('[data-quick-action="friends"] span', "friends");
  setText('[data-quick-action="scan-qr"] span', "scanQr");
  setText('[data-quick-action="profile"] span', "profile");
  setText("#callShortcutBtn span", "callsShortcut");
  setText("#appAdminBtn span", "appAdmin");
  setText('[data-view="chats"]', "chats");
  setText('[data-view="nearby"]', "nearby");
  setText('[data-view="journal"]', "journal");
  setText("#locateBtn", "turnOnNearby");
  setText("#locationStatus", "locationStatus");
  setText('#journalPrivacyInput option[value="public"]', "journalPublic");
  setText('#journalPrivacyInput option[value="friends"]', "journalFriends");
  setText('#journalPrivacyInput option[value="private"]', "journalPrivate");
  setText('[data-journal-privacy="public"]', "journalPublic");
  setText('[data-journal-privacy="friends"]', "journalFriends");
  setText('[data-journal-privacy="private"]', "journalPrivate");
  setText(".journal-tools .media-picker span", "image");
  setText(".journal-composer .primary-btn", "postJournal");
  setText(".assistant-hub span", "aiAssistantPrivate");
  setText(".assistant-toggle span", "aiAutoReply");
  setText(".assistant-rules label span", "aiRules");
  setText("#saveAiRulesBtn", "saveRules");
  setText('[data-ai-assistant-prompt="schedule"]', "schedule");
  setText('[data-ai-assistant-prompt="tasks"]', "tasks");
  setText('[data-ai-assistant-prompt="weekend"]', "weekend");
  setText("#profileOverlay .friend-header h2", "profileTitle");
  setText(".avatar-upload span", "changeAvatar");
  setLabelText("#phoneInput", "phone");
  setLabelText("#emailInput", "emailOtp");
  setLabelText("#nameInput", "displayName");
  setLabelText("#passwordInput", "password");
  setLabelText("#confirmPasswordInput", "confirmPassword");
  setLabelText("#otpInput", "otpCode");
  setLabelText("#profileFullNameInput", "fullName");
  setText(".profile-readonly-field span", "accountEmail");
  setText(".profile-readonly-field small", "emailReadonlyNote");
  setText(".birth-date-field > span", "birthDate");
  setLabelText("#profileInterestsInput", "interests");
  setText(".privacy-panel strong", "privacyTitle");
  setText(".privacy-panel p", "privacyNote");
  setText("#profileForm .primary-btn", "saveProfile");
  setText(".profile-account-panel strong", "deleteAccount");
  setText(".profile-account-panel p", "deleteAccountProfileDesc");
  setText("#profileDeleteAccountBtn", "deleteAccount");
  setText("#settingsOverlay .friend-header .eyebrow", "settingsSetup");
  setText("#settingsOverlay .friend-header h2", "settingsTitle");
  setText("#settingsOverlay .settings-section:nth-child(1) .settings-title strong", "statusTitle");
  setText("#settingsOverlay .settings-section:nth-child(1) .settings-title span", "statusDesc");
  setText("#settingsOverlay .settings-section:nth-child(1) label:nth-of-type(1) span", "onlineDesc");
  setText("#settingsOverlay .settings-section:nth-child(1) label:nth-of-type(2) span", "offlineDesc");
  setText("#settingsOverlay .settings-section:nth-child(2) .settings-title strong", "notifications");
  setText("#settingsOverlay .settings-section:nth-child(2) .settings-title span", "notificationsDesc");
  setText("#settingsOverlay .settings-section:nth-child(2) label:nth-of-type(1) span", "pushNotifications");
  setText("#settingsOverlay .settings-section:nth-child(2) label:nth-of-type(2) span", "msgSound");
  setText("#settingsOverlay .settings-section:nth-child(2) label:nth-of-type(3) span", "msgVibration");
  setText("#settingsOverlay .settings-section:nth-child(2) label:nth-of-type(4) span", "unreadHighlight");
  setText("#settingsOverlay .settings-section:nth-child(3) .settings-title strong", "messagesTitle");
  setText("#settingsOverlay .settings-section:nth-child(3) .settings-title span", "messagesDesc");
  setText("#settingsOverlay .settings-section:nth-child(3) label span", "markReadOnOpen");
  setText("#markAllReadBtn", "markAllRead");
  setText("#settingsOverlay .settings-section:nth-child(4) .settings-title strong", "callsTitle");
  setText("#settingsOverlay .settings-section:nth-child(4) .settings-title span", "callsDesc");
  setText("#settingsOverlay .settings-section:nth-child(4) label:nth-of-type(1) span", "callRingtone");
  setText("#settingsOverlay .settings-section:nth-child(4) label:nth-of-type(2) span", "callVibration");
  setText("#settingsOverlay .settings-section:nth-child(4) label:nth-of-type(3) span", "callRingback");
  setText("#settingsOverlay .settings-section:nth-child(5) .settings-title span", "aiDesc");
  setText("#settingsOverlay .settings-section:nth-child(5) label span", "aiAutoReplySimple");
  setText("#openAiSettingsBtn", "openAi");
  setText("#settingsOverlay .settings-section:nth-child(6) .settings-title strong", "accountPrivacyTitle");
  setText("#settingsOverlay .settings-section:nth-child(6) .settings-title span", "accountPrivacyDesc");
  setText("#settingsOverlay .settings-section:nth-child(6) a", "viewPrivacyPolicy");
  setText("#deleteAccountBtn", "deleteAccount");
  setText("#accountDeleteOverlay .friend-header .eyebrow", "deleteAccountSecurity");
  setText("#accountDeleteOverlay .friend-header h2", "deleteAccountTitle");
  setText(".account-danger-panel .settings-title strong", "deleteAccountWarningTitle");
  setText(".account-danger-panel .settings-title span", "deleteAccountWarning");
  setLabelText("#accountDeletePasswordInput", "currentPassword");
  setLabelText("#accountDeleteConfirmInput", "deleteConfirmLabel");
  setText("#accountDeleteForm .danger-btn", "deleteForever");
  if (accountDeleteStatus && !accountDeleteOverlay?.classList.contains("hidden")) {
    accountDeleteStatus.textContent = t("deleteAccountStatus");
  }

  setAttr("#phoneInput", "placeholder", "phonePlaceholder");
  setAttr("#nameInput", "placeholder", "displayNamePlaceholder");
  setAttr("#passwordInput", "placeholder", "passwordPlaceholder");
  setAttr("#confirmPasswordInput", "placeholder", "confirmPasswordPlaceholder");
  setAttr("#otpInput", "placeholder", "otpPlaceholder");
  setAttr("#conversationSearch", "placeholder", "searchPlaceholder");
  setAttr("#journalTextInput", "placeholder", "journalPlaceholder");
  setAttr("#messageInput", "placeholder", "messagePlaceholder");
  setAttr("#profileFullNameInput", "placeholder", "fullNamePlaceholder");
  setAttr("#profileInterestsInput", "placeholder", "interestsPlaceholder");
  setAttr("#backToListBtn", "aria-label", "backToChats");
  setAttr("#accountDeleteConfirmInput", "placeholder", "deleteConfirmLabel");
}

function applyLanguage({ statusText = "" } = {}) {
  applyStaticLanguage();
  setAuthMode(authMode || "login");
  setupBirthDateControls();
  updateE2eeStatus();
  renderUserProfile();
  renderThemeOptions();
  if (settingsStatus) settingsStatus.textContent = statusText || t("settingsStatus");
}

function validEmail(email = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

function normalizePresenceMode(value = "") {
  return value === "offline" ? "offline" : "online";
}

function profileIsOnline(profile = {}) {
  if (profile.presenceMode === "offline") return false;
  if ("presenceOnline" in profile) return Boolean(profile.presenceOnline);
  return true;
}

function presenceStatusText(profile = {}) {
  return profileIsOnline(profile) ? "Online" : "Offline";
}

function samePhone(left, right) {
  return normalizePhone(left || "") === normalizePhone(right || "");
}

function padDatePart(value) {
  return String(value || "").padStart(2, "0");
}

function parseBirthDate(value = "") {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!match) return { year: "", month: "", day: "" };
  return { year: match[1], month: match[2], day: match[3] };
}

function daysInBirthMonth(year, month) {
  const numericYear = Number(year);
  const numericMonth = Number(month);
  if (!numericYear || !numericMonth) return 31;
  return new Date(numericYear, numericMonth, 0).getDate();
}

function setSelectOptions(select, placeholder, options, selectedValue = "") {
  if (!select) return;
  select.innerHTML = `<option value="">${placeholder}</option>${options
    .map(({ value, label }) => `<option value="${value}">${label}</option>`)
    .join("")}`;
  select.value = selectedValue || "";
}

function refreshBirthDayOptions(selectedDay = profileBirthDayInput?.value || "") {
  if (!profileBirthDayInput) return;
  const maxDay = daysInBirthMonth(profileBirthYearInput?.value, profileBirthMonthInput?.value);
  const normalizedDay = selectedDay && Number(selectedDay) <= maxDay ? selectedDay : "";
  const days = Array.from({ length: maxDay }, (_, index) => {
    const value = padDatePart(index + 1);
    return { value, label: `${t("day")} ${index + 1}` };
  });
  setSelectOptions(profileBirthDayInput, t("day"), days, normalizedDay);
}

function normalizedBirthDateValue() {
  const nativeValue = profileBirthInput?.value || "";
  if (nativeValue) return nativeValue;
  const year = profileBirthYearInput?.value || "";
  const month = profileBirthMonthInput?.value || "";
  const day = profileBirthDayInput?.value || "";
  return year && month && day ? `${year}-${month}-${day}` : "";
}

function syncBirthSelectsFromValue(value = "") {
  const parsed = parseBirthDate(value);
  if (profileBirthYearInput) profileBirthYearInput.value = parsed.year;
  if (profileBirthMonthInput) profileBirthMonthInput.value = parsed.month;
  refreshBirthDayOptions(parsed.day);
}

function syncBirthInputFromSelects() {
  refreshBirthDayOptions(profileBirthDayInput?.value || "");
  const year = profileBirthYearInput?.value || "";
  const month = profileBirthMonthInput?.value || "";
  const day = profileBirthDayInput?.value || "";
  if (profileBirthInput) profileBirthInput.value = year && month && day ? `${year}-${month}-${day}` : "";
}

function setupBirthDateControls() {
  if (!profileBirthInput || !profileBirthDayInput || !profileBirthMonthInput || !profileBirthYearInput) return;

  const currentYear = new Date().getFullYear();
  const selectedMonth = profileBirthMonthInput.value;
  const selectedYear = profileBirthYearInput.value;
  const months = Array.from({ length: 12 }, (_, index) => {
    const value = padDatePart(index + 1);
    return { value, label: `${t("month")} ${index + 1}` };
  });
  const years = Array.from({ length: 101 }, (_, index) => {
    const value = String(currentYear - index);
    return { value, label: value };
  });

  setSelectOptions(profileBirthMonthInput, t("month"), months, selectedMonth);
  setSelectOptions(profileBirthYearInput, t("year"), years, selectedYear);
  refreshBirthDayOptions();

  if (birthDateControlsBound) return;
  birthDateControlsBound = true;
  [profileBirthDayInput, profileBirthMonthInput, profileBirthYearInput].forEach((select) => {
    select.addEventListener("change", syncBirthInputFromSelects);
  });

  profileBirthInput.addEventListener("input", () => syncBirthSelectsFromValue(profileBirthInput.value));
  profileBirthInput.addEventListener("click", () => {
    try {
      profileBirthInput.showPicker?.();
    } catch {}
  });
}

function passwordError(password) {
  if (password.length < 8) return "Mật khẩu phải có ít nhất 8 ký tự.";
  if (!/[A-ZÀ-Ỵ]/.test(password)) return "Mật khẩu cần có tối thiểu 1 chữ viết hoa.";
  if (!/\d/.test(password)) return "Mật khẩu cần có tối thiểu 1 số.";
  if (!/[^\w\s]/.test(password)) return "Mật khẩu cần có tối thiểu 1 ký tự đặc biệt.";
  return "";
}

function normalizeLicenseInfo(license = null) {
  if (!license || typeof license !== "object") return null;
  const lifetime = Boolean(license.lifetime);
  const expiresAt = lifetime ? "" : String(license.expiresAt || "");
  let status = String(license.status || "pending").toLowerCase();
  if (status === "active" && expiresAt && new Date(expiresAt).getTime() < Date.now()) status = "expired";
  return {
    customerId: String(license.customerId || ""),
    productName: String(license.productName || "XPAY Chat"),
    planName: String(license.planName || ""),
    status,
    startsAt: String(license.startsAt || ""),
    expiresAt,
    lifetime,
    mustChangePassword: Boolean(license.mustChangePassword),
    daysRemaining: lifetime || !expiresAt
      ? null
      : Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000))
  };
}

function licenseStatusText(license = null) {
  const info = normalizeLicenseInfo(license);
  if (!info) return "Chưa có gói dịch vụ";
  if (info.status === "active") {
    if (info.lifetime) return `${info.planName || "Gói dịch vụ"} • Vĩnh viễn`;
    const expiry = info.expiresAt ? new Date(info.expiresAt).toLocaleDateString("vi-VN") : "";
    return `${info.planName || "Gói dịch vụ"} • Hết hạn ${expiry}`;
  }
  return `Gói ${info.planName || "dịch vụ"} • ${info.status}`;
}

function initials(name) {
  return name.trim().slice(0, 1).toUpperCase() || "N";
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatAiDueTime(value = "") {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit"
  }).format(date);
}

function normalizeUser(user = {}) {
  const name = user.name || user.fullName || "XPAY User";
  const privacy = user.privacy || {};
  const accountPhone = normalizePhone(user.accountPhone || user.phone || "");
  const normalizedUser = { ...user, accountPhone };
  return {
    accountPhone,
    phone: user.phone || accountPhone,
    name,
    fullName: user.fullName || name,
    email: normalizeEmail(user.email || ""),
    birthDate: user.birthDate || "",
    interests: user.interests || "",
    avatarData: user.avatarData || "",
    phoneVerified: Boolean(user.phoneVerified),
    verifiedAt: user.verifiedAt || "",
    accountBadges: normalizeAccountBadges(user.accountBadges),
    license: normalizeLicenseInfo(user.license),
    roles: Array.isArray(user.roles) ? user.roles.map((role) => String(role).toLowerCase()).filter(Boolean) : [],
    isAppAdmin: Boolean(user.isAppAdmin),
    presenceMode: normalizePresenceMode(user.presenceMode || appSettings.presenceMode),
    presenceOnline: user.presenceOnline !== false && normalizePresenceMode(user.presenceMode || appSettings.presenceMode) !== "offline",
    presenceStatus: user.presenceStatus || presenceStatusText(user),
    lastSeenAt: user.lastSeenAt || "",
    hiddenChats: normalizePhoneList(user.hiddenChats || []),
    referral: normalizeReferral(user.referral || {}, normalizedUser),
    referralPoints: Math.max(0, Number(user.referralPoints ?? user.referral?.points ?? 0) || 0),
    privacy: {
      phone: privacy.phone !== false,
      birthDate: privacy.birthDate !== false,
      interests: privacy.interests !== false,
      avatar: privacy.avatar !== false
    }
  };
}

function normalizeAccountBadges(value = {}) {
  const source = value && typeof value === "object" ? value : {};
  return {
    verified: source.verified === true || source.verifiedAccount === true || source.blueTick === true,
    vip: source.vip === true || source.vipAccount === true || source.diamond === true
  };
}

function normalizedPerson(person) {
  if (!person) {
    return {
      id: "empty",
      name: "Chưa có bạn bè",
      phone: "",
      accountPhone: "",
      birthDate: "",
      interests: "",
      avatarData: "",
      privacy: { phone: false, birthDate: false, interests: false, avatar: true },
      distance: 0,
      status: "Hãy kết bạn bằng số điện thoại hoặc mã QR",
      presenceMode: "offline",
      presenceOnline: false,
      presenceStatus: "Offline",
      lastSeenAt: "",
      accountBadges: { verified: false, vip: false },
      avatar: "N",
      color: "linear-gradient(135deg, #00a7c7, #15b97a)",
      messages: []
    };
  }

  const privacy = person.privacy || {};
  return {
    ...person,
    birthDate: person.birthDate || "",
    interests: person.interests || "",
    avatarData: person.avatarData || "",
    presenceMode: normalizePresenceMode(person.presenceMode),
    presenceOnline: profileIsOnline(person),
    presenceStatus: person.presenceStatus || presenceStatusText(person),
    lastSeenAt: person.lastSeenAt || "",
    accountBadges: normalizeAccountBadges(person.accountBadges),
    privacy: {
      phone: privacy.phone !== false,
      birthDate: privacy.birthDate !== false,
      interests: privacy.interests !== false,
      avatar: privacy.avatar !== false
    }
  };
}

function profileToPerson(profile, index = people.length) {
  const privacy = profile.privacy || {};
  const accountPhone = normalizePhone(profile.accountPhone || profile.phone || "");
  const displayName = profile.fullName || profile.name || `Bạn mới ${accountPhone.slice(-4)}`;
  const online = profileIsOnline(profile);
  const distance = online ? parseDistanceKm(profile.distanceKm) : null;
  const status = profile.isFriend === false
    ? online ? "Tài khoản quanh đây" : "Offline"
    : profile.presenceStatus || (online ? "Online" : "Offline");
  const palette = [
    "linear-gradient(135deg, #00a7c7, #15b97a)",
    "linear-gradient(135deg, #2563eb, #00a7c7)",
    "linear-gradient(135deg, #ff6b5f, #f4b740)",
    "linear-gradient(135deg, #101828, #2563eb)"
  ];

  return {
    id: `server-${accountPhone || Date.now()}`,
    accountPhone,
    name: displayName,
    phone: privacy.phone === false ? "" : profile.phone || accountPhone,
    birthDate: privacy.birthDate === false ? "" : profile.birthDate || "",
    interests: privacy.interests === false ? "" : profile.interests || "",
    avatarData: privacy.avatar === false ? "" : profile.avatarData || "",
    privacy: {
      phone: privacy.phone !== false,
      birthDate: privacy.birthDate !== false,
      interests: privacy.interests !== false,
      avatar: privacy.avatar !== false
    },
    distance,
    status,
    presenceMode: normalizePresenceMode(profile.presenceMode),
    presenceOnline: online,
    presenceStatus: profile.presenceStatus || (online ? "Online" : "Offline"),
    lastSeenAt: profile.lastSeenAt || "",
    accountBadges: normalizeAccountBadges(profile.accountBadges),
    businessContact: Boolean(profile.businessContact),
    businessName: profile.businessName || "",
    businessOwnerPhone: normalizePhone(profile.businessOwnerPhone || ""),
    businessCategory: profile.businessCategory || "",
    businessCustomerStatus: profile.businessCustomerStatus || "",
    businessCustomerStatusLabel: profile.businessCustomerStatusLabel || "",
    avatar: initials(displayName),
    color: palette[index % palette.length],
    messages: []
  };
}

function friendPhone(person) {
  return normalizePhone(person?.accountPhone || person?.phone || "");
}

function hiddenChatOwnerPhone(user = currentUser) {
  return normalizePhone(user?.accountPhone || user?.phone || "") || "local";
}

function hiddenChatListForUser(user = currentUser) {
  return normalizePhoneList(hiddenChatMap[hiddenChatOwnerPhone(user)] || []);
}

function hiddenChatSetForUser(user = currentUser) {
  return new Set(hiddenChatListForUser(user));
}

function hiddenChatMetaForOwner(ownerPhone = hiddenChatOwnerPhone()) {
  const cleanOwner = normalizePhone(ownerPhone) || "local";
  if (!hiddenChatMetaMap[cleanOwner] || typeof hiddenChatMetaMap[cleanOwner] !== "object") {
    hiddenChatMetaMap[cleanOwner] = {};
  }
  return hiddenChatMetaMap[cleanOwner];
}

function rememberHiddenChatState(phone, hidden, ownerPhone = hiddenChatOwnerPhone()) {
  const cleanPhone = normalizePhone(phone);
  if (!cleanPhone) return;
  const meta = hiddenChatMetaForOwner(ownerPhone);
  if (hidden) meta[cleanPhone] = { hiddenAt: Date.now() };
  else delete meta[cleanPhone];
  saveHiddenChatMetaMap();
}

function hiddenChatHiddenAt(phone, user = currentUser) {
  const cleanPhone = normalizePhone(phone);
  const ownerPhone = hiddenChatOwnerPhone(user);
  const meta = hiddenChatMetaForOwner(ownerPhone)[cleanPhone];
  const hiddenAt = Number(meta?.hiddenAt || 0);
  return Number.isFinite(hiddenAt) ? hiddenAt : 0;
}

function mergeServerHiddenChats(ownerPhone, serverHiddenChats = []) {
  const cleanOwner = normalizePhone(ownerPhone) || "local";
  const merged = new Set(normalizePhoneList(serverHiddenChats));
  const meta = hiddenChatMetaForOwner(cleanOwner);
  const now = Date.now();

  Object.entries(meta).forEach(([phone, entry]) => {
    const hiddenAt = Number(entry?.hiddenAt || 0);
    if (hiddenAt && now - hiddenAt <= hiddenChatSyncGraceMs) {
      merged.add(phone);
      return;
    }
    if (!merged.has(phone)) delete meta[phone];
  });

  saveHiddenChatMetaMap();
  return [...merged];
}

function shouldRevealHiddenChatFromServer(phone, serverMessages = []) {
  const cleanPhone = normalizePhone(phone);
  if (!cleanPhone || !hiddenChatSetForUser().has(cleanPhone)) return false;
  const hiddenAt = hiddenChatHiddenAt(cleanPhone);
  if (!hiddenAt) return false;

  return serverMessages.some((message) => {
    if (!message || message.from === "me" || message.deleted || message.recalled) return false;
    const createdAt = Date.parse(message.createdAt || "");
    return Number.isFinite(createdAt) && createdAt > hiddenAt + 1000;
  });
}

function isChatHidden(person) {
  const phone = friendPhone(person);
  return Boolean(phone && hiddenChatSetForUser().has(phone));
}

function setHiddenChatPhone(phone, hidden = true, options = {}) {
  const cleanPhone = normalizePhone(phone);
  if (!cleanPhone) return false;
  const ownerPhone = hiddenChatOwnerPhone();
  const current = new Set(hiddenChatListForUser());
  const beforeSize = current.size;
  if (hidden) current.add(cleanPhone);
  else current.delete(cleanPhone);
  if (current.size === beforeSize && current.has(cleanPhone) === hidden) {
    rememberHiddenChatState(cleanPhone, hidden, ownerPhone);
    return false;
  }
  hiddenChatMap[ownerPhone] = [...current];
  rememberHiddenChatState(cleanPhone, hidden, ownerPhone);
  saveHiddenChatMap();
  if (options.sync !== false && hasServerSession()) {
    apiRequest("/api/conversations/hidden/update", { hiddenChats: hiddenChatMap[ownerPhone] }).catch(() => undefined);
  }
  return true;
}

function syncHiddenChatsFromUser(user = currentUser) {
  if (!user || !Array.isArray(user.hiddenChats)) return;
  const ownerPhone = hiddenChatOwnerPhone(user);
  hiddenChatMap[ownerPhone] = mergeServerHiddenChats(ownerPhone, user.hiddenChats);
  saveHiddenChatMap();
}

function parseDistanceKm(value) {
  const distance = Number(value);
  return Number.isFinite(distance) && distance >= 0 ? distance : null;
}

function formatDistanceKm(value) {
  const distance = parseDistanceKm(value);
  if (distance === null) return "";
  if (distance < 1) return `${Math.max(1, Math.round(distance * 1000))} m`;
  return `${distance < 10 ? distance.toFixed(1) : Math.round(distance)} km`;
}

function sortPeopleByDistance(left, right) {
  const leftDistance = parseDistanceKm(left?.distance);
  const rightDistance = parseDistanceKm(right?.distance);
  if (leftDistance !== null && rightDistance !== null) return leftDistance - rightDistance;
  if (leftDistance !== null) return -1;
  if (rightDistance !== null) return 1;
  return String(left?.name || "").localeCompare(String(right?.name || ""), "vi");
}

function activeMetaText(person) {
  const distance = profileIsOnline(person) ? formatDistanceKm(person?.distance) : "";
  return [distance ? `Cách bạn ${distance}` : "", person?.status || presenceStatusText(person)].filter(Boolean).join(" • ");
}

function unreadBucket(phone) {
  const cleanPhone = normalizePhone(phone);
  if (!cleanPhone) return null;
  if (!unreadState.conversations) unreadState.conversations = {};
  if (!unreadState.conversations[cleanPhone]) unreadState.conversations[cleanPhone] = { ids: [] };
  const bucket = unreadState.conversations[cleanPhone];
  bucket.ids = Array.isArray(bucket.ids) ? bucket.ids.filter(Boolean) : [];
  return bucket;
}

function unreadCountForPerson(person) {
  if (!appSettings.unreadHighlight) return 0;
  const bucket = unreadBucket(friendPhone(person));
  return bucket ? bucket.ids.length : 0;
}

function activeConversationPhone() {
  if (isAiAssistantView()) return "";
  return friendPhone(getActivePerson({ fallback: false }));
}

function isConversationOpenForPhone(phone) {
  const cleanPhone = normalizePhone(phone);
  if (!cleanPhone || cleanPhone !== activeConversationPhone()) return false;
  return currentView === "chats" && (!isCompactLayout() || chatApp.classList.contains("conversation-open"));
}

function markConversationReadByPhone(phone, options = {}) {
  const bucket = unreadBucket(phone);
  if (!bucket || !bucket.ids.length) return false;
  bucket.ids = [];
  if (options.save !== false) saveUnreadState();
  return true;
}

function markActiveConversationRead(options = {}) {
  if (!appSettings.markReadOnOpen) return false;
  const phone = activeConversationPhone();
  if (!isConversationOpenForPhone(phone)) return false;
  return markConversationReadByPhone(phone, options);
}

function markAllConversationsRead() {
  unreadState.conversations = {};
  saveUnreadState();
  renderChats();
}

function addUnreadMessages(phone, ids = []) {
  const bucket = unreadBucket(phone);
  if (!bucket) return false;
  const existing = new Set(bucket.ids);
  ids.filter(Boolean).forEach((id) => existing.add(id));
  bucket.ids = [...existing].slice(-99);
  return true;
}

function handleIncomingMessageEvents(events = []) {
  if (!events.length) return;
  let changed = false;
  events.forEach((event) => {
    if (!event.ids?.length) return;
    if (appSettings.markReadOnOpen && isConversationOpenForPhone(event.phone)) {
      markConversationReadByPhone(event.phone, { save: false });
      return;
    }
    changed = addUnreadMessages(event.phone, event.ids) || changed;
  });
  if (changed) saveUnreadState();
  playMessageNotificationSound();
  vibrateForMessage();
}

function upsertFriend(person) {
  const cleanPhone = friendPhone(person);
  const existingIndex = people.findIndex((item) => cleanPhone && friendPhone(item) === cleanPhone);
  if (existingIndex >= 0) {
    people[existingIndex] = { ...people[existingIndex], ...person, messages: people[existingIndex].messages || person.messages };
    activeId = people[existingIndex].id;
  } else {
    people.unshift(person);
    activeId = person.id;
  }
  savePeople();
  chatApp.classList.add("conversation-open");
  forceConversationScrollBottom = true;
  renderAll();
  return person;
}

function applyServerFriends(friends = []) {
  const activePhone = friendPhone(getActivePerson({ fallback: false }));
  const existingByPhone = new Map(people.map((person) => [friendPhone(person), person]).filter(([phone]) => Boolean(phone)));
  const serverPeople = friends.map((friend, index) => {
    const serverPerson = profileToPerson(friend, index);
    const existing = existingByPhone.get(friendPhone(serverPerson));
    return {
      ...serverPerson,
      messages: existing?.messages || serverPerson.messages || []
    };
  });
  people = serverPeople;
  const stillActive = activePhone
    ? people.find((person) => friendPhone(person) === activePhone)
    : people.find((person) => person.id === activeId);
  activeId = stillActive?.id || "";
  savePeople();
}

function applyServerNearby(nearby = []) {
  nearbyPeople = nearby.map((profile, index) => ({
    ...profileToPerson(profile, people.length + index),
    isFriend: Boolean(profile.isFriend),
    status: profile.isFriend ? "Bạn bè quanh đây" : "Tài khoản quanh đây",
    distance: parseDistanceKm(profile.distanceKm)
  }));
  const nearbyByPhone = new Map(nearbyPeople.map((person) => [friendPhone(person), person]).filter(([phone]) => Boolean(phone)));
  people = people.map((person) => {
    const nearbyPerson = nearbyByPhone.get(friendPhone(person));
    const distance = parseDistanceKm(nearbyPerson?.distance);
    if (distance === null) return person;
    return {
      ...person,
      distance,
      status: nearbyPerson?.isFriend ? "Bạn bè quanh đây" : person.status
    };
  });
}

function applyServerBusinesses(businesses = []) {
  businessProfiles = businesses.map((item) => normalizeBusinessProfile(item));
  saveBusinessProfiles();
}

function applyServerBusinessInbox(items = []) {
  businessInbox = Array.isArray(items) ? items.map((item) => ({
    phone: normalizePhone(item.phone || item.customerPhone || ""),
    name: String(item.name || "Khách hàng XPAY").trim(),
    avatarData: String(item.avatarData || "").trim(),
    status: String(item.status || "new"),
    statusLabel: String(item.statusLabel || businessCustomerStatusLabel(item.status || "new")),
    lastText: String(item.lastText || "").trim(),
    updatedAt: item.updatedAt || "",
    unreadHint: Number(item.unreadHint || 0)
  })).filter((item) => item.phone) : [];
}

function requiresFirstPasswordChange(user = currentUser) {
  return Boolean(normalizeLicenseInfo(user?.license)?.mustChangePassword);
}

function openForcePasswordModal(message = "") {
  if (!forcePasswordOverlay) return;
  forceCurrentPasswordInput.value = "";
  forceNewPasswordInput.value = "";
  forceConfirmPasswordInput.value = "";
  forcePasswordStatus.textContent = message || "Mật khẩu mới cần có chữ hoa, số và ký tự đặc biệt.";
  forcePasswordOverlay.classList.remove("hidden");
  window.setTimeout(() => forceCurrentPasswordInput?.focus(), 80);
}

function closeForcePasswordModal() {
  forcePasswordOverlay?.classList.add("hidden");
}

function applyServerSession(session) {
  if (!session?.user) {
    throw new Error("Không nhận được dữ liệu tài khoản hợp lệ.");
  }
  currentUser = normalizeUser(session.user);
  if (session.token) {
    safeRemoveItem(chatKey);
    safeRemoveItem(journalKey);
    safeSetItem(authTokenKey, session.token);
  }
  if (Array.isArray(session.friends)) applyServerFriends(session.friends);
  if (Array.isArray(session.businesses)) applyServerBusinesses(session.businesses);
  if (Array.isArray(session.businessInbox)) applyServerBusinessInbox(session.businessInbox);
  if (session.ai) applyAiServerState(session.ai);
  showApp(session.user);
  if (requiresFirstPasswordChange(session.user)) {
    stopServerSync();
    openForcePasswordModal("Vui lòng đổi mật khẩu lần đầu để mở đầy đủ tính năng XPAY Chat.");
  } else {
    closeForcePasswordModal();
    startServerSync();
  }
}

function applyServerConversations(conversations = [], options = {}) {
  const shouldNotify = Boolean(options.notify);
  const previousIncomingIds = new Map(
    people.map((person) => [
      friendPhone(person),
      new Set((person.messages || []).filter((message) => message.from === "them").map((message) => message.id).filter(Boolean))
    ])
  );
  const incomingEvents = [];
  const messagesByPhone = new Map(
    conversations.map((conversation) => [normalizePhone(conversation.friendPhone || ""), conversation.messages || []])
  );
  messagesByPhone.forEach((serverMessages, phone) => {
    if (serverMessages.length && shouldRevealHiddenChatFromServer(phone, serverMessages)) {
      setHiddenChatPhone(phone, false);
    }
  });

  people = people.map((person) => {
    const cleanPhone = friendPhone(person);
    const serverMessages = messagesByPhone.get(cleanPhone);
    if (!serverMessages) return person;
    if (shouldNotify) {
      const previousIds = previousIncomingIds.get(cleanPhone) || new Set();
      const newIncomingIds = serverMessages
        .filter((message) => message.from !== "me" && !message.deleted && !message.recalled && message.id && !previousIds.has(message.id))
        .map((message) => message.id);
      if (newIncomingIds.length) incomingEvents.push({ phone: cleanPhone, ids: newIncomingIds });
    }
    return {
      ...person,
      messages: serverMessages.map((message) => ({
        from: message.from === "me" ? "me" : "them",
        text: message.text || "",
        media: message.media || null,
        time: message.time || nowTime(),
        id: message.id || `msg-${Date.now()}`,
        recalled: Boolean(message.recalled),
        recalledAt: message.recalledAt || "",
        reactions: message.reactions || { mine: "", items: [] },
        canRecall: Boolean(message.canRecall)
      }))
    };
  });
  savePeople();
  if (shouldNotify) handleIncomingMessageEvents(incomingEvents);
}

function applyServerJournals(posts = []) {
  journals = posts;
  saveJournals();
}

function callPeerToPerson(call) {
  const peerPhone = normalizePhone(call.peer?.accountPhone || call.peer?.phone || activeCallPeerPhone);
  const existing = people.find((person) => friendPhone(person) === peerPhone);
  if (existing) return normalizedPerson(existing);
  return profileToPerson(call.peer || { accountPhone: peerPhone, fullName: "XPAY User" }, people.length);
}

function applyServerCalls(calls = []) {
  serverCallHistory = Array.isArray(calls) ? calls : [];
  renderCallHistory();
  const activeCall = activeServerCallId ? calls.find((call) => call.id === activeServerCallId) : null;
  if (activeCall) {
    updateCallFromServer(activeCall);
    return;
  }

  const incoming = calls.find((call) => call.direction === "incoming" && call.status === "ringing");
  if (incoming && callOverlay.classList.contains("hidden")) {
    showServerCall(incoming);
  }
}

function callStatusLabel(call = {}) {
  if (call.status === "busy") return "Máy bận";
  if (call.status === "missed") return "Gọi nhỡ";
  if (call.status === "rejected") return "Đã từ chối";
  if (call.status === "ringing") return call.direction === "incoming" ? "Đang gọi đến" : "Đang gọi đi";
  if (call.status === "active") return "Đang diễn ra";
  return call.direction === "incoming" ? "Gọi đến" : "Gọi đi";
}

function callDirectionLabel(call = {}) {
  if (call.status === "missed") return call.direction === "incoming" ? "Gọi nhỡ đến" : "Gọi đi không nghe";
  if (call.status === "busy") return call.direction === "outgoing" ? "Gọi đi máy bận" : "Máy bận";
  return call.direction === "incoming" ? "Gọi đến" : "Gọi đi";
}

function callModeText(call = {}) {
  return call.mode === "video" ? "Video call" : "Gọi thoại";
}

function callDurationLabel(call = {}) {
  const started = new Date(call.startedAt || "").getTime();
  const ended = new Date(call.endedAt || call.updatedAt || "").getTime();
  if (!Number.isFinite(started) || !Number.isFinite(ended) || ended <= started) return "00:00";
  const totalSeconds = Math.max(0, Math.floor((ended - started) / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function renderCallHistory() {
  if (!callHistoryList) return;
  const calls = [...serverCallHistory].sort((left, right) =>
    String(right.updatedAt || right.createdAt || "").localeCompare(String(left.updatedAt || left.createdAt || ""))
  );
  if (!calls.length) {
    callHistoryList.innerHTML = `
      <div class="empty-state">
        <strong>Chưa có lịch sử cuộc gọi</strong>
        <span>Các cuộc gọi đến, gọi đi, gọi nhỡ và máy bận sẽ hiển thị tại đây.</span>
      </div>
    `;
    return;
  }
  callHistoryList.innerHTML = calls
    .map((call) => {
      const peer = call.peer || {};
      const peerName = peer.fullName || peer.name || call.peerPhone || "XPAY User";
      const time = formatDateTime(call.updatedAt || call.createdAt || "");
      const duration = callDurationLabel(call);
      return `
        <div class="call-history-row">
          <div class="call-history-icon ${escapeHtml(call.status || "ended")}">${call.mode === "video" ? "▣" : "☎"}</div>
          <div class="call-history-main">
            <strong>${escapeHtml(peerName)}</strong>
            <span>${escapeHtml(callDirectionLabel(call))} · ${escapeHtml(callModeText(call))}</span>
            <small>${escapeHtml(time || "Chưa rõ thời gian")} · Thời lượng ${escapeHtml(duration)}</small>
          </div>
          <em>${escapeHtml(callStatusLabel(call))}</em>
        </div>
      `;
    })
    .join("");
}

function openCallHistoryModal() {
  renderCallHistory();
  callHistoryOverlay?.classList.remove("hidden");
  if (hasServerSession()) syncServerData();
}

function closeCallHistoryModal() {
  callHistoryOverlay?.classList.add("hidden");
}

async function syncServerData() {
  if (!hasServerSession() || serverSyncInFlight) return;
  serverSyncInFlight = true;
  try {
    const data = await apiRequest("/api/sync");
    if (data.user) saveUser(data.user);
    if (Array.isArray(data.friends)) applyServerFriends(data.friends);
    if (Array.isArray(data.friendRequests)) friendRequests = data.friendRequests;
    if (Array.isArray(data.nearby)) applyServerNearby(data.nearby);
    if (Array.isArray(data.businesses)) applyServerBusinesses(data.businesses);
    if (Array.isArray(data.businessInbox)) applyServerBusinessInbox(data.businessInbox);
    applyServerConversations(data.conversations || [], { notify: serverSyncPrimed });
    applyServerJournals(data.posts || []);
    applyServerCalls(data.calls || []);
    if (data.ai) applyAiServerState(data.ai);
    await maybeAutoReplySimpleMessages();
    serverSyncPrimed = true;
    renderAll();
  } catch (error) {
    if (error.status === 428) {
      if (error.payload?.license && currentUser) saveUser({ ...currentUser, license: error.payload.license });
      stopServerSync();
      openForcePasswordModal(error.message || "Vui lòng đổi mật khẩu lần đầu.");
    } else if (error.status === 401 || error.status === 403) {
      safeRemoveItem(authTokenKey);
      stopServerSync();
      showAuth();
      authStatus.textContent = error.message || "Phiên đăng nhập không còn hợp lệ.";
    }
  } finally {
    serverSyncInFlight = false;
  }
}

function startServerSync() {
  stopServerSync();
  if (!hasServerSession()) return;
  serverSyncPrimed = false;
  syncServerData();
  serverSyncTimer = window.setInterval(syncServerData, 2000);
}

function stopServerSync() {
  if (serverSyncTimer) window.clearInterval(serverSyncTimer);
  serverSyncTimer = null;
  serverSyncPrimed = false;
}

function paintAvatar(element, user) {
  const label = user.fullName || user.name || "XPAY User";
  element.textContent = user.avatarData ? "" : initials(label);
  element.style.backgroundImage = user.avatarData ? `url("${user.avatarData}")` : "";
}

function avatarMarkup(person) {
  const avatarStyle = person.avatarData
    ? `background-image:url('${person.avatarData}')`
    : `background:${person.color}`;
  const label = person.avatarData ? "" : person.avatar;
  return `<div class="avatar" style="${avatarStyle}">${label}</div>`;
}

function accountBadgeMarkup(person = {}) {
  const badges = normalizeAccountBadges(person.accountBadges);
  const items = [];
  if (badges.verified) items.push(`<span class="account-badge verified" title="Tài khoản đã xác thực">✓</span>`);
  if (badges.vip) items.push(`<span class="account-badge vip" title="Tài khoản VIP">◆</span>`);
  return items.length ? `<span class="account-badges" aria-label="Phân loại tài khoản">${items.join("")}</span>` : "";
}

function closeEmojiPanel() {
  emojiPanel?.classList.add("hidden");
  emojiBtn?.setAttribute("aria-expanded", "false");
}

function toggleEmojiPanel() {
  if (!emojiPanel || !emojiBtn || emojiBtn.disabled) return;
  const isHidden = emojiPanel.classList.contains("hidden");
  emojiPanel.classList.toggle("hidden", !isHidden);
  emojiBtn.setAttribute("aria-expanded", isHidden ? "true" : "false");
}

function isComposingMessage(event = {}) {
  return isMessageComposing || event.isComposing || event.keyCode === 229;
}

function autoSizeMessageInput() {
  if (!messageInput) return;
  messageInput.style.height = "auto";
  const nextHeight = Math.max(42, Math.min(messageInput.scrollHeight || 42, 112));
  messageInput.style.height = `${nextHeight}px`;
}

function isEditableElement(element) {
  if (!element) return false;
  const tag = element.tagName;
  return element.isContentEditable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

function updateKeyboardViewportState() {
  keyboardViewportRaf = 0;
  const viewport = window.visualViewport;
  const activeEditable = isEditableElement(document.activeElement);
  let keyboardBottom = 0;

  if (viewport) {
    const hiddenHeight = window.innerHeight - viewport.height - viewport.offsetTop;
    keyboardBottom = Math.max(0, Math.round(hiddenHeight));
  }

  const shouldLift = isCompactLayout() && activeEditable && keyboardBottom > 40;
  document.documentElement.style.setProperty("--keyboard-bottom", shouldLift ? `${keyboardBottom}px` : "0px");
  document.body.classList.toggle("keyboard-open", shouldLift);
  chatApp?.classList.toggle("keyboard-open", shouldLift);

  if (!shouldLift || !chatApp?.classList.contains("conversation-open")) return;
  window.requestAnimationFrame(() => {
    if (!messageStage || !shouldKeepMessageStageAtBottom()) return;
    messageStage.scrollTop = messageStage.scrollHeight;
  });
}

function scheduleKeyboardViewportUpdate() {
  if (keyboardViewportRaf) return;
  keyboardViewportRaf = window.requestAnimationFrame(updateKeyboardViewportState);
}

function insertEmoji(emoji = "") {
  if (!emoji || messageInput.disabled) return;
  const text = `${emoji} `;
  const start = Number.isFinite(messageInput.selectionStart) ? messageInput.selectionStart : messageInput.value.length;
  const end = Number.isFinite(messageInput.selectionEnd) ? messageInput.selectionEnd : start;
  messageInput.setRangeText(text, start, end, "end");
  autoSizeMessageInput();
  messageInput.focus({ preventScroll: true });
}

function displayNameWithBadges(person = {}) {
  return `${escapeHtml(person.name || "XPAY User")}${accountBadgeMarkup(person)}`;
}

function saveUser(user) {
  currentUser = normalizeUser(user);
  syncHiddenChatsFromUser(currentUser);
  appSettings.presenceMode = currentUser.presenceMode;
  saveAppSettings();
  safeSetItem(storageKey, JSON.stringify(compactUserForStorage(currentUser)));
  renderUserProfile();
}

function renderUserProfile() {
  if (!currentUser) return;
  myName.innerHTML = `${escapeHtml(currentUser.fullName || currentUser.name)}${accountBadgeMarkup(currentUser)}`;
  myPhone.textContent = `${currentUser.phone} • ${licenseStatusText(currentUser.license)} • ${presenceStatusText(currentUser)}`;
  paintAvatar(myAvatar, currentUser);
  const appAdminEnabled = isAppAdminAccount(currentUser);
  appAdminBtn?.classList.toggle("hidden", !appAdminEnabled);
  callShortcutBtn?.classList.toggle("hidden", appAdminEnabled);
  quickActions?.classList.toggle("has-app-admin", appAdminEnabled);
  renderReferralPanel();
}

function showApp(user) {
  currentUser = normalizeUser(user);
  syncHiddenChatsFromUser(currentUser);
  appSettings.presenceMode = currentUser.presenceMode;
  saveAppSettings();
  safeSetItem(storageKey, JSON.stringify(compactUserForStorage(currentUser)));
  authScreen.classList.add("hidden");
  chatApp.classList.remove("hidden");
  chatApp.classList.remove("conversation-open");
  renderUserProfile();
  renderAll();
  setupPushNotifications().catch(() => undefined);
}

function showAuth() {
  currentUser = null;
  stopServerSync();
  closeForcePasswordModal();
  authScreen.classList.remove("hidden");
  chatApp.classList.add("hidden");
}

function getActivePerson(options = {}) {
  const exact = people.find((person) => person.id === activeId);
  if (exact) return exact;
  return options.fallback === false ? null : people[0];
}

function findPersonByPhone(phone = "") {
  const cleanPhone = normalizePhone(phone || "");
  if (!cleanPhone) return null;
  return people.find((person) => friendPhone(person) === cleanPhone || normalizePhone(person.phone) === cleanPhone) || null;
}

function findPersonByIdOrPhone(id = "", phone = "", options = {}) {
  const cleanId = String(id || "");
  const cleanPhone = normalizePhone(phone || cleanId);
  const byPhone = cleanPhone ? findPersonByPhone(cleanPhone) : null;
  const byId = people.find((person) => person.id === cleanId) || null;
  return options.preferPhone ? byPhone || byId : byId || byPhone;
}

function isAiAssistantView() {
  return currentView === "ai";
}

function renderAll() {
  markActiveConversationRead({ save: true });
  renderChats();
  renderNearby();
  renderBusinesses();
  renderJournals();
  renderAiAssistantList();
  renderConversation();
  renderAiTwinPanel();
  updateE2eeStatus();
}

function setConversationControls(enabled, options = {}) {
  const assistant = Boolean(options.assistant);
  messageInput.disabled = !enabled;
  attachMediaBtn.disabled = !enabled || assistant;
  sendLocationBtn.disabled = !enabled || assistant;
  if (emojiBtn) emojiBtn.disabled = !enabled;
  if (!enabled) closeEmojiPanel();
  voiceCallBtn.disabled = !enabled || assistant;
  videoCallBtn.disabled = !enabled || assistant;
  friendInfoBtn.disabled = !enabled || assistant;
  if (clearConversationBtn) {
    clearConversationBtn.disabled = !enabled || assistant;
    clearConversationBtn.classList.toggle("hidden", !enabled || assistant);
  }
  aiTwinBtn.disabled = !enabled || assistant;
  messageInput.placeholder = assistant ? "Chat với XPAY Twin AI..." : enabled ? "Nhập tin nhắn..." : "Kết bạn để bắt đầu nhắn tin";
}

function renderChats() {
  const hiddenChats = hiddenChatSetForUser();
  const keyword = currentFilter.trim();
  const filtered = people.filter((person) => {
    const cleanPhone = friendPhone(person);
    if (cleanPhone && hiddenChats.has(cleanPhone)) return false;
    const haystack = `${person.name} ${person.phone}`.toLowerCase();
    return haystack.includes(currentFilter.toLowerCase());
  });
  const businessMatches = keyword ? searchBusinessProfiles(keyword).slice(0, 4) : [];

  if (!filtered.length && !businessMatches.length) {
    chatList.innerHTML = `
      <div class="empty-state">
        <strong>Chưa có hội thoại</strong>
        <span>Vào Bạn bè để mở cuộc trò chuyện, hoặc thêm bạn bằng số điện thoại.</span>
      </div>
      <button class="secondary-btn native-refresh-btn" type="button" data-refresh-chats>Làm mới</button>
    `;
    return;
  }

  const chatRows = filtered
    .map((person) => {
      const last = person.messages.filter((message) => !message.deleted).at(-1);
      const unreadCount = unreadCountForPerson(person);
      const preview = last?.recalled
        ? "Tin nhắn đã được thu hồi"
        : last?.e2ee
          ? "Tin nhắn đã mã hoá"
          : last?.text || "Bắt đầu cuộc trò chuyện";
      return `
        <div class="chat-row-shell" data-chat-shell="${person.id}">
          <button class="chat-row ${person.id === activeId ? "active" : ""} ${unreadCount ? "unread" : ""}" data-id="${person.id}">
            ${avatarMarkup(normalizedPerson(person))}
            <div class="row-main">
              <div class="row-top">
                <strong>${displayNameWithBadges(person)}</strong>
                <span class="row-meta">
                  <span>${last?.time || ""}</span>
                  ${unreadCount ? `<span class="unread-badge">${unreadCount > 99 ? "99+" : unreadCount}</span>` : ""}
                </span>
              </div>
              <p>${escapeHtml(preview)}</p>
            </div>
          </button>
          <button class="chat-row-delete" type="button" data-delete-chat-id="${person.id}" aria-label="Xoá đoạn chat với ${escapeHtml(person.name || "người này")}">
            <span>Xoá</span>
          </button>
        </div>
      `;
    })
    .join("");
  const businessRows = businessMatches.length
    ? `
      <section class="global-business-results">
        <div class="business-section-title compact">
          <strong>Doanh nghiệp phù hợp</strong>
          <span>${businessMatches.length} kết quả</span>
        </div>
        ${businessMatches.map((business) => renderBusinessCard(business, { compact: true })).join("")}
      </section>
    `
    : "";
  chatList.innerHTML = `${chatRows}${businessRows}`;
}

function renderNearby() {
  const friendPhones = new Set(people.map(friendPhone).filter(Boolean));
  const nearbyRows = nearbyPeople
    .filter((person) => !friendPhones.has(friendPhone(person)))
    .sort(sortPeopleByDistance);
  const friendRows = [...people].sort(sortPeopleByDistance);
  const sorted = nearbyRows.length ? [...nearbyRows, ...friendRows] : friendRows;
  if (!sorted.length) {
    peopleNearby.innerHTML = `
      <div class="empty-state">
        <strong>Chưa có tài khoản quanh đây</strong>
        <span>Bật định vị để tìm người dùng XPAY Chat gần bạn hoặc kết bạn bằng số điện thoại.</span>
      </div>
    `;
    return;
  }

  peopleNearby.innerHTML = sorted
    .map(
      (person) => {
        const normalized = normalizedPerson(person);
        const phone = friendPhone(normalized);
        const isNearbyCandidate = !friendPhones.has(phone) && person.isFriend === false;
        const phoneLabel = normalized.privacy.phone && normalized.phone ? ` • ${normalized.phone}` : "";
        const distanceLabel = formatDistanceKm(normalized.distance);
        const action = isNearbyCandidate ? `<span class="nearby-action">Kết bạn</span>` : "";
        return `
        <button class="person-row" ${isNearbyCandidate ? `data-nearby-phone="${phone}"` : `data-id="${person.id}"`}>
          ${avatarMarkup(normalized)}
          <div class="row-main">
            <div class="row-top">
              <strong>${displayNameWithBadges(normalized)}</strong>
              ${distanceLabel ? `<span class="distance">${escapeHtml(distanceLabel)}</span>` : ""}
            </div>
            <p>${escapeHtml(person.status)}${escapeHtml(phoneLabel)}</p>
          </div>
          ${action}
        </button>
      `;
      }
    )
    .join("");
}

function normalizeBusinessProfile(profile = {}) {
  const ownerPhone = normalizePhone(profile.ownerPhone || profile.phone || "");
  const status = profile.status === "published" ? "approved" : profile.status || "pending";
  return {
    id: profile.id || ownerPhone || `business-${Date.now()}`,
    ownerPhone,
    ownerName: profile.ownerName || "",
    name: String(profile.name || profile.businessName || "").trim(),
    category: String(profile.category || "Dịch vụ").trim(),
    description: String(profile.description || "").trim(),
    address: String(profile.address || "").trim(),
    phone: String(profile.phone || ownerPhone || "").trim(),
    website: String(profile.website || "").trim(),
    offer: String(profile.offer || "").trim(),
    services: String(profile.services || profile.products || "").trim(),
    keywords: String(profile.keywords || "").trim(),
    hours: {
      open: String(profile.hours?.open || "").trim(),
      close: String(profile.hours?.close || "").trim(),
      note: String(profile.hours?.note || "").trim()
    },
    openNow: profile.openNow,
    delivery: Boolean(profile.delivery),
    booking: Boolean(profile.booking),
    serviceRadiusKm: Number(profile.serviceRadiusKm || 0),
    latitude: Number.isFinite(Number(profile.latitude)) ? Number(profile.latitude) : null,
    longitude: Number.isFinite(Number(profile.longitude)) ? Number(profile.longitude) : null,
    distanceKm: Number.isFinite(Number(profile.distanceKm)) ? Number(profile.distanceKm) : null,
    distanceText: String(profile.distanceText || "").trim(),
    logoData: String(profile.logoData || profile.logo?.data || "").trim(),
    logo: profile.logo || null,
    gallery: Array.isArray(profile.gallery) ? profile.gallery.filter((item) => item?.data).slice(0, 5) : [],
    verified: Boolean(profile.verified),
    status,
    statusLabel: profile.statusLabel || businessStatusLabel(status),
    reviewNote: String(profile.reviewNote || "").trim(),
    termsAcceptedAt: profile.termsAcceptedAt || "",
    isMine: Boolean(profile.isMine || samePhone(ownerPhone, currentUser?.phone || "")),
    updatedAt: profile.updatedAt || ""
  };
}

function businessStatusLabel(status = "") {
  return {
    pending: "Chờ duyệt",
    approved: "Đã duyệt",
    needs_changes: "Cần bổ sung",
    restricted: "Bị hạn chế",
    locked: "Bị khoá",
    rejected: "Từ chối",
    hidden: "Ẩn"
  }[status] || "Chờ duyệt";
}

function businessCustomerStatusLabel(status = "") {
  return {
    new: "Khách mới",
    handling: "Đang xử lý",
    quoted: "Đã báo giá",
    booked: "Đã đặt lịch",
    done: "Hoàn tất",
    blocked: "Không phù hợp"
  }[status] || "Khách mới";
}

function myBusinessProfile() {
  return businessProfiles.find((item) => item.isMine || samePhone(item.ownerPhone, currentUser?.phone || "")) || null;
}

function businessLogoMarkup(business = {}) {
  const logoData = business.logoData || business.logo?.data || "";
  if (logoData) {
    return `<div class="business-logo has-image"><img src="${escapeHtml(logoData)}" alt="${escapeHtml(business.name || "Logo doanh nghiệp")}" /></div>`;
  }
  return `<div class="business-logo">${escapeHtml(initials(business.name || business.ownerName || "DN"))}</div>`;
}

function businessGalleryMarkup(gallery = []) {
  const images = gallery.filter((item) => item?.data).slice(0, 5);
  if (!images.length) return "";
  return `
    <div class="business-gallery">
      ${images.map((image, index) => `<img src="${escapeHtml(image.data)}" alt="${escapeHtml(image.name || `Ảnh doanh nghiệp ${index + 1}`)}" />`).join("")}
    </div>
  `;
}

function businessMetaMarkup(business = {}) {
  const items = [];
  if (business.distanceText) items.push(business.distanceText);
  if (business.openNow === true) items.push("Đang mở cửa");
  if (business.openNow === false) items.push("Có giờ mở cửa");
  if (business.delivery) items.push("Có giao hàng");
  if (business.booking) items.push("Nhận đặt lịch");
  if (business.serviceRadiusKm) items.push(`Phục vụ ${business.serviceRadiusKm}km`);
  return items.length ? `<div class="business-meta-row">${items.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>` : "";
}

function businessSearchText(profile = {}) {
  const business = normalizeBusinessProfile(profile);
  return normalizeAiPlain([
    business.name,
    business.category,
    business.description,
    business.services,
    business.keywords,
    business.address,
    business.phone,
    business.website,
    business.offer,
    business.ownerName
  ].join(" "));
}

function searchBusinessProfiles(query = "", source = businessProfiles) {
  const keyword = normalizeAiPlain(query);
  if (!keyword) return source.map((item) => normalizeBusinessProfile(item));
  const words = keyword.split(/\s+/).filter(Boolean);
  return source
    .map((item) => {
      const business = normalizeBusinessProfile(item);
      const haystack = businessSearchText(business);
      const name = normalizeAiPlain(business.name);
      const category = normalizeAiPlain(business.category);
      const score =
        (name.includes(keyword) ? 80 : 0) +
        (category.includes(keyword) ? 56 : 0) +
        (normalizeAiPlain(business.services).includes(keyword) ? 64 : 0) +
        (haystack.includes(keyword) ? 28 : 0) +
        words.reduce((total, word) => total + (haystack.includes(word) ? 8 : 0), 0) +
        (business.status === "approved" ? 4 : 0);
      return { business, score };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || String(right.business.updatedAt || "").localeCompare(String(left.business.updatedAt || "")))
    .map((item) => item.business);
}

function businessQuickFilters(profiles = []) {
  const seeds = ["Ăn uống", "Làm đẹp", "Sửa chữa", "Giáo dục", "Công nghệ", "Bất động sản", "Khuyến mãi"];
  const categories = profiles
    .map((item) => normalizeBusinessProfile(item).category)
    .filter(Boolean)
    .filter((value, index, list) => list.findIndex((item) => normalizeAiPlain(item) === normalizeAiPlain(value)) === index)
    .slice(0, 5);
  return [...new Set([...categories, ...seeds])].slice(0, 10);
}

function renderBusinessCard(profile = {}, options = {}) {
  const business = normalizeBusinessProfile(profile);
  const badge = `<span class="business-badge ${business.status === "approved" ? "" : "soft"}">${escapeHtml(business.statusLabel)}</span>`;
  const contact = [business.address, business.phone].filter(Boolean).join(" • ");
  const website = business.website ? `<a href="${escapeHtml(business.website)}" target="_blank" rel="noopener">${escapeHtml(business.website)}</a>` : "";
  return `
    <article class="business-card ${business.isMine ? "mine" : ""} ${options.compact ? "compact" : ""}">
      <header>
        ${businessLogoMarkup(business)}
        <div>
          <strong>${escapeHtml(business.name || "Doanh nghiệp XPAY")}</strong>
          <span>${escapeHtml(business.category || "Dịch vụ")}</span>
        </div>
        ${badge}
      </header>
      ${business.description ? `<p>${escapeHtml(business.description)}</p>` : ""}
      ${business.services ? `<small>Dịch vụ/sản phẩm: ${escapeHtml(business.services)}</small>` : ""}
      ${businessMetaMarkup(business)}
      ${business.offer ? `<div class="business-offer">${escapeHtml(business.offer)}</div>` : ""}
      ${businessGalleryMarkup(business.gallery)}
      ${business.reviewNote ? `<small>Lưu ý admin: ${escapeHtml(business.reviewNote)}</small>` : ""}
      ${contact ? `<small>${escapeHtml(contact)}</small>` : ""}
      ${website}
      ${business.ownerName ? `<em>Đăng bởi ${escapeHtml(business.ownerName)}</em>` : ""}
      ${
        !business.isMine && business.status === "approved"
          ? `<div class="business-actions">
              <button type="button" data-business-contact="${escapeHtml(business.ownerPhone)}">Nhắn tin</button>
              ${business.booking ? `<button type="button" data-business-contact="${escapeHtml(business.ownerPhone)}" data-business-template="booking">Đặt lịch</button>` : ""}
              ${business.phone ? `<a href="tel:${escapeHtml(business.phone)}">Gọi</a>` : ""}
              ${business.latitude !== null && business.longitude !== null ? `<a target="_blank" rel="noopener" href="https://www.google.com/maps?q=${encodeURIComponent(`${business.latitude},${business.longitude}`)}">Chỉ đường</a>` : ""}
              <button type="button" data-business-report="${escapeHtml(business.ownerPhone)}" data-business-name="${escapeHtml(business.name)}">Báo cáo</button>
            </div>`
          : ""
      }
    </article>
  `;
}

function renderBusinessInboxPanel(mine) {
  if (!mine) return "";
  const rows = businessInbox.length
    ? businessInbox.map((item) => {
        const person = people.find((entry) => samePhone(friendPhone(entry), item.phone));
        const personId = person?.id || "";
        return `
          <article class="business-customer-card">
            <div>
              <strong>${escapeHtml(item.name)}</strong>
              <span>${escapeHtml(item.statusLabel || businessCustomerStatusLabel(item.status))}</span>
              ${item.lastText ? `<small>${escapeHtml(item.lastText)}</small>` : ""}
            </div>
            <select data-business-customer-status="${escapeHtml(item.phone)}">
              ${["new", "handling", "quoted", "booked", "done", "blocked"].map((status) => `<option value="${status}" ${item.status === status ? "selected" : ""}>${businessCustomerStatusLabel(status)}</option>`).join("")}
            </select>
            <button type="button" data-business-open-chat="${escapeHtml(item.phone)}" ${personId ? "" : "disabled"}>Mở chat</button>
          </article>
        `;
      }).join("")
    : `<div class="empty-state"><strong>Chưa có khách liên hệ</strong><span>Khi khách bấm nhắn tin doanh nghiệp, họ sẽ xuất hiện tại đây để bạn chăm sóc.</span></div>`;
  return `
    <section class="business-owner-panel">
      <div class="business-section-title">
        <strong>Quản lý khách hàng</strong>
        <span>${businessInbox.length} cuộc liên hệ</span>
      </div>
      <div class="business-owner-tools">
        <button type="button" data-business-quick-reply="price">Mẫu báo giá</button>
        <button type="button" data-business-quick-reply="hours">Mẫu giờ mở cửa</button>
        <button type="button" data-business-quick-reply="booking">Mẫu đặt lịch</button>
      </div>
      ${rows}
    </section>
  `;
}

function renderBusinesses() {
  if (!businessList) return;
  const mine = myBusinessProfile();
  if (pendingBusinessLogo === null) pendingBusinessLogo = mine?.logo || (mine?.logoData ? { data: mine.logoData, type: "image/*", name: "logo" } : null);
  if (pendingBusinessGallery === null) pendingBusinessGallery = Array.isArray(mine?.gallery) ? mine.gallery.slice(0, 5) : [];
  if (pendingBusinessLocation === null) {
    pendingBusinessLocation = Number.isFinite(Number(mine?.latitude)) && Number.isFinite(Number(mine?.longitude))
      ? { latitude: Number(mine.latitude), longitude: Number(mine.longitude) }
      : null;
  }
  const others = businessProfiles.filter((item) => !normalizeBusinessProfile(item).isMine);
  const searchedBusinesses = businessSearchQuery ? searchBusinessProfiles(businessSearchQuery, others) : others.map((item) => normalizeBusinessProfile(item));
  const filters = businessQuickFilters(others);
  const composerOpen = businessComposerOpen;
  businessList.innerHTML = `
    <section class="business-composer ${composerOpen ? "is-open" : "is-closed"}">
      <button class="business-intro business-toggle" type="button" data-business-composer-toggle aria-expanded="${composerOpen ? "true" : "false"}" aria-controls="businessComposerBody">
        <span>
          <strong>Quảng bá doanh nghiệp trên XPAY Chat</strong>
          <small>${mine ? `Trạng thái: ${escapeHtml(mine.statusLabel || businessStatusLabel(mine.status))}` : "Bấm để tạo hồ sơ doanh nghiệp"}</small>
        </span>
        <span class="business-toggle-icon" aria-hidden="true">${composerOpen ? "Thu gọn" : "Mở"}</span>
      </button>
      <div class="business-composer-body" id="businessComposerBody" ${composerOpen ? "" : "hidden"}>
        <p class="business-status">Hồ sơ gửi lên sẽ chờ admin duyệt trước khi hiển thị công khai cho người dùng khác.</p>
        <form id="businessForm" class="business-form">
        <input id="businessNameInput" type="text" placeholder="Tên doanh nghiệp" value="${escapeHtml(mine?.name || "")}" required />
        <input id="businessCategoryInput" type="text" placeholder="Ngành nghề, ví dụ: nhà hàng, spa, sửa chữa" value="${escapeHtml(mine?.category || "")}" />
        <textarea id="businessDescriptionInput" rows="3" placeholder="Mô tả ngắn về sản phẩm, dịch vụ">${escapeHtml(mine?.description || "")}</textarea>
        <input id="businessAddressInput" type="text" placeholder="Địa chỉ hoặc khu vực phục vụ" value="${escapeHtml(mine?.address || "")}" />
        <input id="businessPhoneInput" type="tel" placeholder="Số điện thoại liên hệ" value="${escapeHtml(mine?.phone || currentUser?.phone || "")}" />
        <input id="businessWebsiteInput" type="url" placeholder="Website hoặc link mạng xã hội" value="${escapeHtml(mine?.website || "")}" />
        <input id="businessOfferInput" type="text" placeholder="Ưu đãi hoặc điểm nổi bật hôm nay" value="${escapeHtml(mine?.offer || "")}" />
        <textarea id="businessServicesInput" rows="2" placeholder="Sản phẩm/dịch vụ chính, ví dụ: phở bò, cơm văn phòng, sửa điện thoại">${escapeHtml(mine?.services || "")}</textarea>
        <input id="businessKeywordsInput" type="text" placeholder="Từ khoá tìm kiếm, cách nhau bằng dấu phẩy" value="${escapeHtml(mine?.keywords || "")}" />
        <div class="business-hours-row">
          <input id="businessOpenInput" type="time" value="${escapeHtml(mine?.hours?.open || "")}" />
          <input id="businessCloseInput" type="time" value="${escapeHtml(mine?.hours?.close || "")}" />
        </div>
        <div class="business-hours-row">
          <input id="businessRadiusInput" type="number" min="0" max="200" step="1" placeholder="Bán kính phục vụ km" value="${escapeHtml(mine?.serviceRadiusKm || "")}" />
          <label class="business-checkbox"><input id="businessDeliveryInput" type="checkbox" ${mine?.delivery ? "checked" : ""} /> <span>Giao hàng</span></label>
          <label class="business-checkbox"><input id="businessBookingInput" type="checkbox" ${mine?.booking ? "checked" : ""} /> <span>Đặt lịch</span></label>
        </div>
        <div class="business-location-panel">
          <button class="secondary-btn" type="button" id="businessUseLocationBtn">Lấy vị trí hiện tại làm vị trí doanh nghiệp</button>
          <small>${pendingBusinessLocation ? `Vị trí: ${pendingBusinessLocation.latitude.toFixed(6)}, ${pendingBusinessLocation.longitude.toFixed(6)}` : "Chưa gắn vị trí GPS cho doanh nghiệp."}</small>
        </div>
        <div class="business-upload-panel">
          <label>
            <span>Logo doanh nghiệp</span>
            <input id="businessLogoInput" type="file" accept="image/*" />
          </label>
          <div class="business-logo-preview">
            ${pendingBusinessLogo?.data ? `<img src="${escapeHtml(pendingBusinessLogo.data)}" alt="Logo doanh nghiệp" />` : `<span>${escapeHtml(initials(mine?.name || currentUser?.fullName || "DN"))}</span>`}
          </div>
        </div>
        <div class="business-upload-panel">
          <label>
            <span>Ảnh doanh nghiệp, tối đa 5 ảnh, dưới 6MB/ảnh</span>
            <input id="businessGalleryInput" type="file" accept="image/*" multiple />
          </label>
          <div class="business-gallery-preview">
            ${businessGalleryMarkup(pendingBusinessGallery || []) || `<small>Chưa chọn ảnh trưng bày.</small>`}
          </div>
        </div>
        <label class="business-terms">
          <input id="businessTermsInput" type="checkbox" ${mine?.termsAcceptedAt ? "checked" : ""} required />
          <span>Tôi cam kết thông tin doanh nghiệp là thật, không đăng hàng cấm, lừa đảo, nội dung người lớn, cờ bạc, vay nặng lãi, giấy tờ giả, thuốc/chữa bệnh sai sự thật hoặc link thu thập OTP/mật khẩu.</span>
        </label>
        <button class="primary-btn" type="submit">${mine ? "Cập nhật hồ sơ doanh nghiệp" : "Tạo hồ sơ doanh nghiệp"}</button>
        </form>
        <p class="business-status" id="businessStatus">${mine ? `Trạng thái: ${escapeHtml(mine.statusLabel || businessStatusLabel(mine.status))}.` : "Tạo hồ sơ đầu tiên để gửi admin duyệt."}</p>
      </div>
    </section>
    ${renderBusinessInboxPanel(mine)}
    <section class="business-featured">
      <div class="business-section-title">
        <strong>Doanh nghiệp nổi bật</strong>
        <span>${businessProfiles.length ? `${businessProfiles.length} hồ sơ trong hệ thống của bạn` : "Chưa có hồ sơ doanh nghiệp"}</span>
      </div>
      <div class="business-search-panel">
        <input id="businessSearchInput" type="search" placeholder="Tìm tên, ngành nghề, sản phẩm hoặc khu vực" value="${escapeHtml(businessSearchQuery)}" />
        <div class="business-filter-row">
          ${filters.map((filter) => `<button type="button" data-business-filter="${escapeHtml(filter)}">${escapeHtml(filter)}</button>`).join("")}
        </div>
        <div class="business-filter-row">
          <button type="button" data-business-near-me="${businessSearchNearMe ? "off" : "on"}">${businessSearchNearMe ? "Bỏ gần tôi" : "Gần tôi"}</button>
          <button type="button" data-business-open-now="${businessSearchOpenNow ? "off" : "on"}">${businessSearchOpenNow ? "Bỏ đang mở cửa" : "Đang mở cửa"}</button>
          <select id="businessRadiusSelect" aria-label="Bán kính tìm kiếm">
            ${[1, 3, 5, 10, 20].map((value) => `<option value="${value}" ${businessSearchRadiusKm === value ? "selected" : ""}>${value}km</option>`).join("")}
          </select>
        </div>
        <small>${businessSearchQuery ? `Đang lọc theo "${escapeHtml(businessSearchQuery)}" • ${searchedBusinesses.length} kết quả` : "Gõ từ khoá hoặc chọn ngành để tìm doanh nghiệp đã được duyệt."}</small>
      </div>
      ${mine ? renderBusinessCard(mine) : ""}
      ${
        searchedBusinesses.length
          ? searchedBusinesses.map(renderBusinessCard).join("")
          : `<div class="empty-state"><strong>Không tìm thấy doanh nghiệp phù hợp</strong><span>Thử tìm theo tên, ngành nghề, sản phẩm/dịch vụ hoặc khu vực khác.</span></div>`
      }
    </section>
  `;
}

async function saveBusinessProfileFromForm(form) {
  const business = {
    name: form.querySelector("#businessNameInput")?.value.trim() || "",
    category: form.querySelector("#businessCategoryInput")?.value.trim() || "",
    description: form.querySelector("#businessDescriptionInput")?.value.trim() || "",
    address: form.querySelector("#businessAddressInput")?.value.trim() || "",
    phone: form.querySelector("#businessPhoneInput")?.value.trim() || "",
    website: form.querySelector("#businessWebsiteInput")?.value.trim() || "",
    offer: form.querySelector("#businessOfferInput")?.value.trim() || "",
    services: form.querySelector("#businessServicesInput")?.value.trim() || "",
    keywords: form.querySelector("#businessKeywordsInput")?.value.trim() || "",
    hours: {
      open: form.querySelector("#businessOpenInput")?.value.trim() || "",
      close: form.querySelector("#businessCloseInput")?.value.trim() || ""
    },
    serviceRadiusKm: Number(form.querySelector("#businessRadiusInput")?.value || 0),
    delivery: Boolean(form.querySelector("#businessDeliveryInput")?.checked),
    booking: Boolean(form.querySelector("#businessBookingInput")?.checked),
    latitude: pendingBusinessLocation?.latitude ?? null,
    longitude: pendingBusinessLocation?.longitude ?? null,
    logoData: pendingBusinessLogo?.data || "",
    logo: pendingBusinessLogo || null,
    gallery: Array.isArray(pendingBusinessGallery) ? pendingBusinessGallery.slice(0, 5) : []
  };
  const acceptTerms = Boolean(form.querySelector("#businessTermsInput")?.checked);
  const status = document.querySelector("#businessStatus");
  if (!business.name) {
    if (status) status.textContent = "Vui lòng nhập tên doanh nghiệp.";
    return;
  }
  if (!acceptTerms) {
    if (status) status.textContent = "Vui lòng đồng ý điều khoản doanh nghiệp.";
    return;
  }
  if (status) status.textContent = "Đang lưu hồ sơ doanh nghiệp...";
  try {
    const data = hasServerSession()
      ? await apiRequest("/api/businesses/upsert", { business, acceptTerms })
      : { businesses: [{ ...business, ownerPhone: currentUser?.phone || "", ownerName: currentUser?.fullName || currentUser?.name || "", isMine: true, status: "pending", termsAcceptedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }] };
    applyServerBusinesses(data.businesses || []);
    renderBusinesses();
    const nextStatus = document.querySelector("#businessStatus");
    if (nextStatus) nextStatus.textContent = "Đã gửi hồ sơ doanh nghiệp. Admin sẽ duyệt trước khi hiển thị công khai.";
  } catch (error) {
    if (status) status.textContent = error.message || "Không lưu được hồ sơ doanh nghiệp.";
  }
}

async function getCurrentGeoPosition() {
  if (!navigator.geolocation) throw new Error("Thiết bị chưa hỗ trợ định vị.");
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 60000
    });
  });
}

async function refreshBusinessSearchFromServer(options = {}) {
  if (!hasServerSession()) return;
  const status = document.querySelector("#businessStatus");
  let position = null;
  if (businessSearchNearMe || options.forceLocation) {
    try {
      position = await getCurrentGeoPosition();
      await apiRequest("/api/location/update", {
        enabled: true,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      }).catch(() => undefined);
    } catch {
      if (status) status.textContent = "Chưa lấy được vị trí. Hãy bật quyền vị trí để tìm gần tôi.";
      businessSearchNearMe = false;
    }
  }
  const payload = {
    query: businessSearchQuery,
    radiusKm: businessSearchNearMe ? businessSearchRadiusKm : 0,
    openNow: businessSearchOpenNow
  };
  if (position) {
    payload.latitude = position.coords.latitude;
    payload.longitude = position.coords.longitude;
  }
  const data = await apiRequest("/api/businesses/search", payload);
  applyServerBusinesses(data.businesses || []);
  renderBusinesses();
}

function businessContactTemplate(business, kind = "") {
  if (kind === "booking") return `Xin chào ${business.name}, tôi muốn đặt lịch.`;
  return `Xin chào ${business.name}, tôi muốn được tư vấn về sản phẩm/dịch vụ.`;
}

async function contactBusiness(ownerPhone, template = "") {
  const business = normalizeBusinessProfile(businessProfiles.find((item) => samePhone(normalizeBusinessProfile(item).ownerPhone, ownerPhone)) || {});
  if (!business.ownerPhone || business.isMine) return;
  const status = document.querySelector("#businessStatus");
  const text = businessContactTemplate(business, template);
  if (status) status.textContent = "Đang mở kênh chat với doanh nghiệp...";
  try {
    const data = await apiRequest("/api/businesses/contact", {
      ownerPhone: business.ownerPhone,
      text,
      message: { text, time: nowTime() }
    });
    if (data.contact) {
      const person = profileToPerson(data.contact, people.length);
      const existingIndex = people.findIndex((item) => samePhone(friendPhone(item), friendPhone(person)));
      if (existingIndex >= 0) people[existingIndex] = { ...people[existingIndex], ...person, messages: people[existingIndex].messages || [] };
      else people.unshift(person);
    }
    if (data.conversation) applyServerConversations([data.conversation], { notify: false });
    const target = selectPerson(business.ownerPhone, { phone: business.ownerPhone, preferPhone: true, revealHidden: true });
    if (target) {
      currentView = "chats";
      setActiveView("chats");
      messageInput.placeholder = `Đang chat với ${business.name}`;
    }
    syncServerData();
  } catch (error) {
    if (status) status.textContent = error.message || "Không mở được kênh chat doanh nghiệp.";
  }
}

async function updateBusinessCustomerStatus(customerPhone, status) {
  const result = await apiRequest("/api/businesses/customer/status", { customerPhone, status });
  if (Array.isArray(result.businessInbox)) applyServerBusinessInbox(result.businessInbox);
  if (result.business) {
    const next = normalizeBusinessProfile(result.business);
    businessProfiles = [next, ...businessProfiles.filter((item) => !samePhone(normalizeBusinessProfile(item).ownerPhone, next.ownerPhone))];
    saveBusinessProfiles();
  }
  renderBusinesses();
}

function ensureMessageId(message, index = 0) {
  if (!message.id) message.id = `local-${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`;
  return message.id;
}

function messageStageBottomOffset() {
  return Math.max(0, messageStage.scrollHeight - messageStage.scrollTop - messageStage.clientHeight);
}

function shouldKeepMessageStageAtBottom() {
  return messageStageBottomOffset() < 96;
}

function restoreMessageStageScroll(options = {}) {
  if (options.toBottom) {
    messageStage.scrollTop = messageStage.scrollHeight;
    return;
  }

  if (Number.isFinite(options.previousBottomOffset)) {
    messageStage.scrollTop = Math.max(0, messageStage.scrollHeight - messageStage.clientHeight - options.previousBottomOffset);
  }
}

function renderAiAssistantList() {
  if (!aiAssistantList) return;
  aiAutoReplyToggle.checked = Boolean(aiSettings.autoReplySimple);
  if (aiRulesInput && document.activeElement !== aiRulesInput) {
    aiRulesInput.value = aiServerState.rules?.customRules || "";
  }
  const agenda = buildAssistantAgenda();
  const pendingTasks = (aiAgentState.tasks || []).filter((task) => !task.done);
  const schedule = aiAgentState.schedule || [];
  const reminders = (aiServerState.reminders || []).filter((item) => item.status === "open");
  aiAssistantBrief.innerHTML = `
    <div>
      <span>Hôm nay</span>
      <strong>${escapeHtml(agenda.headline)}</strong>
    </div>
    <div>
      <span>Lịch hẹn</span>
      <strong>${agenda.schedule.length} mục</strong>
    </div>
    <div>
      <span>Lịch AI</span>
      <strong>${reminders.length} mục</strong>
    </div>
    <div>
      <span>Tự trả lời</span>
      <strong>${aiSettings.autoReplySimple ? "Đang bật" : "Đang tắt"}</strong>
    </div>
  `;
  if (aiAgentBoard) {
    const taskRows = pendingTasks.slice(-3).map((task) => `<li>${escapeHtml(task.text)}</li>`).join("");
    const scheduleRows = schedule.slice(-3).map((item) => `<li>${escapeHtml(item.text)}</li>`).join("");
    const reminderRows = reminders
      .slice(0, 4)
      .map((item) => `<li>${escapeHtml(item.title || "Lịch nhắc")} ${item.dueAt ? `• ${escapeHtml(formatAiDueTime(item.dueAt))}` : ""}</li>`)
      .join("");
    const noteRows = (aiAgentState.notes || []).slice(-2).map((note) => `<li>${escapeHtml(note.text)}</li>`).join("");
    aiAgentBoard.innerHTML = `
      <div class="agent-metric">
        <span>Việc</span>
        <strong>${pendingTasks.length}</strong>
      </div>
      <div class="agent-metric">
        <span>Lịch AI</span>
        <strong>${reminders.length}</strong>
      </div>
      <div class="agent-feed">
        <span>Đang theo dõi</span>
        <ul>
          ${reminderRows || taskRows || scheduleRows || noteRows || "<li>Chưa có mục nào</li>"}
        </ul>
      </div>
    `;
  }
}

function renderAiAssistantConversation() {
  const previousBottomOffset = messageStageBottomOffset();
  const keepAtBottom =
    forceConversationScrollBottom || renderedConversationPhone !== "nexa-ai" || shouldKeepMessageStageAtBottom();
  setConversationControls(true, { assistant: true });
  closeAiPanel();
  activeName.textContent = "XPAY Twin AI";
  activeMeta.textContent = "Trợ lý cá nhân có ngữ cảnh và dữ liệu thời gian thực";
  activeAvatar.textContent = "AI";
  activeAvatar.style.background = "linear-gradient(135deg, #101828, #2563eb 48%, #15b97a)";
  activeAvatar.style.backgroundImage = "";
  e2eeStatus.textContent = "AI riêng theo tài khoản";

  messageStage.innerHTML = aiAssistantMessages
    .map((message, index) => {
      const id = ensureMessageId(message, index);
      return `
        <article class="message ${message.from === "me" ? "me" : "them"} assistant-message ${message.pending ? "is-pending" : ""}" data-message-id="${id}" tabindex="0" aria-label="Tin nhắn XPAY AI. Giữ để sao chép hoặc xoá.">
          <div class="message-body">
            <div class="bubble">${renderAiAssistantBubble(message.text || "")}</div>
            <time>${escapeHtml(message.time || "")}</time>
          </div>
        </article>
      `;
    })
    .join("");
  restoreMessageStageScroll({ toBottom: keepAtBottom, previousBottomOffset });
  renderedConversationPhone = "nexa-ai";
  forceConversationScrollBottom = false;
}

function renderAiAssistantBubble(text = "") {
  const lines = repairAiSingleLineMarkdownTable(String(text || "")).split(/\r?\n/);
  const html = [];
  let paragraph = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (isMarkdownTableStart(lines, index)) {
      flushAiParagraph(paragraph, html);
      const tableLines = [];
      while (index < lines.length && /^\s*\|.*\|\s*$/.test(lines[index])) {
        tableLines.push(lines[index]);
        index += 1;
      }
      index -= 1;
      html.push(renderAiMarkdownTable(tableLines));
      continue;
    }
    if (/^\s*Minh hoạ nhanh\s*:/i.test(line)) {
      flushAiParagraph(paragraph, html);
      const items = [];
      index += 1;
      while (index < lines.length && lines[index].trim()) {
        items.push(lines[index].replace(/^\s*[-*]\s*/, "").trim());
        index += 1;
      }
      index -= 1;
      html.push(renderAiVisualBlock(items));
      continue;
    }
    if (!line.trim()) {
      flushAiParagraph(paragraph, html);
      continue;
    }
    paragraph.push(line);
  }
  flushAiParagraph(paragraph, html);
  return html.join("") || escapeHtml(text);
}

function repairAiSingleLineMarkdownTable(text = "") {
  const value = String(text || "");
  if (!value.includes("|") || /\n\s*\|/.test(value)) return value;
  const cells = value.split("|").map((cell) => cell.trim()).filter(Boolean);
  const dashStart = cells.findIndex((cell, index) => index > 0 && /^:?-{3,}:?$/.test(cell));
  if (dashStart < 1) return value;
  let columnCount = 0;
  while (dashStart + columnCount < cells.length && /^:?-{3,}:?$/.test(cells[dashStart + columnCount])) columnCount += 1;
  if (columnCount < 2) return value;
  const headerStart = dashStart - columnCount;
  if (headerStart < 0) return value;
  const prefix = cells.slice(0, headerStart).join(" | ");
  const header = cells.slice(headerStart, dashStart);
  if (header.length !== columnCount) return value;
  const tableLines = [
    `| ${header.join(" | ")} |`,
    `| ${Array.from({ length: columnCount }, () => "---").join(" | ")} |`
  ];
  let index = dashStart + columnCount;
  while (index + columnCount <= cells.length) {
    const row = cells.slice(index, index + columnCount);
    if (row.join(" ").length > 420) break;
    tableLines.push(`| ${row.join(" | ")} |`);
    index += columnCount;
  }
  const tail = cells.slice(index).join(" | ");
  return [prefix, tableLines.join("\n"), tail].filter(Boolean).join("\n\n");
}

function flushAiParagraph(paragraph, html) {
  if (!paragraph.length) return;
  html.push(`<p>${formatAiInlineText(paragraph.join(" "))}</p>`);
  paragraph.length = 0;
}

function formatAiInlineText(text = "") {
  return escapeHtml(text)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

function isMarkdownTableStart(lines, index) {
  return /^\s*\|.*\|\s*$/.test(lines[index] || "") && /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(lines[index + 1] || "");
}

function markdownTableCells(line = "") {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function renderAiMarkdownTable(lines = []) {
  if (lines.length < 2) return `<p>${formatAiInlineText(lines.join(" "))}</p>`;
  const header = markdownTableCells(lines[0]);
  const body = lines.slice(2).map(markdownTableCells).filter((row) => row.length);
  return `
    <div class="ai-table-wrap">
      <table class="ai-answer-table">
        <thead><tr>${header.map((cell) => `<th>${formatAiInlineText(cell)}</th>`).join("")}</tr></thead>
        <tbody>
          ${body
            .map((row) => `<tr>${header.map((_, cellIndex) => `<td>${formatAiInlineText(row[cellIndex] || "")}</td>`).join("")}</tr>`)
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderAiVisualBlock(items = []) {
  const visibleItems = items.slice(0, 4).map((item) => {
    const [label, rest = ""] = item.split(":");
    const [value, note = ""] = rest.split(/\s+-\s+/);
    return { label: label.trim(), value: value.trim(), note: note.trim() };
  }).filter((item) => item.label || item.value);
  if (!visibleItems.length) return "";
  return `
    <div class="ai-visual-block" aria-label="Minh hoạ nhanh">
      ${visibleItems
        .map((item) => `
          <div class="ai-visual-item">
            <span>${escapeHtml(item.label || "Ý chính")}</span>
            <strong>${escapeHtml(item.value || item.note || "")}</strong>
            ${item.note && item.value ? `<small>${escapeHtml(item.note)}</small>` : ""}
          </div>
        `)
        .join("")}
    </div>
  `;
}

async function renderConversation() {
  if (isAiAssistantView()) {
    renderAiAssistantConversation();
    return;
  }

  if (!people.length) {
    setConversationControls(false);
    closeAiPanel();
    activeName.textContent = "Chưa có bạn bè";
    activeMeta.textContent = "Hãy kết bạn bằng số điện thoại hoặc mã QR";
    activeAvatar.textContent = "N";
    activeAvatar.style.background = "linear-gradient(135deg, #00a7c7, #15b97a)";
    activeAvatar.style.backgroundImage = "";
    messageStage.innerHTML = `
      <div class="empty-state">
        <strong>Bắt đầu từ Danh bạ</strong>
        <span>Thêm bạn bằng số điện thoại hoặc quét QR để mở cuộc trò chuyện bảo mật.</span>
      </div>
    `;
    updateE2eeStatus();
    return;
  }

  setConversationControls(true);
  const person = normalizedPerson(getActivePerson());
  activeName.innerHTML = displayNameWithBadges(person);
  activeMeta.textContent = activeMetaText(person);
  activeAvatar.textContent = person.avatarData ? "" : person.avatar;
  activeAvatar.style.background = person.avatarData ? "" : person.color;
  activeAvatar.style.backgroundImage = person.avatarData ? `url("${person.avatarData}")` : "";

  const conversationPhone = friendPhone(person);
  const previousBottomOffset = messageStageBottomOffset();
  const keepAtBottom =
    forceConversationScrollBottom || renderedConversationPhone !== conversationPhone || shouldKeepMessageStageAtBottom();
  const visibleMessages = person.messages.filter((message) => !message.deleted);
  const renderedMessages = await Promise.all(
    visibleMessages.map(async (message, index) => {
      const messageId = ensureMessageId(message, index);
      const openMessage = await openMessagePayload(message);
      const recalled = Boolean(openMessage.recalled);
      const media = renderMessageMedia(openMessage);
      const reactions = renderMessageReactions(message);
      return `
        <article class="message ${message.from}${recalled ? " recalled" : ""}" data-message-id="${messageId}" tabindex="0" aria-label="Tin nhắn. Giữ để mở thao tác.">
          <div class="message-body">
            ${openMessage.text ? `<div class="bubble">${escapeHtml(openMessage.text)}</div>` : ""}
            ${media}
            ${message.e2ee && !recalled ? `<div class="media-caption">Đã mã hoá đầu cuối</div>` : ""}
            ${reactions}
            <time>${escapeHtml(message.time || "")}</time>
          </div>
        </article>
      `;
    })
  );
  messageStage.innerHTML = renderedMessages.join("");
  restoreMessageStageScroll({ toBottom: keepAtBottom, previousBottomOffset });
  renderedConversationPhone = conversationPhone;
  forceConversationScrollBottom = false;
}

function renderMessageReactions(message) {
  const items = Array.isArray(message.reactions?.items) ? message.reactions.items : [];
  const visibleItems = items.filter((item) => item?.emoji && Number(item.count) > 0);
  if (!visibleItems.length || message.recalled) return "";
  return `
    <div class="message-reactions" aria-label="Cảm xúc tin nhắn">
      ${visibleItems
        .map((item) => {
          const mine = message.reactions?.mine === item.emoji ? " is-mine" : "";
          return `<span class="message-reaction${mine}">${escapeHtml(item.emoji)}<b>${Number(item.count)}</b></span>`;
        })
        .join("")}
    </div>
  `;
}

async function openMessagePayload(message) {
  if (message.recalled) return { ...message, text: "Tin nhắn đã được thu hồi", media: null };
  if (!message.e2ee) return message;
  try {
    const payload = await decryptPayload(message);
    return { ...message, text: payload.text || "", media: payload.media || null };
  } catch {
    return { ...message, text: "Không thể giải mã tin nhắn này.", media: null };
  }
}

function renderMessageMedia(message) {
  if (!message.media?.data) return "";
  const name = message.media.name ? `<div class="media-caption">${escapeHtml(message.media.name)}</div>` : "";
  const mediaName = escapeHtml(message.media.name || "Hình ảnh");
  if (message.media.type === "application/vnd.xpaychat.location+json") {
    try {
      const location = JSON.parse(message.media.data);
      const lat = Number(location.lat);
      const lng = Number(location.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return "";
      const accuracy = Number(location.accuracy || 0);
      const mapsUrl = `https://www.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}`;
      const accuracyText = accuracy ? `Sai số khoảng ${Math.round(accuracy)} m` : "Vị trí GPS hiện tại";
      return `
        <a class="message-location" href="${mapsUrl}" target="_blank" rel="noopener noreferrer">
          <span class="location-pin" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M12 21s7-5.4 7-12a7 7 0 1 0-14 0c0 6.6 7 12 7 12z"></path>
              <circle cx="12" cy="9" r="2.5"></circle>
            </svg>
          </span>
          <span>
            <strong>Vị trí hiện tại</strong>
            <small>${escapeHtml(lat.toFixed(6))}, ${escapeHtml(lng.toFixed(6))}</small>
            <em>${escapeHtml(accuracyText)}</em>
          </span>
        </a>
      `;
    } catch {
      return "";
    }
  }
  if (message.media.type.startsWith("image/")) {
    return `<div class="message-media"><img src="${message.media.data}" alt="${mediaName}" />${name}</div>`;
  }
  if (message.media.type.startsWith("video/")) {
    return `<div class="message-media"><video src="${message.media.data}" controls playsinline></video>${name}</div>`;
  }
  return "";
}

function truncateAiText(value = "", limit = 92) {
  const text = String(value).replace(/\s+/g, " ").trim();
  if (text.length <= limit) return text;
  return `${text.slice(0, limit - 1).trim()}...`;
}

function tokenizeAiText(value = "") {
  return String(value)
    .toLowerCase()
    .normalize("NFC")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 3 && !aiStopWords.has(word));
}

function splitAiPhrases(value = "") {
  return String(value)
    .split(/[,;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function topAiKeywords(values = [], limit = 5) {
  const counts = new Map();
  values.forEach((value) => {
    tokenizeAiText(value).forEach((word) => counts.set(word, (counts.get(word) || 0) + 1));
  });
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "vi"))
    .map(([word]) => word)
    .slice(0, limit);
}

function extractAiTopics(...values) {
  const phrases = values.flatMap(splitAiPhrases);
  const keywords = topAiKeywords(values, 8);
  return [...new Set([...phrases, ...keywords])].slice(0, 8);
}

function visibleAiMessages(person) {
  return (person?.messages || [])
    .filter((message) => !message.deleted)
    .map((message) => {
      const mediaName = message.media?.name ? `Tệp: ${message.media.name}` : "";
      const text = message.recalled
        ? "Tin nhắn đã được thu hồi"
        : message.e2ee && message.text === "Tin nhắn đã mã hoá"
          ? "Tin nhắn đã mã hoá"
          : message.text || mediaName;
      return {
        from: message.from === "me" ? "me" : "them",
        text: String(text || "").trim(),
        hasMedia: Boolean(message.media?.data),
        e2ee: Boolean(message.e2ee),
        recalled: Boolean(message.recalled)
      };
    })
    .filter((message) => message.text || message.hasMedia)
    .slice(-18);
}

function getSharedAiTopics(userTopics, friendTopics) {
  const friendTokens = new Set(friendTopics.flatMap(tokenizeAiText));
  const shared = userTopics.filter((topic) => tokenizeAiText(topic).some((token) => friendTokens.has(token)));
  return [...new Set(shared)].slice(0, 4);
}

function normalizeAiPlain(value = "") {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ")
    .trim();
}

function aiTextHasAny(text = "", words = []) {
  const plain = normalizeAiPlain(text);
  return words.some((word) => plain.includes(normalizeAiPlain(word)));
}

function latestAiText(messages, count = 6) {
  return messages.slice(-count).map((message) => message.text).join(" ");
}

function countAiMessages(messages, from) {
  return messages.filter((message) => message.from === from).length;
}

function buildAiSignal(messages, person, topics, sharedTopics) {
  const recentText = latestAiText(messages, 7);
  const lastMessage = messages.at(-1);
  const hasQuestion = Boolean(lastMessage?.text?.includes("?")) || aiTextHasAny(recentText, [
    "sao", "vi sao", "tai sao", "khi nao", "o dau", "duoc khong", "the nao", "bao nhieu", "co khong"
  ]);
  const hasRisk = aiTextHasAny(recentText, [
    "otp", "mat khau", "password", "ma xac thuc", "chuyen khoan", "so tai khoan", "ngan hang",
    "cccd", "can cuoc", "ma pin", "the tin dung", "link la", "dang nhap giup"
  ]);
  const hasUrgency = aiTextHasAny(recentText, [
    "gap", "ngay", "khan", "nhanh", "hom nay", "bay gio", "can lien", "rat can"
  ]);
  const wantsCall = aiTextHasAny(recentText, ["goi", "call", "video", "thoai", "noi chuyen truc tiep"]);
  const wantsMeet = aiTextHasAny(recentText, ["gap", "hen", "cafe", "ca phe", "meetup", "dia diem", "lich"]);
  const positive = aiTextHasAny(recentText, ["cam on", "vui", "thich", "tuyet", "ok", "dong y", "hay", "tot"]);
  const negative = aiTextHasAny(recentText, ["lo", "so", "khong on", "that vong", "kho", "phien", "ngai"]);
  const hasMedia = messages.some((message) => message.hasMedia);
  const meCount = countAiMessages(messages, "me");
  const themCount = countAiMessages(messages, "them");
  const imbalance = Math.abs(meCount - themCount);
  const needsReply = lastMessage?.from === "them";
  const sharedScore = sharedTopics.length * 12;
  const trustScore = Math.max(
    18,
    Math.min(98, 44 + sharedScore + Math.min(messages.length, 18) * 2 + (friendPhone(person) ? 8 : 0) - (hasRisk ? 22 : 0))
  );

  const mood = hasRisk
    ? "Cần kiểm chứng"
    : positive
      ? "Tích cực"
      : negative
        ? "Cần tinh tế"
        : messages.length
          ? "Ổn định"
          : "Mới kết nối";
  const intent = hasRisk
    ? "Yêu cầu nhạy cảm"
    : wantsCall
      ? "Muốn gọi trực tiếp"
      : wantsMeet
        ? "Muốn hẹn gặp"
        : hasQuestion
          ? "Đang hỏi bạn"
          : hasMedia
            ? "Trao đổi media"
            : messages.length
              ? "Duy trì quan hệ"
              : "Mở kết nối";
  const urgency = hasRisk || hasUrgency ? "Cao" : needsReply || hasQuestion ? "Nên phản hồi" : "Thường";

  return {
    mood,
    intent,
    urgency,
    hasQuestion,
    hasRisk,
    wantsCall,
    wantsMeet,
    needsReply,
    imbalance,
    trustScore,
    lastMessage
  };
}

function buildAiReplies(person, signal, leadTopic) {
  if (signal.hasRisk) {
    return [
      "Mình không chia sẻ OTP, mật khẩu hoặc thông tin ngân hàng qua chat. Nếu cần xác minh, mình sẽ gọi trực tiếp qua XPAY Chat.",
      `Mình muốn giữ an toàn cho cả hai, ${person.name}. Bạn mô tả nhu cầu chính, mình sẽ hỗ trợ trong phạm vi không cần mã OTP hay dữ liệu riêng tư nhé.`,
      "Vì nội dung này liên quan thông tin nhạy cảm, mình cần xác minh lại trước khi tiếp tục. Mình không nhập mã, không mở link lạ và không gửi dữ liệu cá nhân."
    ];
  }
  if (signal.wantsMeet) {
    return [
      "Được, mình sắp xếp được. Bạn gửi giúp mình thời gian và khu vực thuận tiện nhé.",
      `Hay đó ${person.name}. Mình nghĩ mình có thể hẹn ở một nơi công khai, dễ tìm, rồi trao đổi thêm về ${leadTopic}.`,
      "Mình đồng ý trao đổi thêm. Bạn đề xuất thời gian, địa điểm cụ thể; mình sẽ xác nhận lại lịch phù hợp."
    ];
  }
  if (signal.wantsCall) {
    return [
      "Được, mình có thể gọi qua XPAY Chat. Bạn muốn gọi thoại hay video?",
      `Mình nghe được. Nếu tiện, mình gọi nhanh với bạn để trao đổi rõ hơn về ${leadTopic}.`,
      "Mình sẵn sàng trao đổi trực tiếp qua cuộc gọi trong app. Bạn cho mình khung giờ phù hợp để bắt đầu."
    ];
  }
  if (signal.hasQuestion || signal.needsReply) {
    return [
      `Mình đã hiểu. Về ${leadTopic}, mình nghĩ mình có thể chia sẻ thêm một chút.`,
      `Cảm ơn ${person.name} đã hỏi. Chủ đề ${leadTopic} khá hay, mình muốn nghe thêm góc nhìn của bạn nữa.`,
      `Mình ghi nhận câu hỏi của bạn. Với ${leadTopic}, mình sẽ trả lời rõ từng ý để hai bên cùng dễ theo dõi.`
    ];
  }
  return [
    `Mình muốn trao đổi thêm về ${leadTopic}.`,
    `Mình thấy chủ đề ${leadTopic} khá hợp để nói tiếp. Bạn đang quan tâm phần nào nhất?`,
    `Khi bạn tiện, mình muốn tiếp tục cuộc trò chuyện về ${leadTopic} theo hướng rõ hơn và hữu ích hơn cho cả hai.`
  ];
}

function buildAiActions(signal, person, leadTopic) {
  const actions = [];
  if (signal.hasRisk) {
    actions.push("Không chia sẻ OTP, mật khẩu, CCCD hoặc thông tin ngân hàng.");
    actions.push("Xác minh lại bằng cuộc gọi trong app nếu nội dung quan trọng.");
  } else if (signal.wantsCall) {
    actions.push("Bấm gọi thoại/video khi hai bên sẵn sàng.");
  } else if (signal.wantsMeet) {
    actions.push("Chốt thời gian và địa điểm công khai trước khi gặp.");
  } else if (signal.hasQuestion || signal.needsReply) {
    actions.push("Trả lời trực tiếp tin nhắn mới nhất trước, rồi mở rộng sang chủ đề liên quan.");
  } else {
    actions.push(`Gợi mở thêm về ${leadTopic} để giữ mạch trò chuyện tự nhiên.`);
  }
  if (!person.interests) actions.push("Khuyến khích bạn bè cập nhật sở thích để AI hiểu ngữ cảnh tốt hơn.");
  if (signal.imbalance >= 4) actions.push("Nhịp trò chuyện đang lệch, nên viết ngắn hơn và đặt một câu hỏi mở.");
  return actions.slice(0, 4);
}

function collectAssistantContext() {
  return people.flatMap((person) =>
    (person.messages || [])
      .filter((message) => !message.deleted && !message.recalled && message.text)
      .map((message) => ({
        person: person.name,
        from: message.from === "me" ? "me" : "them",
        text: String(message.text || ""),
        time: message.time || ""
      }))
  );
}

function assistantScheduleItems(context = collectAssistantContext()) {
  return context
    .filter((item) =>
      aiTextHasAny(item.text, [
        "hẹn", "lịch", "gap", "gặp", "cafe", "cà phê", "cuối tuần", "thu bay", "thứ bảy",
        "chu nhat", "chủ nhật", "hom nay", "hôm nay", "ngay mai", "ngày mai", "toi nay", "tối nay"
      ])
    )
    .slice(-6)
    .map((item) => `${item.person}: ${truncateAiText(item.text, 72)}`);
}

function assistantTaskItems(context = collectAssistantContext()) {
  return context
    .filter((item) =>
      aiTextHasAny(item.text, [
        "can", "cần", "nho", "nhớ", "gui", "gửi", "kiem tra", "kiểm tra", "xac nhan", "xác nhận",
        "bao lai", "báo lại", "todo", "viec", "việc", "deadline", "hoan thanh", "hoàn thành"
      ])
    )
    .slice(-6)
    .map((item) => `${item.person}: ${truncateAiText(item.text, 72)}`);
}

function assistantWeekendIdeas() {
  const topicSource = [
    currentUser?.interests || "",
    ...people.map((person) => `${person.name} ${person.interests || ""} ${person.status || ""}`)
  ];
  const topics = topAiKeywords(topicSource, 4);
  const lead = topics[0] || "kết nối bạn bè";
  const friend = people.find((person) => person.interests)?.name || people[0]?.name || "một người bạn";
  return [
    `Cuối tuần có thể rủ ${friend} trao đổi nhẹ về ${lead}.`,
    "Dành 20 phút gom lại các tin nhắn có lịch hẹn để xác nhận thời gian cụ thể.",
    "Đăng một nhật ký ngắn để mở thêm chủ đề trò chuyện tự nhiên."
  ];
}

function buildAssistantAgenda() {
  const context = collectAssistantContext();
  const schedule = assistantScheduleItems(context);
  const tasks = assistantTaskItems(context);
  const weekend = assistantWeekendIdeas();
  const headline = schedule.length || tasks.length
    ? `Có ${schedule.length} lịch hẹn và ${tasks.length} việc cần chú ý`
    : "Chưa có việc nổi bật từ hội thoại";
  return { headline, schedule, tasks, weekend };
}

function agentItemId(prefix = "agent") {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function cleanAgentCommand(text = "", words = []) {
  let value = String(text || "").trim();
  words.forEach((word) => {
    value = value.replace(new RegExp(`^${word}\\s*[:\\-]?\\s*`, "i"), "");
  });
  return value.trim();
}

function addAgentTask(text, source = "manual") {
  const value = truncateAiText(String(text || "").trim(), 140);
  if (!value) return null;
  const task = {
    id: agentItemId("task"),
    text: value,
    source,
    done: false,
    createdAt: new Date().toISOString()
  };
  aiAgentState.tasks = [...(aiAgentState.tasks || []), task];
  aiAgentState.lastRunAt = new Date().toISOString();
  saveAiAgentState();
  return task;
}

function addAgentSchedule(text, source = "manual") {
  const value = truncateAiText(String(text || "").trim(), 140);
  if (!value) return null;
  const item = {
    id: agentItemId("schedule"),
    text: value,
    source,
    createdAt: new Date().toISOString()
  };
  aiAgentState.schedule = [...(aiAgentState.schedule || []), item];
  aiAgentState.lastRunAt = new Date().toISOString();
  saveAiAgentState();
  return item;
}

function addAgentNote(text, source = "agent") {
  const value = truncateAiText(String(text || "").trim(), 180);
  if (!value) return null;
  const note = {
    id: agentItemId("note"),
    text: value,
    source,
    createdAt: new Date().toISOString()
  };
  aiAgentState.notes = [...(aiAgentState.notes || []), note];
  aiAgentState.lastRunAt = new Date().toISOString();
  saveAiAgentState();
  return note;
}

function agentSecurityFindings() {
  const findings = [];
  people.forEach((person) => {
    const messages = visibleAiMessages(person);
    const risky = messages.find((message) =>
      aiTextHasAny(message.text, [
        "otp", "mat khau", "password", "ngan hang", "chuyen khoan", "cccd", "can cuoc", "ma pin", "link"
      ])
    );
    if (risky) findings.push(`${person.name}: ${truncateAiText(risky.text, 76)}`);
  });
  return findings.slice(-6);
}

function runAgentPlanning() {
  const agenda = buildAssistantAgenda();
  let created = 0;
  agenda.tasks.slice(-4).forEach((item) => {
    if (!(aiAgentState.tasks || []).some((task) => task.text === item)) {
      addAgentTask(item, "conversation");
      created += 1;
    }
  });
  agenda.schedule.slice(-4).forEach((item) => {
    if (!(aiAgentState.schedule || []).some((schedule) => schedule.text === item)) {
      addAgentSchedule(item, "conversation");
      created += 1;
    }
  });
  if (!created) addAgentNote("Không tìm thấy việc/lịch mới trong các hội thoại gần đây.", "planning");
  renderAiAssistantList();
  return created
    ? `Mình đã lập kế hoạch và đưa ${created} mục vào bộ nhớ XPAY AI. ${formatAssistantList("Lịch", agenda.schedule, "chưa có")} ${formatAssistantList("Việc", agenda.tasks, "chưa có")}`
    : "Mình đã rà soát hội thoại gần đây nhưng chưa thấy việc/lịch mới đủ rõ để đưa vào kế hoạch.";
}

function draftAgentReply() {
  const person = getActivePerson();
  if (!person || !people.length) return "Chưa có hội thoại để soạn trả lời.";
  const insight = buildAiTwinInsight();
  const draft = insight.suggestion || insight.replies?.[0] || "";
  if (!draft) return "Chưa đủ ngữ cảnh để soạn trả lời.";
  document.querySelector('[data-view="chats"]')?.click();
  useAiText(draft);
  return `Mình đã soạn sẵn phản hồi cho ${normalizedPerson(person).name}. Bạn có thể xem và gửi khi sẵn sàng.`;
}

function draftAgentJournal() {
  const agenda = buildAssistantAgenda();
  const topic = topAiKeywords([
    currentUser?.interests || "",
    ...people.map((person) => person.interests || ""),
    ...collectAssistantContext().map((item) => item.text)
  ], 3).join(", ") || "một ngày nhiều kết nối";
  const text = agenda.schedule.length || agenda.tasks.length
    ? `Hôm nay mình đang sắp xếp ${agenda.schedule.length} lịch hẹn và ${agenda.tasks.length} việc cần làm trên XPAY Chat. Chủ đề nổi bật: ${topic}.`
    : `Một ghi chú ngắn từ XPAY Chat: mình đang kết nối thêm những câu chuyện mới quanh ${topic}.`;
  document.querySelector('[data-view="journal"]')?.click();
  journalTextInput.value = text;
  try {
    journalTextInput.focus({ preventScroll: true });
  } catch {
    journalTextInput.focus();
  }
  return "Mình đã tạo nháp nhật ký. Bạn có thể chỉnh lại rồi đăng.";
}

function runAgentSecurityScan() {
  const findings = agentSecurityFindings();
  const response = findings.length
    ? `Mình tìm thấy ${findings.length} tín hiệu cần kiểm tra: ${findings.map((item, index) => `${index + 1}. ${item}`).join(" • ")}. Không chia sẻ OTP, mật khẩu, CCCD hoặc thông tin ngân hàng qua chat.`
    : "Mình chưa thấy tín hiệu rủi ro rõ trong các tin nhắn gần đây. Vẫn nên giữ nguyên tắc: không gửi OTP, mật khẩu, CCCD hoặc thông tin ngân hàng.";
  addAgentNote(findings.length ? `${findings.length} cảnh báo an toàn cần xem lại` : "Quét an toàn không thấy rủi ro rõ", "security");
  renderAiAssistantList();
  return response;
}

function runAiAgentAction(action) {
  if (action === "plan") return runAgentPlanning();
  if (action === "draft-reply") return draftAgentReply();
  if (action === "journal-draft") return draftAgentJournal();
  if (action === "security-scan") return runAgentSecurityScan();
  return "Mình chưa nhận diện được hành động này.";
}

async function saveAiRulesToServer(options = {}) {
  const rules = {
    ...(aiServerState.rules || {}),
    customRules: aiRulesInput?.value.trim() || "",
    allowAutoReply: Boolean(aiSettings.autoReplySimple),
    allowLiveInfo: aiServerState.rules?.allowLiveInfo !== false,
    allowContext: aiServerState.rules?.allowContext !== false
  };
  aiServerState.rules = rules;
  saveAiServerState();
  if (!hasServerSession()) {
    if (!options.silent && aiRulesStatus) aiRulesStatus.textContent = "Đã lưu quy tắc tạm thời.";
    renderAiAssistantList();
    return;
  }
  if (!options.silent && aiRulesStatus) aiRulesStatus.textContent = "Đang lưu quy tắc...";
  try {
    const data = await apiRequest("/api/ai/rules/update", { rules });
    if (data.ai) applyAiServerState(data.ai);
    if (!options.silent && aiRulesStatus) aiRulesStatus.textContent = "Đã đồng bộ quy tắc theo tài khoản.";
    renderAiAssistantList();
  } catch {
    if (!options.silent && aiRulesStatus) aiRulesStatus.textContent = "Chưa lưu được, đã giữ tạm thời.";
  }
}

function handleAssistantPromptLocal(prompt = "") {
  const text = String(prompt || "").trim();
  const plain = normalizeAiPlain(text);
  if (aiTextHasAny(plain, ["tao viec", "them viec", "nhac viec", "todo"])) {
    const taskText = cleanAgentCommand(text, ["tao viec", "tạo việc", "them viec", "thêm việc", "nhac viec", "nhắc việc", "todo"]);
    const task = addAgentTask(taskText || "Việc mới từ XPAY AI", "chat-command");
    renderAiAssistantList();
    return `Đã tạo việc: ${task.text}`;
  }
  if (aiTextHasAny(plain, ["tao lich", "them lich", "lich hen", "dat lich"])) {
    const scheduleText = cleanAgentCommand(text, ["tao lich", "tạo lịch", "them lich", "thêm lịch", "lich hen", "lịch hẹn", "dat lich", "đặt lịch"]);
    const schedule = addAgentSchedule(scheduleText || "Lịch mới từ XPAY AI", "chat-command");
    renderAiAssistantList();
    return `Đã tạo lịch: ${schedule.text}`;
  }
  if (aiTextHasAny(plain, ["danh dau xong", "hoan thanh viec", "xong viec"])) {
    const task = (aiAgentState.tasks || []).find((item) => !item.done);
    if (!task) return "Chưa có việc đang mở để đánh dấu hoàn thành.";
    task.done = true;
    task.doneAt = new Date().toISOString();
    saveAiAgentState();
    renderAiAssistantList();
    return `Đã hoàn thành: ${task.text}`;
  }
  if (aiTextHasAny(plain, ["lap ke hoach", "tu lap ke hoach", "agent"])) return runAgentPlanning();
  if (aiTextHasAny(plain, ["soan tra loi", "viet tra loi", "goi y tra loi"])) return draftAgentReply();
  if (aiTextHasAny(plain, ["nhap nhat ky", "nhap nhật ký", "viet nhat ky", "dang nhat ky"])) return draftAgentJournal();
  if (aiTextHasAny(plain, ["quet an toan", "bao mat", "rui ro", "kiem tra an toan"])) return runAgentSecurityScan();
  return buildAssistantResponse(text);
}

async function handleAssistantPrompt(prompt = "") {
  const text = String(prompt || "").trim();
  if (hasServerSession()) {
    try {
      const history = aiAssistantMessages
        .filter((message) => !message.pending && message.text && message.text !== text)
        .slice(-12)
        .map((message) => ({
          from: message.from === "me" ? "me" : "assistant",
          text: message.text,
          time: message.time || ""
        }));
      const data = await apiRequest("/api/ai/assistant", {
        prompt: text,
        history,
        activeFriendPhone: friendPhone(getActivePerson())
      });
      if (data.ai) applyAiServerState(data.ai);
      renderAiAssistantList();
      if (data.answer) return data.answer;
    } catch (error) {
      if (aiRulesStatus) aiRulesStatus.textContent = "XPAY AI đang dùng chế độ dự phòng.";
    }
  }
  return handleAssistantPromptLocal(text);
}

function aiMessageId(prefix = "ai") {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function resolveAiPendingMessage(pendingId, prompt) {
  const answer = await handleAssistantPrompt(prompt);
  const index = aiAssistantMessages.findIndex((message) => message.id === pendingId);
  const resolved = { id: pendingId, from: "them", text: answer, time: nowTime(), pending: false };
  if (index >= 0) aiAssistantMessages[index] = resolved;
  else aiAssistantMessages.push(resolved);
  saveAiAssistantMessages();
  renderAll();
}

function startAiAssistantPrompt(prompt) {
  const text = String(prompt || "").trim();
  if (!text) return;
  const pendingId = aiMessageId("ai-pending");
  aiAssistantMessages.push({ id: aiMessageId("ai-me"), from: "me", text, time: nowTime() });
  aiAssistantMessages.push({ id: pendingId, from: "them", text: "XPAY AI đang xử lý...", time: nowTime(), pending: true });
  forceConversationScrollBottom = true;
  saveAiAssistantMessages();
  renderAll();
  resolveAiPendingMessage(pendingId, text).catch(() => {
    const index = aiAssistantMessages.findIndex((message) => message.id === pendingId);
    const fallback = { id: pendingId, from: "them", text: handleAssistantPromptLocal(text), time: nowTime(), pending: false };
    if (index >= 0) aiAssistantMessages[index] = fallback;
    else aiAssistantMessages.push(fallback);
    saveAiAssistantMessages();
    renderAll();
  });
}

function formatAssistantList(title, items, fallback) {
  if (!items.length) return `${title}: ${fallback}`;
  return `${title}: ${items.map((item, index) => `${index + 1}. ${item}`).join(" • ")}`;
}

function buildAssistantResponse(prompt = "") {
  const text = String(prompt || "").trim();
  const plain = normalizeAiPlain(text);
  const agenda = buildAssistantAgenda();
  const previousAssistant = [...aiAssistantMessages].reverse().find((message) => message.from !== "me" && !message.pending && message.text);
  const looksFollowUp = aiTextHasAny(plain, ["y do", "cai do", "noi tiep", "tiep tuc", "lam sao", "vay thi", "tai sao", "ro hon"]);
  const previousAskedForDetail = previousAssistant?.text && aiTextHasAny(
    normalizeAiPlain(previousAssistant.text),
    ["bo sung", "dia diem", "dia chi", "ghi chu", "chi tiet", "quan nay", "buoi gap"]
  );
  const looksLikeDetailAnswer = text.length <= 180 && (/\d{1,5}\s+[\p{L}0-9\s.,/-]{2,}/u.test(text) || aiTextHasAny(plain, ["duong", "phuong", "quan", "xa ", "huyen", "nha hang", "quan an", "dia chi", "tai "]));

  if (previousAskedForDetail && looksLikeDetailAnswer) {
    return `Mình đã hiểu đây là thông tin bổ sung cho nội dung trước: ${truncateAiText(text, 160)}. Mình sẽ dùng chi tiết này làm địa điểm/ghi chú cho lịch hoặc tình huống đang trao đổi.`;
  }

  if (looksFollowUp && previousAssistant?.text) {
    return `Mình hiểu đây là câu hỏi nối tiếp. Ý chính trước đó là: ${truncateAiText(previousAssistant.text, 180)}. Để làm tiếp, bạn có thể chọn một bước cụ thể hơn: đưa thêm dữ liệu, yêu cầu mình lập kế hoạch, hoặc bảo mình soạn câu trả lời mẫu.`;
  }

  if (aiTextHasAny(plain, ["lich", "hen", "sap xep", "calendar"])) {
    return formatAssistantList("Lịch hẹn XPAY Twin tìm thấy", agenda.schedule, "chưa thấy lịch hẹn rõ ràng trong hội thoại gần đây.");
  }
  if (aiTextHasAny(plain, ["cong viec", "viec", "task", "todo", "can lam", "nhac viec"])) {
    return formatAssistantList("Công việc cần chú ý", agenda.tasks, "chưa thấy đầu việc rõ ràng. Bạn có thể nhắn mình: tạo việc + nội dung.");
  }
  if (aiTextHasAny(plain, ["cuoi tuan", "thu bay", "chu nhat", "goi y", "ke hoach"])) {
    return formatAssistantList("Gợi ý cuối tuần", agenda.weekend, "hãy cập nhật sở thích để mình gợi ý sát hơn.");
  }
  if (aiTextHasAny(plain, ["tu tra loi", "auto", "tra loi thay", "chao hoi"])) {
    return aiSettings.autoReplySimple
      ? "Tự trả lời chào hỏi đang bật. Mình chỉ phản hồi các tin rất đơn giản như chào hỏi, hỏi thăm sức khỏe, và không trả lời nội dung nhạy cảm."
      : "Tự trả lời chào hỏi đang tắt. Bạn có thể bật lại trong mục XPAY AI.";
  }
  if (aiTextHasAny(plain, ["xin chao", "chao", "hello", "hi", "khoe khong", "suc khoe"])) {
    return "Chào bạn, mình vẫn ổn và sẵn sàng hỗ trợ. Hôm nay bạn muốn mình sắp lịch, gom việc hay gợi ý cách trả lời tin nhắn?";
  }
  if (aiTextHasAny(plain, ["tong ket", "tom tat", "tin nhan"])) {
    return `${agenda.headline}. ${formatAssistantList("Lịch", agenda.schedule, "chưa có")} ${formatAssistantList("Việc", agenda.tasks, "chưa có")}`;
  }
  return `Mình đã đọc ngữ cảnh XPAY Chat của bạn. ${agenda.headline}. Bạn có thể hỏi mình về lịch hẹn, công việc, trả lời nhanh hoặc kế hoạch cuối tuần.`;
}

function simpleAutoReplyText(messageText = "") {
  const text = String(messageText || "").trim();
  if (!text || text.length > 90) return "";
  const plain = normalizeAiPlain(text);
  const hasRisk = aiTextHasAny(plain, [
    "otp", "mat khau", "password", "ngan hang", "chuyen khoan", "cccd", "can cuoc", "ma pin", "link"
  ]);
  if (hasRisk) return "";
  if (aiTextHasAny(plain, ["khoe khong", "suc khoe", "dao nay", "on khong"])) {
    return "Mình vẫn ổn, cảm ơn bạn đã hỏi. Mình sẽ nhắn lại kỹ hơn khi tiện nhé.";
  }
  if (aiTextHasAny(plain, ["xin chao", "chao", "hello", "hi", "alo"])) {
    return "Chào bạn, mình đang bận một chút. Mình sẽ phản hồi kỹ hơn ngay khi tiện nhé.";
  }
  if (aiTextHasAny(plain, ["cam on", "thanks", "thank you"])) {
    return "Không có gì nhé. Mình sẽ xem lại và phản hồi thêm nếu cần.";
  }
  return "";
}

async function maybeAutoReplySimpleMessages() {
  if (!hasServerSession() || !aiSettings.autoReplySimple) return;
  const repliedIds = loadAutoReplyIds();
  let changed = false;

  for (const person of people) {
    const messages = (person.messages || []).filter((message) => !message.deleted && !message.recalled);
    const last = messages.at(-1);
    if (!last || last.from !== "them" || !last.id || repliedIds.has(last.id) || last.media) continue;

    const replyText = simpleAutoReplyText(last.text);
    if (!replyText) continue;

    const sent = await sendServerMessage(person, { text: replyText, media: null, time: nowTime() });
    if (sent?.message) {
      repliedIds.add(last.id);
      changed = true;
      person.messages.push({
        from: "me",
        text: sent.message.text || replyText,
        media: null,
        time: sent.message.time || nowTime(),
        id: sent.message.id || `ai-auto-${Date.now()}`,
        recalled: false,
        canRecall: true
      });
    }
  }

  if (changed) saveAutoReplyIds(repliedIds);
}

function buildAiTwinInsight() {
  const person = normalizedPerson(getActivePerson());
  if (!people.length || !person || person.id === "empty") {
    return {
      mood: "Chưa có dữ liệu",
      intent: "Chờ chọn bạn",
      urgency: "Thường",
      summary: "Hãy chọn một người bạn để XPAY Twin AI phân tích cuộc trò chuyện.",
      state: "Chưa có hội thoại để đánh giá.",
      suggestion: "",
      replies: [],
      common: "Chưa có dữ liệu để tìm điểm chung.",
      actions: ["Chọn một người bạn trong danh sách để XPAY Twin bắt đầu phân tích."],
      memory: "XPAY Memory chưa có dữ liệu hội thoại.",
      safety: "AI không tự gửi tin nhắn và không thay đổi dữ liệu tài khoản.",
      opener: ""
    };
  }

  const messages = visibleAiMessages(person);
  const userTopics = extractAiTopics(currentUser?.interests || "");
  const friendTopics = extractAiTopics(person.interests || "", person.status || "");
  const messageTopics = topAiKeywords(messages.map((message) => message.text), 6);
  const sharedTopics = getSharedAiTopics(userTopics, friendTopics);
  const topics = [...new Set([...sharedTopics, ...friendTopics, ...messageTopics])].slice(0, 5);
  const topicText = topics.length ? topics.join(", ") : "kết nối mới";
  const leadTopic = topics[0] || "câu chuyện này";
  const lastMessage = messages.at(-1);
  const hasEncrypted = messages.some((message) => message.e2ee);
  const signal = buildAiSignal(messages, person, topics, sharedTopics);
  const replies = buildAiReplies(person, signal, leadTopic);
  const actions = buildAiActions(signal, person, leadTopic);

  const encryptedNote = hasEncrypted
    ? " Một số nội dung đang mã hoá nên AI chỉ phân tích phần đang hiển thị."
    : "";
  const summary = messages.length
    ? `Cuộc trò chuyện với ${person.name} có ${messages.length} tin nhắn gần đây. Chủ đề nổi bật: ${topicText}. Tin mới nhất: "${truncateAiText(lastMessage.text, 82)}".${encryptedNote}`
    : `Bạn chưa có tin nhắn với ${person.name}. AI gợi ý bắt đầu bằng một lời chào ngắn, thân thiện và có liên quan đến hồ sơ.`;

  const opener = `Chào ${person.name}, mình thấy chúng ta có thể cùng quan tâm đến ${leadTopic}. Rất vui được kết nối với bạn trên XPAY Chat.`;
  const suggestion = !messages.length
    ? opener
    : replies[1] || replies[0] || "";

  const common = sharedTopics.length
    ? `Điểm chung nổi bật: ${sharedTopics.join(", ")}. Đây là phần XPAY Twin AI có thể dùng để mở rộng câu chuyện tự nhiên hơn.`
    : topics.length
      ? `AI tìm thấy các chủ đề có thể khai thác: ${topicText}. Chưa thấy điểm chung rõ ràng từ hồ sơ hai bên.`
      : "Hồ sơ còn ít thông tin. Bạn có thể cập nhật sở thích để AI tìm điểm chung tốt hơn.";

  const state = messages.length
    ? `XPAY Twin nhận diện cảm xúc "${signal.mood}", ý định "${signal.intent}", độ ưu tiên "${signal.urgency}". Điểm phù hợp ước tính ${signal.trustScore}/100 dựa trên hồ sơ, điểm chung và nhịp hội thoại.`
    : `Đây là kết nối mới. XPAY Twin sẽ ưu tiên lời chào ngắn, lịch sự và liên quan đến ${leadTopic}.`;

  const memory = messages.length
    ? `XPAY Memory tạm ghi nhận: ${person.name} liên quan đến ${topicText}; tin gần nhất thuộc nhóm "${signal.intent}". Dữ liệu này chỉ dùng để gợi ý trong phiên hội thoại.`
    : `XPAY Memory sẽ bắt đầu học từ sở thích công khai của bạn và ${person.name}: ${topicText}.`;

  const safetySignals = [];
  if (friendPhone(person)) safetySignals.push("đã có định danh số điện thoại trong danh bạ");
  if (person.avatarData) safetySignals.push("có ảnh đại diện");
  if (person.interests) safetySignals.push("có sở thích công khai");
  const safety = signal.hasRisk
    ? "Cảnh báo AI: hội thoại có dấu hiệu nhắc đến mã, mật khẩu, ngân hàng hoặc giấy tờ. Không chia sẻ OTP, không mở link lạ và nên xác minh bằng cuộc gọi."
    : safetySignals.length
      ? `Tín hiệu an toàn cơ bản: ${safetySignals.join(", ")}. AI chỉ gợi ý nội dung, không tự gửi tin nhắn và không mở thông tin đã bị ẩn.`
      : "Hồ sơ người này còn ít tín hiệu công khai. Nên trò chuyện thận trọng và không chia sẻ mã OTP, mật khẩu hoặc thông tin nhạy cảm.";

  return {
    mood: signal.mood,
    intent: signal.intent,
    urgency: signal.urgency,
    summary,
    state,
    suggestion,
    replies,
    common,
    actions,
    memory,
    safety,
    opener
  };
}

function renderAiTwinPanel() {
  if (!aiPanel || aiPanel.classList.contains("hidden")) return;
  const insight = buildAiTwinInsight();
  lastAiSuggestion = insight.suggestion;
  lastAiOpener = insight.opener;
  lastAiReplies = insight.replies || [];
  aiMoodPill.textContent = `Cảm xúc: ${insight.mood}`;
  aiIntentPill.textContent = `Ý định: ${insight.intent}`;
  aiUrgencyPill.textContent = `Ưu tiên: ${insight.urgency}`;
  aiSummary.textContent = insight.summary;
  aiConversationState.textContent = insight.state;
  aiSuggestion.textContent = insight.suggestion || "Chưa có gợi ý trả lời.";
  aiCommon.textContent = insight.common;
  aiActions.innerHTML = (insight.actions || [])
    .map((action) => `<span>${escapeHtml(action)}</span>`)
    .join("");
  aiMemory.textContent = insight.memory;
  aiSafety.textContent = insight.safety;
  aiOpener.textContent = insight.opener || "Chọn một người bạn để tạo lời mở đầu.";
  [...aiReplyGrid.querySelectorAll(".ai-reply-btn")].forEach((button, index) => {
    button.disabled = !lastAiReplies[index];
    button.title = lastAiReplies[index] || "Chưa có gợi ý";
  });
  useAiSuggestionBtn.disabled = !lastAiSuggestion;
  useAiOpenerBtn.disabled = !lastAiOpener;
}

function openAiPanel() {
  if (!people.length) return;
  aiPanel.classList.remove("hidden");
  renderAiTwinPanel();
}

function closeAiPanel() {
  aiPanel?.classList.add("hidden");
}

function useAiText(text) {
  if (!text || messageInput.disabled) return;
  messageInput.value = text;
  autoSizeMessageInput();
  try {
    messageInput.focus({ preventScroll: true });
  } catch {
    messageInput.focus();
  }
  closeAiPanel();
}

async function makeSecureMessage({ from = "me", text = "", media = null, time = nowTime() }) {
  const encrypted = await encryptPayload({ text, media });
  if (!encrypted) return { from, text, media, time };
  return {
    from,
    text: "Tin nhắn đã mã hoá",
    media: null,
    time,
    ...encrypted
  };
}

async function sendServerMessage(person, message) {
  const friendPhoneValue = friendPhone(person);
  if (!hasServerSession() || !friendPhoneValue) return null;

  try {
    const result = await apiRequest("/api/messages/send", {
      friendPhone: friendPhoneValue,
      message
    });
    setHiddenChatPhone(friendPhoneValue, false);
    return result;
  } catch (error) {
    if (error.status === 401) safeRemoveItem(authTokenKey);
    return null;
  }
}

function addPlainMessage(person, message) {
  if (message.from !== "them") setHiddenChatPhone(friendPhone(person), false);
  person.messages.push({
    from: message.from === "them" ? "them" : "me",
    text: message.text || "",
    media: message.media || null,
    time: message.time || nowTime(),
    id: message.id || `local-${Date.now()}`,
    recalled: Boolean(message.recalled),
    recalledAt: message.recalledAt || "",
    reactions: message.reactions || { mine: "", items: [] },
    canRecall: Boolean(message.canRecall)
  });
  if (person.id === activeId) forceConversationScrollBottom = true;
  renderAll();
}

function findActiveMessage(messageId) {
  const person = getActivePerson();
  if (!person) return {};
  const message = person.messages.find((item) => item.id === messageId);
  return { person, message };
}

async function deleteMessageForMe(messageId) {
  const { person, message } = findActiveMessage(messageId);
  if (!person || !message) return;

  if (hasServerSession()) {
    const result = await apiRequest("/api/messages/delete", {
      friendPhone: friendPhone(person),
      messageId
    }).catch((error) => {
      messageInput.placeholder = error.message || "Không xoá được tin nhắn";
      return null;
    });
    if (!result) return;
  }

  person.messages = person.messages.filter((item) => item.id !== messageId);
  if (!hasServerSession()) savePeople();
  renderAll();
  if (hasServerSession()) syncServerData();
}

function findAiAssistantMessage(messageId) {
  const message = aiAssistantMessages.find((item) => item.id === messageId);
  return { message };
}

async function copyAiAssistantMessage(messageId) {
  const { message } = findAiAssistantMessage(messageId);
  if (!message?.text) return;
  const copied = await copyTextToClipboard(message.text);
  messageInput.placeholder = copied ? "Đã sao chép tin nhắn XPAY AI." : "Không sao chép được tin nhắn.";
}

async function copyChatMessage(messageId) {
  const { message } = findActiveMessage(messageId);
  if (!message || message.recalled) return;
  const payload = await messagePayloadForAction(message);
  const copied = await copyTextToClipboard(payload.text);
  messageInput.placeholder = copied ? "Đã sao chép tin nhắn." : "Không sao chép được tin nhắn.";
}

async function createContentReport(payload = {}) {
  if (!hasServerSession()) {
    messageInput.placeholder = "Cần đăng nhập máy chủ để gửi báo cáo.";
    return false;
  }
  const reason = window.prompt("Lý do báo cáo nội dung này:", payload.reason || "Nội dung không phù hợp") || "";
  if (!reason.trim()) return false;
  await apiRequest("/api/reports/create", { ...payload, reason: reason.trim() });
  messageInput.placeholder = "Đã gửi báo cáo để quản trị viên xem xét.";
  return true;
}

async function reportChatMessage(messageId) {
  const { person, message } = findActiveMessage(messageId);
  if (!person || !message || message.recalled) return;
  const payload = await messagePayloadForAction(message);
  await createContentReport({
    targetType: "message",
    targetId: messageId,
    targetOwnerPhone: message.from === "me" ? normalizePhone(currentUser?.phone || currentUser?.accountPhone || "") : friendPhone(person),
    details: payload.text
  });
}

async function reportAiAssistantMessage(messageId) {
  const { message } = findAiAssistantMessage(messageId);
  if (!message || message.pending || message.from === "me") return;
  await createContentReport({
    targetType: "ai_output",
    targetId: messageId,
    details: message.text || ""
  });
}

function deleteAiAssistantMessage(messageId) {
  const before = aiAssistantMessages.length;
  aiAssistantMessages = aiAssistantMessages.filter((message) => message.id !== messageId);
  if (aiAssistantMessages.length === before) return;
  saveAiAssistantMessages();
  forceConversationScrollBottom = false;
  renderAll();
  messageInput.placeholder = "Đã xoá tin nhắn XPAY AI khỏi thiết bị này.";
}

function firstVisiblePersonAfterHidden(excludedId = "") {
  return people.find((person) => person.id !== excludedId && !isChatHidden(person)) || null;
}

function updateActiveAfterHiddenConversation(person) {
  if (!person || activeId !== person.id) return;
  const nextPerson = firstVisiblePersonAfterHidden(person.id);
  activeId = nextPerson?.id || "";
  if (!nextPerson || isCompactLayout()) chatApp.classList.remove("conversation-open");
}

async function deleteConversationForPerson(person, options = {}) {
  if (!person) return;
  const visibleCount = (person.messages || []).filter((message) => !message.deleted).length;
  const confirmed = options.confirmed === true || window.confirm(
    `Xoá toàn bộ đoạn chat với ${person.name || "người bạn này"} khỏi danh sách của bạn? Người bên kia vẫn giữ lịch sử của họ.`
  );
  if (!confirmed) return;

  if (hasServerSession()) {
    if (clearConversationBtn) clearConversationBtn.disabled = true;
    const result = await apiRequest("/api/conversations/delete", {
      friendPhone: friendPhone(person),
      hide: true
    }).catch((error) => {
      messageInput.placeholder = error.message || "Không xoá được đoạn chat";
      return null;
    });
    if (clearConversationBtn) clearConversationBtn.disabled = false;
    if (!result) return;
  }

  person.messages = [];
  markConversationReadByPhone(friendPhone(person));
  setHiddenChatPhone(friendPhone(person), true, { sync: !hasServerSession() });
  if (!hasServerSession()) savePeople();
  updateActiveAfterHiddenConversation(person);
  forceConversationScrollBottom = true;
  renderAll();
  messageInput.placeholder = visibleCount ? "Đã xoá đoạn chat khỏi danh sách của bạn." : "Đã xoá khỏi danh sách chat.";
  if (hasServerSession()) syncServerData();
}

async function clearActiveConversation() {
  if (isAiAssistantView()) return;
  await deleteConversationForPerson(getActivePerson());
}

async function recallMessageForEveryone(messageId) {
  const { person, message } = findActiveMessage(messageId);
  if (!person || !message || message.from !== "me" || message.recalled) return;

  if (hasServerSession()) {
    const result = await apiRequest("/api/messages/recall", {
      friendPhone: friendPhone(person),
      messageId
    }).catch((error) => {
      messageInput.placeholder = error.message || "Không thu hồi được tin nhắn";
      return null;
    });
    if (!result?.message) return;
    Object.assign(message, result.message);
  } else {
    message.text = "Tin nhắn đã được thu hồi";
    message.media = null;
    message.recalled = true;
    message.recalledAt = new Date().toISOString();
    savePeople();
  }

  renderAll();
  if (hasServerSession()) syncServerData();
}

async function reactToMessage(messageId, emoji) {
  const { person, message } = findActiveMessage(messageId);
  if (!person || !message || message.recalled) return;

  if (hasServerSession()) {
    const result = await apiRequest("/api/messages/react", {
      friendPhone: friendPhone(person),
      messageId,
      emoji
    }).catch((error) => {
      messageInput.placeholder = error.message || "Không thả được cảm xúc";
      return null;
    });
    if (!result?.message) return;
    message.reactions = result.message.reactions || { mine: "", items: [] };
  } else {
    const previousMine = message.reactions?.mine || "";
    const nextMine = previousMine === emoji ? "" : emoji;
    const counts = new Map((message.reactions?.items || []).map((item) => [item.emoji, Number(item.count) || 0]));
    if (previousMine) counts.set(previousMine, Math.max(0, (counts.get(previousMine) || 0) - 1));
    if (nextMine) counts.set(nextMine, (counts.get(nextMine) || 0) + 1);
    message.reactions = {
      mine: nextMine,
      items: Array.from(counts.entries())
        .filter(([, count]) => count > 0)
        .map(([emojiValue, count]) => ({ emoji: emojiValue, count }))
    };
    savePeople();
  }

  renderAll();
}

function closeMessageActionSheet() {
  document.querySelectorAll(".message-action-sheet").forEach((sheet) => sheet.remove());
  document.body.classList.remove("message-action-open");
}

function actionTextSnippet(value, maxLength = 88) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "Tin nhắn";
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

async function messagePayloadForAction(message) {
  const opened = await openMessagePayload(message);
  const text = opened.text || "";
  const media = opened.media || null;
  const fallback = media?.type?.startsWith("video/") ? "[Video]" : media ? "[Hình ảnh]" : "Tin nhắn";
  return { text: text || fallback, media };
}

async function replyToMessage(messageId) {
  const { message } = findActiveMessage(messageId);
  if (!message || message.recalled) return;
  const payload = await messagePayloadForAction(message);
  const prefix = `Trả lời "${actionTextSnippet(payload.text, 48)}": `;
  messageInput.value = messageInput.value.trim() ? `${prefix}${messageInput.value.trim()}` : prefix;
  autoSizeMessageInput();
  try {
    messageInput.focus({ preventScroll: true });
  } catch {
    messageInput.focus();
  }
}

async function forwardMessageToFriend(messageId, targetPerson) {
  const { message } = findActiveMessage(messageId);
  if (!message || message.recalled || !targetPerson) return;
  const payload = await messagePayloadForAction(message);
  const text = payload.text.startsWith("[") ? "Tin nhắn được chuyển tiếp" : `Chuyển tiếp: ${payload.text}`;
  const time = nowTime();

  if (hasServerSession()) {
    const sent = await sendServerMessage(targetPerson, { text, media: payload.media || null, time });
    if (!sent?.message) {
      messageInput.placeholder = "Không chuyển tiếp được, vui lòng thử lại";
      return;
    }
    targetPerson.messages.push({
      from: "me",
      text: sent.message.text || text,
      media: sent.message.media || payload.media || null,
      time: sent.message.time || time,
      id: sent.message.id || `forward-${Date.now()}`,
      recalled: Boolean(sent.message.recalled),
      recalledAt: sent.message.recalledAt || "",
      reactions: sent.message.reactions || { mine: "", items: [] },
      canRecall: Boolean(sent.message.canRecall)
    });
    renderAll();
    syncServerData();
    return;
  }

  targetPerson.messages.push(await makeSecureMessage({ from: "me", text, media: payload.media || null, time }));
  savePeople();
  renderAll();
}

function openForwardTargetSheet(messageId) {
  closeMessageActionSheet();
  const candidates = people.filter((person) => person.id && person.id !== activeId);
  const sheet = document.createElement("section");
  sheet.className = "message-action-sheet";
  sheet.setAttribute("role", "dialog");
  sheet.setAttribute("aria-label", "Chọn người nhận chuyển tiếp");
  sheet.innerHTML = `
    <div class="message-action-panel">
      <div class="message-action-title">
        <strong>Chuyển tiếp tin nhắn</strong>
        <span>Chọn một người bạn để gửi bản chuyển tiếp.</span>
      </div>
      <div class="message-forward-list">
        ${
          candidates.length
            ? candidates
                .map(
                  (person) => `
                    <button class="message-action-row" type="button" data-forward-target="${escapeHtml(person.id)}">
                      <span>${displayNameWithBadges(person)}</span>
                      <small>${escapeHtml(person.phone || friendPhone(person) || "")}</small>
                    </button>
                  `
                )
                .join("")
            : `<p class="message-action-empty">Chưa có người bạn khác để chuyển tiếp.</p>`
        }
      </div>
      <button class="message-action-cancel" type="button" data-message-action-close>Đóng</button>
    </div>
  `;
  sheet.addEventListener("click", async (event) => {
    if (event.target === sheet || event.target.closest("[data-message-action-close]")) {
      closeMessageActionSheet();
      return;
    }
    const targetButton = event.target.closest("[data-forward-target]");
    if (!targetButton) return;
    const targetPerson = people.find((person) => person.id === targetButton.dataset.forwardTarget);
    closeMessageActionSheet();
    await forwardMessageToFriend(messageId, targetPerson);
  });
  document.body.appendChild(sheet);
  document.body.classList.add("message-action-open");
}

async function openMessageActionSheet(messageId) {
  if (isAiAssistantView()) {
    openAiAssistantMessageActionSheet(messageId);
    return;
  }
  const { message } = findActiveMessage(messageId);
  if (!message) return;
  closeMessageActionSheet();
  const canRecall = message.from === "me" && !message.recalled;
  const canReplyOrForward = !message.recalled;
  const sheet = document.createElement("section");
  sheet.className = "message-action-sheet";
  sheet.setAttribute("role", "dialog");
  sheet.setAttribute("aria-label", "Thao tác tin nhắn");
  sheet.innerHTML = `
    <div class="message-action-panel">
      <div class="message-action-title">
        <strong>Thao tác tin nhắn</strong>
        <span>Chọn hành động cho tin nhắn này.</span>
      </div>
      ${
        canReplyOrForward
          ? `<div class="message-reaction-picker" aria-label="Thả cảm xúc">
              ${messageReactionOptions
                .map((emoji) => {
                  const active = message.reactions?.mine === emoji ? " active" : "";
                  return `<button class="message-reaction-choice${active}" type="button" data-message-reaction="${escapeHtml(emoji)}">${escapeHtml(emoji)}</button>`;
                })
                .join("")}
            </div>`
          : ""
      }
      <button class="message-action-row" type="button" data-message-menu-action="reply" ${canReplyOrForward ? "" : "disabled"}>
        <span>Trả lời</span>
        <small>Gắn nội dung tin nhắn vào ô soạn</small>
      </button>
      <button class="message-action-row" type="button" data-message-menu-action="copy" ${canReplyOrForward ? "" : "disabled"}>
        <span>Sao chép tin nhắn</span>
        <small>Copy nội dung tin nhắn vào clipboard</small>
      </button>
      <button class="message-action-row" type="button" data-message-menu-action="forward" ${canReplyOrForward ? "" : "disabled"}>
        <span>Chuyển tiếp</span>
        <small>Gửi sang hội thoại khác</small>
      </button>
      <button class="message-action-row warning" type="button" data-message-menu-action="report" ${canReplyOrForward ? "" : "disabled"}>
        <span>Báo cáo tin nhắn</span>
        <small>Gửi nội dung này tới quản trị viên xem xét</small>
      </button>
      ${
        canRecall
          ? `<button class="message-action-row warning" type="button" data-message-menu-action="recall">
              <span>Thu hồi</span>
              <small>Ẩn tin nhắn với cả hai bên</small>
            </button>`
          : ""
      }
      <button class="message-action-row danger" type="button" data-message-menu-action="delete">
        <span>Xoá ở phía tôi</span>
        <small>Chỉ xoá khỏi màn hình của tài khoản này</small>
      </button>
      <button class="message-action-cancel" type="button" data-message-action-close>Đóng</button>
    </div>
  `;
  sheet.addEventListener("click", async (event) => {
    if (event.target === sheet || event.target.closest("[data-message-action-close]")) {
      closeMessageActionSheet();
      return;
    }
    const actionButton = event.target.closest("[data-message-menu-action]");
    const reactionButton = event.target.closest("[data-message-reaction]");
    if (reactionButton) {
      const emoji = reactionButton.dataset.messageReaction || "";
      closeMessageActionSheet();
      await reactToMessage(messageId, emoji);
      return;
    }
    if (!actionButton) return;
    const action = actionButton.dataset.messageMenuAction;
    closeMessageActionSheet();
    if (action === "reply") await replyToMessage(messageId);
    if (action === "copy") await copyChatMessage(messageId);
    if (action === "forward") openForwardTargetSheet(messageId);
    if (action === "report") await reportChatMessage(messageId);
    if (action === "delete") deleteMessageForMe(messageId);
    if (action === "recall") recallMessageForEveryone(messageId);
  });
  document.body.appendChild(sheet);
  document.body.classList.add("message-action-open");
}

function openAiAssistantMessageActionSheet(messageId) {
  const { message } = findAiAssistantMessage(messageId);
  if (!message) return;
  closeMessageActionSheet();
  const canCopy = Boolean(String(message.text || "").trim());
  const sheet = document.createElement("section");
  sheet.className = "message-action-sheet";
  sheet.setAttribute("role", "dialog");
  sheet.setAttribute("aria-label", "Thao tác tin nhắn XPAY AI");
  sheet.innerHTML = `
    <div class="message-action-panel">
      <div class="message-action-title">
        <strong>Tin nhắn XPAY AI</strong>
        <span>${escapeHtml(actionTextSnippet(message.text, 92))}</span>
      </div>
      <button class="message-action-row" type="button" data-ai-message-action="copy" ${canCopy ? "" : "disabled"}>
        <span>Sao chép</span>
        <small>Copy nội dung tin nhắn vào clipboard</small>
      </button>
      <button class="message-action-row warning" type="button" data-ai-message-action="report" ${canCopy && message.from !== "me" ? "" : "disabled"}>
        <span>Báo cáo phản hồi AI</span>
        <small>Gửi phản hồi này tới quản trị viên xem xét</small>
      </button>
      <button class="message-action-row danger" type="button" data-ai-message-action="delete">
        <span>Xoá tin này</span>
        <small>Chỉ xoá khỏi lịch sử XPAY AI trên thiết bị này</small>
      </button>
      <button class="message-action-cancel" type="button" data-message-action-close>Đóng</button>
    </div>
  `;
  sheet.addEventListener("click", async (event) => {
    if (event.target === sheet || event.target.closest("[data-message-action-close]")) {
      closeMessageActionSheet();
      return;
    }
    const actionButton = event.target.closest("[data-ai-message-action]");
    if (!actionButton) return;
    const action = actionButton.dataset.aiMessageAction;
    closeMessageActionSheet();
    if (action === "copy") await copyAiAssistantMessage(messageId);
    if (action === "report") await reportAiAssistantMessage(messageId);
    if (action === "delete") deleteAiAssistantMessage(messageId);
  });
  document.body.appendChild(sheet);
  document.body.classList.add("message-action-open");
}

function closeOpenChatDeleteRows(exceptShell = null) {
  document.querySelectorAll(".chat-row-shell.is-delete-open").forEach((shell) => {
    if (shell !== exceptShell) shell.classList.remove("is-delete-open");
  });
}

function personFromChatElement(element) {
  const id = element?.dataset?.chatShell || element?.dataset?.id || element?.dataset?.deleteChatId || "";
  return people.find((person) => person.id === id) || null;
}

async function openChatDeleteSheet(personId) {
  const person = people.find((item) => item.id === personId);
  if (!person) return;
  closeMessageActionSheet();
  const sheet = document.createElement("section");
  sheet.className = "message-action-sheet chat-action-sheet";
  sheet.setAttribute("role", "dialog");
  sheet.setAttribute("aria-label", "Xoá đoạn chat");
  sheet.innerHTML = `
    <div class="message-action-panel chat-action-panel">
      <div class="message-action-title">
        <strong>${escapeHtml(person.name || "Đoạn chat")}</strong>
        <span>Xoá khỏi danh sách Tin nhắn của bạn, không ảnh hưởng dữ liệu phía người bên kia.</span>
      </div>
      <button class="message-action-row danger" type="button" data-chat-menu-action="delete">
        <span>Xoá</span>
        <small>Xoá toàn bộ đoạn chat ở phía tài khoản này</small>
      </button>
      <button class="message-action-cancel" type="button" data-message-action-close>Đóng</button>
    </div>
  `;
  sheet.addEventListener("click", async (event) => {
    if (event.target === sheet || event.target.closest("[data-message-action-close]")) {
      closeMessageActionSheet();
      return;
    }
    if (!event.target.closest("[data-chat-menu-action='delete']")) return;
    closeMessageActionSheet();
    await deleteConversationForPerson(person, { confirmed: true });
  });
  document.body.appendChild(sheet);
  document.body.classList.add("message-action-open");
}

function privacyLabel(value) {
  if (value === "private") return "Chỉ mình tôi";
  if (value === "friends") return "Bạn bè";
  return "Công khai";
}

function syncJournalPrivacyButtons(value = journalPrivacyInput?.value || "public") {
  journalPrivacyButtons.forEach((button) => {
    const active = button.dataset.journalPrivacy === value;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

function renderJournals() {
  if (!journalPosts) return;
  if (!journals.length) {
    journalPosts.innerHTML = `<p class="journal-empty">Chưa có nhật ký nào.</p>`;
    return;
  }

  journalPosts.innerHTML = journals
    .map((post) => {
      const media = post.image
        ? `<button class="journal-media-thumb" type="button" aria-label="Xem ảnh nhật ký">
            <img src="${escapeHtml(post.image.data)}" alt="${escapeHtml(post.image.name || "Ảnh nhật ký")}" />
          </button>`
        : "";
      const canDelete = !post.authorPhone || samePhone(post.authorPhone, currentUser?.phone || "");
      const deleteButton = canDelete
        ? `<button class="delete-journal-btn" type="button" data-delete-journal="${escapeHtml(post.id)}">Xoá</button>`
        : "";
      const reportButton = !canDelete
        ? `<button class="delete-journal-btn" type="button" data-report-journal="${escapeHtml(post.id)}">Báo cáo</button>`
        : "";
      const authorName = escapeHtml(post.authorName || "XPAY User");
      const avatarStyle = post.avatarData ? `background-image:url('${escapeHtml(post.avatarData)}')` : "";
      const bodyText = post.text
        ? `<p>${escapeHtml(post.text)}</p>`
        : `<p class="journal-muted">Đã đăng một hình ảnh mới.</p>`;
      return `
        <article class="journal-post" data-id="${escapeHtml(post.id)}">
          <header>
            <div class="avatar avatar-me" style="${avatarStyle}">${
              post.avatarData ? "" : escapeHtml(initials(post.authorName || "XPAY User"))
            }</div>
            <div>
              <strong>${authorName}</strong>
              <span>${escapeHtml(post.time || "")} • ${escapeHtml(privacyLabel(post.privacy))}</span>
            </div>
            ${deleteButton}${reportButton}
          </header>
          <div class="journal-post-body${post.image ? " has-media" : ""}">
            <div class="journal-copy">${bodyText}</div>
            ${media}
          </div>
        </article>
      `;
    })
    .join("");
}

function selectPerson(id, options = {}) {
  const person = findPersonByIdOrPhone(id, options.phone, { preferPhone: options.preferPhone });
  const fallback = options.allowFallback ? people.find((item) => !isChatHidden(item)) || people[0] : null;
  const target = person || fallback;
  if (!target) return null;
  if (options.revealHidden) setHiddenChatPhone(friendPhone(target), false, { sync: options.syncHidden !== false });
  activeId = target.id;
  chatApp.classList.add("conversation-open");
  forceConversationScrollBottom = true;
  markActiveConversationRead();
  renderAll();
  renderAiTwinPanel();
  return target;
}

function nowTime() {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date());
}

function readMediaFile(file, options = {}) {
  const maxSize = options.maxSize || 15 * 1024 * 1024;
  const accepted = options.accepted || [];

  return new Promise((resolve, reject) => {
    if (!file) {
      resolve(null);
      return;
    }

    if (accepted.length && !accepted.some((prefix) => file.type.startsWith(prefix))) {
      reject(new Error("unsupported"));
      return;
    }

    if (file.size > maxSize) {
      reject(new Error("too-large"));
      return;
    }

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      resolve({
        data: String(reader.result || ""),
        type: file.type,
        name: file.name,
        size: file.size
      });
    });
    reader.addEventListener("error", () => reject(new Error("read-failed")));
    reader.readAsDataURL(file);
  });
}

function createOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function resetOtpFlow() {
  pendingOtp = null;
  pendingOtpPhone = "";
  pendingOtpEmail = "";
  pendingOtpExpiresAt = 0;
  pendingOtpPurpose = "";
  otpInput.value = "";
  otpPanel.classList.add("hidden");
  resendOtpBtn.classList.add("hidden");
  authSubmitBtn.textContent = authMode === "forgot" ? "Gửi OTP khôi phục" : "Đăng nhập";
  otpLocalCode.textContent = "";
}

async function startOtpFlow(phone, purpose, email = "") {
  const cleanEmail = normalizeEmail(email);
  if (!validEmail(cleanEmail)) {
    authStatus.textContent = "Vui lòng nhập email hợp lệ để nhận OTP.";
    return false;
  }
  if (isServerRuntime()) {
    authStatus.textContent = "Đang gửi OTP qua email...";
    try {
      await apiRequest("/api/auth/otp/request", { phone, email: cleanEmail, purpose }, { auth: false });
      pendingOtp = "__server_email__";
      pendingOtpPhone = normalizePhone(phone);
      pendingOtpEmail = cleanEmail;
      pendingOtpExpiresAt = Date.now() + 5 * 60 * 1000;
      pendingOtpPurpose = purpose;
      otpPanel.classList.remove("hidden");
      resendOtpBtn.classList.remove("hidden");
      authSubmitBtn.textContent = purpose === "forgot" ? "Đặt lại mật khẩu" : "Xác nhận OTP";
      authStatus.textContent = `Đã gửi OTP đến ${cleanEmail}. Mã có hiệu lực trong 5 phút.`;
      otpLocalCode.textContent = "";
      otpInput.focus();
      return true;
    } catch (error) {
      authStatus.textContent = error.message || "Chưa gửi được OTP qua email.";
      return false;
    }
  }

  pendingOtp = createOtp();
  pendingOtpPhone = normalizePhone(phone);
  pendingOtpEmail = cleanEmail;
  pendingOtpExpiresAt = Date.now() + 5 * 60 * 1000;
  pendingOtpPurpose = purpose;
  otpPanel.classList.remove("hidden");
  resendOtpBtn.classList.remove("hidden");
  authSubmitBtn.textContent = purpose === "forgot" ? "Đặt lại mật khẩu" : "Xác nhận OTP";
  authStatus.textContent = `Đã gửi OTP đến ${phone}. Mã có hiệu lực trong 5 phút.`;
  otpLocalCode.textContent = `Mã OTP kiểm thử cục bộ: ${pendingOtp}`;
  otpInput.focus();
  return true;
}

function verifyOtp(phone, code, purpose) {
  if (pendingOtp === "__server_email__") return true;
  if (!pendingOtp || normalizePhone(phone) !== pendingOtpPhone) return false;
  if (purpose && pendingOtpPurpose !== purpose) return false;
  if (Date.now() > pendingOtpExpiresAt) return false;
  return code.trim() === pendingOtp;
}

function setAuthMode(mode) {
  if (!["login", "forgot"].includes(mode)) mode = "login";
  authMode = mode;
  document.body.dataset.authMode = mode;
  resetOtpFlow();
  document.querySelectorAll(".auth-tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.authMode === mode);
  });

  const isForgot = mode === "forgot";
  authTitle.textContent = isForgot ? t("forgotTitle") : t("loginTitle");
  emailField.classList.toggle("hidden", !isForgot);
  nameField.classList.add("hidden");
  passwordField.classList.toggle("hidden", false);
  confirmPasswordField.classList.toggle("hidden", !isForgot);
  passwordLabel.textContent = isForgot ? t("newPassword") : t("password");
  nameInput.required = false;
  emailInput.required = isForgot;
  passwordInput.required = true;
  confirmPasswordInput.required = isForgot;
  authSubmitBtn.textContent = isForgot ? t("forgotSubmit") : t("loginSubmit");
  authStatus.textContent = isForgot
      ? t("authForgotStatus")
      : t("authLoginStatus");
}

function updateDistancesFromLocation() {
  people = people.map((person, index) => ({
    ...person,
    distance: Math.max(0.4, (parseDistanceKm(person.distance) ?? 0.8 + index * 0.7) + (index - 1.5) * 0.18)
  }));
  savePeople();
  renderAll();
}

function currentAccountPhone(user = currentUser || {}) {
  return normalizePhone(user.accountPhone || user.phone || "");
}

function friendPayload() {
  const user = currentUser || JSON.parse(localStorage.getItem(storageKey) || "{}");
  const accountPhone = currentAccountPhone(user);
  return JSON.stringify({
    type: "xpaychat-friend",
    version: 2,
    app: "XPAY Chat",
    phone: accountPhone,
    name: user.fullName || user.name || "XPAY User"
  });
}

function openProfileModal() {
  if (!currentUser) return;
  pendingAvatarData = currentUser.avatarData || "";
  profileFullNameInput.value = currentUser.fullName || currentUser.name || "";
  profileEmailInput.value = currentUser.email || "";
  profileEmailInput.placeholder = currentUser.email ? "" : "Chưa có email khôi phục";
  profileBirthInput.value = currentUser.birthDate || "";
  syncBirthSelectsFromValue(profileBirthInput.value);
  profileInterestsInput.value = currentUser.interests || "";
  privacyPhoneInput.checked = currentUser.privacy.phone;
  privacyBirthInput.checked = currentUser.privacy.birthDate;
  privacyInterestsInput.checked = currentUser.privacy.interests;
  privacyAvatarInput.checked = currentUser.privacy.avatar;
  profileAvatarInput.value = "";
  paintAvatar(profileAvatarPreview, currentUser);
  profileStatus.textContent = hasServerSession()
    ? t("profileStatusServer")
    : t("profileStatusLocal");
  profileOverlay.classList.remove("hidden");
}

function closeProfileModal() {
  profileOverlay.classList.add("hidden");
}

function formatDate(dateValue) {
  if (!dateValue) return "";
  const [year, month, day] = dateValue.split("-");
  if (!year || !month || !day) return dateValue;
  return `${day}/${month}/${year}`;
}

function infoItem(label, value) {
  return `
    <div class="info-item">
      <span>${label}</span>
      <strong>${value}</strong>
    </div>
  `;
}

function openFriendInfo() {
  const person = normalizedPerson(getActivePerson());
  const distanceLabel = profileIsOnline(person) ? formatDistanceKm(person.distance) : "";
  friendInfoName.innerHTML = displayNameWithBadges(person);
  friendInfoStatus.textContent = person.status || "Bạn bè";
  friendInfoAvatar.textContent = person.avatarData && person.privacy.avatar ? "" : person.avatar;
  friendInfoAvatar.style.background = person.avatarData && person.privacy.avatar ? "" : person.color;
  friendInfoAvatar.style.backgroundImage =
    person.avatarData && person.privacy.avatar ? `url("${person.avatarData}")` : "";

  const rows = [
    infoItem("Họ và tên", person.name),
    person.privacy.phone && person.phone ? infoItem("Số điện thoại", person.phone) : "",
    person.privacy.birthDate && person.birthDate ? infoItem("Ngày sinh", formatDate(person.birthDate)) : "",
    person.privacy.interests && person.interests
      ? `<div class="info-item"><span>Sở thích</span><p>${person.interests}</p></div>`
      : "",
    infoItem("Trạng thái", person.status || "Bạn bè"),
    distanceLabel ? infoItem("Khoảng cách", distanceLabel) : ""
  ].filter(Boolean);

  friendInfoList.innerHTML = rows.join("");
  friendInfoOverlay.classList.remove("hidden");
}

function closeFriendInfo() {
  friendInfoOverlay.classList.add("hidden");
}

function renderFriendsDirectory() {
  if (!friendsDirectoryList) return;
  renderReferralPanel();
  const sorted = [...people].sort((a, b) => a.name.localeCompare(b.name, "vi"));
  const incomingRequests = friendRequests.filter((request) => request.direction === "incoming" && request.status === "pending");
  const outgoingRequests = friendRequests.filter((request) => request.direction === "outgoing" && request.status === "pending");
  const requestMarkup = [...incomingRequests, ...outgoingRequests]
    .map((request) => {
      const profile = request.profile || {};
      const name = profile.fullName || profile.name || request.requesterPhone || request.targetPhone || "XPAY User";
      const incoming = request.direction === "incoming";
      return `
        <article class="person-row friends-directory-row friend-request-row">
          ${avatarMarkup(normalizeUser(profile))}
          <div class="row-main">
            <div class="row-top">
              <strong>${escapeHtml(name)}</strong>
              <span>${incoming ? "Muốn kết bạn" : "Đang chờ"}</span>
            </div>
            <p>${escapeHtml(incoming ? "Chấp nhận nếu anh biết người này." : "Đợi người kia xác nhận yêu cầu.")}</p>
          </div>
          ${
            incoming
              ? `<button type="button" data-friend-request-action="accept" data-friend-request-id="${escapeHtml(request.id)}">Nhận</button>
                 <button type="button" data-friend-request-action="reject" data-friend-request-id="${escapeHtml(request.id)}">Từ chối</button>`
              : ""
          }
        </article>
      `;
    })
    .join("");
  if (!sorted.length && !requestMarkup) {
    friendsDirectoryList.innerHTML = `
      <div class="empty-state">
        <strong>Chưa có bạn bè</strong>
        <span>Bấm Thêm bạn hoặc Quét QR để bắt đầu danh bạ XPAY Chat.</span>
      </div>
    `;
    return;
  }

  friendsDirectoryList.innerHTML = `
    ${requestMarkup}
    ${sorted
    .map((person) => {
      const normalized = normalizedPerson(person);
      const phone = friendPhone(normalized);
      const phoneText = normalized.privacy.phone && phone ? phone : "Đã kết nối XPAY Chat";
      return `
        <button class="person-row friends-directory-row" type="button" data-friends-id="${escapeHtml(person.id)}" data-friends-phone="${escapeHtml(phone)}">
          ${avatarMarkup(normalized)}
          <div class="row-main">
            <div class="row-top">
              <strong>${displayNameWithBadges(normalized)}</strong>
              <span>${escapeHtml(normalized.status || "Bạn bè")}</span>
            </div>
            <p>${escapeHtml(phoneText)}</p>
          </div>
        </button>
      `;
    })
    .join("")}
  `;
}

function openFriendsDirectory() {
  renderReferralPanel();
  renderFriendsDirectory();
  friendsOverlay?.classList.remove("hidden");
}

function closeFriendsDirectory() {
  friendsOverlay?.classList.add("hidden");
}

function currentReferral() {
  return normalizeReferral(currentUser?.referral || {}, currentUser || {});
}

function renderReferralPanel() {
  if (!referralPointsText || !referralStatus) return;
  const referral = currentReferral();
  referralPointsText.textContent = `Điểm giới thiệu: ${referral.points} điểm`;
  referralStatus.textContent = "Mỗi tài khoản mới xác minh thành công qua link giới thiệu sẽ được tính 1 điểm.";
}

async function copyTextToClipboard(text = "") {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    let copied = false;
    try {
      copied = document.execCommand("copy");
    } catch {}
    area.remove();
    return copied;
  }
}

async function createReferralShareContent() {
  const referral = currentReferral();
  const text = referral.shareText;
  const copied = await copyTextToClipboard(text);
  referralStatus.textContent = copied
    ? "Đã sao chép nội dung giới thiệu XPAY Chat."
    : text;
  return text;
}

async function shareReferralContent() {
  const text = await createReferralShareContent();
  if (navigator.share) {
    try {
      await navigator.share({ title: "Mời tham gia XPAY Chat", text });
      referralStatus.textContent = "Đã mở bảng chia sẻ link XPAY Chat.";
      return;
    } catch {}
  }
  referralStatus.textContent = "Đã sao chép nội dung giới thiệu XPAY Chat để anh gửi cho bạn bè.";
}

function appAdminBadgeText(user = {}) {
  const badges = normalizeAccountBadges(user.accountBadges);
  const labels = [];
  if (badges.verified) labels.push("Tích xanh");
  if (badges.vip) labels.push("VIP");
  return labels.length ? labels.join(", ") : "Thường";
}

function appAdminPrivacyText(privacy = {}) {
  const enabled = [];
  if (privacy.phone) enabled.push("SĐT");
  if (privacy.birthDate) enabled.push("Ngày sinh");
  if (privacy.interests) enabled.push("Sở thích");
  if (privacy.avatar) enabled.push("Avatar");
  return enabled.length ? enabled.join(", ") : "Không hiển thị";
}

function formatDateTime(value = "") {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(date);
}

function appAdminInfoItem(label, value) {
  return `
    <div class="info-item">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value || "Chưa có")}</strong>
    </div>
  `;
}

function appAdminAvatarMarkup(user = {}) {
  const label = initials(user.fullName || user.name || "XPAY User");
  if (user.avatarData) return `<div class="avatar"><img src="${escapeHtml(user.avatarData)}" alt="${escapeHtml(user.fullName || user.name || "XPAY User")}" /></div>`;
  return `<div class="avatar">${escapeHtml(label)}</div>`;
}

function renderAppAdminList() {
  if (!appAdminUsersList) return;
  if (!appAdminFilteredUsers.length) {
    appAdminUsersList.innerHTML = `
      <div class="empty-state">
        <strong>Không tìm thấy người dùng</strong>
        <span>Thử tìm bằng tên, số điện thoại hoặc sở thích khác.</span>
      </div>
    `;
    return;
  }

  appAdminUsersList.innerHTML = appAdminFilteredUsers
    .map((user) => `
      <button class="app-admin-row ${user.accountPhone === appAdminSelectedPhone ? "active" : ""}" type="button" data-app-admin-phone="${escapeHtml(user.accountPhone)}">
        ${appAdminAvatarMarkup(user)}
        <div>
          <strong>${escapeHtml(user.fullName || user.name || "XPAY User")}</strong>
          <span>${escapeHtml(user.phone || user.accountPhone)} • ${escapeHtml(user.presenceOnline ? "Online" : "Offline")}</span>
        </div>
        <small>${escapeHtml(appAdminBadgeText(user))}</small>
      </button>
    `)
    .join("");
}

function renderAppAdminBusinesses() {
  const panel = document.querySelector("#appAdminBusinessList");
  if (!panel) return;
  const reportsMarkup = appAdminReports.length
    ? `
      <div class="app-admin-business-title">
        <strong>Báo cáo nội dung</strong>
        <span>${appAdminReports.length} báo cáo gần nhất</span>
      </div>
      ${appAdminReports.map((report) => `
        <article class="app-admin-business-card" data-report-id="${escapeHtml(report.id)}">
          <div>
            <strong>${escapeHtml(report.targetType || "report")} • ${escapeHtml(report.status || "open")}</strong>
            <span>${escapeHtml(report.reporterPhone || "")} báo cáo ${escapeHtml(report.targetOwnerPhone || report.targetId || "")}</span>
            <p>${escapeHtml(report.reason || "Nội dung cần xem xét")}</p>
            ${report.details ? `<small>${escapeHtml(actionTextSnippet(report.details, 180))}</small>` : ""}
          </div>
          <div class="app-admin-business-actions">
            <button type="button" data-report-status="reviewing">Đang xem</button>
            <button type="button" data-report-status="resolved">Đã xử lý</button>
            <button type="button" data-report-status="rejected">Bỏ qua</button>
          </div>
        </article>
      `).join("")}
    `
    : "";
  if (!appAdminBusinesses.length && !appAdminReports.length) {
    panel.innerHTML = `
      <div class="app-admin-business-empty">
        <strong>Chưa có hồ sơ doanh nghiệp</strong>
        <span>Hồ sơ người dùng tạo sẽ xuất hiện tại đây để admin duyệt.</span>
      </div>
    `;
    return;
  }
  panel.innerHTML = `
    <div class="app-admin-business-title">
      <strong>Quản lý doanh nghiệp</strong>
      <span>${appAdminBusinesses.length} hồ sơ • chỉ hồ sơ Đã duyệt mới hiển thị công khai</span>
    </div>
    ${appAdminBusinesses.map((business) => {
      const normalized = normalizeBusinessProfile(business);
      return `
        <article class="app-admin-business-card" data-business-owner="${escapeHtml(normalized.ownerPhone)}">
          <div>
            <strong>${escapeHtml(normalized.name || "Doanh nghiệp XPAY")}</strong>
            <span>${escapeHtml(normalized.category)} • ${escapeHtml(normalized.ownerPhone)} • ${escapeHtml(normalized.statusLabel)}</span>
            <p>${escapeHtml(normalized.description || "Chưa có mô tả")}</p>
            ${normalized.offer ? `<small>Ưu đãi: ${escapeHtml(normalized.offer)}</small>` : ""}
            ${normalized.reviewNote ? `<small>Lý do admin: ${escapeHtml(normalized.reviewNote)}</small>` : ""}
          </div>
          <div class="app-admin-business-actions">
            <button type="button" data-business-status="approved">Duyệt</button>
            <button type="button" data-business-status="needs_changes">Cần sửa</button>
            <button type="button" data-business-status="restricted">Hạn chế</button>
            <button type="button" data-business-status="locked">Khoá</button>
            <button type="button" data-business-status="rejected">Từ chối</button>
          </div>
        </article>
      `;
    }).join("")}
    ${reportsMarkup}
  `;
}

function renderAppAdminDetail(user) {
  if (!appAdminDetail) return;
  if (!user) {
    appAdminSelectedPhone = "";
    appAdminDetail.innerHTML = `
      <div class="detail-empty">
        <strong>Chọn người dùng</strong>
        <span>Thông tin hồ sơ và trạng thái sẽ hiển thị tại đây.</span>
      </div>
    `;
    renderAppAdminList();
    return;
  }

  appAdminSelectedPhone = user.accountPhone;
  appAdminDetail.innerHTML = `
    <div class="app-admin-profile">
      ${appAdminAvatarMarkup(user)}
      <h3>${escapeHtml(user.fullName || user.name || "XPAY User")}</h3>
      <span>${escapeHtml(user.accountPhone)} • ${escapeHtml(appAdminBadgeText(user))}</span>
    </div>
    <div class="info-list">
      ${appAdminInfoItem("Số điện thoại hồ sơ", user.phone || user.accountPhone)}
      ${appAdminInfoItem("Tên hiển thị", user.name)}
      ${appAdminInfoItem("Ngày sinh", user.birthDate)}
      ${appAdminInfoItem("Sở thích", user.interests)}
      ${appAdminInfoItem("Phân loại", appAdminBadgeText(user))}
      ${appAdminInfoItem("Quyền hiển thị", appAdminPrivacyText(user.privacy || {}))}
      ${appAdminInfoItem("Trạng thái", user.presenceOnline ? "Online" : "Offline")}
      ${appAdminInfoItem("Lý do offline", user.presenceOnline ? "Đang hoạt động" : user.presenceOfflineReasonText)}
      ${appAdminInfoItem("Chế độ người dùng chọn", user.presenceMode === "offline" ? "Offline" : "Online")}
      ${appAdminInfoItem("Lần hoạt động gần nhất", formatDateTime(user.lastSeenAt))}
      ${appAdminInfoItem("Bạn bè", `${user.friendsCount || 0} tài khoản`)}
      ${appAdminInfoItem("Danh sách bạn bè", (user.friends || []).join(", "))}
      ${appAdminInfoItem("Nhật ký", `${user.journalsCount || 0} bài`)}
      ${appAdminInfoItem("Tin nhắn liên quan", `${user.messagesCount || 0} tin`)}
      ${appAdminInfoItem("Cuộc gọi liên quan", `${user.callsCount || 0} cuộc`)}
      ${appAdminInfoItem("Quanh đây", user.locationEnabled ? "Đang bật" : "Đang tắt")}
      ${appAdminInfoItem("Toạ độ gần đây", user.latitude !== null && user.longitude !== null ? `${user.latitude}, ${user.longitude}` : "")}
      ${appAdminInfoItem("Cập nhật vị trí", formatDateTime(user.locationUpdatedAt))}
      ${appAdminInfoItem("Ngày tạo", formatDateTime(user.createdAt))}
      ${appAdminInfoItem("Cập nhật hồ sơ", formatDateTime(user.updatedAt))}
      ${appAdminInfoItem("Xác thực số", user.phoneVerified ? `Đã xác thực ${formatDateTime(user.verifiedAt)}` : "Chưa xác thực")}
    </div>
  `;
  renderAppAdminList();
}

function filterAppAdminUsers() {
  const keyword = (appAdminSearchInput?.value || "").trim().toLowerCase();
  appAdminFilteredUsers = appAdminUsers.filter((user) => {
    const haystack = [
      user.accountPhone,
      user.phone,
      user.name,
      user.fullName,
      user.birthDate,
      user.interests,
      user.presenceStatus,
      user.presenceOfflineReasonText,
      appAdminBadgeText(user)
    ].join(" ").toLowerCase();
    return haystack.includes(keyword);
  });
  renderAppAdminList();
  renderAppAdminDetail(appAdminFilteredUsers.find((user) => user.accountPhone === appAdminSelectedPhone) || appAdminFilteredUsers[0] || null);
}

async function loadAppAdminUsers() {
  if (!isAppAdminAccount()) {
    if (appAdminStatus) appAdminStatus.textContent = "Tài khoản này không có quyền xem dữ liệu người dùng.";
    return;
  }
  if (!hasServerSession()) {
    if (appAdminStatus) appAdminStatus.textContent = "Vui lòng đăng nhập tài khoản đặc quyền.";
    return;
  }
  if (appAdminStatus) appAdminStatus.textContent = "Đang tải dữ liệu người dùng...";
  try {
    const data = await apiRequest("/api/app-admin/users");
    appAdminUsers = data.users || [];
    appAdminBusinesses = (data.businesses || []).map((item) => normalizeBusinessProfile(item));
    appAdminReports = data.reports || [];
    if (appAdminStatus) appAdminStatus.textContent = `Đã tải ${data.total || appAdminUsers.length} người dùng • ${appAdminBusinesses.length} doanh nghiệp • ${appAdminReports.length} báo cáo • ${formatDateTime(data.generatedAt)}`;
    renderAppAdminBusinesses();
    filterAppAdminUsers();
  } catch (error) {
    if (appAdminStatus) appAdminStatus.textContent = error.message || "Không tải được dữ liệu người dùng.";
  }
}

async function updateAppAdminBusiness(ownerPhone, status) {
  const reviewNote = ["needs_changes", "restricted", "locked", "rejected"].includes(status)
    ? window.prompt("Nhập lý do để chủ doanh nghiệp biết cần xử lý:", "") || ""
    : "";
  if (!ownerPhone || !status) return;
  if (appAdminStatus) appAdminStatus.textContent = "Đang cập nhật hồ sơ doanh nghiệp...";
  try {
    const data = await apiRequest("/api/app-admin/business/update", { ownerPhone, status, reviewNote });
    appAdminBusinesses = (data.businesses || []).map((item) => normalizeBusinessProfile(item));
    renderAppAdminBusinesses();
    if (appAdminStatus) appAdminStatus.textContent = "Đã cập nhật trạng thái doanh nghiệp.";
  } catch (error) {
    if (appAdminStatus) appAdminStatus.textContent = error.message || "Không cập nhật được doanh nghiệp.";
  }
}

async function updateAppAdminReport(reportId, status) {
  if (!reportId || !status) return;
  if (appAdminStatus) appAdminStatus.textContent = "Đang cập nhật báo cáo...";
  try {
    const data = await apiRequest("/api/app-admin/reports/update", { id: reportId, status });
    appAdminReports = data.reports || appAdminReports.map((report) => report.id === reportId ? { ...report, status } : report);
    renderAppAdminBusinesses();
    if (appAdminStatus) appAdminStatus.textContent = "Đã cập nhật báo cáo.";
  } catch (error) {
    if (appAdminStatus) appAdminStatus.textContent = error.message || "Không cập nhật được báo cáo.";
  }
}

function openAppAdminPanel() {
  if (!isAppAdminAccount()) return;
  appAdminOverlay?.classList.remove("hidden");
  loadAppAdminUsers();
}

function closeAppAdminPanel() {
  appAdminOverlay?.classList.add("hidden");
}

function updateSettingsStatus(text = t("settingsSaved")) {
  if (settingsStatus) settingsStatus.textContent = text;
}

function renderSettingsPanel() {
  const mode = normalizePresenceMode(currentUser?.presenceMode || appSettings.presenceMode);
  if (presenceOnlineSetting) presenceOnlineSetting.checked = mode !== "offline";
  if (presenceOfflineSetting) presenceOfflineSetting.checked = mode === "offline";
  if (pushNotificationSetting) pushNotificationSetting.checked = Boolean(appSettings.pushNotifications);
  if (messageSoundSetting) messageSoundSetting.checked = Boolean(appSettings.messageSound);
  if (messageVibrationSetting) messageVibrationSetting.checked = Boolean(appSettings.messageVibration);
  if (unreadHighlightSetting) unreadHighlightSetting.checked = Boolean(appSettings.unreadHighlight);
  if (markReadOnOpenSetting) markReadOnOpenSetting.checked = Boolean(appSettings.markReadOnOpen);
  if (callRingtoneSetting) callRingtoneSetting.checked = Boolean(appSettings.callRingtone);
  if (callVibrationSetting) callVibrationSetting.checked = Boolean(appSettings.callVibration);
  if (callRingbackSetting) callRingbackSetting.checked = Boolean(appSettings.callRingback);
  if (settingsAiAutoReplyToggle) settingsAiAutoReplyToggle.checked = Boolean(aiSettings.autoReplySimple);
}

function openSettingsModal() {
  renderSettingsPanel();
  updateSettingsStatus(t("settingsStatus"));
  settingsOverlay?.classList.remove("hidden");
}

function closeSettingsModal() {
  settingsOverlay?.classList.add("hidden");
}

function openAccountDeleteModal() {
  accountDeletePasswordInput.value = "";
  accountDeleteConfirmInput.value = "";
  accountDeleteStatus.textContent = t("deleteAccountStatus");
  accountDeleteOverlay?.classList.remove("hidden");
}

function closeAccountDeleteModal() {
  accountDeleteOverlay?.classList.add("hidden");
}

function setAppSetting(key, enabled) {
  appSettings = { ...defaultAppSettings(), ...appSettings, [key]: Boolean(enabled) };
  saveAppSettings();
  if (key === "pushNotifications") {
    if (enabled) setupPushNotifications({ forcePermission: true });
    else unregisterPushToken().then(() => updateSettingsStatus("Đã tắt thông báo ngoài màn hình cho thiết bị này."));
  }
  if (key === "messageSound" && enabled) unlockMessageAudio();
  if (key === "callRingtone" && enabled) primeCallAudio();
  if ((key === "callRingtone" || key === "callVibration") && !appSettings.callRingtone && !appSettings.callVibration) {
    stopIncomingRingtone();
  }
  if (key === "callRingback" && !enabled) stopOutgoingRingback();
  if (key === "unreadHighlight" && !enabled) renderChats();
  if (key === "markReadOnOpen" && enabled) {
    markActiveConversationRead();
    renderChats();
  }
  updateSettingsStatus(t("settingsSaved"));
}

async function updatePresenceMode(mode) {
  const presenceMode = normalizePresenceMode(mode);
  appSettings.presenceMode = presenceMode;
  saveAppSettings();
  if (currentUser) {
    currentUser = normalizeUser({
      ...currentUser,
      presenceMode,
      presenceOnline: presenceMode === "online",
      presenceStatus: presenceMode === "online" ? "Online" : "Offline",
      lastSeenAt: presenceMode === "online" ? new Date().toISOString() : currentUser.lastSeenAt || ""
    });
    saveUser(currentUser);
  }
  renderSettingsPanel();
  renderUserProfile();
  renderAll();

  if (!hasServerSession()) {
    updateSettingsStatus(presenceMode === "online" ? "Đã chuyển sang trạng thái online." : "Đã chuyển sang trạng thái offline.");
    return;
  }

  updateSettingsStatus("Đang đồng bộ trạng thái...");
  try {
    const data = await apiRequest("/api/presence/update", { mode: presenceMode });
    if (data.user) saveUser(data.user);
    if (presenceMode === "offline") {
      people = people.map((person) => ({ ...person, distance: null }));
      nearbyPeople = [];
    }
    renderAll();
    updateSettingsStatus(presenceMode === "online" ? "Bạn đang online." : "Bạn đang offline. Khoảng cách của bạn sẽ được ẩn.");
  } catch (error) {
    updateSettingsStatus(error.network ? "Chưa cập nhật được trạng thái." : error.message || "Chưa đổi được trạng thái.");
  }
}

function updateAiAutoReplySetting(enabled) {
  aiSettings.autoReplySimple = Boolean(enabled);
  saveAiSettings();
  saveAiRulesToServer({ silent: true });
  if (aiAutoReplyToggle) aiAutoReplyToggle.checked = Boolean(enabled);
  updateSettingsStatus(enabled ? "XPAY AI đã bật tự trả lời chào hỏi." : "XPAY AI đã tắt tự trả lời chào hỏi.");
  renderAiAssistantList();
}

function setFriendView(view) {
  document.querySelectorAll(".friend-tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.friendView === view);
  });
  phoneFriendPanel.classList.toggle("hidden", view !== "phone");
  qrFriendPanel.classList.toggle("hidden", view !== "qr");
  scanFriendPanel.classList.toggle("hidden", view !== "scan");

  if (view === "qr") renderMyQr();
  if (view === "scan") friendStatus.textContent = "Bật camera hoặc chọn ảnh mã QR từ thư viện để kết bạn.";
  if (view === "phone") friendStatus.textContent = "Nhập số điện thoại XPAY Chat để kết bạn.";
  if (view !== "scan") stopQrScanner();
}

function openFriendModal(view = "phone") {
  friendOverlay.classList.remove("hidden");
  friendStatus.textContent = "Nhập số điện thoại hoặc quét mã QR XPAY Chat để kết bạn.";
  setFriendView(view);
}

function closeFriendModal() {
  stopQrScanner();
  friendOverlay.classList.add("hidden");
}

function renderMyQr() {
  const user = currentUser || {};
  qrOwnerName.textContent = user.fullName || user.name || "XPAY User";
  const accountPhone = currentAccountPhone(user);
  qrOwnerPhone.textContent = accountPhone || "Chưa có số điện thoại";

  if (!window.QRious) {
    friendStatus.textContent = "Chưa tải được bộ tạo mã QR.";
    return;
  }

  if (!accountPhone) {
    friendStatus.textContent = "Tài khoản chưa có số điện thoại để tạo mã QR.";
    return;
  }

  try {
    new QRious({
      element: myQrCanvas,
      value: friendPayload(),
      size: 236,
      level: "H",
      background: "white",
      foreground: "#101828"
    });
    friendStatus.textContent = "Đưa mã này cho người khác quét để kết bạn với bạn.";
  } catch {
    friendStatus.textContent = "Không tạo được mã QR. Hãy đăng nhập lại để đồng bộ số điện thoại.";
  }
}

function makeLocalFriendFromPhone(phone, name = "", extra = {}) {
  const cleanPhone = normalizePhone(phone);
  if (!cleanPhone) {
    friendStatus.textContent = "Vui lòng nhập số điện thoại hợp lệ.";
    return null;
  }

  if (currentUser && normalizePhone(currentUser.phone) === cleanPhone) {
    friendStatus.textContent = "Đây là số điện thoại của bạn.";
    return null;
  }

  const existing = people.find((person) => friendPhone(person) === cleanPhone || samePhone(person.phone, cleanPhone));
  if (existing) {
    friendStatus.textContent = `${existing.name} đã có trong danh sách bạn bè.`;
    selectPerson(existing.id, { phone: cleanPhone, preferPhone: true, revealHidden: true });
    return existing;
  }

  const displayName = name.trim() || `Bạn mới ${cleanPhone.slice(-4)}`;
  const palette = [
    "linear-gradient(135deg, #00a7c7, #15b97a)",
    "linear-gradient(135deg, #2563eb, #00a7c7)",
    "linear-gradient(135deg, #ff6b5f, #f4b740)",
    "linear-gradient(135deg, #101828, #2563eb)"
  ];
  const person = {
    id: `friend-${Date.now()}`,
    accountPhone: cleanPhone,
    name: displayName,
    phone: cleanPhone,
    birthDate: extra.birthDate || "",
    interests: extra.interests || "",
    avatarData: extra.avatarData || "",
    privacy: extra.privacy || { phone: true, birthDate: true, interests: true, avatar: true },
    distance: 0.8 + people.length * 0.7,
    status: "Bạn bè qua số điện thoại",
    avatar: initials(displayName),
    color: palette[people.length % palette.length],
    messages: [{ from: "them", text: "Đã kết bạn qua XPAY Chat.", time: nowTime() }]
  };

  upsertFriend(person);
  friendStatus.textContent = `Đã kết bạn với ${person.name}.`;
  return person;
}

async function addFriendByPhone(phone, name = "", extra = {}) {
  const cleanPhone = normalizePhone(phone);
  if (!cleanPhone) {
    friendStatus.textContent = "Vui lòng nhập số điện thoại hợp lệ.";
    return null;
  }

  const existing = people.find((person) => friendPhone(person) === cleanPhone || samePhone(person.phone, cleanPhone));
  if (existing) {
    friendStatus.textContent = `${existing.name} đã có trong danh sách bạn bè.`;
    selectPerson(existing.id, { phone: cleanPhone, preferPhone: true, revealHidden: true });
    return existing;
  }

  if (hasServerSession()) {
    friendStatus.textContent = "Đang tìm tài khoản...";
    try {
      const data = await apiRequest("/api/friends/add", { phone: cleanPhone });
      if (data.status === "pending") {
        friendStatus.textContent = "Đã gửi yêu cầu kết bạn. Khi người kia chấp nhận, hai bên mới nhắn tin/gọi được.";
        if (data.request) {
          friendRequests = [data.request, ...friendRequests.filter((request) => request.id !== data.request.id)];
          renderFriendsDirectory();
        }
        return null;
      }
      const person = upsertFriend(profileToPerson(data.friend, people.length));
      friendStatus.textContent = `Đã kết bạn với ${person.name}.`;
      syncServerData();
      return person;
    } catch (error) {
      if (!error.network) {
        friendStatus.textContent = error.message || "Không kết bạn được với số điện thoại này.";
        return null;
      }
      if (isServerRuntime()) {
        friendStatus.textContent = "Không kết nối được, chưa thể đồng bộ kết bạn.";
        return null;
      }
    }
  }

  return makeLocalFriendFromPhone(phone, name, extra);
}

async function respondFriendRequest(requestId, action) {
  if (!requestId || !["accept", "reject"].includes(action)) return;
  try {
    const data = await apiRequest("/api/friends/respond", { requestId, action });
    friendRequests = data.friendRequests || friendRequests.filter((request) => request.id !== requestId);
    if (data.accepted && data.friend) upsertFriend(profileToPerson(data.friend, people.length));
    renderFriendsDirectory();
    renderAll();
  } catch (error) {
    friendStatus.textContent = error.message || "Không xử lý được yêu cầu kết bạn.";
  }
}

function readQrContact(value) {
  const rawValue = String(value || "").trim();
  if (!rawValue) return null;

  try {
    const data = JSON.parse(rawValue);
    if (
      ["xpaychat-contact", "xpaychat-friend"].includes(data.type) &&
      normalizePhone(data.phone || data.accountPhone)
    ) {
      return {
        ...data,
        phone: normalizePhone(data.phone || data.accountPhone),
        name: data.name || data.fullName || ""
      };
    }
  } catch {
    try {
      const url = new URL(rawValue);
      const phone = normalizePhone(url.searchParams.get("phone") || url.searchParams.get("p") || "");
      if ((url.protocol === "xpaychat:" || /gatewayxpay\.com$/i.test(url.hostname)) && phone) {
        return {
          phone,
          name: url.searchParams.get("name") || ""
        };
      }
    } catch {}

    const phone = normalizePhone(rawValue);
    if (phone) return { phone, name: "" };
  }

  return null;
}

async function addFriendFromQrContact(contact) {
  if (!contact?.phone || qrScanLocked) return;
  qrScanLocked = true;
  stopQrScanner();
  friendStatus.textContent = "Đã nhận mã QR, đang kết bạn...";
  const person = await addFriendByPhone(contact.phone, contact.name || "", contact);
  if (person) closeFriendModal();
  qrScanLocked = false;
}

function decodeQrFromCanvas(canvas) {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  return jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "attemptBoth" });
}

function readImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function scanQrImageFile(file) {
  if (!file) return;
  if (!window.jsQR) {
    friendStatus.textContent = "Chưa tải được bộ quét mã QR.";
    return;
  }

  try {
    friendStatus.textContent = "Đang đọc ảnh mã QR...";
    const src = await readImageFile(file);
    const image = await loadImage(src);
    const canvas = qrScanCanvas;
    const maxSize = 1280;
    const ratio = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
    canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const code = decodeQrFromCanvas(canvas);
    const contact = code?.data ? readQrContact(code.data) : null;
    if (!contact) {
      friendStatus.textContent = "Không tìm thấy mã QR kết bạn XPAY Chat trong ảnh này.";
      return;
    }
    await addFriendFromQrContact(contact);
  } catch {
    friendStatus.textContent = "Không đọc được ảnh mã QR này. Hãy thử ảnh rõ nét hơn.";
  } finally {
    if (qrImageInput) qrImageInput.value = "";
  }
}

async function startQrScanner() {
  if (!navigator.mediaDevices?.getUserMedia) {
    friendStatus.textContent = "Trình duyệt chưa hỗ trợ quét QR bằng camera.";
    return;
  }

  if (!window.jsQR) {
    friendStatus.textContent = "Chưa tải được bộ quét mã QR.";
    return;
  }

  stopQrScanner();
  qrScanLocked = false;
  friendStatus.textContent = "Đang xin quyền camera...";

  try {
    try {
      qrScanStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
    } catch {
      qrScanStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    }
    qrScanVideo.srcObject = qrScanStream;
    await qrScanVideo.play();
    friendStatus.textContent = "Đưa mã QR vào khung quét.";
    scanQrFrame();
  } catch {
    friendStatus.textContent = "Không mở được camera. Trên mobile hãy dùng HTTPS hoặc localhost.";
  }
}

function scanQrFrame() {
  if (!qrScanStream) return;
  const canvas = qrScanCanvas;
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (qrScanVideo.readyState === qrScanVideo.HAVE_ENOUGH_DATA) {
    canvas.width = qrScanVideo.videoWidth;
    canvas.height = qrScanVideo.videoHeight;
    context.drawImage(qrScanVideo, 0, 0, canvas.width, canvas.height);
    const code = decodeQrFromCanvas(canvas);
    if (code?.data) {
      const contact = readQrContact(code.data);
      if (contact) {
        addFriendFromQrContact(contact);
        return;
      }
      friendStatus.textContent = "Mã QR này không phải mã kết bạn XPAY Chat.";
    }
  }

  qrScanFrameId = requestAnimationFrame(scanQrFrame);
}

function stopQrScanner() {
  if (qrScanFrameId) cancelAnimationFrame(qrScanFrameId);
  qrScanFrameId = null;

  if (qrScanStream) {
    qrScanStream.getTracks().forEach((track) => track.stop());
    qrScanStream = null;
  }
  qrScanVideo.srcObject = null;
}

function formatDuration(totalSeconds) {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function updateCallTimer() {
  if (!callStartedAt) return;
  const elapsed = Math.floor((Date.now() - callStartedAt) / 1000);
  callTimer.textContent = formatDuration(elapsed);
}

function setTrackEnabled(kind, enabled) {
  if (kind === "audio") callMicEnabled = Boolean(enabled);
  if (kind === "video") callCameraEnabled = Boolean(enabled);
  localStream?.getTracks().forEach((track) => {
    if (track.kind === kind) track.enabled = enabled;
  });
  if (kind === "audio") updateMuteButton();
  if (kind === "video") updateCameraButton();
}

function stopLocalStream() {
  if (!localStream) return;
  localStream.getTracks().forEach((track) => track.stop());
  localStream = null;
  localVideo.srcObject = null;
}

function stopPeerConnection() {
  if (peerConnection) {
    peerConnection.onicecandidate = null;
    peerConnection.ontrack = null;
    peerConnection.onconnectionstatechange = null;
    peerConnection.oniceconnectionstatechange = null;
    peerConnection.close();
    peerConnection = null;
  }
  if (remoteStream) {
    remoteStream.getTracks().forEach((track) => track.stop());
    remoteStream = null;
  }
  pendingIceCandidates = [];
  handledSignalIds = new Set();
  remoteAudio.srcObject = null;
  remoteVideo.srcObject = null;
  remoteVideo.classList.add("hidden");
}

function getMessageAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!messageAudioContext) messageAudioContext = new AudioContextClass();
  return messageAudioContext;
}

function unlockMessageAudio() {
  const context = getMessageAudioContext();
  if (context?.state === "suspended") context.resume().catch(() => {});
}

function playMessageTone(delay = 0, frequency = 960) {
  const context = getMessageAudioContext();
  if (!context) return;

  context
    .resume()
    .then(() => {
      const start = context.currentTime + delay;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.09, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.14);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.16);
      oscillator.addEventListener("ended", () => {
        oscillator.disconnect();
        gain.disconnect();
      });
    })
    .catch(() => {});
}

function playMessageNotificationSound() {
  if (!appSettings.messageSound) return;
  playMessageTone(0, 920);
  playMessageTone(0.18, 1180);
}

function vibrateForMessage() {
  if (appSettings.messageVibration && navigator.vibrate) navigator.vibrate([50, 35, 50]);
}

function getRingtoneContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!ringtoneContext) ringtoneContext = new AudioContextClass();
  return ringtoneContext;
}

function unlockRingtone() {
  const context = getRingtoneContext();
  if (context?.state === "suspended") context.resume().catch(() => {});
}

function createRingtoneDataUrl() {
  const sampleRate = 22050;
  const duration = 1.16;
  const samples = Math.floor(sampleRate * duration);
  const buffer = new ArrayBuffer(44 + samples * 2);
  const view = new DataView(buffer);

  function writeText(offset, text) {
    for (let index = 0; index < text.length; index += 1) {
      view.setUint8(offset + index, text.charCodeAt(index));
    }
  }

  writeText(0, "RIFF");
  view.setUint32(4, 36 + samples * 2, true);
  writeText(8, "WAVE");
  writeText(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeText(36, "data");
  view.setUint32(40, samples * 2, true);

  for (let index = 0; index < samples; index += 1) {
    const time = index / sampleRate;
    const pulse = time % 0.58;
    const active = pulse < 0.18;
    const envelope = active ? Math.sin(Math.min(1, pulse / 0.04) * Math.PI / 2) * Math.max(0, 1 - pulse / 0.2) : 0;
    const value = Math.sin(2 * Math.PI * 880 * time) * envelope * 0.42;
    view.setInt16(44 + index * 2, Math.max(-1, Math.min(1, value)) * 0x7fff, true);
  }

  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let index = 0; index < bytes.length; index += 1) binary += String.fromCharCode(bytes[index]);
  return `data:audio/wav;base64,${btoa(binary)}`;
}

function getRingtoneAudio() {
  if (!ringtoneAudio) {
    ringtoneAudio = new Audio(createRingtoneDataUrl());
    ringtoneAudio.loop = true;
    ringtoneAudio.preload = "auto";
    ringtoneAudio.volume = 0.58;
    ringtoneAudio.playsInline = true;
  }
  return ringtoneAudio;
}

function primeCallAudio() {
  unlockRingtone();
  if (callAudioUnlocked) return;
  const audio = getRingtoneAudio();
  const previousMuted = audio.muted;
  audio.muted = true;
  audio
    .play()
    .then(() => {
      audio.pause();
      audio.currentTime = 0;
      audio.muted = previousMuted;
      callAudioUnlocked = true;
    })
    .catch(() => {
      audio.muted = previousMuted;
    });
}

function playRingtoneBeep(delay = 0) {
  const context = getRingtoneContext();
  if (!context) return;

  context
    .resume()
    .then(() => {
      const start = context.currentTime + delay;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.12, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.2);
      oscillator.addEventListener("ended", () => {
        oscillator.disconnect();
        gain.disconnect();
      });
    })
    .catch(() => {});
}

function playRingtonePattern() {
  if (!ringtoneActive) return;
  if (appSettings.callRingtone) {
    playRingtoneBeep(0);
    playRingtoneBeep(0.32);
  }
  if (appSettings.callVibration && navigator.vibrate) navigator.vibrate([180, 100, 180]);
}

function startIncomingRingtone() {
  if (ringtoneActive) return;
  if (!appSettings.callRingtone && !appSettings.callVibration) return;
  ringtoneActive = true;
  unlockRingtone();
  if (appSettings.callRingtone) {
    const audio = getRingtoneAudio();
    audio.muted = false;
    audio.volume = 0.58;
    audio.currentTime = 0;
    audio.play().catch(() => {
      callHint.textContent = "Có cuộc gọi đến. Hãy bấm Nghe máy để mở âm thanh.";
    });
  }
  playRingtonePattern();
  ringtoneTimerId = window.setInterval(playRingtonePattern, 1700);
}

function stopIncomingRingtone() {
  ringtoneActive = false;
  if (ringtoneTimerId) window.clearInterval(ringtoneTimerId);
  ringtoneTimerId = null;
  if (ringtoneAudio) {
    ringtoneAudio.pause();
    ringtoneAudio.currentTime = 0;
  }
  if (navigator.vibrate) navigator.vibrate(0);
}

function playRingbackTone(delay = 0) {
  const context = getRingtoneContext();
  if (!context) return;
  context
    .resume()
    .then(() => {
      const start = context.currentTime + delay;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(430, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.1, start + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.72);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.74);
      oscillator.addEventListener("ended", () => {
        oscillator.disconnect();
        gain.disconnect();
      });
    })
    .catch(() => {});
}

function playRingbackPattern() {
  if (!ringbackActive) return;
  if (!appSettings.callRingback) return;
  playRingbackTone(0);
  playRingbackTone(0.92);
}

function startOutgoingRingback() {
  if (ringbackActive) return;
  if (!appSettings.callRingback) return;
  ringbackActive = true;
  unlockRingtone();
  playRingbackPattern();
  ringbackTimerId = window.setInterval(playRingbackPattern, 2800);
}

function stopOutgoingRingback() {
  ringbackActive = false;
  if (ringbackTimerId) window.clearInterval(ringbackTimerId);
  ringbackTimerId = null;
}

function startCallSyncBoost() {
  if (callSyncTimerId || !hasServerSession()) return;
  callSyncTimerId = window.setInterval(() => {
    if (callOverlay.classList.contains("hidden")) {
      stopCallSyncBoost();
      return;
    }
    syncServerData();
  }, 750);
}

function stopCallSyncBoost() {
  if (callSyncTimerId) window.clearInterval(callSyncTimerId);
  callSyncTimerId = null;
}

async function preferredAudioSinkId(useSpeaker) {
  if (!navigator.mediaDevices?.enumerateDevices) return "default";
  try {
    const outputs = (await navigator.mediaDevices.enumerateDevices()).filter((device) => device.kind === "audiooutput");
    if (!outputs.length) return "default";
    const targetWords = useSpeaker
      ? ["speaker", "loa ngoai", "loa ngoài", "external"]
      : ["earpiece", "receiver", "phone", "handset", "loa trong", "communications"];
    const target = outputs.find((device) => {
      const label = normalizeAiPlain(device.label || "");
      return targetWords.some((word) => label.includes(normalizeAiPlain(word)));
    });
    return target?.deviceId || "default";
  } catch {
    return "default";
  }
}

async function applySpeakerOutput() {
  if (!remoteAudio) return;
  remoteAudio.muted = false;
  remoteAudio.removeAttribute("muted");
  remoteAudio.volume = callSpeakerEnabled ? 1 : 0.62;
  if (typeof remoteAudio.setSinkId === "function") {
    await remoteAudio.setSinkId(await preferredAudioSinkId(callSpeakerEnabled)).catch(() => {});
  }
}

function updateMuteButton() {
  if (!muteBtn) return;
  muteBtn.classList.toggle("is-off", !callMicEnabled);
  muteBtn.setAttribute("aria-label", callMicEnabled ? "Tắt micro" : "Bật micro");
  muteBtn.setAttribute("aria-pressed", String(!callMicEnabled));
  const label = muteBtn.querySelector("span");
  if (label) label.textContent = callMicEnabled ? "Mic" : "Bật mic";
}

function updateCameraButton() {
  if (!cameraBtn) return;
  cameraBtn.classList.toggle("is-off", !callCameraEnabled);
  cameraBtn.setAttribute("aria-label", callCameraEnabled ? "Tắt camera" : "Bật camera");
  cameraBtn.setAttribute("aria-pressed", String(!callCameraEnabled));
  const label = cameraBtn.querySelector("span");
  if (label) label.textContent = callCameraEnabled ? "Camera" : "Bật cam";
}

function updateSpeakerButton() {
  if (!speakerBtn) return;
  speakerBtn.classList.toggle("is-active", callSpeakerEnabled);
  speakerBtn.setAttribute("aria-label", callSpeakerEnabled ? "Chuyển về loa trong" : "Bật loa ngoài");
  speakerBtn.setAttribute("aria-pressed", String(callSpeakerEnabled));
  const label = speakerBtn.querySelector("span");
  if (label) label.textContent = callSpeakerEnabled ? "Loa trong" : "Loa ngoài";
}

async function playRemoteMedia() {
  if (remoteStream && remoteAudio.srcObject !== remoteStream) remoteAudio.srcObject = remoteStream;
  if (remoteStream && remoteVideo.srcObject !== remoteStream) remoteVideo.srcObject = remoteStream;
  remoteStream?.getAudioTracks().forEach((track) => {
    track.enabled = true;
  });
  await applySpeakerOutput();
  remoteAudio.play().catch(() => {
    callHint.textContent = "Âm thanh đã sẵn sàng. Hãy chạm vào màn hình hoặc bấm Mic để trình duyệt mở loa.";
  });
  if (activeCallMode === "video") {
    remoteVideo.muted = true;
    remoteVideo.play().catch(() => {});
  }
}

async function getRtcConfig() {
  if (rtcConfigCache) return rtcConfigCache;
  try {
    rtcConfigCache = await apiRequest("/api/rtc/config");
  } catch {
    rtcConfigCache = { iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }] };
  }
  return rtcConfigCache;
}

async function sendRtcSignal(type, payload) {
  if (!activeServerCallId || !hasServerSession()) return;
  await apiRequest("/api/calls/signal", { id: activeServerCallId, type, payload }).catch(() => {});
}

async function ensurePeerConnection() {
  if (peerConnection) return peerConnection;
  const rtcConfig = await getRtcConfig();
  peerConnection = new RTCPeerConnection(rtcConfig);
  remoteStream = new MediaStream();
  remoteAudio.srcObject = remoteStream;
  remoteVideo.srcObject = remoteStream;

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) sendRtcSignal("candidate", event.candidate.toJSON());
  };

  peerConnection.ontrack = (event) => {
    const tracks = event.streams[0]?.getTracks?.() || [event.track];
    const existingIds = new Set(remoteStream.getTracks().map((track) => track.id));
    tracks.forEach((track) => {
      if (!existingIds.has(track.id)) {
        remoteStream.addTrack(track);
        existingIds.add(track.id);
      }
      track.enabled = true;
      track.onunmute = playRemoteMedia;
    });
    remoteAudio.srcObject = remoteStream;
    remoteVideo.srcObject = remoteStream;
    if (activeCallMode === "video" && remoteStream.getVideoTracks().length) {
      remoteVideo.classList.remove("hidden");
      remotePlaceholder.style.display = "none";
    }
    playRemoteMedia();
  };

  peerConnection.onconnectionstatechange = () => {
    const state = peerConnection?.connectionState || "";
    if (state === "connected") {
      callState.textContent = "Đã kết nối WebRTC";
      callHint.textContent = "Âm thanh/video đang truyền trực tiếp giữa hai thiết bị.";
      playRemoteMedia();
    }
    if (["failed", "disconnected"].includes(state)) {
      callHint.textContent = "Kết nối WebRTC đang yếu, TURN server sẽ hỗ trợ chuyển tiếp.";
    }
  };

  peerConnection.oniceconnectionstatechange = () => {
    if (["connected", "completed"].includes(peerConnection?.iceConnectionState || "")) {
      playRemoteMedia();
    }
  };

  return peerConnection;
}

async function addLocalTracksToPeer() {
  if (!localStream) return;
  const pc = await ensurePeerConnection();
  const existingTracks = new Set(pc.getSenders().map((sender) => sender.track).filter(Boolean));
  localStream.getTracks().forEach((track) => {
    if (!existingTracks.has(track)) pc.addTrack(track, localStream);
  });
}

async function flushPendingIceCandidates() {
  if (!peerConnection?.remoteDescription) return;
  const candidates = [...pendingIceCandidates];
  pendingIceCandidates = [];
  for (const candidate of candidates) {
    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
  }
}

async function processRtcSignal(signal) {
  if (!signal?.id || handledSignalIds.has(signal.id)) return;
  handledSignalIds.add(signal.id);
  const pc = await ensurePeerConnection();

  if (signal.type === "offer") {
    await pc.setRemoteDescription(new RTCSessionDescription(signal.payload));
    await flushPendingIceCandidates();
    await addLocalTracksToPeer();
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await sendRtcSignal("answer", pc.localDescription.toJSON());
    return;
  }

  if (signal.type === "answer") {
    if (!pc.remoteDescription) {
      await pc.setRemoteDescription(new RTCSessionDescription(signal.payload));
      await flushPendingIceCandidates();
    }
    return;
  }

  if (signal.type === "candidate") {
    if (!pc.remoteDescription) {
      pendingIceCandidates.push(signal.payload);
      return;
    }
    await pc.addIceCandidate(new RTCIceCandidate(signal.payload)).catch(() => {});
  }
}

async function processRtcSignals(signals = []) {
  for (const signal of signals) {
    await processRtcSignal(signal);
  }
}

async function createRtcOffer() {
  await addLocalTracksToPeer();
  const pc = await ensurePeerConnection();
  const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: activeCallMode === "video" });
  await pc.setLocalDescription(offer);
  await sendRtcSignal("offer", pc.localDescription.toJSON());
}

function setCallShell(person, mode, direction = "outgoing", status = "ringing") {
  activeCallMode = mode;
  callName.textContent = person.name;
  callAvatar.textContent = person.avatarData ? "" : person.avatar;
  callAvatar.style.background = person.avatarData ? "" : person.color;
  callAvatar.style.backgroundImage = person.avatarData ? `url("${person.avatarData}")` : "";
  callModeLabel.textContent = mode === "video" ? "Gọi video" : "Gọi thoại";
  callState.textContent =
    direction === "incoming" && status === "ringing"
      ? "Cuộc gọi đến"
      : status === "active"
        ? "Đang gọi"
        : "Đang gọi";
  callHint.textContent =
    direction === "incoming" && status === "ringing"
      ? `${person.name} đang gọi ${mode === "video" ? "video" : "thoại"} cho bạn.`
      : status === "active"
        ? "Cuộc gọi đang được đồng bộ theo thời gian thực."
        : `Đang đổ chuông cho ${person.name}.`;
  callOverlay.classList.remove("hidden");
  callOverlay.classList.toggle("voice-call", mode === "voice");
  callOverlay.classList.toggle("video-call", mode === "video");
  callOverlay.classList.toggle("incoming-call", direction === "incoming" && status === "ringing");
  answerCallBtn.classList.toggle("hidden", !(direction === "incoming" && status === "ringing"));
  muteBtn.classList.remove("hidden");
  cameraBtn.classList.toggle("hidden", mode !== "video" || (direction === "incoming" && status === "ringing"));
  speakerBtn?.classList.remove("hidden");
  updateMuteButton();
  updateSpeakerButton();
  updateCameraButton();
  localVideo.classList.toggle("hidden", mode !== "video");
  remotePlaceholder.style.display = mode === "video" && remoteStream ? "none" : "grid";
}

async function prepareLocalCallMedia(mode) {
  try {
    stopLocalStream();
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      },
      video: mode === "video" ? { facingMode: "user" } : false
    });
    setTrackEnabled("audio", callMicEnabled);
    if (mode === "video") setTrackEnabled("video", callCameraEnabled);

    if (mode === "video") {
      localVideo.srcObject = localStream;
      localVideo.play().catch(() => {});
      remotePlaceholder.style.display = "none";
    } else {
      localVideo.srcObject = null;
      localVideo.classList.add("hidden");
      remotePlaceholder.style.display = "grid";
    }

    callHint.textContent =
      mode === "video"
        ? "Camera của bạn đang bật. Trạng thái cuộc gọi đang được cập nhật."
        : "Micro của bạn đang bật. Trạng thái cuộc gọi đang được cập nhật.";
    return true;
  } catch {
    stopLocalStream();
    callState.textContent = "Không lấy được quyền thiết bị";
    callHint.textContent =
      "Hãy cho phép micro/camera rồi thử lại. Cuộc gọi chưa thể truyền âm thanh khi chưa có quyền micro.";
    localVideo.classList.add("hidden");
    remotePlaceholder.style.display = "grid";
    return false;
  }
}

function showServerCall(call) {
  const person = callPeerToPerson(call);
  if (activeServerCallId !== call.id) {
    stopPeerConnection();
    callMicEnabled = true;
    callCameraEnabled = true;
    callSpeakerEnabled = false;
  }
  activeServerCallId = call.id;
  activeCallDirection = call.direction;
  activeCallPeerPhone = normalizePhone(call.peer?.accountPhone || call.peer?.phone || "");
  setCallShell(person, call.mode, call.direction, call.status);
  startCallSyncBoost();
  if (call.direction === "incoming" && call.status === "ringing") {
    stopOutgoingRingback();
    startIncomingRingtone();
  } else if (call.direction === "outgoing" && call.status === "ringing") {
    stopIncomingRingtone();
    startOutgoingRingback();
  } else {
    stopIncomingRingtone();
    stopOutgoingRingback();
  }

  if (call.status === "active") {
    stopIncomingRingtone();
    stopOutgoingRingback();
    primeCallAudio();
    callStartedAt = call.startedAt ? new Date(call.startedAt).getTime() : Date.now();
    callTimer.textContent = formatDuration(Math.max(0, Math.floor((Date.now() - callStartedAt) / 1000)));
    clearInterval(callTimerId);
    callTimerId = setInterval(updateCallTimer, 1000);
    playRemoteMedia();
  } else {
    callStartedAt = null;
    callTimer.textContent = "00:00";
  }
  if (!(call.direction === "incoming" && call.status === "ringing") && answeringCallId !== call.id) {
    processRtcSignals(call.signals || []);
  }
}

function updateCallFromServer(call) {
  if (["ended", "rejected", "missed"].includes(call.status)) {
    closeCallOverlay();
    return;
  }

  showServerCall(call);
}

function closeCallOverlay() {
  stopIncomingRingtone();
  stopOutgoingRingback();
  stopCallSyncBoost();
  clearInterval(callTimerId);
  callTimerId = null;
  callStartedAt = null;
  activeServerCallId = "";
  activeCallPeerPhone = "";
  stopPeerConnection();
  stopLocalStream();
  callOverlay.classList.add("hidden");
  callOverlay.classList.remove("incoming-call", "voice-call", "video-call");
  answerCallBtn.classList.add("hidden");
}

async function callAction(action, options = {}) {
  if (!activeServerCallId || !hasServerSession()) return null;
  try {
    const data = await apiRequest("/api/calls/respond", { id: activeServerCallId, action });
    if (data.call && options.apply !== false) updateCallFromServer(data.call);
    if (options.sync !== false) syncServerData();
    return data.call || null;
  } catch {
    callHint.textContent = "Không đồng bộ được trạng thái cuộc gọi, vui lòng thử lại.";
    return null;
  }
}

async function startCall(mode) {
  const person = getActivePerson();
  if (!person) return;
  callMicEnabled = true;
  callCameraEnabled = true;
  callSpeakerEnabled = false;

  if (hasServerSession()) {
    setCallShell(normalizedPerson(person), mode, "outgoing", "ringing");
    primeCallAudio();
    const mediaReady = await prepareLocalCallMedia(mode);
    if (!mediaReady) return;

    try {
      const data = await apiRequest("/api/calls/start", { friendPhone: friendPhone(person), mode });
      showServerCall(data.call);
      await createRtcOffer();
      startOutgoingRingback();
      syncServerData();
      return;
    } catch (error) {
      callHint.textContent = error.message || "Không tạo được cuộc gọi.";
      return;
    }
  }

  activeServerCallId = "";
  activeCallPeerPhone = "";
  callStartedAt = Date.now();
  callTimer.textContent = "00:00";
  setCallShell(normalizedPerson(person), mode, "outgoing", "active");
  primeCallAudio();
  clearInterval(callTimerId);
  callTimerId = setInterval(updateCallTimer, 1000);
  await prepareLocalCallMedia(mode);
}

async function endCall() {
  if (callOverlay.classList.contains("hidden")) return;

  if (activeServerCallId) {
    await callAction(activeCallDirection === "incoming" && !callStartedAt ? "reject" : "end");
    closeCallOverlay();
    return;
  }

  if (!callStartedAt) {
    closeCallOverlay();
    return;
  }

  const elapsed = callStartedAt ? Math.max(1, Math.floor((Date.now() - callStartedAt) / 1000)) : 0;
  const person = getActivePerson();
  if (!person) {
    closeCallOverlay();
    return;
  }
  const label = activeCallMode === "video" ? "Gọi video" : "Gọi thoại";

  closeCallOverlay();

  person.messages.push(await makeSecureMessage({
    from: "me",
    text: `${label} với ${person.name} • ${formatDuration(elapsed)}`,
    time: nowTime()
  }));
  savePeople();
  renderAll();
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const phone = phoneInput.value.trim();
  const cleanPhone = normalizePhone(phone);
  const email = normalizeEmail(emailInput.value);
  const name = nameInput.value.trim();
  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;
  const users = loadUsers();
  if (!phone) return;

  if (authMode === "login") {
    authStatus.textContent = "Đang đăng nhập...";
    try {
      const session = await apiRequest("/api/auth/login", { phone, password }, { auth: false });
      applyServerSession(session);
      return;
    } catch (error) {
      if (!error.network) {
        authStatus.textContent = error.message || "Không đăng nhập được.";
        return;
      }
      if (isServerRuntime()) {
        authStatus.textContent = "Không kết nối được. Vui lòng kiểm tra mạng rồi đăng nhập lại.";
        return;
      }
    }

    const account = users[cleanPhone];
    if (!account) {
      authStatus.textContent = "Số điện thoại này chưa được Admin XPAY cấp tài khoản. Vui lòng chọn gói dịch vụ trên gatewayxpay.com.";
      return;
    }
    if (account.password !== password) {
      authStatus.textContent = "Mật khẩu không đúng.";
      return;
    }
    safeRemoveItem(authTokenKey);
    showApp(account.user);
    return;
  }

  const error = passwordError(password);
  if (error) {
    authStatus.textContent = error;
    return;
  }
  if (password !== confirmPassword) {
    authStatus.textContent = "Mật khẩu nhập lại chưa khớp.";
    return;
  }

  if (!validEmail(email)) {
    authStatus.textContent = "Vui lòng nhập email khôi phục hợp lệ để nhận OTP.";
    return;
  }
  if (!pendingOtp || cleanPhone !== pendingOtpPhone || pendingOtpEmail !== email || pendingOtpPurpose !== "forgot") {
    await startOtpFlow(phone, "forgot", email);
    return;
  }
  if (!verifyOtp(phone, otpInput.value, "forgot")) {
    authStatus.textContent = "Mã OTP không đúng hoặc đã hết hạn. Vui lòng kiểm tra lại.";
    return;
  }
  authStatus.textContent = "Đang cập nhật mật khẩu...";
  let resetResult = null;
  try {
    resetResult = await apiRequest("/api/auth/reset-password", { phone, email, password, otp: otpInput.value }, { auth: false });
  } catch (error) {
    if (!error.network) {
      authStatus.textContent = error.message || "Không đặt lại được mật khẩu.";
      return;
    }
    if (isServerRuntime()) {
      authStatus.textContent = "Không kết nối được, chưa thể đặt lại mật khẩu.";
      return;
    }
    if (!users[cleanPhone]) {
      authStatus.textContent = "Không kết nối được và chưa tìm thấy tài khoản phù hợp.";
      return;
    }
    users[cleanPhone].password = password;
    users[cleanPhone].passwordUpdatedAt = new Date().toISOString();
    saveUsers(users);
  }
  resetOtpFlow();
  passwordInput.value = "";
  confirmPasswordInput.value = "";
  setAuthMode("login");
  phoneInput.value = phone;
  authStatus.textContent = resetResult?.emailBound
    ? "Đã đặt lại mật khẩu và gắn email khôi phục duy nhất cho tài khoản. Vui lòng đăng nhập."
    : "Đã đặt lại mật khẩu. Vui lòng đăng nhập.";
});

resendOtpBtn.addEventListener("click", async () => {
  const phone = phoneInput.value.trim();
  const email = normalizeEmail(emailInput.value);
  if (!phone) {
    authStatus.textContent = "Vui lòng nhập số điện thoại trước khi gửi OTP.";
    return;
  }
  if (authMode === "forgot") await startOtpFlow(phone, "forgot", email);
});

document.querySelectorAll(".auth-tab").forEach((tab) => {
  tab.addEventListener("click", () => setAuthMode(tab.dataset.authMode));
});

["pointerdown", "keydown", "touchstart"].forEach((eventName) => {
  document.addEventListener(
    eventName,
    () => {
      primeCallAudio();
      unlockMessageAudio();
    },
    { once: true, passive: true }
  );
});

logoutBtn.addEventListener("click", async () => {
  if (hasServerSession()) {
    await unregisterPushToken();
    await apiRequest("/api/session/logout", { deviceId: pushDeviceId() }).catch(() => undefined);
  }
  safeRemoveItem(storageKey);
  safeRemoveItem(authTokenKey);
  clearLargeLocalCache();
  stopServerSync();
  closeFriendModal();
  closeProfileModal();
  closeFriendInfo();
  closeSettingsModal();
  closeAccountDeleteModal();
  resetOtpFlow();
  setAuthMode("login");
  showAuth();
});

profileBtn.addEventListener("click", openProfileModal);

closeProfileBtn.addEventListener("click", closeProfileModal);

profileOverlay.addEventListener("click", (event) => {
  if (event.target === profileOverlay) closeProfileModal();
});

profileAvatarInput.addEventListener("change", () => {
  const file = profileAvatarInput.files?.[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    profileStatus.textContent = "Vui lòng chọn file hình ảnh.";
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    pendingAvatarData = String(reader.result || "");
    paintAvatar(profileAvatarPreview, {
      ...currentUser,
      avatarData: pendingAvatarData,
      fullName: profileFullNameInput.value
    });
    profileStatus.textContent = "Ảnh mới đã sẵn sàng. Bấm Lưu hồ sơ để áp dụng.";
  });
  reader.readAsDataURL(file);
});

profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const fullName = profileFullNameInput.value.trim();
  if (!fullName) {
    profileStatus.textContent = "Vui lòng nhập họ và tên.";
    return;
  }

  const profile = {
    ...currentUser,
    name: fullName,
    fullName,
    birthDate: normalizedBirthDateValue(),
    interests: profileInterestsInput.value.trim(),
    avatarData: pendingAvatarData,
    privacy: {
      phone: privacyPhoneInput.checked,
      birthDate: privacyBirthInput.checked,
      interests: privacyInterestsInput.checked,
      avatar: privacyAvatarInput.checked
    }
  };

  profileStatus.textContent = "Đang lưu hồ sơ...";
  try {
    const data = await apiRequest("/api/profile/update", { profile });
    saveUser(data.user);
    profileStatus.textContent = "Đã lưu hồ sơ.";
  } catch (error) {
    if (isServerRuntime()) {
      profileStatus.textContent = error.network
        ? "Không kết nối được, vui lòng thử lại."
        : error.message || "Không lưu được hồ sơ.";
      return;
    }
    saveUser(profile);
    profileStatus.textContent = error.network
      ? "Không kết nối được, thông tin đã được giữ tạm thời."
      : error.message || "Không lưu được, thông tin đã được giữ tạm thời.";
  }
  closeProfileModal();
});

friendInfoBtn.addEventListener("click", openFriendInfo);

clearConversationBtn?.addEventListener("click", clearActiveConversation);

closeFriendInfoBtn.addEventListener("click", closeFriendInfo);

friendInfoOverlay.addEventListener("click", (event) => {
  if (event.target === friendInfoOverlay) closeFriendInfo();
});

closeFriendsBtn?.addEventListener("click", closeFriendsDirectory);

friendsOverlay?.addEventListener("click", (event) => {
  if (event.target === friendsOverlay) closeFriendsDirectory();
});

friendsDirectoryList?.addEventListener("click", (event) => {
  const requestAction = event.target.closest("[data-friend-request-action]");
  if (requestAction) {
    respondFriendRequest(requestAction.dataset.friendRequestId || "", requestAction.dataset.friendRequestAction || "");
    return;
  }
  const row = event.target.closest("[data-friends-id]");
  if (!row) return;
  const target = findPersonByIdOrPhone(row.dataset.friendsPhone || row.dataset.friendsId, row.dataset.friendsPhone, {
    preferPhone: true
  });
  if (!target) return;
  activeId = target.id;
  closeFriendsDirectory();
  document.querySelector('[data-view="chats"]')?.click();
  selectPerson(target.id, {
    phone: row.dataset.friendsPhone,
    preferPhone: true,
    revealHidden: true
  });
});

closeAppAdminBtn?.addEventListener("click", closeAppAdminPanel);

refreshAppAdminBtn?.addEventListener("click", loadAppAdminUsers);

appAdminSearchInput?.addEventListener("input", filterAppAdminUsers);

appAdminOverlay?.addEventListener("click", (event) => {
  if (event.target === appAdminOverlay) closeAppAdminPanel();
});

appAdminUsersList?.addEventListener("click", (event) => {
  const row = event.target.closest("[data-app-admin-phone]");
  if (!row) return;
  renderAppAdminDetail(appAdminFilteredUsers.find((user) => user.accountPhone === row.dataset.appAdminPhone) || null);
});

document.querySelector("#appAdminBusinessList")?.addEventListener("click", (event) => {
  const reportStatus = event.target.closest("[data-report-status]");
  if (reportStatus) {
    const card = reportStatus.closest("[data-report-id]");
    updateAppAdminReport(card?.dataset.reportId || "", reportStatus.dataset.reportStatus || "");
    return;
  }
  const button = event.target.closest("[data-business-status]");
  if (!button) return;
  const card = button.closest("[data-business-owner]");
  updateAppAdminBusiness(card?.dataset.businessOwner || "", button.dataset.businessStatus || "");
});

settingsBtn?.addEventListener("click", openSettingsModal);

closeSettingsBtn?.addEventListener("click", closeSettingsModal);

settingsOverlay?.addEventListener("click", (event) => {
  if (event.target === settingsOverlay) closeSettingsModal();
});

deleteAccountBtn?.addEventListener("click", openAccountDeleteModal);

profileDeleteAccountBtn?.addEventListener("click", () => {
  closeProfileModal();
  openAccountDeleteModal();
});

closeAccountDeleteBtn?.addEventListener("click", closeAccountDeleteModal);

accountDeleteOverlay?.addEventListener("click", (event) => {
  if (event.target === accountDeleteOverlay) closeAccountDeleteModal();
});

accountDeleteForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const password = accountDeletePasswordInput.value;
  const confirmation = accountDeleteConfirmInput.value.trim();
  if (confirmation !== "DELETE") {
    accountDeleteStatus.textContent = t("deleteAccountConfirmError");
    return;
  }
  accountDeleteStatus.textContent = t("deleteAccountWorking");
  try {
    await apiRequest("/api/account/delete", { password, confirmation });
    safeRemoveItem(storageKey);
    safeRemoveItem(authTokenKey);
    clearLargeLocalCache();
    stopServerSync();
    closeAccountDeleteModal();
    closeSettingsModal();
    resetOtpFlow();
    setAuthMode("login");
    showAuth();
    authStatus.textContent = t("deleteAccountDone");
  } catch (error) {
    accountDeleteStatus.textContent = error.message || "Không xoá được tài khoản.";
  }
});

forcePasswordForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const currentPassword = forceCurrentPasswordInput.value;
  const newPassword = forceNewPasswordInput.value;
  const confirmPassword = forceConfirmPasswordInput.value;
  const policyError = passwordError(newPassword);
  if (policyError) {
    forcePasswordStatus.textContent = policyError;
    return;
  }
  if (newPassword !== confirmPassword) {
    forcePasswordStatus.textContent = "Mật khẩu mới nhập lại chưa khớp.";
    return;
  }
  forcePasswordStatus.textContent = "Đang đổi mật khẩu...";
  try {
    const session = await apiRequest("/api/auth/change-password", { currentPassword, newPassword });
    forcePasswordStatus.textContent = "Đã đổi mật khẩu.";
    applyServerSession(session);
  } catch (error) {
    forcePasswordStatus.textContent = error.message || "Không đổi được mật khẩu.";
  }
});

forcePasswordLogoutBtn?.addEventListener("click", async () => {
  if (hasServerSession()) {
    await apiRequest("/api/session/logout", { deviceId: pushDeviceId() }).catch(() => undefined);
  }
  safeRemoveItem(storageKey);
  safeRemoveItem(authTokenKey);
  clearLargeLocalCache();
  stopServerSync();
  setAuthMode("login");
  showAuth();
  authStatus.textContent = "Đã đăng xuất. Vui lòng đăng nhập lại khi cần sử dụng XPAY Chat.";
});

presenceOnlineSetting?.addEventListener("change", () => {
  if (presenceOnlineSetting.checked) updatePresenceMode("online");
});

presenceOfflineSetting?.addEventListener("change", () => {
  if (presenceOfflineSetting.checked) updatePresenceMode("offline");
});

[
  [pushNotificationSetting, "pushNotifications"],
  [messageSoundSetting, "messageSound"],
  [messageVibrationSetting, "messageVibration"],
  [unreadHighlightSetting, "unreadHighlight"],
  [markReadOnOpenSetting, "markReadOnOpen"],
  [callRingtoneSetting, "callRingtone"],
  [callVibrationSetting, "callVibration"],
  [callRingbackSetting, "callRingback"]
].forEach(([input, key]) => {
  input?.addEventListener("change", () => setAppSetting(key, input.checked));
});

settingsAiAutoReplyToggle?.addEventListener("change", () => {
  updateAiAutoReplySetting(settingsAiAutoReplyToggle.checked);
});

markAllReadBtn?.addEventListener("click", () => {
  markAllConversationsRead();
  updateSettingsStatus("Đã đánh dấu tất cả hội thoại là đã đọc.");
});

openAiSettingsBtn?.addEventListener("click", () => {
  closeSettingsModal();
  document.querySelector('[data-view="ai"]')?.click();
});

friendBtn.addEventListener("click", () => openFriendModal("phone"));

closeFriendBtn.addEventListener("click", closeFriendModal);

friendOverlay.addEventListener("click", (event) => {
  if (event.target === friendOverlay) closeFriendModal();
});

document.querySelectorAll(".friend-tab").forEach((tab) => {
  tab.addEventListener("click", () => setFriendView(tab.dataset.friendView));
});

document.querySelectorAll("[data-quick-action]").forEach((button) => {
  button.addEventListener("click", () => {
    const action = button.dataset.quickAction;
    if (action === "business") openMainView("business");
    if (action === "friends") openFriendsDirectory();
    if (action === "scan-qr") openFriendModal("scan");
    if (action === "profile") openProfileModal();
    if (action === "calls") openCallHistoryModal();
    if (action === "app-admin") openAppAdminPanel();
  });
});

closeThemeBtn?.addEventListener("click", closeThemeModal);
closeCallHistoryBtn?.addEventListener("click", closeCallHistoryModal);
refreshCallHistoryBtn?.addEventListener("click", () => {
  renderCallHistory();
  syncServerData();
});
createReferralBtn?.addEventListener("click", createReferralShareContent);
shareReferralBtn?.addEventListener("click", shareReferralContent);

callHistoryOverlay?.addEventListener("click", (event) => {
  if (event.target === callHistoryOverlay) closeCallHistoryModal();
});

themeOverlay?.addEventListener("click", (event) => {
  if (event.target === themeOverlay) closeThemeModal();
});

themeGrid?.addEventListener("click", (event) => {
  const option = event.target.closest("[data-theme-id]");
  if (!option) return;
  applyUiTheme(option.dataset.themeId);
});

phoneFriendPanel.addEventListener("submit", async (event) => {
  event.preventDefault();
  const person = await addFriendByPhone(friendPhoneInput.value, friendNameInput.value);
  if (person) {
    friendPhoneInput.value = "";
    friendNameInput.value = "";
    closeFriendModal();
  }
});

startScanBtn.addEventListener("click", startQrScanner);

stopScanBtn.addEventListener("click", () => {
  stopQrScanner();
  friendStatus.textContent = "Đã tắt quét QR.";
});

qrImageInput?.addEventListener("change", (event) => {
  scanQrImageFile(event.target.files?.[0]);
});

chatList.addEventListener("click", async (event) => {
  const refreshButton = event.target.closest("[data-refresh-chats]");
  if (refreshButton) {
    event.preventDefault();
    refreshButton.disabled = true;
    refreshButton.textContent = "Đang làm mới...";
    try {
      await syncServerData();
    } finally {
      renderChats();
    }
    return;
  }

  const deleteButton = event.target.closest("[data-delete-chat-id]");
  if (deleteButton) {
    event.preventDefault();
    const person = people.find((item) => item.id === deleteButton.dataset.deleteChatId);
    closeOpenChatDeleteRows();
    await deleteConversationForPerson(person, { confirmed: true });
    return;
  }

  const row = event.target.closest("[data-id]");
  if (!row) return;
  const shell = row.closest(".chat-row-shell");
  if (suppressNextChatClick) {
    event.preventDefault();
    return;
  }
  if (shell?.classList.contains("is-delete-open")) {
    event.preventDefault();
    closeOpenChatDeleteRows();
    return;
  }
  closeOpenChatDeleteRows();
  selectPerson(row.dataset.id);
});

chatList.addEventListener("contextmenu", (event) => {
  const shell = event.target.closest(".chat-row-shell");
  if (!shell || !chatList.contains(shell)) return;
  const person = personFromChatElement(shell);
  if (!person) return;
  event.preventDefault();
  closeOpenChatDeleteRows();
  openChatDeleteSheet(person.id);
});

chatList.addEventListener("pointerdown", (event) => {
  if (!isCompactLayout() || event.target.closest("[data-delete-chat-id]")) return;
  const shell = event.target.closest(".chat-row-shell");
  if (!shell || !chatList.contains(shell)) return;
  chatRowSwipe = {
    shell,
    startX: event.clientX,
    startY: event.clientY,
    moved: false
  };
}, { passive: true });

chatList.addEventListener("pointermove", (event) => {
  if (!chatRowSwipe) return;
  const deltaX = event.clientX - chatRowSwipe.startX;
  const deltaY = event.clientY - chatRowSwipe.startY;
  if (Math.abs(deltaX) < 18 || Math.abs(deltaX) < Math.abs(deltaY) * 1.25) return;
  chatRowSwipe.moved = true;
  suppressNextChatClick = true;
  if (deltaX < -42) {
    closeOpenChatDeleteRows(chatRowSwipe.shell);
    chatRowSwipe.shell.classList.add("is-delete-open");
  } else if (deltaX > 36) {
    chatRowSwipe.shell.classList.remove("is-delete-open");
  }
}, { passive: true });

["pointerup", "pointercancel", "pointerleave"].forEach((eventName) => {
  chatList.addEventListener(eventName, () => {
    if (chatRowSwipe?.moved) {
      window.setTimeout(() => {
        suppressNextChatClick = false;
      }, 180);
    }
    chatRowSwipe = null;
  }, { passive: true });
});

document.addEventListener("click", (event) => {
  if (!event.target.closest?.(".chat-row-shell")) closeOpenChatDeleteRows();
});

peopleNearby.addEventListener("click", (event) => {
  const row = event.target.closest("[data-id]");
  const nearbyRow = event.target.closest("[data-nearby-phone]");
  if (nearbyRow) {
    addFriendByPhone(nearbyRow.dataset.nearbyPhone).then((person) => {
      if (person) {
        document.querySelector('[data-view="chats"]').click();
        syncServerData();
      }
    });
    return;
  }
  if (row) {
    document.querySelector('[data-view="chats"]').click();
    selectPerson(row.dataset.id);
  }
});

function closeConversationToList() {
  closeMessageActionSheet();
  chatApp.classList.remove("conversation-open");
}

function clearMessageLongPress() {
  if (messageLongPressTimer) clearTimeout(messageLongPressTimer);
  messageLongPressTimer = null;
  messageLongPressTarget = null;
}

function messageElementFromEvent(event) {
  const messageElement = event.target.closest?.(".message[data-message-id]");
  if (!messageElement || !messageStage.contains(messageElement)) return null;
  return messageElement;
}

messageStage.addEventListener("pointerdown", (event) => {
  if (event.button !== undefined && event.button !== 0) return;
  const messageElement = messageElementFromEvent(event);
  if (!messageElement) return;
  clearMessageLongPress();
  messageLongPressTarget = messageElement;
  messageLongPressTimer = window.setTimeout(() => {
    const messageId = messageLongPressTarget?.dataset.messageId || "";
    clearMessageLongPress();
    if (!messageId) return;
    navigator.vibrate?.(12);
    openMessageActionSheet(messageId);
  }, 520);
});

["pointerup", "pointercancel", "pointerleave", "scroll"].forEach((eventName) => {
  messageStage.addEventListener(eventName, clearMessageLongPress, { passive: true });
});

messageStage.addEventListener("contextmenu", (event) => {
  const messageElement = messageElementFromEvent(event);
  if (!messageElement) return;
  event.preventDefault();
  clearMessageLongPress();
  openMessageActionSheet(messageElement.dataset.messageId);
});

messageStage.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const messageElement = messageElementFromEvent(event);
  if (!messageElement) return;
  event.preventDefault();
  openMessageActionSheet(messageElement.dataset.messageId);
});

backToListBtn.addEventListener("click", closeConversationToList);

function isSurfaceOpen(element) {
  return Boolean(element && !element.classList.contains("hidden"));
}

function activateChatsView() {
  const chatTab = document.querySelector('.tab[data-view="chats"]');
  if (chatTab) {
    chatTab.click();
    return;
  }
  currentView = "chats";
  renderAll();
}

function goBackOneLevel() {
  if (document.querySelector(".message-action-sheet")) {
    closeMessageActionSheet();
    return true;
  }
  if (isSurfaceOpen(accountDeleteOverlay)) {
    closeAccountDeleteModal();
    return true;
  }
  if (isSurfaceOpen(settingsOverlay)) {
    closeSettingsModal();
    return true;
  }
  if (isSurfaceOpen(friendInfoOverlay)) {
    closeFriendInfo();
    return true;
  }
  if (isSurfaceOpen(friendsOverlay)) {
    closeFriendsDirectory();
    return true;
  }
  if (isSurfaceOpen(themeOverlay)) {
    closeThemeModal();
    return true;
  }
  if (isSurfaceOpen(appAdminOverlay)) {
    closeAppAdminPanel();
    return true;
  }
  if (isSurfaceOpen(profileOverlay)) {
    closeProfileModal();
    return true;
  }
  if (isSurfaceOpen(friendOverlay)) {
    closeFriendModal();
    return true;
  }
  if (aiPanel && !aiPanel.classList.contains("hidden")) {
    closeAiPanel();
    return true;
  }
  if (isSurfaceOpen(callOverlay)) {
    callHint.textContent = "Đang trong cuộc gọi. Dùng nút Kết thúc để đóng cuộc gọi an toàn.";
    return true;
  }
  if (chatApp.classList.contains("conversation-open")) {
    closeConversationToList();
    return true;
  }
  if (currentView !== "chats") {
    activateChatsView();
    return true;
  }
  if (!authScreen.classList.contains("hidden") && authMode !== "login") {
    setAuthMode("login");
    return true;
  }
  return false;
}

function beginGlobalBackSwipe(x, y) {
  if (!isCompactLayout() && !isNativeRuntime()) return;
  globalBackSwipeStart = {
    x,
    y,
    time: Date.now()
  };
}

function handleGlobalBackSwipe(x, y, options = {}) {
  if (!globalBackSwipeStart) return;
  const deltaX = x - globalBackSwipeStart.x;
  const deltaY = y - globalBackSwipeStart.y;
  const elapsed = Date.now() - globalBackSwipeStart.time;
  if (deltaX > 82 && Math.abs(deltaY) < 90 && elapsed < 950) {
    const now = Date.now();
    if (now - lastGlobalBackSwipeAt < 450) return;
    lastGlobalBackSwipeAt = now;
    globalBackSwipeStart = null;
    goBackOneLevel();
    return;
  }
  if (options.final) globalBackSwipeStart = null;
}

function finishGlobalBackSwipe(x, y) {
  handleGlobalBackSwipe(x, y, { final: true });
}

document.addEventListener(
  "pointerdown",
  (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    beginGlobalBackSwipe(event.clientX, event.clientY);
  },
  { passive: true }
);

document.addEventListener(
  "pointerup",
  (event) => {
    finishGlobalBackSwipe(event.clientX, event.clientY);
  },
  { passive: true }
);

document.addEventListener(
  "pointermove",
  (event) => {
    handleGlobalBackSwipe(event.clientX, event.clientY);
  },
  { passive: true }
);

document.addEventListener(
  "touchstart",
  (event) => {
    const touch = event.touches?.[0];
    if (!touch) return;
    beginGlobalBackSwipe(touch.clientX, touch.clientY);
  },
  { passive: true }
);

document.addEventListener(
  "touchend",
  (event) => {
    const touch = event.changedTouches?.[0];
    if (!touch) return;
    finishGlobalBackSwipe(touch.clientX, touch.clientY);
  },
  { passive: true }
);

document.addEventListener(
  "touchmove",
  (event) => {
    const touch = event.touches?.[0];
    if (!touch) return;
    handleGlobalBackSwipe(touch.clientX, touch.clientY);
  },
  { passive: true }
);

document.addEventListener("visibilitychange", () => {
  globalBackSwipeStart = null;
});

voiceCallBtn.addEventListener("click", () => startCall("voice"));

videoCallBtn.addEventListener("click", () => startCall("video"));

answerCallBtn.addEventListener("click", async () => {
  stopIncomingRingtone();
  primeCallAudio();
  answerCallBtn.disabled = true;
  answeringCallId = activeServerCallId;
  try {
    const mediaReady = await prepareLocalCallMedia(activeCallMode);
    if (!mediaReady) return;
    const call = await callAction("accept", { apply: false, sync: false });
    if (call) {
      showServerCall({ ...call, signals: [] });
      await addLocalTracksToPeer();
      await processRtcSignals(call.signals || []);
      playRemoteMedia();
      syncServerData();
    }
  } catch {
    callHint.textContent = "Không kết nối được âm thanh, vui lòng thử lại cuộc gọi.";
  } finally {
    answeringCallId = "";
    answerCallBtn.disabled = false;
  }
});

muteBtn.addEventListener("click", () => {
  setTrackEnabled("audio", !callMicEnabled);
  callHint.textContent = callMicEnabled ? "Micro đang bật." : "Micro đã tắt.";
});

cameraBtn.addEventListener("click", () => {
  setTrackEnabled("video", !callCameraEnabled);
  localVideo.classList.toggle("hidden", !callCameraEnabled || activeCallMode !== "video");
  remotePlaceholder.style.display = !callCameraEnabled ? "grid" : "none";
});

speakerBtn?.addEventListener("click", async () => {
  callSpeakerEnabled = !callSpeakerEnabled;
  updateSpeakerButton();
  await applySpeakerOutput();
  playRemoteMedia();
  callHint.textContent = callSpeakerEnabled
    ? "Loa ngoài đang bật. Nếu dùng tai nghe Bluetooth, hãy chọn thiết bị âm thanh trong hệ điều hành."
    : "Đã chuyển về chế độ loa trong trong XPAY Chat. Một số trình duyệt mobile vẫn có thể giới hạn điều khiển phần cứng âm thanh.";
});

endCallBtn.addEventListener("click", endCall);

function openMainView(view = "chats") {
  currentView = view;
  document.querySelectorAll(".tab").forEach((item) => {
    item.classList.toggle("active", item.dataset.view === view);
  });
  document.querySelectorAll("[data-quick-action]").forEach((item) => {
    item.classList.toggle("active", item.dataset.quickAction === view);
  });
  const showNearby = view === "nearby";
  const showBusiness = view === "business";
  const showJournal = view === "journal";
  const showAi = view === "ai";
  chatList.classList.toggle("hidden", showNearby || showBusiness || showJournal || showAi);
  nearbyList.classList.toggle("hidden", !showNearby);
  businessList?.classList.toggle("hidden", !showBusiness);
  journalList.classList.toggle("hidden", !showJournal);
  aiAssistantList.classList.toggle("hidden", !showAi);
  if (isCompactLayout()) {
    chatApp.classList.toggle("conversation-open", showAi);
  }
  renderAll();
  if (showNearby && hasServerSession()) {
    apiRequest("/api/nearby/list")
      .then((data) => {
        applyServerNearby(data.nearby || []);
        renderNearby();
      })
      .catch(() => {
        locationStatus.textContent = "Bấm Bật quanh đây để cập nhật vị trí.";
      });
  }
  if (showBusiness && hasServerSession()) {
    apiRequest("/api/businesses/list")
      .then((data) => {
        applyServerBusinesses(data.businesses || []);
        renderBusinesses();
      })
      .catch(() => undefined);
  }
}

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    openMainView(tab.dataset.view || "chats");
  });
});

businessList?.addEventListener("submit", (event) => {
  const form = event.target.closest("#businessForm");
  if (!form) return;
  event.preventDefault();
  saveBusinessProfileFromForm(form);
});

businessList?.addEventListener("input", (event) => {
  if (event.target?.id !== "businessSearchInput") return;
  businessSearchQuery = event.target.value || "";
  renderBusinesses();
  const input = document.querySelector("#businessSearchInput");
  input?.focus({ preventScroll: true });
  input?.setSelectionRange(businessSearchQuery.length, businessSearchQuery.length);
});

businessList?.addEventListener("click", (event) => {
  const composerToggle = event.target.closest("[data-business-composer-toggle]");
  if (composerToggle) {
    businessComposerOpen = !businessComposerOpen;
    renderBusinesses();
    return;
  }

  if (event.target?.id === "businessUseLocationBtn") {
    getCurrentGeoPosition()
      .then((position) => {
        pendingBusinessLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        renderBusinesses();
      })
      .catch(() => {
        const status = document.querySelector("#businessStatus");
        if (status) status.textContent = "Không lấy được vị trí. Hãy bật quyền vị trí cho trình duyệt.";
      });
    return;
  }
  const contactButton = event.target.closest("[data-business-contact]");
  if (contactButton) {
    contactBusiness(contactButton.dataset.businessContact, contactButton.dataset.businessTemplate || "");
    return;
  }
  const reportBusinessButton = event.target.closest("[data-business-report]");
  if (reportBusinessButton) {
    createContentReport({
      targetType: "business",
      targetId: reportBusinessButton.dataset.businessReport || "",
      targetOwnerPhone: reportBusinessButton.dataset.businessReport || "",
      details: reportBusinessButton.dataset.businessName || ""
    }).catch(() => {});
    return;
  }
  const openChat = event.target.closest("[data-business-open-chat]")?.dataset.businessOpenChat;
  if (openChat) {
    const target = selectPerson(openChat, { phone: openChat, preferPhone: true, revealHidden: true });
    if (target) {
      currentView = "chats";
      setActiveView("chats");
    }
    return;
  }
  const quickReply = event.target.closest("[data-business-quick-reply]")?.dataset.businessQuickReply;
  if (quickReply) {
    const templates = {
      price: "Cảm ơn anh/chị đã quan tâm. Anh/chị cho em biết sản phẩm/dịch vụ cần báo giá để em tư vấn chính xác nhé.",
      hours: "Bên em đang mở cửa theo giờ đã đăng trên hồ sơ doanh nghiệp. Anh/chị muốn ghé hoặc cần hỗ trợ online ạ?",
      booking: "Anh/chị cho em xin thời gian mong muốn, số người và nội dung cần đặt lịch để em xác nhận lại nhé."
    };
    messageInput.value = templates[quickReply] || "";
    autoSizeMessageInput();
    currentView = "chats";
    setActiveView("chats");
    messageInput.focus();
    return;
  }
  const near = event.target.closest("[data-business-near-me]")?.dataset.businessNearMe;
  if (near) {
    businessSearchNearMe = near === "on";
    refreshBusinessSearchFromServer({ forceLocation: businessSearchNearMe }).catch(() => renderBusinesses());
    return;
  }
  const openNow = event.target.closest("[data-business-open-now]")?.dataset.businessOpenNow;
  if (openNow) {
    businessSearchOpenNow = openNow === "on";
    refreshBusinessSearchFromServer().catch(() => renderBusinesses());
    return;
  }
  const filter = event.target.closest("[data-business-filter]")?.dataset.businessFilter;
  if (!filter) return;
  businessSearchQuery = filter;
  refreshBusinessSearchFromServer().catch(() => renderBusinesses());
});

businessList?.addEventListener("change", (event) => {
  if (event.target?.id !== "businessRadiusSelect") return;
  businessSearchRadiusKm = Number(event.target.value || 5);
  refreshBusinessSearchFromServer().catch(() => renderBusinesses());
});

businessList?.addEventListener("change", (event) => {
  const customerPhone = event.target?.dataset?.businessCustomerStatus;
  if (!customerPhone) return;
  updateBusinessCustomerStatus(customerPhone, event.target.value).catch((error) => {
    const status = document.querySelector("#businessStatus");
    if (status) status.textContent = error.message || "Không cập nhật được trạng thái khách hàng.";
  });
});

businessList?.addEventListener("change", async (event) => {
  const target = event.target;
  if (target?.id !== "businessLogoInput" && target?.id !== "businessGalleryInput") return;
  const status = document.querySelector("#businessStatus");
  try {
    if (target.id === "businessLogoInput") {
      const file = target.files?.[0];
      if (!file) return;
      pendingBusinessLogo = await readMediaFile(file, {
        accepted: ["image/"],
        maxSize: 6 * 1024 * 1024
      });
      if (status) status.textContent = "Logo đã sẵn sàng. Bấm cập nhật hồ sơ để gửi admin duyệt.";
    } else {
      const files = Array.from(target.files || []).slice(0, 5);
      pendingBusinessGallery = [];
      for (const file of files) {
        pendingBusinessGallery.push(await readMediaFile(file, {
          accepted: ["image/"],
          maxSize: 6 * 1024 * 1024
        }));
      }
      if (status) status.textContent = `Đã chọn ${pendingBusinessGallery.length} ảnh. Bấm cập nhật hồ sơ để gửi admin duyệt.`;
    }
    renderBusinesses();
  } catch (error) {
    if (status) status.textContent = error.message === "too-large"
      ? "Ảnh vượt quá 6MB. Vui lòng chọn ảnh nhẹ hơn."
      : "Chỉ hỗ trợ file ảnh hợp lệ.";
    target.value = "";
  }
});

aiAutoReplyToggle?.addEventListener("change", () => {
  aiSettings.autoReplySimple = aiAutoReplyToggle.checked;
  saveAiSettings();
  saveAiRulesToServer({ silent: true });
  if (settingsAiAutoReplyToggle) settingsAiAutoReplyToggle.checked = aiAutoReplyToggle.checked;
  renderAiAssistantList();
});

aiRulesForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  await saveAiRulesToServer();
});

document.querySelectorAll("[data-ai-assistant-prompt]").forEach((button) => {
  button.addEventListener("click", () => {
    const promptMap = {
      schedule: "Sắp xếp lịch hẹn từ tin nhắn gần đây",
      tasks: "Tổng hợp công việc cần làm",
      weekend: "Gợi ý kế hoạch cuối tuần"
    };
    const prompt = promptMap[button.dataset.aiAssistantPrompt] || "Tóm tắt giúp tôi";
    document.querySelector('[data-view="ai"]')?.click();
    startAiAssistantPrompt(prompt);
  });
});

document.querySelectorAll("[data-ai-agent-action]").forEach((button) => {
  button.addEventListener("click", () => {
    const response = runAiAgentAction(button.dataset.aiAgentAction || "");
    aiAssistantMessages.push({ from: "them", text: response, time: nowTime() });
    saveAiAssistantMessages();
    renderAll();
  });
});

conversationSearch.addEventListener("input", (event) => {
  currentFilter = event.target.value;
  renderChats();
});

messageInput.addEventListener("compositionstart", () => {
  isMessageComposing = true;
});

messageInput.addEventListener("compositionend", () => {
  isMessageComposing = false;
  autoSizeMessageInput();
  scheduleKeyboardViewportUpdate();
});

messageInput.addEventListener("input", () => {
  autoSizeMessageInput();
  scheduleKeyboardViewportUpdate();
});

messageInput.addEventListener("focus", () => {
  scheduleKeyboardViewportUpdate();
  window.setTimeout(scheduleKeyboardViewportUpdate, 180);
});

messageInput.addEventListener("blur", () => {
  window.setTimeout(scheduleKeyboardViewportUpdate, 80);
});

messageInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" || event.shiftKey || isComposingMessage(event)) return;
  if (isCompactLayout() && !event.metaKey && !event.ctrlKey) return;
  event.preventDefault();
  if (typeof messageForm.requestSubmit === "function") {
    messageForm.requestSubmit();
    return;
  }
  messageForm.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
});

document.addEventListener("focusin", scheduleKeyboardViewportUpdate, true);
document.addEventListener("focusout", () => window.setTimeout(scheduleKeyboardViewportUpdate, 80), true);
window.addEventListener("resize", scheduleKeyboardViewportUpdate);
window.addEventListener("orientationchange", () => window.setTimeout(scheduleKeyboardViewportUpdate, 180));
window.visualViewport?.addEventListener("resize", scheduleKeyboardViewportUpdate);
window.visualViewport?.addEventListener("scroll", scheduleKeyboardViewportUpdate);

messageForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (isComposingMessage(event)) return;
  const text = messageInput.value.trim();
  if (!text) return;
  closeEmojiPanel();

  if (isAiAssistantView()) {
    messageInput.value = "";
    autoSizeMessageInput();
    startAiAssistantPrompt(text);
    return;
  }

  const person = getActivePerson();
  if (!person) return;

  const time = nowTime();
  messageInput.value = "";
  autoSizeMessageInput();

  if (hasServerSession()) {
    const sent = await sendServerMessage(person, { text, media: null, time });
    if (!sent?.message) {
      messageInput.value = text;
      autoSizeMessageInput();
      messageInput.placeholder = "Không gửi được, vui lòng thử lại";
      return;
    }
    addPlainMessage(person, sent.message);
    syncServerData();
    return;
  }

  person.messages.push(await makeSecureMessage({ from: "me", text, time }));
  setHiddenChatPhone(friendPhone(person), false, { sync: false });
  savePeople();
  renderAll();
});

attachMediaBtn.addEventListener("click", () => {
  if (isAiAssistantView()) return;
  if (!getActivePerson()) return;
  closeEmojiPanel();
  chatMediaInput.click();
});

emojiBtn?.addEventListener("click", (event) => {
  event.preventDefault();
  toggleEmojiPanel();
});

emojiPanel?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-emoji]");
  if (!button) return;
  insertEmoji(button.dataset.emoji || "");
  closeEmojiPanel();
});

document.addEventListener("click", (event) => {
  if (!emojiPanel || emojiPanel.classList.contains("hidden")) return;
  if (event.target.closest("#emojiPanel") || event.target.closest("#emojiBtn")) return;
  closeEmojiPanel();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeEmojiPanel();
});

function currentPosition(options = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("unsupported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 30000,
      ...options
    });
  });
}

function locationMediaFromPosition(position) {
  const lat = Number(position.coords.latitude);
  const lng = Number(position.coords.longitude);
  const accuracy = Number(position.coords.accuracy || 0);
  const capturedAt = new Date(position.timestamp || Date.now()).toISOString();
  return {
    type: "application/vnd.xpaychat.location+json",
    name: "Vị trí hiện tại",
    data: JSON.stringify({
      lat,
      lng,
      accuracy,
      capturedAt
    })
  };
}

async function sendCurrentLocationMessage() {
  if (isAiAssistantView()) return;
  const person = getActivePerson();
  if (!person) return;

  sendLocationBtn.disabled = true;
  const previousPlaceholder = messageInput.placeholder;
  messageInput.placeholder = "Đang lấy vị trí hiện tại...";
  try {
    const position = await currentPosition();
    const media = locationMediaFromPosition(position);
    const time = nowTime();
    const text = "Đã gửi vị trí hiện tại";

    if (hasServerSession()) {
      const sent = await sendServerMessage(person, { text, media, time });
      if (!sent?.message) {
        messageInput.placeholder = "Không gửi được vị trí, vui lòng thử lại";
        return;
      }
      addPlainMessage(person, sent.message);
      syncServerData();
      messageInput.placeholder = previousPlaceholder;
      return;
    }

    person.messages.push(await makeSecureMessage({ from: "me", text, media, time }));
    savePeople();
    renderAll();
    messageInput.placeholder = previousPlaceholder;
  } catch (error) {
    messageInput.placeholder =
      error?.code === 1
        ? "Bạn chưa cấp quyền vị trí cho trình duyệt"
        : error?.message === "unsupported"
          ? "Trình duyệt chưa hỗ trợ gửi vị trí"
          : "Không lấy được vị trí, vui lòng thử lại";
  } finally {
    sendLocationBtn.disabled = false;
  }
}

sendLocationBtn.addEventListener("click", sendCurrentLocationMessage);

chatMediaInput.addEventListener("change", async () => {
  const file = chatMediaInput.files?.[0];
  if (!file) return;

  try {
    const media = await readMediaFile(file, {
      accepted: ["image/", "video/"],
      maxSize: 20 * 1024 * 1024
    });
    const person = getActivePerson();
    if (!person) {
      chatMediaInput.value = "";
      return;
    }
    const kind = media.type.startsWith("video/") ? "video" : "hình ảnh";
    const time = nowTime();

    if (hasServerSession()) {
      const sent = await sendServerMessage(person, { text: `Đã gửi ${kind}`, media, time });
      if (!sent?.message) {
        messageInput.placeholder = "Không gửi được file, vui lòng thử lại";
        chatMediaInput.value = "";
        return;
      }
      chatMediaInput.value = "";
      addPlainMessage(person, sent.message);
      syncServerData();
      return;
    }

    person.messages.push(await makeSecureMessage({
      from: "me",
      text: `Đã gửi ${kind}`,
      media,
      time
    }));
    chatMediaInput.value = "";
    savePeople();
    renderAll();
  } catch (error) {
    messageInput.placeholder =
      error.message === "too-large" ? "File quá lớn, hãy chọn file dưới 20MB" : "Không gửi được file này";
    chatMediaInput.value = "";
  }
});

journalPrivacyButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (!journalPrivacyInput) return;
    journalPrivacyInput.value = button.dataset.journalPrivacy || "public";
    syncJournalPrivacyButtons();
  });
});

journalPrivacyInput?.addEventListener("change", () => syncJournalPrivacyButtons());

journalImageInput.addEventListener("change", async () => {
  const file = journalImageInput.files?.[0];
  if (!file) {
    pendingJournalImage = null;
    journalPreview.classList.add("hidden");
    journalPreview.innerHTML = "";
    return;
  }

  try {
    pendingJournalImage = await readMediaFile(file, {
      accepted: ["image/"],
      maxSize: 8 * 1024 * 1024
    });
    journalPreview.innerHTML = `<img src="${pendingJournalImage.data}" alt="${pendingJournalImage.name || "Ảnh nhật ký"}" />`;
    journalPreview.classList.remove("hidden");
  } catch (error) {
    pendingJournalImage = null;
    journalImageInput.value = "";
    journalPreview.classList.add("hidden");
    journalPreview.innerHTML = "";
    journalTextInput.placeholder =
      error.message === "too-large" ? "Ảnh quá lớn, hãy chọn ảnh dưới 8MB" : "Không đọc được ảnh này";
  }
});

journalForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = journalTextInput.value.trim();
  if (!text && !pendingJournalImage) return;

  const post = {
    id: `journal-${Date.now()}`,
    authorName: currentUser?.fullName || currentUser?.name || "XPAY User",
    authorPhone: currentUser?.phone || "",
    avatarData: currentUser?.avatarData || "",
    text,
    privacy: journalPrivacyInput.value,
    image: pendingJournalImage,
    time: nowTime()
  };

  if (hasServerSession()) {
    try {
      const data = await apiRequest("/api/journals/create", { post });
      journals.unshift(data.post || post);
    } catch (error) {
      if (isServerRuntime()) {
        journalTextInput.placeholder = error.network
          ? "Không kết nối được, vui lòng thử lại"
          : "Chưa đăng nhật ký được, vui lòng thử lại";
        return;
      }
      journals.unshift(post);
    }
  } else {
    journals.unshift(post);
  }

  saveJournals();
  journalTextInput.value = "";
  journalImageInput.value = "";
  pendingJournalImage = null;
  journalPreview.classList.add("hidden");
  journalPreview.innerHTML = "";
  renderJournals();
  syncServerData();
});

journalPosts.addEventListener("click", async (event) => {
  const reportButton = event.target.closest("[data-report-journal]");
  if (reportButton) {
    const post = journals.find((item) => item.id === reportButton.dataset.reportJournal);
    if (post) {
      await createContentReport({
        targetType: "journal",
        targetId: post.id,
        targetOwnerPhone: post.authorPhone || "",
        details: post.text || ""
      });
    }
    return;
  }
  const deleteButton = event.target.closest("[data-delete-journal]");
  if (!deleteButton) return;

  if (hasServerSession()) {
    try {
      await apiRequest("/api/journals/delete", { id: deleteButton.dataset.deleteJournal });
    } catch (error) {
      if (!error.network) return;
    }
  }

  journals = journals.filter((post) => post.id !== deleteButton.dataset.deleteJournal);
  saveJournals();
  renderJournals();
});

locateBtn.addEventListener("click", () => {
  if (normalizePresenceMode(currentUser?.presenceMode || appSettings.presenceMode) === "offline") {
    locationStatus.textContent = "Bạn đang offline. Chuyển sang online trong Cài đặt để dùng Quanh đây.";
    return;
  }

  locationStatus.textContent = "Đang xin quyền định vị...";

  if (!navigator.geolocation) {
    locationStatus.textContent = "Trình duyệt chưa hỗ trợ định vị";
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      if (hasServerSession()) {
        try {
          const data = await apiRequest("/api/location/update", {
            enabled: true,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          applyServerNearby(data.nearby || []);
          locationStatus.textContent = data.nearby?.length
            ? `Đã bật quanh đây, tìm thấy ${data.nearby.length} tài khoản`
            : "Đã bật quanh đây, chưa có tài khoản gần bạn";
          renderNearby();
          return;
        } catch (error) {
          locationStatus.textContent = error.message || "Không cập nhật được vị trí";
          return;
        }
      }

      updateDistancesFromLocation();
      locationStatus.textContent = "Đã quét vị trí gần bạn";
    },
    () => {
      locationStatus.textContent = "Không có quyền định vị. Hãy bật quyền vị trí cho trình duyệt.";
      if (!hasServerSession()) updateDistancesFromLocation();
    },
    { enableHighAccuracy: true, timeout: 6000, maximumAge: 120000 }
  );
});

async function bootApp() {
  const savedToken = localStorage.getItem(authTokenKey);
  if (savedToken) {
    try {
      const session = await apiRequest("/api/session/restore");
      applyServerSession(session);
      return;
    } catch (error) {
      safeRemoveItem(authTokenKey);
      if (error?.message) authStatus.textContent = error.message;
    }
  }

  const savedUser = localStorage.getItem(storageKey);
  if (savedUser && !isServerRuntime()) {
    try {
      showApp(JSON.parse(savedUser));
      return;
    } catch {
      showAuth();
    }
  }

  if (isServerRuntime()) clearLargeLocalCache();
  setAuthMode("login");
  showAuth();
}

applyUiTheme(currentUiTheme, { persist: false });
applyLanguage();
syncJournalPrivacyButtons();
bootApp();

window.addEventListener("focus", () => {
  syncServerData();
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") syncServerData();
});

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", () => {
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
    navigator.serviceWorker.register("./service-worker.js?v=20260531-ios-parity").catch(() => {});
  });
}
