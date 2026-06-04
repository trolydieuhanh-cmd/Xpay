const money = new Intl.NumberFormat("vi-VN");

const icons = {
  "xpay-chat": "<svg viewBox='0 0 24 24'><path d='M5 6h14v9H8l-3 3V6Z'/><path d='M9 10h6M9 13h4'/></svg>",
  "enterprise-suite": "<svg viewBox='0 0 24 24'><path d='M4 20V7l8-4 8 4v13'/><path d='M8 20v-8h8v8M10 7h.01M14 7h.01'/></svg>",
  "automation-core": "<svg viewBox='0 0 24 24'><path d='M12 3v3M12 18v3M4.8 7.2l2.1 2.1M17.1 14.7l2.1 2.1M3 12h3M18 12h3M4.8 16.8l2.1-2.1M17.1 9.3l2.1-2.1'/><circle cx='12' cy='12' r='4'/></svg>",
  "ai-ops": "<svg viewBox='0 0 24 24'><path d='M12 3a5 5 0 0 0-5 5v1a5 5 0 0 0 10 0V8a5 5 0 0 0-5-5Z'/><path d='M7 9H5a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h2M17 9h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2M9 17v3M15 17v3M10 9h.01M14 9h.01'/></svg>"
};

let publicConfig = null;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}

function qrUrl(bank, amount, content) {
  return `https://img.vietqr.io/image/${bank.bankCode}-${bank.accountNumber}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(content)}&accountName=${encodeURIComponent(bank.accountName)}`;
}

function planPrice(plan) {
  return `${money.format(plan.price)} VND`;
}

function renderProducts(products) {
  const grid = document.querySelector("#productGrid");
  grid.innerHTML = products.map((product, index) => `
    <article class="product-card">
      <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.category)}">
      <div class="product-card-content">
        <span class="product-tag">${escapeHtml(product.category)}</span>
        <div class="panel-title">
          <span class="icon-box ${["icon-cyan", "icon-green", "icon-gold", "icon-rose"][index % 4]}">${icons[product.id] || icons["automation-core"]}</span>
          <h3>${escapeHtml(product.name)}</h3>
        </div>
        <p>${escapeHtml(product.summary)}</p>
      </div>
    </article>
  `).join("");
}

function renderPricing(plans) {
  const grid = document.querySelector("#pricingGrid");
  grid.innerHTML = plans.map((plan) => `
    <article class="price-card">
      <h3>${escapeHtml(plan.name)}</h3>
      <p>${escapeHtml(plan.highlight || "")}</p>
      <strong>${planPrice(plan)}</strong>
      <ul>${(plan.features || []).map((feature) => `<li>${escapeHtml(feature)}</li>`).join("")}</ul>
      <button class="primary-btn choose-plan" data-plan-id="${escapeHtml(plan.id)}" type="button">Chọn gói này</button>
    </article>
  `).join("");
}

function fillSelects(config) {
  document.querySelector("#productSelect").innerHTML = config.products.map((product) => `<option value="${escapeHtml(product.id)}">${escapeHtml(product.name)}</option>`).join("");
  document.querySelector("#planSelect").innerHTML = config.plans.map((plan) => `<option value="${escapeHtml(plan.id)}">${escapeHtml(plan.name)} - ${planPrice(plan)}</option>`).join("");
}

async function loadConfig() {
  const response = await fetch("/api/public/config");
  publicConfig = await response.json();
  renderProducts(publicConfig.products);
  renderPricing(publicConfig.plans);
  fillSelects(publicConfig);
  const samplePlan = publicConfig.plans[0];
  document.querySelector("#heroQr").src = qrUrl(publicConfig.settings.bank, samplePlan.price, "XPAY DEMO");
  document.querySelector("#heroRevenue").textContent = `${money.format(samplePlan.price)}đ`;
}

document.addEventListener("click", (event) => {
  const button = event.target.closest(".choose-plan");
  if (!button) return;
  document.querySelector("#planSelect").value = button.dataset.planId;
  document.querySelector("#payment").scrollIntoView({ behavior: "smooth" });
});

document.querySelector("#orderForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const status = document.querySelector("#orderStatus");
  status.textContent = "Đang tạo mã QR...";
  const body = Object.fromEntries(new FormData(event.currentTarget).entries());
  const response = await fetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = await response.json();
  if (!response.ok) {
    status.textContent = payload.error || "Không tạo được giao dịch.";
    return;
  }
  status.textContent = "Đã tạo mã QR. Vui lòng chuyển khoản đúng nội dung.";
  document.querySelector("#qrResult").hidden = false;
  document.querySelector("#orderQr").src = payload.order.qrUrl;
  document.querySelector("#orderId").textContent = payload.order.id;
  document.querySelector("#orderAmount").textContent = payload.order.priceLabel;
  document.querySelector("#orderContent").textContent = payload.order.paymentContent;
});

const events = new EventSource("/api/events");
events.addEventListener("customer.online", () => {
  const element = document.querySelector("#heroOnline");
  element.textContent = String(Number(element.textContent || 0) + 1);
});
events.addEventListener("plan.updated", loadConfig);

loadConfig().catch(() => {
  document.querySelector("#orderStatus").textContent = "Không tải được cấu hình. Vui lòng thử lại.";
});
