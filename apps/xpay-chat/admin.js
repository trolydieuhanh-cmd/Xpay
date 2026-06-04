const adminTokenKey = "xpaychat.adminToken";

const loginPanel = document.querySelector("#loginPanel");
const dashboard = document.querySelector("#dashboard");
const tokenForm = document.querySelector("#tokenForm");
const adminTokenInput = document.querySelector("#adminTokenInput");
const loginStatus = document.querySelector("#loginStatus");
const refreshBtn = document.querySelector("#refreshBtn");
const exportBtn = document.querySelector("#exportBtn");
const logoutAdminBtn = document.querySelector("#logoutAdminBtn");
const searchInput = document.querySelector("#searchInput");
const usersTable = document.querySelector("#usersTable");
const detailCard = document.querySelector("#detailCard");
const emptyState = document.querySelector("#emptyState");
const syncTime = document.querySelector("#syncTime");
const totalUsers = document.querySelector("#totalUsers");
const verifiedUsers = document.querySelector("#verifiedUsers");
const onlineUsers = document.querySelector("#onlineUsers");
const manualOfflineUsers = document.querySelector("#manualOfflineUsers");
const inactiveOfflineUsers = document.querySelector("#inactiveOfflineUsers");
const avatarUsers = document.querySelector("#avatarUsers");
const nearbyUsers = document.querySelector("#nearbyUsers");
const blueTickUsers = document.querySelector("#blueTickUsers");
const vipUsers = document.querySelector("#vipUsers");
const businessAdminList = document.querySelector("#businessAdminList");
const businessAdminCount = document.querySelector("#businessAdminCount");

let adminToken = sessionStorage.getItem(adminTokenKey) || "";
let users = [];
let filteredUsers = [];
let selectedPhone = "";
let businesses = [];

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function initials(name = "") {
  return String(name).trim().slice(0, 1).toUpperCase() || "N";
}

