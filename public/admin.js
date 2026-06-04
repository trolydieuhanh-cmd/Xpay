const adminMoney = new Intl.NumberFormat("vi-VN");
let adminToken = localStorage.getItem("xpayAdminToken") || "";
let adminState = null;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}

function adminHeaders() {
  return adminToken ? { Authorization: `Bearer ${adminToken}` } : {};
}

async function adminApi(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...adminHeaders(),
      ...(options.headers || {})
    }
  });
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) {
    throw new Error(payload.error || "Yêu cầu admin không thành công.");
  }
  return payload;
}

function statusPill(status) {
  return `<span class="status-pill ${escapeHtml(status)}">${escapeHtml(status)}</span>`;
}

function dateLabel(value) {
  if (!value) return "Vĩnh viễn";
  return new Date(value).toLocaleString("vi-VN");
}

function renderStats(state) {
  document.querySelector("#statPending").textContent = state.stats.pendingOrders;
  document.querySelector("#statPaid").textContent = state.stats.paidOrders;
  document.querySelector("#statActive").textContent = state.stats.activeCustomers;
  document.querySelector("#statOnline").textContent = state.stats.onlineCustomers;
  document.querySelector("#statRevenue").textContent = `${adminMoney.format(state.stats.revenueConfirmed)}đ`;
}

function renderOrders(state) {
  const table = document.querySelector("#ordersTable");
  table.innerHTML = state.orders.map((order) => `
    <tr>
      <td><strong>${escapeHtml(order.id)}</strong><br><small>${dateLabel(order.createdAt)}</small></td>
      <td>${escapeHtml(order.name)}<br><small>${escapeHtml(order.email)} · ${escapeHtml(order.phone)}</small></td>
      <td>${escapeHtml(order.productName)}<br><small>${escapeHtml(order.planName)}</small></td>
      <td><strong>${escapeHtml(order.priceLabel)}</strong><br><small>${escapeHtml(order.paymentContent)}</small></td>
      <td>${statusPill(order.status)}</td>
      <td><img class="order-qr" src="${escapeHtml(order.qrUrl)}" alt="QR ${escapeHtml(order.id)}"></td>
      <td>
        <div class="row-actions">
          <button class="small-btn" data-action="mark-paid" data-id="${escapeHtml(order.id)}">Đã thanh toán</button>
          <button class="small-btn" data-action="activate" data-id="${escapeHtml(order.id)}">Kích hoạt</button>
        </div>
      </td>
    </tr>
  `).join("") || `<tr><td colspan="7">Chưa có giao dịch.</td></tr>`;
}

function renderCustomers(state) {
  const table = document.querySelector("#customersTable");
  table.innerHTML = state.customers.map((customer) => `
    <tr>
      <td><strong>${escapeHtml(customer.name)}</strong><br><small>${escapeHtml(customer.id)}</small></td>
      <td>${escapeHtml(customer.email)}<br><small>${escapeHtml(customer.phone)}</small></td>
      <td>${escapeHtml(customer.productName)}<br><small>${escapeHtml(customer.planName)}</small></td>
      <td>${statusPill(customer.licenseStatus)}<br><small>Hết hạn: ${dateLabel(customer.expiresAt)}</small></td>
      <td>${customer.lastSeenAt ? dateLabel(customer.lastSeenAt) : "Chưa online"}</td>
      <td>
        <div class="row-actions">
          <button class="small-btn" data-action="suspend" data-id="${escapeHtml(customer.id)}">Tạm dừng</button>
          <button class="small-btn" data-action="resume" data-id="${escapeHtml(customer.id)}">Tiếp tục</button>
          <button class="small-btn" data-action="extend" data-id="${escapeHtml(customer.id)}">+30 ngày</button>
        </div>
      </td>
    </tr>
  `).join("") || `<tr><td colspan="6">Chưa có khách hàng.</td></tr>`;
}

