export const API_BASE = "";

export async function api<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${path} → ${res.status}: ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const fetcher = <T,>(path: string) => api<T>(path);

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type Project = {
  id: number;
  name: string;
  code: string;
  description: string;
  status: string;
  owner: string;
  start_date: string | null;
  target_date: string | null;
  budget_vnd: number;
  tags: string[];
  created_at: string;
  updated_at: string;
};

export type Task = {
  id: number;
  project_id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignee: string;
  estimate_hours: number;
  due_date: string | null;
  created_at: string;
  updated_at: string;
};

export type Risk = {
  id: number;
  project_id: number;
  title: string;
  description: string;
  level: string;
  probability: number;
  impact: number;
  status: string;
  mitigation: string;
  owner: string;
  created_at: string;
  updated_at: string;
};
