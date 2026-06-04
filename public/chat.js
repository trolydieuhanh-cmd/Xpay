let customerToken = localStorage.getItem("xpayCustomerToken") || "";
let lastPassword = "";
let activeConversationId = "";
let currentLicense = null;

const selectors = {
  loginForm: document.querySelector("#chatLoginForm"),
  logoutButton: document.querySelector("#chatLogout"),
  changePasswordForm: document.querySelector("#changePasswordForm"),
  status: document.querySelector("#chatStatus"),
  licenseState: document.querySelector("#licenseState"),
  licensePanel: document.querySelector("#licensePanel"),
  conversationPanel: document.querySelector("#conversationPanel"),
  conversationList: document.querySelector("#conversationList"),
  newConversationButton: document.querySelector("#newConversationButton"),
  activeChatTitle: document.querySelector("#activeChatTitle"),
  messageList: document.querySelector("#messageList"),
  messageForm: document.querySelector("#chatMessageForm")
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}

function authHeaders() {
  return customerToken ? { Authorization: `Bearer ${customerToken}` } : {};
}

async function chatApi(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(options.headers || {})
    }
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Yêu cầu không thành công.");
  return payload;
}

function dateLabel(value) {
  if (!value) return "Vĩnh viễn";
  return new Date(value).toLocaleString("vi-VN");
}

function timeLabel(value) {
  if (!value) return "";
  return new Date(value).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

function canUseChat(license = currentLicense) {
  return Boolean(license && license.status === "active" && !license.mustChangePassword);
}

function setChatEnabled(enabled) {
  selectors.messageForm.querySelector("input").disabled = !enabled;
  selectors.messageForm.querySelector("button").disabled = !enabled;
  selectors.conversationPanel.hidden = !enabled;
}

function renderLockedMessage(message) {
  selectors.activeChatTitle.textContent = "XPAY Chat";
  selectors.messageList.innerHTML = `<article class="message other">${escapeHtml(message)}</article>`;
  setChatEnabled(false);
}

function renderLicense(payload) {
  const customer = payload.customer;
  const license = payload.license;
  currentLicense = license;
  selectors.licenseState.textContent = license.mustChangePassword ? "Cần đổi mật khẩu" : license.status;
  selectors.loginForm.hidden = Boolean(customerToken);
  selectors.logoutButton.hidden = !customerToken;
  selectors.changePasswordForm.hidden = !license.mustChangePassword;
  selectors.licensePanel.innerHTML = `
    <h2>Thông tin license</h2>
    <dl>
      <div><dt>Khách hàng</dt><dd>${escapeHtml(customer.name)}</dd></div>
      <div><dt>Email</dt><dd>${escapeHtml(customer.email)}</dd></div>
      <div><dt>Số điện thoại</dt><dd>${escapeHtml(customer.phone)}</dd></div>
      <div><dt>Sản phẩm</dt><dd>${escapeHtml(customer.productName)}</dd></div>
      <div><dt>Gói dịch vụ</dt><dd>${escapeHtml(customer.planName)}</dd></div>
      <div><dt>Trạng thái</dt><dd>${escapeHtml(license.status)}</dd></div>
      <div><dt>Hiệu lực đến</dt><dd>${dateLabel(license.expiresAt)}</dd></div>
    </dl>
  `;
  if (license.mustChangePassword) {
    renderLockedMessage("Vui lòng đổi mật khẩu lần đầu để mở workspace XPAY Chat.");
  } else if (license.status !== "active") {
    renderLockedMessage(`License đang ở trạng thái ${license.status}. Vui lòng liên hệ Admin XPAY.`);
  }
}

function renderConversations(conversations) {
  selectors.conversationList.innerHTML = conversations.map((conversation) => `
    <button class="conversation-item ${conversation.id === activeConversationId ? "active" : ""}" data-conversation-id="${escapeHtml(conversation.id)}" type="button">
      <strong>${escapeHtml(conversation.title)}</strong>
      <span>${escapeHtml(conversation.lastMessage || "Chưa có tin nhắn")}</span>
    </button>
  `).join("");
}

function renderMessages(messages) {
  selectors.messageList.innerHTML = messages.map((message) => {
    const kind = message.authorType === "customer" ? "mine" : "other";
    return `
      <article class="message ${kind}">
        <p>${escapeHtml(message.text)}</p>
        <small>${escapeHtml(message.authorName)} · ${timeLabel(message.createdAt)}</small>
      </article>
    `;
  }).join("") || `<article class="message other">Hội thoại đang trống.</article>`;
  selectors.messageList.scrollTop = selectors.messageList.scrollHeight;
}

function renderWorkspace(payload) {
  renderLicense(payload);
  if (!canUseChat(payload.license)) return;
  activeConversationId = payload.activeConversationId;
  const active = payload.conversations.find((conversation) => conversation.id === activeConversationId);
  selectors.activeChatTitle.textContent = active ? active.title : "XPAY Chat";
  renderConversations(payload.conversations);
  renderMessages(payload.messages);
  setChatEnabled(true);
}

async function loadWorkspace(conversationId = activeConversationId) {
  if (!customerToken || !canUseChat()) return;
  const query = conversationId ? `?conversationId=${encodeURIComponent(conversationId)}` : "";
  const payload = await chatApi(`/api/chat/workspace${query}`);
  renderWorkspace(payload);
}

selectors.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  selectors.status.textContent = "Đang đăng nhập...";
  const body = Object.fromEntries(new FormData(event.currentTarget).entries());
  body.deviceId = `web-${navigator.userAgent.slice(0, 48)}`;
  lastPassword = body.password;
  try {
    const payload = await chatApi("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
      headers: {}
    });
    customerToken = payload.token;
    localStorage.setItem("xpayCustomerToken", customerToken);
    selectors.status.textContent = payload.license.mustChangePassword ? "Vui lòng đổi mật khẩu lần đầu." : "Đăng nhập thành công. XPAY Chat đã sẵn sàng.";
    selectors.changePasswordForm.querySelector("[name='currentPassword']").value = lastPassword;
    renderLicense(payload);
    if (canUseChat(payload.license)) await loadWorkspace();
  } catch (error) {
    selectors.status.textContent = error.message;
  }
});

