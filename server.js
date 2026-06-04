"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { URL } = require("url");

let nodemailer = null;
try {
  nodemailer = require("nodemailer");
} catch (error) {
  nodemailer = null;
}

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const DATA_DIR = path.join(ROOT, "data");
const STATE_FILE = path.join(DATA_DIR, "state.json");
const SEED_FILE = path.join(DATA_DIR, "seed-state.json");
const OUTBOX_DIR = path.join(DATA_DIR, "outbox");

loadEnv(path.join(ROOT, ".env.local"));
loadEnv(path.join(ROOT, ".env"));

const PORT = Number(process.env.PORT || 4187);
const HOST = process.env.HOST || "127.0.0.1";
const listeners = new Set();

ensureStateFile();

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function ensureStateFile() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(STATE_FILE)) {
    fs.copyFileSync(SEED_FILE, STATE_FILE);
  }
}

function readState() {
  ensureStateFile();
  return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
}

function writeState(state) {
  fs.writeFileSync(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`);
}

function nowIso() {
  return new Date().toISOString();
}

function id(prefix) {
  return `${prefix}-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + Number(days || 0));
  return next;
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString("vi-VN");
}

function paymentContent(order) {
  return `XPAY ${order.id} ${order.phone}`.slice(0, 80);
}

function vietQrUrl(bank, order) {
  const amount = Number(order.amount || 0);
  const accountName = encodeURIComponent(bank.accountName);
  const addInfo = encodeURIComponent(paymentContent(order));
  return `https://img.vietqr.io/image/${bank.bankCode}-${bank.accountNumber}-compact2.png?amount=${amount}&addInfo=${addInfo}&accountName=${accountName}`;
}

function sanitizePublicState(state) {
  return {
    settings: state.settings,
    products: state.products,
    plans: state.plans.map((plan) => ({ ...plan, priceLabel: `${formatMoney(plan.price)} VND` }))
  };
}

function audit(state, actor, action, detail = {}) {
  state.audit.unshift({
    id: id("AUD"),
    actor,
    action,
    detail,
    createdAt: nowIso()
  });
  state.audit = state.audit.slice(0, 500);
}

function emit(type, payload = {}) {
  const event = JSON.stringify({ type, payload, at: nowIso() });
  for (const res of listeners) {
    res.write(`event: ${type}\n`);
    res.write(`data: ${event}\n\n`);
  }
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.pbkdf2Sync(String(password), salt, 120000, 32, "sha256").toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored || !stored.includes(":")) return false;
  const [salt] = stored.split(":");
  return crypto.timingSafeEqual(Buffer.from(hashPassword(password, salt)), Buffer.from(stored));
}

function hashToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

function generatePassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let out = "Xpay-";
  for (let i = 0; i < 14; i += 1) out += alphabet[crypto.randomInt(0, alphabet.length)];
  return out;
}

function requireJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("Payload quá lớn."));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!body.trim()) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error("JSON không hợp lệ."));
      }
    });
  });
}

function sendJson(res, status, payload, headers = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...headers
  });
  res.end(body);
}

function sendText(res, status, body, contentType = "text/plain; charset=utf-8", headers = {}) {
  res.writeHead(status, {
    "Content-Type": contentType,
    "Cache-Control": "no-store",
    ...headers
  });
  res.end(body);
}

function parseCookies(req) {
  const cookie = req.headers.cookie || "";
  return cookie.split(";").reduce((acc, item) => {
    const [key, ...rest] = item.trim().split("=");
    if (key) acc[key] = decodeURIComponent(rest.join("="));
    return acc;
  }, {});
}

function bearer(req) {
  const header = req.headers.authorization || "";
  if (header.toLowerCase().startsWith("bearer ")) return header.slice(7).trim();
  return "";
}

function adminPasswordOk(password) {
  const configuredHash = process.env.ADMIN_PASSWORD_HASH;
  const configuredPassword = process.env.ADMIN_PASSWORD || "ChangeMe-XPAY-2026!";
  if (configuredHash) return verifyPassword(password, configuredHash);
  return String(password) === configuredPassword;
}