function formatDate(value = "") {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

function avatarMarkup(user) {
  if (user.avatarData) {
    return `<div class="avatar"><img src="${escapeHtml(user.avatarData)}" alt="${escapeHtml(user.fullName || user.name)}" /></div>`;
  }
  return `<div class="avatar">${escapeHtml(initials(user.fullName || user.name))}</div>`;
}

function privacyText(privacy = {}) {
  const enabled = [];
  if (privacy.phone) enabled.push("SĐT");
  if (privacy.birthDate) enabled.push("Ngày sinh");
  if (privacy.interests) enabled.push("Sở thích");
  if (privacy.avatar) enabled.push("Avatar");
  return enabled.length ? enabled.join(", ") : "Không hiển thị";
}

function normalizeAccountBadges(value = {}) {
  const source = value && typeof value === "object" ? value : {};
  return {
    verified: source.verified === true || source.verifiedAccount === true || source.blueTick === true,
    vip: source.vip === true || source.vipAccount === true || source.diamond === true
  };
}

function badgeText(user = {}) {
  const badges = normalizeAccountBadges(user.accountBadges);
  const labels = [];
  if (badges.verified) labels.push("Tích xanh");
  if (badges.vip) labels.push("Kim cương VIP");
  return labels.length ? labels.join(", ") : "Thường";
}

function badgeMarkup(user = {}) {
  const badges = normalizeAccountBadges(user.accountBadges);
  return `
    <span class="account-badges">
      ${badges.verified ? `<span class="account-badge verified" title="Tích xanh">✓</span>` : ""}
      ${badges.vip ? `<span class="account-badge vip" title="Kim cương VIP">◆</span>` : ""}
      ${!badges.verified && !badges.vip ? `<span class="badge-muted">Thường</span>` : ""}
    </span>
  `;
}

function isManualOffline(user = {}) {
  return !user.presenceOnline && user.presenceOfflineReason === "manual_offline";
}

function isInactiveOffline(user = {}) {
  return !user.presenceOnline && !isManualOffline(user);
}

function presenceReasonText(user = {}) {
  if (user.presenceOnline) return "Đang hoạt động";
  if (isManualOffline(user)) return "Tắt trạng thái trong cài đặt";
  return user.presenceOfflineReasonText || "Không đăng nhập hoặc thiết bị không hoạt động";
}

function presenceClass(user = {}) {
  if (user.presenceOnline) return "online";
  return isManualOffline(user) ? "manual-offline" : "inactive-offline";
}

function presenceMarkup(user = {}) {
  const status = user.presenceOnline ? "Online" : "Offline";
  return `
    <span class="presence-pill ${presenceClass(user)}">
      <i aria-hidden="true"></i>
      ${escapeHtml(status)}
    </span>
    <small class="presence-reason">${escapeHtml(presenceReasonText(user))}</small>
  `;
}

function businessStatusLabel(status = "") {
  return {
    published: "Đã duyệt",
    pending: "Chờ duyệt",
    approved: "Đã duyệt",
    needs_changes: "Cần bổ sung",
    restricted: "Bị hạn chế",
    locked: "Bị khoá",
    rejected: "Từ chối",
    hidden: "Ẩn"
  }[status] || "Chờ duyệt";
}

async function adminRequest(path, payload = {}) {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Không tải được dữ liệu admin.");
  return data;
}

function showDashboard() {
  loginPanel.classList.add("hidden");
  dashboard.classList.remove("hidden");
}

function showLogin(message = "") {
  dashboard.classList.add("hidden");
  loginPanel.classList.remove("hidden");
  if (message) loginStatus.textContent = message;
}

function renderStats() {
  totalUsers.textContent = users.length;
  verifiedUsers.textContent = users.filter((user) => user.phoneVerified).length;
  onlineUsers.textContent = users.filter((user) => user.presenceOnline).length;
  manualOfflineUsers.textContent = users.filter(isManualOffline).length;
  inactiveOfflineUsers.textContent = users.filter(isInactiveOffline).length;
  avatarUsers.textContent = users.filter((user) => user.avatarUpdated).length;
  nearbyUsers.textContent = users.filter((user) => user.locationEnabled).length;
  blueTickUsers.textContent = users.filter((user) => normalizeAccountBadges(user.accountBadges).verified).length;
  vipUsers.textContent = users.filter((user) => normalizeAccountBadges(user.accountBadges).vip).length;
}

function renderBusinessAdmin() {
  if (!businessAdminList) return;
  businessAdminCount.textContent = `${businesses.length} hồ sơ`;
  if (!businesses.length) {
    businessAdminList.innerHTML = `<p class="empty-state">Chưa có hồ sơ doanh nghiệp chờ quản lý.</p>`;
    return;
  }
  businessAdminList.innerHTML = businesses
    .map((business) => `
      <article class="business-admin-row" data-business-owner="${escapeHtml(business.ownerPhone)}">
        <div>
          <strong>${escapeHtml(business.name || "Doanh nghiệp Nexa")}</strong>
          <span>${escapeHtml(business.category || "Dịch vụ")} • ${escapeHtml(business.ownerPhone)} • ${escapeHtml(businessStatusLabel(business.status))}</span>
          <p>${escapeHtml(business.description || "Chưa có mô tả")}</p>
          ${business.offer ? `<small>Ưu đãi: ${escapeHtml(business.offer)}</small>` : ""}
          ${business.reviewNote ? `<small>Lý do admin: ${escapeHtml(business.reviewNote)}</small>` : ""}
        </div>
        <div class="business-admin-actions">
          <button type="button" data-business-status="approved">Duyệt</button>
          <button type="button" data-business-status="needs_changes">Cần sửa</button>
          <button type="button" data-business-status="restricted">Hạn chế</button>
          <button type="button" data-business-status="locked">Khoá</button>
          <button type="button" data-business-status="rejected">Từ chối</button>
        </div>
      </article>
    `)
    .join("");
}

function applyFilter() {
  const keyword = searchInput.value.trim().toLowerCase();
  filteredUsers = users.filter((user) => {
    const haystack = [
      user.accountPhone,
      user.phone,
      user.name,
      user.fullName,
      user.birthDate,
      user.interests,
      user.presenceStatus,
      user.presenceMode,
      user.presenceOfflineReasonText,
      badgeText(user),
      user.createdAt,
      user.updatedAt
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(keyword);
  });
  renderTable();
  renderDetail(filteredUsers.find((user) => user.accountPhone === selectedPhone) || filteredUsers[0] || null);
}

function renderTable() {
  emptyState.classList.toggle("hidden", filteredUsers.length > 0);
  usersTable.innerHTML = filteredUsers
    .map((user) => {
      const active = user.accountPhone === selectedPhone ? "active" : "";
      return `
        <tr class="${active}" data-phone="${escapeHtml(user.accountPhone)}">
          <td>
            <div class="user-cell">
              ${avatarMarkup(user)}
              <div class="cell-main">
                <strong>${escapeHtml(user.fullName || user.name || "Nexa User")}</strong>
                <span>${user.phoneVerified ? "Đã xác thực" : "Chưa xác thực"}</span>
              </div>
            </div>
          </td>
          <td>${escapeHtml(user.phone || user.accountPhone)}</td>
          <td>${badgeMarkup(user)}</td>
          <td>${presenceMarkup(user)}</td>
          <td>${escapeHtml(user.birthDate || "")}</td>
          <td title="${escapeHtml(user.interests || "")}">${escapeHtml(user.interests || "")}</td>
          <td><span class="pill">${user.friendsCount || 0}</span></td>
          <td><small>${escapeHtml(formatDate(user.updatedAt || user.createdAt))}</small></td>
        </tr>
      `;
    })
    .join("");
}

function detailItem(label, value) {
  return `
    <div class="detail-item">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value || "Chưa có")}</strong>
    </div>
  `;
}

function renderBadgeControls(user) {
  const badges = normalizeAccountBadges(user.accountBadges);
  return `
    <form class="badge-panel" id="badgeForm" data-phone="${escapeHtml(user.accountPhone)}">
      <div>
        <span>Phân loại tài khoản</span>
        <strong>${escapeHtml(badgeText(user))}</strong>
      </div>
      <label>
        <input type="checkbox" name="verified" ${badges.verified ? "checked" : ""} />
        <span>Tích xanh xác thực</span>
      </label>
      <label>
        <input type="checkbox" name="vip" ${badges.vip ? "checked" : ""} />
        <span>Kim cương VIP</span>
      </label>
      <button type="submit">Lưu phân loại</button>
      <small id="badgeStatus">Chỉ admin được thay đổi, người dùng khác sẽ thấy khi kết bạn hoặc xem quanh đây.</small>
    </form>
  `;
}

function renderDetail(user) {
  if (!user) {
    selectedPhone = "";
    detailCard.innerHTML = `
      <div class="detail-empty">
        <strong>Chọn một người dùng</strong>
        <span>Thông tin hồ sơ, quyền hiển thị và trạng thái thiết bị sẽ xuất hiện tại đây.</span>
      </div>
    `;
    renderTable();
    return;
  }

  selectedPhone = user.accountPhone;
  detailCard.innerHTML = `
    <div class="detail-profile">
      <div class="detail-head">
        ${avatarMarkup(user)}
        <div>
          <h2>${escapeHtml(user.fullName || user.name || "Nexa User")}</h2>
          <span>${escapeHtml(user.accountPhone)}</span>
        </div>
      </div>
      <div class="detail-list">
        ${renderBadgeControls(user)}
        ${detailItem("Số điện thoại hồ sơ", user.phone || user.accountPhone)}
        ${detailItem("Tên hiển thị", user.name)}
        ${detailItem("Ngày sinh", user.birthDate)}
        ${detailItem("Sở thích", user.interests)}
        ${detailItem("Quyền hiển thị", privacyText(user.privacy))}
        ${detailItem("Trạng thái", user.presenceOnline ? "Online" : "Offline")}
        ${detailItem("Lý do offline", user.presenceOnline ? "Đang hoạt động" : presenceReasonText(user))}
        ${detailItem("Chế độ người dùng chọn", user.presenceMode === "offline" ? "Offline" : "Online")}
        ${detailItem("Lần hoạt động gần nhất", formatDate(user.lastSeenAt))}
        ${detailItem("Cập nhật trạng thái", formatDate(user.presenceUpdatedAt))}
        ${detailItem("Bạn bè", `${user.friendsCount || 0} tài khoản`)}
        ${detailItem("Danh sách bạn bè", (user.friends || []).join(", "))}
        ${detailItem("Nhật ký", `${user.journalsCount || 0} bài`)}
        ${detailItem("Tin nhắn liên quan", `${user.messagesCount || 0} tin`)}
        ${detailItem("Cuộc gọi liên quan", `${user.callsCount || 0} cuộc`)}
        ${detailItem("Quanh đây", user.locationEnabled ? "Đang bật" : "Đang tắt")}
        ${detailItem("Toạ độ gần đây", user.latitude !== null && user.longitude !== null ? `${user.latitude}, ${user.longitude}` : "")}
        ${detailItem("Cập nhật vị trí", formatDate(user.locationUpdatedAt))}
        ${detailItem("Ngày tạo", formatDate(user.createdAt))}
        ${detailItem("Cập nhật hồ sơ", formatDate(user.updatedAt))}
        ${detailItem("Xác thực số", user.phoneVerified ? `Đã xác thực ${formatDate(user.verifiedAt)}` : "Chưa xác thực")}
      </div>
    </div>
  `;
  renderTable();
}

async function loadAdminUsers() {
  if (!adminToken) {
    showLogin("Vui lòng nhập mã quản trị.");
    return;
  }

  loginStatus.textContent = "Đang kiểm tra mã quản trị...";
  try {
    const data = await adminRequest("/api/admin/users");
    users = data.users || [];
    businesses = data.businesses || [];
    filteredUsers = users;
    syncTime.textContent = `Cập nhật: ${formatDate(data.generatedAt)}`;
    renderStats();
    renderBusinessAdmin();
    showDashboard();
    applyFilter();
  } catch (error) {
    sessionStorage.removeItem(adminTokenKey);
    adminToken = "";
    showLogin(error.message || "Không vào được trang admin.");
  }
}

async function updateBusinessStatus(ownerPhone, status) {
  const reviewNote = ["needs_changes", "restricted", "locked", "rejected"].includes(status)
    ? window.prompt("Nhập lý do để chủ doanh nghiệp biết cần xử lý:", "") || ""
    : "";
  const data = await adminRequest("/api/admin/business/update", { ownerPhone, status, reviewNote });
  businesses = data.businesses || [];
  renderBusinessAdmin();
}

function excelCell(value = "") {
  const text = String(value ?? "");
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `<td style="mso-number-format:'\\@';">${escapeHtml(safe)}</td>`;
}

function exportExcel() {
  if (!filteredUsers.length) return;
  const rows = filteredUsers
    .map((user) => `
      <tr>
        ${excelCell(user.accountPhone)}
        ${excelCell(user.phone || user.accountPhone)}
        ${excelCell(user.fullName || user.name)}
        ${excelCell(user.name)}
        ${excelCell(user.birthDate)}
        ${excelCell(user.interests)}
        ${excelCell(user.phoneVerified ? "Có" : "Không")}
        ${excelCell(badgeText(user))}
        ${excelCell(privacyText(user.privacy))}
        ${excelCell(user.presenceOnline ? "Online" : "Offline")}
        ${excelCell(user.presenceMode === "offline" ? "Offline" : "Online")}
        ${excelCell(user.presenceOnline ? "Đang hoạt động" : presenceReasonText(user))}
        ${excelCell(user.lastSeenAt)}
        ${excelCell(user.presenceUpdatedAt)}
        ${excelCell(String(user.friendsCount || 0))}
        ${excelCell(String(user.journalsCount || 0))}
        ${excelCell(String(user.messagesCount || 0))}
        ${excelCell(String(user.callsCount || 0))}
        ${excelCell(user.locationEnabled ? "Có" : "Không")}
        ${excelCell(user.locationUpdatedAt)}
        ${excelCell(user.createdAt)}
        ${excelCell(user.updatedAt)}
      </tr>
    `)
    .join("");
  const html = `
    <html>
      <head><meta charset="UTF-8" /></head>
      <body>
        <table>
          <thead>
            <tr>
              <th>Số tài khoản</th>
              <th>Số điện thoại hồ sơ</th>
              <th>Họ và tên</th>
              <th>Tên hiển thị</th>
              <th>Ngày sinh</th>
              <th>Sở thích</th>
              <th>Đã xác thực</th>
              <th>Phân loại tài khoản</th>
              <th>Quyền hiển thị</th>
              <th>Trạng thái</th>
              <th>Chế độ chọn</th>
              <th>Lý do offline</th>
              <th>Lần hoạt động gần nhất</th>
              <th>Cập nhật trạng thái</th>
              <th>Số bạn bè</th>
              <th>Số nhật ký</th>
              <th>Số tin nhắn</th>
              <th>Số cuộc gọi</th>
              <th>Bật quanh đây</th>
              <th>Cập nhật vị trí</th>
              <th>Ngày tạo</th>
              <th>Cập nhật hồ sơ</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
    </html>
  `;
  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `xpaychat-users-${new Date().toISOString().slice(0, 10)}.xls`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

tokenForm.addEventListener("submit", (event) => {
  event.preventDefault();
  adminToken = adminTokenInput.value.trim();
  if (!adminToken) return;
  sessionStorage.setItem(adminTokenKey, adminToken);
  loadAdminUsers();
});

refreshBtn.addEventListener("click", loadAdminUsers);
exportBtn.addEventListener("click", exportExcel);
searchInput.addEventListener("input", applyFilter);

businessAdminList?.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-business-status]");
  if (!button) return;
  const row = button.closest("[data-business-owner]");
  button.disabled = true;
  try {
    await updateBusinessStatus(row?.dataset.businessOwner || "", button.dataset.businessStatus || "");
  } catch (error) {
    loginStatus.textContent = error.message || "Không cập nhật được doanh nghiệp.";
  } finally {
    button.disabled = false;
  }
});