function renderPlans(state) {
  const editor = document.querySelector("#planEditor");
  editor.innerHTML = state.plans.map((plan) => `
    <form class="plan-editor" data-plan-id="${escapeHtml(plan.id)}">
      <h3>${escapeHtml(plan.name)}</h3>
      <label>Giá tiền VND
        <input name="price" type="number" min="0" step="10000" value="${Number(plan.price || 0)}">
      </label>
      <label>Ghi chú
        <input name="highlight" value="${escapeHtml(plan.highlight || "")}">
      </label>
      <button class="secondary-btn full" type="submit">Lưu giá</button>
    </form>
  `).join("");
}

function renderOnline(state) {
  const list = document.querySelector("#onlineList");
  list.innerHTML = state.online.map((item) => `
    <div class="online-item">
      <div>
        <strong>${escapeHtml(item.name)}</strong>
        <span>${escapeHtml(item.email)} · ${escapeHtml(item.phone)}</span>
      </div>
      <span>${dateLabel(item.lastSeenAt)}</span>
    </div>
  `).join("") || `<div class="online-item"><span>Chưa có khách đang online.</span></div>`;
}

function renderAdmin(state) {
  adminState = state;
  document.querySelector("#adminLogin").hidden = true;
  document.querySelector("#adminContent").hidden = false;
  renderStats(state);
  renderOrders(state);
  renderCustomers(state);
  renderPlans(state);
  renderOnline(state);
}

async function loadAdmin() {
  const state = await adminApi("/api/admin/state", { headers: {} });
  renderAdmin(state);
}

document.querySelector("#adminLogin").addEventListener("submit", async (event) => {
  event.preventDefault();
  const status = document.querySelector("#adminLoginStatus");
  status.textContent = "Đang đăng nhập...";
  const body = Object.fromEntries(new FormData(event.currentTarget).entries());
  try {
    const payload = await adminApi("/api/admin/login", {
      method: "POST",
      body: JSON.stringify(body),
      headers: {}
    });
    adminToken = payload.token;
    localStorage.setItem("xpayAdminToken", adminToken);
    status.textContent = "Đăng nhập thành công.";
    await loadAdmin();
  } catch (error) {
    status.textContent = error.message;
  }
});

document.querySelector("#refreshBtn").addEventListener("click", () => {
  loadAdmin().catch((error) => {
    document.querySelector("#adminLoginStatus").textContent = error.message;
  });
});

document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button || !adminState) return;
  button.disabled = true;
  const id = button.dataset.id;
  const action = button.dataset.action;
  try {
    if (action === "mark-paid") await adminApi(`/api/admin/orders/${encodeURIComponent(id)}/mark-paid`, { method: "POST", body: "{}" });
    if (action === "activate") await adminApi(`/api/admin/orders/${encodeURIComponent(id)}/activate`, { method: "POST", body: "{}" });
    if (action === "suspend") await adminApi(`/api/admin/customers/${encodeURIComponent(id)}/suspend`, { method: "POST", body: "{}" });
    if (action === "resume") await adminApi(`/api/admin/customers/${encodeURIComponent(id)}/resume`, { method: "POST", body: "{}" });
    if (action === "extend") await adminApi(`/api/admin/customers/${encodeURIComponent(id)}/extend`, { method: "POST", body: JSON.stringify({ days: 30 }) });
    await loadAdmin();
  } catch (error) {
    alert(error.message);
  } finally {
    button.disabled = false;
  }
});

document.addEventListener("submit", async (event) => {
  const form = event.target.closest(".plan-editor");
  if (!form) return;
  event.preventDefault();
  const body = Object.fromEntries(new FormData(form).entries());
  try {
    await adminApi(`/api/admin/plans/${encodeURIComponent(form.dataset.planId)}`, {
      method: "PUT",
      body: JSON.stringify(body)
    });
    await loadAdmin();
  } catch (error) {
    alert(error.message);
  }
});

const events = new EventSource("/api/events");
["order.created", "order.paid", "customer.activated", "customer.online", "plan.updated", "customer.suspend", "customer.resume", "customer.extend"].forEach((name) => {
  events.addEventListener(name, () => {
    if (adminToken) loadAdmin().catch(() => undefined);
  });
});

if (adminToken) {
  loadAdmin().catch(() => {
    localStorage.removeItem("xpayAdminToken");
    adminToken = "";
  });
}
