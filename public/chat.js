let customerToken = localStorage.getItem("xpayCustomerToken") || "";
let lastPassword = "";

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

function renderLicense(payload) {
  const customer = payload.customer;
  const license = payload.license;
  document.querySelector("#licenseState").textContent = license.status;
  document.querySelector("#licensePanel").innerHTML = `
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
  document.querySelector("#changePasswordForm").hidden = !license.mustChangePassword;
}

document.querySelector("#chatLoginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const status = document.querySelector("#chatStatus");
  status.textContent = "Đang đăng nhập...";
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
    status.textContent = payload.license.mustChangePassword ? "Vui lòng đổi mật khẩu lần đầu." : "Đăng nhập thành công.";
    document.querySelector("#changePasswordForm [name='currentPassword']").value = lastPassword;
    renderLicense(payload);
  } catch (error) {
    status.textContent = error.message;
  }
});

document.querySelector("#changePasswordForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const status = document.querySelector("#chatStatus");
  const body = Object.fromEntries(new FormData(event.currentTarget).entries());
  try {
    const payload = await chatApi("/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify(body)
    });
    status.textContent = "Đã đổi mật khẩu. XPAY Chat đã sẵn sàng.";
    renderLicense(payload);
    event.currentTarget.hidden = true;
  } catch (error) {
    status.textContent = error.message;
  }
});

if (customerToken) {
  chatApi("/api/me")
    .then(renderLicense)
    .catch(() => {
      localStorage.removeItem("xpayCustomerToken");
      customerToken = "";
    });
}
