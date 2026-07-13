"use client";

import useSWR from "swr";
import { fetcher, Project, Task } from "@/lib/api";

const STATUS_LABEL: Record<string, string> = {
  todo: "Chờ làm",
  in_progress: "Đang làm",
  in_review: "Đang review",
  done: "Xong",
  blocked: "Bị chặn",
};

const PRIO_TONE: Record<string, string> = {
  low: "bg-slate-200 text-slate-700",
  medium: "bg-blue-100 text-blue-800",
  high: "bg-amber-100 text-amber-800",
  critical: "bg-rose-100 text-rose-800",
};

export default function TasksPage() {
  const { data: tasks } = useSWR<Task[]>("/api/tasks", fetcher);
  const { data: projects } = useSWR<Project[]>("/api/projects", fetcher);

  const projectMap = new Map((projects || []).map((p) => [p.id, p]));
  const grouped = (tasks || []).reduce<Record<string, Task[]>>((acc, t) => {
    acc[t.status] = acc[t.status] || [];
    acc[t.status].push(t);
    return acc;
  }, {});

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Công việc</h1>
      <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
        Tạo/cập nhật task bằng API <code>/api/tasks</code>. Giao diện chi tiết
        sẽ được bổ sung dần.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {["todo", "in_progress", "in_review", "done", "blocked"].map((col) => (
          <div
            key={col}
            className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 min-h-[300px]"
          >
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
              {STATUS_LABEL[col]} ({(grouped[col] || []).length})
            </div>
            <div className="space-y-2">
              {(grouped[col] || []).map((t) => (
                <div
                  key={t.id}
                  className="p-3 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                >
                  <div className="text-sm font-medium">{t.title}</div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {projectMap.get(t.project_id)?.name || `Dự án #${t.project_id}`}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded ${
                        PRIO_TONE[t.priority] || PRIO_TONE.medium
                      }`}
                    >
                      {t.priority}
                    </span>
                    {t.assignee && (
                      <span className="text-[10px] text-slate-500">
                        @{t.assignee}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
