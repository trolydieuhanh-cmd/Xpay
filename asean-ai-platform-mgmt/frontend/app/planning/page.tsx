"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Mode = "wbs" | "risks" | "report";

export default function PlanningPage() {
  const [mode, setMode] = useState<Mode>("wbs");
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [wbs, setWbs] = useState({
    project_name: "ASEAN AI Platform — Phase 1",
    goal: "Xây dựng nền tảng AI dùng chung cho các công ty thành viên",
    constraints: "Ngân sách 600k USD năm đầu, đội core 6 người",
    duration_weeks: 24,
  });
  const [risks, setRisks] = useState({
    project_name: "ASEAN AI Platform",
    context:
      "Nền tảng chatbot + RAG cho nội bộ 3 công ty thành viên, phụ thuộc Claude API và OpenAI, deploy trên VNG Cloud.",
    focus: "all",
  });
  const [report, setReport] = useState({
    project_name: "ASEAN AI Platform",
    accomplishments: "",
    blockers: "",
    next_week: "",
  });

  async function run() {
    setLoading(true);
    setError(null);
    setOutput("");
    try {
      const url =
        mode === "wbs"
          ? "/api/planning/wbs"
          : mode === "risks"
          ? "/api/planning/risks"
          : "/api/planning/weekly-report";
      const body = mode === "wbs" ? wbs : mode === "risks" ? risks : report;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setOutput(data.text || "(không có nội dung)");
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Lập kế hoạch AI</h1>
      <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
        Điền form, AI sẽ tự sinh WBS / phân tích rủi ro / báo cáo tuần.
      </p>

      <div className="flex gap-2 mb-6">
        {(["wbs", "risks", "report"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-4 py-2 text-sm rounded-md ${
              mode === m
                ? "bg-brand-600 text-white"
                : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
            }`}
          >
            {m === "wbs"
              ? "WBS"
              : m === "risks"
              ? "Phân tích rủi ro"
              : "Báo cáo tuần"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          {mode === "wbs" && (
            <div className="space-y-3">
              <Field
                label="Tên dự án"
                value={wbs.project_name}
                onChange={(v) => setWbs({ ...wbs, project_name: v })}
              />
              <Field
                label="Mục tiêu"
                value={wbs.goal}
                onChange={(v) => setWbs({ ...wbs, goal: v })}
                textarea
              />
              <Field
                label="Ràng buộc"
                value={wbs.constraints}
                onChange={(v) => setWbs({ ...wbs, constraints: v })}
                textarea
              />
              <Field
                label="Số tuần"
                type="number"
                value={String(wbs.duration_weeks)}
                onChange={(v) =>
                  setWbs({ ...wbs, duration_weeks: Number(v) || 12 })
                }
              />
            </div>
          )}
          {mode === "risks" && (
            <div className="space-y-3">
              <Field
                label="Tên dự án"
                value={risks.project_name}
                onChange={(v) => setRisks({ ...risks, project_name: v })}
              />
              <Field
                label="Ngữ cảnh"
                value={risks.context}
                onChange={(v) => setRisks({ ...risks, context: v })}
                textarea
              />
              <div>
                <label className="text-xs uppercase tracking-wide text-slate-500">
                  Tập trung vào
                </label>
                <select
                  value={risks.focus}
                  onChange={(e) => setRisks({ ...risks, focus: e.target.value })}
                  className="mt-1 w-full border rounded px-3 py-2 text-sm dark:bg-slate-950 dark:border-slate-700"
                >
                  <option value="all">Tất cả</option>
                  <option value="technical">Kỹ thuật</option>
                  <option value="financial">Tài chính</option>
                  <option value="operational">Vận hành</option>
                </select>
              </div>
            </div>
          )}
          {mode === "report" && (
            <div className="space-y-3">
              <Field
                label="Tên dự án"
                value={report.project_name}
                onChange={(v) => setReport({ ...report, project_name: v })}
              />
              <Field
                label="Đã đạt được tuần này"
                value={report.accomplishments}
                onChange={(v) => setReport({ ...report, accomplishments: v })}
                textarea
              />
              <Field
                label="Vướng mắc / blocker"
                value={report.blockers}
                onChange={(v) => setReport({ ...report, blockers: v })}
                textarea
              />
              <Field
                label="Kế hoạch tuần tới"
                value={report.next_week}
                onChange={(v) => setReport({ ...report, next_week: v })}
                textarea
              />
            </div>
          )}
          <button
            onClick={run}
            disabled={loading}
            className="mt-4 px-4 py-2 bg-brand-600 text-white text-sm rounded hover:bg-brand-700 disabled:opacity-50"
          >
            {loading ? "AI đang sinh nội dung…" : "Sinh nội dung"}
          </button>
        </div>

        <div className="p-5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 min-h-[400px]">
          <div className="text-xs uppercase tracking-wide text-slate-500 mb-3">
            Kết quả
          </div>
          {error && (
            <div className="text-sm text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}
          {!error && !output && !loading && (
            <div className="text-sm text-slate-400">
              Kết quả sẽ hiển thị ở đây.
            </div>
          )}
          {output && (
            <div className="prose-chat text-sm">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{output}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  textarea,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
  type?: string;
}) {
  return (
    <div>
      <label className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </label>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="mt-1 w-full border rounded px-3 py-2 text-sm dark:bg-slate-950 dark:border-slate-700"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full border rounded px-3 py-2 text-sm dark:bg-slate-950 dark:border-slate-700"
        />
      )}
    </div>
  );
}