function authenticateAdmin(req, state) {
  const token = bearer(req) || parseCookies(req).xpay_admin;
  if (!token) return null;
  const tokenHash = hashToken(token);
  const now = Date.now();
  const session = state.adminSessions.find((item) => item.tokenHash === tokenHash && new Date(item.expiresAt).getTime() > now);
  if (!session) return null;
  session.lastSeenAt = nowIso();
  return session;
}

function authenticateCustomer(req, state) {
  const token = bearer(req) || parseCookies(req).xpay_customer;
  if (!token) return null;
  const tokenHash = hashToken(token);
  const now = Date.now();
  const session = state.sessions.find((item) => item.tokenHash === tokenHash && new Date(item.expiresAt).getTime() > now);
  if (!session) return null;
  const customer = state.customers.find((item) => item.id === session.customerId);
  if (!customer) return null;
  session.lastSeenAt = nowIso();
  customer.lastSeenAt = nowIso();
  return { session, customer };
}

function onlineCustomers(state) {
  const cutoff = Date.now() - 5 * 60 * 1000;
  return state.sessions
    .filter((session) => new Date(session.lastSeenAt || session.createdAt).getTime() > cutoff)
    .map((session) => {
      const customer = state.customers.find((item) => item.id === session.customerId);
      return customer ? {
        customerId: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        productId: customer.productId,
        lastSeenAt: session.lastSeenAt,
        deviceId: session.deviceId
      } : null;
    })
    .filter(Boolean);
}

function customerView(customer) {
  const { passwordHash, ...safe } = customer;
  return safe;
}

function adminView(state) {
  const orders = state.orders.map((order) => ({
    ...order,
    priceLabel: `${formatMoney(order.amount)} VND`,
    qrUrl: vietQrUrl(state.settings.bank, order)
  }));
  const customers = state.customers.map(customerView);
  return {
    settings: state.settings,
    products: state.products,
    plans: state.plans,
    orders,
    customers,
    online: onlineCustomers(state),
    audit: state.audit.slice(0, 80),
    stats: {
      pendingOrders: state.orders.filter((order) => order.status === "pending").length,
      paidOrders: state.orders.filter((order) => order.status === "paid").length,
      activeCustomers: state.customers.filter((customer) => customer.licenseStatus === "active").length,
      suspendedCustomers: state.customers.filter((customer) => customer.licenseStatus === "suspended").length,
      onlineCustomers: onlineCustomers(state).length,
      revenueConfirmed: state.orders.filter((order) => ["paid", "activated"].includes(order.status)).reduce((sum, order) => sum + Number(order.amount || 0), 0)
    }
  };
}

