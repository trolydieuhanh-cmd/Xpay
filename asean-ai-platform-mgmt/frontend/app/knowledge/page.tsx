"use client";

import { useState } from "react";
import useSWR from "swr";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { fetcher } from "@/lib/api";

type Doc = {
  source: string;
  title: string;
  chunk_count: number;
  char_count: number;
};

type SearchResult = {
  title: string;
  source: string;
  excerpt: string;
  score: number;
};

export default function KnowledgePage() {
  const { data, mutate } = useSWR<{ documents: Doc[]; total_chunks: number }>(
    "/api/knowledge/documents",
    fetcher
  );
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [doc, setDoc] = useState<{ source: string; content: string } | null>(
    null
  );
  const [reloading, setReloading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);

  async function upload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement;
    const subdirInput = form.elements.namedItem("subdir") as HTMLInputElement;
    if (!fileInput.files?.length) return;

    const fd = new FormData();
    fd.append("file", fileInput.files[0]);
    if (subdirInput.value.trim()) fd.append("subdir", subdirInput.value.trim());

    setUploading(true);
    setUploadMsg(null);
    try {
      const res = await fetch("/api/knowledge/upload", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setUploadMsg(
        `✓ Đã upload "${data.source}" (${data.bytes} bytes). Tổng ${data.total_chunks} chunk.`
      );
      form.reset();
      mutate();
    } catch (e: any) {
      setUploadMsg("✗ Lỗi: " + (e.message || String(e)));
    } finally {
      setUploading(false);
    }
  }

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    const res = await fetch(`/api/knowledge/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setResults(data);
  }

  async function openDoc(source: string) {
    const res = await fetch(`/api/knowledge/document/${source}`);
    if (res.ok) setDoc(await res.json());
  }

  async function reload() {
    setReloading(true);
    try {
      await fetch("/api/knowledge/reload", { method: "POST" });
      await mutate();
    } finally {
      setReloading(false);
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Kho tri thức (Knowledge Base)</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
            AI dùng các tài liệu này qua RAG khi trả lời.
            {data && (
              <>
                {" "}
                Hiện có <b>{data.documents.length}</b> tài liệu,{" "}
                <b>{data.total_chunks}</b> chunk.
              </>
            )}
          </p>
        </div>
        <button
          onClick={reload}
          disabled={reloading}
          className="px-3 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
        >
          {reloading ? "Đang tải lại…" : "Tải lại KB"}
        </button>
      </div>

      <form
        onSubmit={upload}
        className="mb-6 p-4 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
      >
        <div className="text-sm font-semibold mb-2">Thêm tài liệu vào KB</div>
        <div className="flex flex-wrap gap-2 items-center">
          <input
            type="file"
            name="file"
            accept=".md,.txt"
            required
            className="text-sm"
          />
          <input
            name="subdir"
            placeholder="Thư mục con (tùy chọn)"
            className="text-sm border rounded px-2 py-1 dark:bg-slate-950 dark:border-slate-700"
          />
          <button
            type="submit"
            disabled={uploading}
            className="px-3 py-1.5 text-sm rounded bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {uploading ? "Đang upload…" : "Upload"}
          </button>
          <span className="text-xs text-slate-500">
            .md hoặc .txt, tối đa 2 MB, UTF-8
          </span>
        </div>
        {uploadMsg && (
          <div
            className={`mt-2 text-xs ${
              uploadMsg.startsWith("✓")
                ? "text-emerald-700 dark:text-emerald-300"
                : "text-rose-700 dark:text-rose-300"
            }`}
          >
            {uploadMsg}
          </div>
        )}
      </form>

      <form onSubmit={search} className="flex gap-2 mb-6">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm trong knowledge base…"
          className="flex-1 border rounded px-3 py-2 text-sm dark:bg-slate-950 dark:border-slate-700"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-brand-600 text-white text-sm rounded hover:bg-brand-700"
        >
          Tìm
        </button>
      </form>

      {results !== null && (
        <div className="mb-8 space-y-2">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Kết quả tìm kiếm ({results.length})
          </div>
          {results.map((r, i) => (
            <div
              key={i}
              onClick={() => openDoc(r.source)}
              className="p-3 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-brand-400 cursor-pointer"
            >
              <div className="text-sm font-semibold">{r.title}</div>
              <div className="text-[11px] text-slate-500 mb-1">
                {r.source} · score {r.score.toFixed(2)}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-300">
                {r.excerpt.slice(0, 250)}…
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="text-sm font-semibold mb-2">Tài liệu</div>
          <div className="space-y-2">
            {(data?.documents || []).map((d) => (
              <button
                key={d.source}
                onClick={() => openDoc(d.source)}
                className="w-full text-left p-3 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-brand-400"
              >
                <div className="text-sm font-medium">{d.title}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {d.source} · {d.chunk_count} chunk ·{" "}
                  {(d.char_count / 1000).toFixed(1)}k ký tự
                </div>
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="text-sm font-semibold mb-2">Xem nội dung</div>
          <div className="p-4 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 min-h-[300px]">
            {doc ? (
              <>
                <div className="text-[11px] text-slate-500 mb-2">
                  {doc.source}
                </div>
                <div className="prose-chat text-sm">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {doc.content}
                  </ReactMarkdown>
                </div>
              </>
            ) : (
              <div className="text-sm text-slate-400">
                Chọn một tài liệu bên trái để xem nội dung.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
