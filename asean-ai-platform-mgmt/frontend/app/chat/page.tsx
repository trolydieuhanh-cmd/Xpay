"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Message = {
  role: "user" | "assistant";
  content: string;
  message_id?: number | null;
  feedback?: 1 | -1 | null;
};

const ROLES = [
  { value: "project_manager", label: "PM tổng quát" },
  { value: "wbs_planner", label: "Lập WBS" },
  { value: "risk_analyst", label: "Phân tích rủi ro" },
  { value: "report_writer", label: "Viết báo cáo" },
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Xin chào! Tôi là AI trợ lý quản lý dự án cho **ASEAN AI Platform**. Bạn có thể hỏi tôi về lập kế hoạch, rủi ro, phương pháp luận, hoặc bối cảnh dự án. Chọn vai trò phía trên để tôi tối ưu phong cách trả lời.",
    },
  ]);
  const [input, setInput] = useState("");
  const [role, setRole] = useState("project_manager");
  const [useRag, setUseRag] = useState(true);
  const [streaming, setStreaming] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendStreaming(next: Message[]) {
    const res = await fetch("/api/chat/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: next.map(({ role, content }) => ({ role, content })),
        role,
        use_rag: useRag,
        conversation_id: conversationId,
      }),
    });
    if (!res.ok || !res.body) throw new Error(await res.text());

    // Reserve an assistant slot to append tokens into
    const assistantIndex = next.length;
    setMessages([...next, { role: "assistant", content: "" }]);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let sseBuffer = "";
    let accumulated = "";
    let messageId: number | null = null;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      sseBuffer += decoder.decode(value, { stream: true });
      const events = sseBuffer.split("\n\n");
      sseBuffer = events.pop() || "";
      for (const evt of events) {
        const line = evt.trim();
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (data === "[DONE]") continue;
        try {
          const obj = JSON.parse(data);
          if (obj.delta) {
            accumulated += obj.delta;
            setMessages((prev) => {
              const copy = [...prev];
              copy[assistantIndex] = { role: "assistant", content: accumulated };
              return copy;
            });
          } else if (obj.conversation_id) {
            setConversationId(obj.conversation_id);
          } else if (obj.message_id) {
            messageId = obj.message_id;
          } else if (obj.error) {
            throw new Error(obj.error);
          }
        } catch (e) {
          // Bỏ qua parse error trên SSE keep-alive
        }
      }
    }

    setMessages((prev) => {
      const copy = [...prev];
      copy[assistantIndex] = {
        role: "assistant",
        content: accumulated || "(không có nội dung)",
        message_id: messageId,
        feedback: null,
      };
      return copy;
    });
  }

  async function sendBlocking(next: Message[]) {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: next.map(({ role, content }) => ({ role, content })),
        role,
        use_rag: useRag,
        conversation_id: conversationId,
      }),
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    if (data.conversation_id) setConversationId(data.conversation_id);
    setMessages([
      ...next,
      {
        role: "assistant",
        content: data.text || "(không có nội dung)",
        message_id: data.message_id ?? null,
        feedback: null,
      },
    ]);
  }

  async function send() {
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    setError(null);
    const next: Message[] = [...messages, { role: "user", content: q }];
    setMessages(next);
    setLoading(true);
    try {
      if (streaming) await sendStreaming(next);
      else await sendBlocking(next);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function sendFeedback(index: number, rating: 1 | -1) {
    const msg = messages[index];
    if (!msg?.message_id) return;
    try {
      await fetch("/api/chat/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message_id: msg.message_id, rating }),
      });
      setMessages((prev) => {
        const copy = [...prev];
        copy[index] = { ...copy[index], feedback: rating };
        return copy;
      });
    } catch (e: any) {
      setError("Không gửi được feedback: " + (e.message || String(e)));
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      send();
    }
  }

  function resetConversation() {
    setConversationId(null);
    setMessages([
      {
        role: "assistant",
        content: "Đã bắt đầu cuộc trò chuyện mới. Bạn muốn hỏi gì?",
      },
    ]);
    setError(null);
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-3 flex items-center gap-3 flex-wrap">
        <div className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Vai trò:
        </div>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="text-sm border border-slate-300 dark:border-slate-700 rounded px-2 py-1 bg-white dark:bg-slate-800"
        >
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm ml-4">
          <input
            type="checkbox"
            checked={useRag}
            onChange={(e) => setUseRag(e.target.checked)}
          />
          Knowledge Base (RAG)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={streaming}
            onChange={(e) => setStreaming(e.target.checked)}
          />
          Streaming
        </label>
        <button
          onClick={resetConversation}
          className="ml-auto text-xs text-slate-500 hover:text-brand-600 underline"
        >
          Cuộc trò chuyện mới
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${
                m.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div className="max-w-[85%]">
                <div
                  className={`rounded-lg px-4 py-3 ${
                    m.role === "user"
                      ? "bg-brand-600 text-white"
                      : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                  }`}
                >
                  {m.role === "user" ? (
                    <div className="whitespace-pre-wrap text-sm">
                      {m.content}
                    </div>
                  ) : (
                    <div className="prose-chat text-sm">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {m.content || "…"}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
                {m.role === "assistant" && m.message_id && (
                  <div className="flex items-center gap-2 mt-1 pl-1 text-xs">
                    <button
                      onClick={() => sendFeedback(i, 1)}
                      disabled={m.feedback != null}
                      className={`px-2 py-0.5 rounded ${
                        m.feedback === 1
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30"
                          : "text-slate-400 hover:text-emerald-600"
                      }`}
                      title="Hữu ích"
                    >
                      👍
                    </button>
                    <button
                      onClick={() => sendFeedback(i, -1)}
                      disabled={m.feedback != null}
                      className={`px-2 py-0.5 rounded ${
                        m.feedback === -1
                          ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30"
                          : "text-slate-400 hover:text-rose-600"
                      }`}
                      title="Chưa tốt"
                    >
                      👎
                    </button>
                    {m.feedback != null && (
                      <span className="text-slate-400">Đã ghi nhận</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && !streaming && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-lg px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-500">
                AI đang suy nghĩ…
              </div>
            </div>
          )}
          {error && (
            <div className="rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-300 dark:border-rose-800 px-4 py-3 text-sm text-rose-800 dark:text-rose-200">
              Lỗi: {error}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <div className="max-w-3xl mx-auto flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            rows={2}
            placeholder="Hỏi PM AI… (Ctrl/⌘+Enter để gửi)"
            className="flex-1 resize-none border border-slate-300 dark:border-slate-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="px-4 py-2 rounded-md bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Gửi
          </button>
        </div>
      </div>
    </div>
  );
}