selectors.changePasswordForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const body = Object.fromEntries(new FormData(event.currentTarget).entries());
  try {
    const payload = await chatApi("/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify(body)
    });
    selectors.status.textContent = "Đã đổi mật khẩu. XPAY Chat đã sẵn sàng.";
    event.currentTarget.reset();
    renderLicense(payload);
    await loadWorkspace();
  } catch (error) {
    selectors.status.textContent = error.message;
  }
});

selectors.messageForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const input = event.currentTarget.querySelector("[name='text']");
  const text = input.value.trim();
  if (!text || !activeConversationId) return;
  input.value = "";
  input.disabled = true;
  try {
    const payload = await chatApi("/api/chat/messages", {
      method: "POST",
      body: JSON.stringify({ conversationId: activeConversationId, text })
    });
    renderWorkspace(payload);
  } catch (error) {
    selectors.status.textContent = error.message;
  } finally {
    input.disabled = !canUseChat();
    input.focus();
  }
});

selectors.conversationList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-conversation-id]");
  if (!button) return;
  activeConversationId = button.dataset.conversationId;
  await loadWorkspace(activeConversationId);
});

selectors.newConversationButton.addEventListener("click", async () => {
  const title = window.prompt("Tên hội thoại mới", "Hỗ trợ XPAY");
  if (!title) return;
  const payload = await chatApi("/api/chat/conversations", {
    method: "POST",
    body: JSON.stringify({ title })
  });
  renderWorkspace(payload);
});

selectors.logoutButton.addEventListener("click", () => {
  customerToken = "";
  activeConversationId = "";
  currentLicense = null;
  localStorage.removeItem("xpayCustomerToken");
  selectors.loginForm.hidden = false;
  selectors.logoutButton.hidden = true;
  selectors.changePasswordForm.hidden = true;
  selectors.licenseState.textContent = "Chưa đăng nhập";
  selectors.status.textContent = "Đã đăng xuất.";
  selectors.licensePanel.innerHTML = "<h2>Thông tin license</h2><p>Đăng nhập để xem trạng thái gói, ngày kích hoạt và ngày hết hạn.</p>";
  renderLockedMessage("Đăng nhập để mở workspace XPAY Chat.");
});

if (customerToken) {
  chatApi("/api/me")
    .then((payload) => {
      renderLicense(payload);
      if (canUseChat(payload.license)) return loadWorkspace();
      return null;
    })
    .catch(() => {
      localStorage.removeItem("xpayCustomerToken");
      customerToken = "";
      renderLockedMessage("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
    });
} else {
  renderLockedMessage("Đăng nhập để mở workspace XPAY Chat.");
}