logoutAdminBtn.addEventListener("click", () => {
  sessionStorage.removeItem(adminTokenKey);
  adminToken = "";
  users = [];
  filteredUsers = [];
  adminTokenInput.value = "";
  showLogin("Đã đăng xuất khỏi trang admin.");
});

detailCard.addEventListener("submit", async (event) => {
  const form = event.target.closest("#badgeForm");
  if (!form) return;
  event.preventDefault();
  const phone = form.dataset.phone;
  const button = form.querySelector("button");
  const status = form.querySelector("#badgeStatus");
  button.disabled = true;
  status.textContent = "Đang lưu phân loại tài khoản...";
  try {
    const data = await adminRequest("/api/admin/user/badges", {
      phone,
      accountBadges: {
        verified: Boolean(form.elements.verified?.checked),
        vip: Boolean(form.elements.vip?.checked)
      }
    });
    const updated = data.user;
    users = users.map((user) => (user.accountPhone === updated.accountPhone ? { ...user, ...updated } : user));
    renderStats();
    applyFilter();
    renderDetail(users.find((user) => user.accountPhone === updated.accountPhone) || updated);
    const savedStatus = detailCard.querySelector("#badgeStatus");
    if (savedStatus) savedStatus.textContent = "Đã lưu phân loại tài khoản.";
  } catch (error) {
    status.textContent = error.message || "Không lưu được phân loại tài khoản.";
    button.disabled = false;
  }
});

usersTable.addEventListener("click", (event) => {
  const row = event.target.closest("[data-phone]");
  if (!row) return;
  renderDetail(filteredUsers.find((user) => user.accountPhone === row.dataset.phone) || null);
});

if (adminToken) loadAdminUsers();
