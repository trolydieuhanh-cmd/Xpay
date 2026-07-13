"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher, Project } from "@/lib/api";

const STATUS_LABEL: Record<string, string> = {
  planning: "Lập kế hoạch",
  in_progress: "Đang triển khai",
  on_hold: "Tạm dừng",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
};

export default function ProjectsPage() {
  const { data, error, isLoading, mutate } = useSWR<Project[]>(
    "/api/projects",
    fetcher
  );
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    code: "",
    description: "",
    owner: "",
    budget_vnd: 0,
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(await res.text());
      setForm({ name: "", code: "", description: "", owner: "", budget_vnd: 0 });
      mutate();
    } catch (e: any) {
      alert("Lỗi: " + e.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Danh sách dự án</h1>

      <form
        onSubmit={submit}
        className="mb-8 p-5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
      >
        <div className="text-sm font-semibold mb-3">Thêm dự án mới</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            required
            placeholder="Tên dự án"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="border rounded px-3 py-2 text-sm dark:bg-slate-950 dark:border-slate-700"
          />
          <input
            required
            placeholder="Mã (VD: AAIP-001)"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            className="border rounded px-3 py-2 text-sm dark:bg-slate-950 dark:border-slate-700"
          />
          <input
            placeholder="Chủ nhiệm dự án"
            value={form.owner}
            onChange={(e) => setForm({ ...form, owner: e.target.value })}
            className="border rounded px-3 py-2 text-sm dark:bg-slate-950 dark:border-slate-700"
          />
          <input
            type="number"
            placeholder="Ngân sách (VND)"
            value={form.budget_vnd || ""}
            onChange={(e) =>
              setForm({ ...form, budget_vnd: Number(e.target.value) || 0 })
            }
            className="border rounded px-3 py-2 text-sm dark:bg-slate-950 dark:border-slate-700"
          />
          <textarea
            placeholder="Mô tả"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="md:col-span-2 border rounded px-3 py-2 text-sm dark:bg-slate-950 dark:border-slate-700"
            rows={2}
          />
        </div>
        <button
          type="submit"
          disabled={creating}
          className="mt-3 px-4 py-2 bg-brand-600 text-white text-sm rounded hover:bg-brand-700 disabled:opacity-50"
        >
          {creating ? "Đang lưu…" : "Tạo dự án"}
        </button>
      </form>

      {error && (
        <div className="text-rose-600 text-sm mb-4">
          Không tải được: {String(error.message || error)}
        </div>
      )}
      {isLoading && <div className="text-slate-500 text-sm">Đang tải…</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(data || []).map((p) => (
          <div
            key={p.id}
            className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold text-slate-900 dark:text-white">
                  {p.name}
                </div>
                <div className="text-xs text-slate-500">{p.code}</div>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-brand-100 text-brand-700">
                {STATUS_LABEL[p.status] || p.status}
              </span>
            </div>
            {p.description && (
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
                {p.description}
              </p>
            )}
            <div className="text-xs text-slate-500 mt-3 space-x-4">
              {p.owner && <span>Owner: {p.owner}</span>}
              {p.budget_vnd > 0 && (
                <span>
                  Ngân sách: {p.budget_vnd.toLocaleString("vi-VN")} VND
                </span>
              )}
            </div>
          </div>
        ))}
        {data && data.length === 0 && (
          <div className="text-slate-500 text-sm">
            Chưa có dự án nào. Tạo dự án đầu tiên ở form phía trên.
          </div>
        )}
      </div>
    </div>
  );
}
