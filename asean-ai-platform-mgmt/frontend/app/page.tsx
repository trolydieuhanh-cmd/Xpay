import Link from "next/link";

export const dynamic = "force-dynamic";

async function fetchHealth() {
  try {
    const backend = process.env.BACKEND_URL || "http://localhost:8000";
    const res = await fetch(`${backend}/health`, { cache: "no-store" });
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    return null;
  }
}

export default async function DashboardPage() {
  const health = await fetchHealth();

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          ASEAN AI Platform — Trợ lý Quản lý Dự án
        </h1>
        <p className="text-slate-600 dark:text-slate-300 mt-2">
          AI được đào tạo chuyên biệt cho công tác quản lý dự án ASEAN AI
          Platform của ASEAN Holding.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatusCard
          title="Trạng thái Backend"
          value={health ? "Kết nối OK" : "Chưa kết nối"}
          tone={health ? "green" : "red"}
          detail={
            health
              ? `Model: ${health.model_main}`
              : "Kiểm tra `uvicorn app.main:app` đang chạy trên cổng 8000"
          }
        />
        <StatusCard
          title="Claude API"
          value={
            health?.anthropic_configured ? "Đã cấu hình" : "Chưa cấu hình"
          }
          tone={health?.anthropic_configured ? "green" : "amber"}
          detail={
            health?.anthropic_configured
              ? "Đã có ANTHROPIC_API_KEY trong .env"
              : "Thêm ANTHROPIC_API_KEY vào backend/.env"
          }
        />
        <StatusCard
          title="Dự án chính"
          value="ASEAN AI Platform"
          tone="blue"
          detail="Phase Concept → Architecture"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <QuickAction
          href="/chat"
          title="Trò chuyện với PM AI"
          description="Hỏi bất kỳ điều gì về dự án, phương pháp luận, tình huống thực tế."
        />
        <QuickAction
          href="/planning"
          title="Sinh WBS / Phân tích rủi ro"
          description="Điền form ngắn để AI tự động tạo cấu trúc phân rã công việc hoặc phân tích rủi ro."
        />
        <QuickAction
          href="/projects"
          title="Quản lý dự án"
          description="Danh sách dự án, tiến độ, ngân sách."
        />
        <QuickAction
          href="/knowledge"
          title="Kho tri thức"
          description="Xem tài liệu ASEAN Holding, cách bổ sung thông tin cho AI."
        />
      </div>

      <div className="mt-10 p-5 rounded-lg border border-brand-200 bg-brand-50 dark:bg-brand-900/20 dark:border-brand-800">
        <h2 className="font-semibold text-brand-800 dark:text-brand-200 mb-2">
          Cách AI được "đào tạo liên tục"
        </h2>
        <ul className="text-sm text-slate-700 dark:text-slate-200 space-y-1 list-disc pl-5">
          <li>
            Thêm tài liệu vào <code>backend/app/knowledge/</code> — AI dùng
            RAG để trích dẫn nội dung này.
          </li>
          <li>
            Tinh chỉnh prompt trong <code>backend/app/prompts/</code> — định
            hình vai trò và phong cách.
          </li>
          <li>
            Bổ sung tool/endpoint trong <code>backend/app/services/</code>{" "}
            khi cần khả năng mới.
          </li>
          <li>
            Nâng cấp model bằng cách đổi biến{" "}
            <code>ANTHROPIC_MODEL_MAIN</code> trong <code>.env</code> khi
            Anthropic phát hành model mới.
          </li>
        </ul>
      </div>
    </div>
  );
}

function StatusCard({
  title,
  value,
  detail,
  tone,
}: {
  title: string;
  value: string;
  detail: string;
  tone: "green" | "red" | "amber" | "blue";
}) {
  const tones = {
    green: "border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800",
    red: "border-rose-300 bg-rose-50 dark:bg-rose-900/20 dark:border-rose-800",
    amber: "border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800",
    blue: "border-brand-300 bg-brand-50 dark:bg-brand-900/20 dark:border-brand-800",
  }[tone];
  return (
    <div className={`p-4 rounded-lg border ${tones}`}>
      <div className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {title}
      </div>
      <div className="text-lg font-semibold mt-1">{value}</div>
      <div className="text-xs text-slate-600 dark:text-slate-300 mt-1">
        {detail}
      </div>
    </div>
  );
}

function QuickAction({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="block p-5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-brand-400 hover:shadow-sm transition"
    >
      <div className="font-semibold text-slate-900 dark:text-white">
        {title}
      </div>
      <div className="text-sm text-slate-600 dark:text-slate-300 mt-1">
        {description}
      </div>
    </Link>
  );
}