async function sendActivationEmail(customer, plan, password) {
  const subject = "Thông tin đăng nhập XPAY Chat";
  const expiryText = customer.expiresAt ? new Date(customer.expiresAt).toLocaleDateString("vi-VN") : "Vĩnh viễn";
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.55;color:#0b1627">
      <h2>XPAY Chat đã được kích hoạt</h2>
      <p>Xin chào ${escapeHtml(customer.name)},</p>
      <p>Tài khoản của bạn đã được kích hoạt bởi ${escapeHtml("Công Ty TNHH TM DV PHẦN MỀM XPAY")}.</p>
      <p><strong>Gói dịch vụ:</strong> ${escapeHtml(plan.name)}<br>
      <strong>Hiệu lực đến:</strong> ${escapeHtml(expiryText)}<br>
      <strong>Email:</strong> ${escapeHtml(customer.email)}<br>
      <strong>Số điện thoại:</strong> ${escapeHtml(customer.phone)}</p>
      <p><strong>Mật khẩu đăng nhập lần đầu:</strong> ${escapeHtml(password)}</p>
      <p>Hệ thống sẽ yêu cầu đổi mật khẩu ngay sau lần đăng nhập đầu tiên.</p>
      <p>Truy cập: <a href="${escapeHtml(process.env.PUBLIC_BASE_URL || "https://gatewayxpay.com")}/chat">XPAY Chat</a></p>
    </div>
  `;
  const text = `XPAY Chat đã được kích hoạt.\nGói: ${plan.name}\nHiệu lực đến: ${expiryText}\nEmail: ${customer.email}\nSố điện thoại: ${customer.phone}\nMật khẩu đăng nhập lần đầu: ${password}\nHệ thống sẽ yêu cầu đổi mật khẩu sau lần đăng nhập đầu tiên.`;
  return sendMail({ to: customer.email, subject, html, text });
}

async function sendMail(message) {
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  if (nodemailer && smtpHost && smtpUser && smtpPass) {
    const transport = nodemailer.createTransport({
      host: smtpHost,
      port: Number(process.env.SMTP_PORT || 465),
      secure: String(process.env.SMTP_SECURE || "true") === "true",
      auth: { user: smtpUser, pass: smtpPass }
    });
    await transport.sendMail({
      from: process.env.MAIL_FROM || `"XPAY Gateway" <${smtpUser}>`,
      ...message
    });
    return { mode: "smtp", delivered: true };
  }
  fs.mkdirSync(OUTBOX_DIR, { recursive: true });
  const file = path.join(OUTBOX_DIR, `${Date.now()}-${crypto.randomBytes(3).toString("hex")}.json`);
  fs.writeFileSync(file, `${JSON.stringify({ ...message, createdAt: nowIso() }, null, 2)}\n`);
  return { mode: "outbox", delivered: false, file: path.relative(ROOT, file) };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizePhone(value) {
  return String(value || "").replace(/[^\d+]/g, "").trim();
}

function validateOrder(body, state) {
  const product = state.products.find((item) => item.id === body.productId);
  const plan = state.plans.find((item) => item.id === body.planId);
  const name = String(body.name || "").trim();
  const email = normalizeEmail(body.email);
  const phone = normalizePhone(body.phone);
  if (!product) return { error: "Sản phẩm không hợp lệ." };
  if (!plan) return { error: "Gói dịch vụ không hợp lệ." };
  if (name.length < 2) return { error: "Vui lòng nhập tên khách hàng." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Email không hợp lệ." };
  if (phone.length < 8) return { error: "Số điện thoại không hợp lệ." };
  return { product, plan, name, email, phone };
}

function createOrder(body, state) {
  const validation = validateOrder(body, state);
  if (validation.error) return validation;
  const { product, plan, name, email, phone } = validation;
  const order = {
    id: id("AHAI-XPAY"),
    productId: product.id,
    productName: product.name,
    planId: plan.id,
    planName: plan.name,
    durationDays: plan.durationDays,
    amount: Number(plan.price || 0),
    name,
    email,
    phone,
    status: "pending",
    paymentContent: "",
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
  order.paymentContent = paymentContent(order);
  state.orders.unshift(order);
  audit(state, "public", "order.created", { orderId: order.id, email, phone, planId: plan.id });
  return { order };
}

function ensureCustomerFromOrder(state, order) {
  let customer = state.customers.find((item) => item.email === order.email || item.phone === order.phone);
  if (!customer) {
    customer = {
      id: id("CUS"),
      name: order.name,
      email: order.email,
      phone: order.phone,
      productId: order.productId,
      productName: order.productName,
      planId: order.planId,
      planName: order.planName,
      licenseStatus: "pending",
      startsAt: null,
      expiresAt: null,
      lifetime: order.durationDays === null,
      mustChangePassword: true,
      passwordHash: null,
      activatedOrderIds: [],
      lastSeenAt: null,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    state.customers.unshift(customer);
  }
  return customer;
}

async function activateOrder(state, order, actor) {
  const plan = state.plans.find((item) => item.id === order.planId);
  if (!plan) throw new Error("Không tìm thấy gói dịch vụ.");
  const customer = ensureCustomerFromOrder(state, order);
  const firstPassword = generatePassword();
  const startsAt = new Date();
  customer.name = order.name;
  customer.email = order.email;
  customer.phone = order.phone;
  customer.productId = order.productId;
  customer.productName = order.productName;
  customer.planId = order.planId;
  customer.planName = order.planName;
  customer.licenseStatus = "active";
  customer.startsAt = startsAt.toISOString();
  customer.expiresAt = plan.durationDays ? addDays(startsAt, plan.durationDays).toISOString() : null;
  customer.lifetime = plan.durationDays === null;
  customer.mustChangePassword = true;
  customer.passwordHash = hashPassword(firstPassword);
  customer.updatedAt = nowIso();
  if (!customer.activatedOrderIds.includes(order.id)) customer.activatedOrderIds.push(order.id);
  order.status = "activated";
  order.activatedAt = nowIso();
  order.updatedAt = nowIso();
  const delivery = await sendActivationEmail(customer, plan, firstPassword);
  audit(state, actor, "customer.activated", {
    orderId: order.id,
    customerId: customer.id,
    deliveryMode: delivery.mode,
    delivered: delivery.delivered
  });
  return { customer, delivery };
}

function customerLicense(customer) {
  const now = Date.now();
  const expired = customer.expiresAt ? new Date(customer.expiresAt).getTime() < now : false;
  return {
    status: expired && customer.licenseStatus === "active" ? "expired" : customer.licenseStatus,
    startsAt: customer.startsAt,
    expiresAt: customer.expiresAt,
    lifetime: Boolean(customer.lifetime),
    mustChangePassword: Boolean(customer.mustChangePassword)
  };
}

async function handleApi(req, res, url) {
  const state = readState();
  const method = req.method || "GET";

  try {
    if (method === "GET" && url.pathname === "/api/health") {
      return sendJson(res, 200, { ok: true, name: "Gateway XPAY", at: nowIso() });
    }

    if (method === "GET" && url.pathname === "/api/public/config") {
      return sendJson(res, 200, sanitizePublicState(state));
    }

    if (method === "GET" && url.pathname === "/api/events") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-store",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no"
      });
      res.write(`event: hello\n`);
      res.write(`data: ${JSON.stringify({ type: "hello", at: nowIso() })}\n\n`);
      listeners.add(res);
      req.on("close", () => listeners.delete(res));
      return undefined;
    }

    if (method === "POST" && url.pathname === "/api/orders") {
      const body = await requireJson(req);
      const created = createOrder(body, state);
      if (created.error) return sendJson(res, 400, { error: created.error });
      writeState(state);
      emit("order.created", { orderId: created.order.id });
      return sendJson(res, 201, {
        order: {
          ...created.order,
          priceLabel: `${formatMoney(created.order.amount)} VND`,
          qrUrl: vietQrUrl(state.settings.bank, created.order)
        },
        bank: state.settings.bank
      });
    }

    if (method === "POST" && url.pathname === "/api/admin/login") {
      const body = await requireJson(req);
      if (!adminPasswordOk(body.password || "")) {
        return sendJson(res, 401, { error: "Thông tin admin không hợp lệ." });
      }
      const token = crypto.randomBytes(32).toString("hex");
      state.adminSessions.unshift({
        id: id("ADMSES"),
        email: process.env.ADMIN_EMAIL || "admin@gatewayxpay.com",
        tokenHash: hashToken(token),
        createdAt: nowIso(),
        lastSeenAt: nowIso(),
        expiresAt: addDays(new Date(), 7).toISOString()
      });
      state.adminSessions = state.adminSessions.slice(0, 20);
      audit(state, "admin", "admin.login");
      writeState(state);
      return sendJson(res, 200, { token, email: process.env.ADMIN_EMAIL || "admin@gatewayxpay.com" }, {
        "Set-Cookie": `xpay_admin=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 86400}`
      });
    }

    if (url.pathname.startsWith("/api/admin")) {
      const admin = authenticateAdmin(req, state);
      if (!admin) return sendJson(res, 401, { error: "Vui lòng đăng nhập Admin." });

      if (method === "GET" && url.pathname === "/api/admin/state") {
        writeState(state);
        return sendJson(res, 200, adminView(state));
      }

      const planMatch = url.pathname.match(/^\/api\/admin\/plans\/([^/]+)$/);
      if (method === "PUT" && planMatch) {
        const body = await requireJson(req);
        const plan = state.plans.find((item) => item.id === planMatch[1]);
        if (!plan) return sendJson(res, 404, { error: "Không tìm thấy gói." });
        plan.price = Math.max(0, Number(body.price || 0));
        plan.highlight = String(body.highlight || plan.highlight || "").trim();
        plan.updatedAt = nowIso();
        audit(state, "admin", "plan.updated", { planId: plan.id, price: plan.price });
        writeState(state);
        emit("plan.updated", { planId: plan.id });
        return sendJson(res, 200, { plan });
      }

      const paidMatch = url.pathname.match(/^\/api\/admin\/orders\/([^/]+)\/mark-paid$/);
      if (method === "POST" && paidMatch) {
        const order = state.orders.find((item) => item.id === paidMatch[1]);
        if (!order) return sendJson(res, 404, { error: "Không tìm thấy giao dịch." });
        order.status = "paid";
        order.paidAt = nowIso();
        order.updatedAt = nowIso();
        audit(state, "admin", "order.paid", { orderId: order.id });
        writeState(state);
        emit("order.paid", { orderId: order.id });
        return sendJson(res, 200, { order });
      }

      const activateMatch = url.pathname.match(/^\/api\/admin\/orders\/([^/]+)\/activate$/);
      if (method === "POST" && activateMatch) {
        const order = state.orders.find((item) => item.id === activateMatch[1]);
        if (!order) return sendJson(res, 404, { error: "Không tìm thấy giao dịch." });
        const result = await activateOrder(state, order, "admin");
        writeState(state);
        emit("customer.activated", { customerId: result.customer.id, orderId: order.id });
        return sendJson(res, 200, {
          customer: customerView(result.customer),
          delivery: result.delivery
        });
      }

      const actionMatch = url.pathname.match(/^\/api\/admin\/customers\/([^/]+)\/(suspend|resume|extend)$/);
      if (method === "POST" && actionMatch) {
        const customer = state.customers.find((item) => item.id === actionMatch[1]);
        if (!customer) return sendJson(res, 404, { error: "Không tìm thấy khách hàng." });
        const body = await requireJson(req);
        const action = actionMatch[2];
        if (action === "suspend") customer.licenseStatus = "suspended";
        if (action === "resume") customer.licenseStatus = "active";
        if (action === "extend") {
          const days = Math.max(1, Number(body.days || 30));
          const start = customer.expiresAt && new Date(customer.expiresAt).getTime() > Date.now() ? new Date(customer.expiresAt) : new Date();
          customer.expiresAt = addDays(start, days).toISOString();
          customer.lifetime = false;
          customer.licenseStatus = "active";
        }
        customer.updatedAt = nowIso();
        audit(state, "admin", `customer.${action}`, { customerId: customer.id });
        writeState(state);
        emit(`customer.${action}`, { customerId: customer.id });
        return sendJson(res, 200, { customer: customerView(customer) });
      }

      if (method === "GET" && url.pathname === "/api/admin/export.xls") {
        const rows = state.customers.map((customer) => ({
          "Mã khách hàng": customer.id,
          "Tên khách hàng": customer.name,
          Email: customer.email,
          "Số điện thoại": customer.phone,
          "Sản phẩm": customer.productName,
          "Gói": customer.planName,
          "Trạng thái": customerLicense(customer).status,
          "Ngày kích hoạt": customer.startsAt || "",
          "Ngày hết hạn": customer.expiresAt || "Vĩnh viễn",
          "Online gần nhất": customer.lastSeenAt || ""
        }));
        const html = toExcelHtml(rows, "KhachHangXPAY");
        return sendText(res, 200, html, "application/vnd.ms-excel; charset=utf-8", {
          "Content-Disposition": "attachment; filename=xpay-customers.xls"
        });
      }
    }

    if (method === "POST" && url.pathname === "/api/auth/login") {
      const body = await requireJson(req);
      const emailOrPhone = String(body.emailOrPhone || "").trim().toLowerCase();
      const password = String(body.password || "");
      const customer = state.customers.find((item) => item.email === emailOrPhone || item.phone === normalizePhone(emailOrPhone));
      if (!customer || !verifyPassword(password, customer.passwordHash)) {
        return sendJson(res, 401, { error: "Email/số điện thoại hoặc mật khẩu không đúng." });
      }
      const license = customerLicense(customer);
      if (!["active"].includes(license.status)) {
        return sendJson(res, 403, { error: `Tài khoản đang ở trạng thái ${license.status}. Vui lòng liên hệ Admin XPAY.` });
      }
      const token = crypto.randomBytes(32).toString("hex");
      state.sessions.unshift({
        id: id("SES"),
        customerId: customer.id,
        tokenHash: hashToken(token),
        deviceId: String(body.deviceId || "web").slice(0, 120),
        createdAt: nowIso(),
        lastSeenAt: nowIso(),
        expiresAt: addDays(new Date(), 30).toISOString()
      });
      state.sessions = state.sessions.slice(0, 300);
      customer.lastSeenAt = nowIso();
      audit(state, customer.id, "customer.login", { deviceId: body.deviceId || "web" });
      writeState(state);
      emit("customer.online", { customerId: customer.id });
      return sendJson(res, 200, {
        token,
        customer: customerView(customer),
        license
      }, {
        "Set-Cookie": `xpay_customer=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 86400}`
      });
    }

    if (method === "POST" && url.pathname === "/api/auth/change-password") {
      const auth = authenticateCustomer(req, state);
      if (!auth) return sendJson(res, 401, { error: "Vui lòng đăng nhập." });
      const body = await requireJson(req);
      if (!verifyPassword(body.currentPassword || "", auth.customer.passwordHash)) {
        return sendJson(res, 400, { error: "Mật khẩu hiện tại không đúng." });
      }
      const next = String(body.newPassword || "");
      if (next.length < 10) return sendJson(res, 400, { error: "Mật khẩu mới cần ít nhất 10 ký tự." });
      auth.customer.passwordHash = hashPassword(next);
      auth.customer.mustChangePassword = false;
      auth.customer.updatedAt = nowIso();
      audit(state, auth.customer.id, "customer.password.changed");
      writeState(state);
      emit("customer.password.changed", { customerId: auth.customer.id });
      return sendJson(res, 200, { customer: customerView(auth.customer), license: customerLicense(auth.customer) });
    }

    if (method === "GET" && url.pathname === "/api/me") {
      const auth = authenticateCustomer(req, state);
      if (!auth) return sendJson(res, 401, { error: "Vui lòng đăng nhập." });
      writeState(state);
      return sendJson(res, 200, { customer: customerView(auth.customer), license: customerLicense(auth.customer) });
    }

    return sendJson(res, 404, { error: "Không tìm thấy API." });
  } catch (error) {
    return sendJson(res, 500, { error: error.message || "Lỗi hệ thống." });
  }
}

function toCsv(rows) {
  if (!rows.length) return "";
  const columns = Object.keys(rows[0]);
  const encode = (value) => `"${String(value ?? "").replaceAll("\"", "\"\"")}"`;
  return [columns.map(encode).join(","), ...rows.map((row) => columns.map((column) => encode(row[column])).join(","))].join("\n");
}

