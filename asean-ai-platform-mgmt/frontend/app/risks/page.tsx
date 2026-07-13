"use client";

import useSWR from "swr";
import { fetcher, Risk } from "@/lib/api";

const LEVEL_TONE: Record<string, string> = {
  low: "bg-emerald-100 text-emerald-800",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-rose-100 text-rose-800",
};

export default function RisksPage() {
  const { data } = useSWR<Risk[]>("/api/risks", fetcher);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Sổ đăng ký rủi ro</h1>
      <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
        Ghi nhận rủi ro theo khung ISO 31000. Có thể tạo tự động từ trang{" "}
        <a href="/planning" className="text-brand-600 underline">
          Lập kế hoạch AI
        </a>
        .
      </p>

      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100 dark:bg-slate-800">
            <tr>
              <th className="text-left px-3 py-2">Rủi ro</th>
              <th className="text-left px-3 py-2">Mức</th>
              <th className="text-left px-3 py-2">P × I</th>
              <th className="text-left px-3 py-2">Chiến lược</th>
              <th className="text-left px-3 py-2">Owner</th>
              <th className="text-left px-3 py-2">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {(data || []).map((r) => (
              <tr
                key={r.id}
                className="border-t border-slate-200 dark:border-slate-800"
              >
                <td className="px-3 py-2">
                  <div className="font-medium">{r.title}</div>
                  {r.description && (
                    <div className="text-xs text-slate-500 mt-0.5">
                      {r.description.slice(0, 120)}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded ${
                      LEVEL_TONE[r.level] || LEVEL_TONE.medium
                    }`}
                  >
                    {r.level}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs">
                  {r.probability}% × {r.impact}%
                </td>
                <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
                  {r.mitigation || "-"}
                </td>
                <td className="px-3 py-2 text-xs">{r.owner || "-"}</td>
                <td className="px-3 py-2 text-xs">{r.status}</td>
              </tr>
            ))}
            {(!data || data.length === 0) && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                  Chưa có rủi ro nào được ghi nhận.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