function toExcelHtml(rows, sheetName) {
  const columns = rows[0] ? Object.keys(rows[0]) : ["Thông báo"];
  const bodyRows = rows.length ? rows : [{ "Thông báo": "Chưa có khách hàng" }];
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="ProgId" content="Excel.Sheet">
  <style>
    table { border-collapse: collapse; font-family: Arial, sans-serif; }
    th { background: #0b1627; color: #ffffff; }
    th, td { border: 1px solid #9fb8c8; padding: 8px 10px; mso-number-format:"\\@"; }
  </style>
</head>
<body>
  <table data-sheet-name="${escapeHtml(sheetName)}">
    <thead><tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr></thead>
    <tbody>${bodyRows.map((row) => `<tr>${columns.map((column) => `<td>${escapeHtml(row[column] ?? "")}</td>`).join("")}</tr>`).join("")}</tbody>
  </table>
</body>
</html>`;
}

function serveStatic(req, res, url) {
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/") pathname = "/index.html";
  if (pathname === "/admin") pathname = "/admin.html";
  if (pathname === "/chat") pathname = "/chat.html";
  const filePath = path.normalize(path.join(PUBLIC_DIR, pathname));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    return sendText(res, 403, "Forbidden");
  }
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    return sendText(res, 404, "Not found");
  }
  const ext = path.extname(filePath).toLowerCase();
  const type = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webmanifest": "application/manifest+json"
  }[ext] || "application/octet-stream";
  res.writeHead(200, {
    "Content-Type": type,
    "Cache-Control": ext === ".html" ? "no-store" : "public, max-age=3600"
  });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  if (url.pathname.startsWith("/api/")) {
    handleApi(req, res, url);
    return;
  }
  serveStatic(req, res, url);
});

server.listen(PORT, HOST, () => {
  console.log(`Gateway XPAY running at http://${HOST}:${PORT}`);
});
