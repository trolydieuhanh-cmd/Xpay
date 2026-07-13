import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "ASEAN AI Platform — PM AI",
  description:
    "AI trợ lý quản lý dự án cho ASEAN Holding, chuyên trách dự án ASEAN AI Platform.",
};

const navItems = [
  { href: "/", label: "Tổng quan" },
  { href: "/chat", label: "AI Chat" },
  { href: "/projects", label: "Dự án" },
  { href: "/tasks", label: "Công việc" },
  { href: "/risks", label: "Rủi ro" },
  { href: "/planning", label: "Lập kế hoạch AI" },
  { href: "/knowledge", label: "Kho tri thức" },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="min-h-screen font-sans">
        <div className="flex min-h-screen">
          <aside className="w-64 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="px-5 py-6">
              <Link href="/" className="block">
                <div className="text-lg font-bold text-brand-700 dark:text-brand-300">
                  ASEAN AI
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Project Management AI
                </div>
              </Link>
            </div>
            <nav className="px-3 pb-6 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block px-3 py-2 rounded-md text-sm text-slate-700 dark:text-slate-200 hover:bg-brand-50 dark:hover:bg-slate-800 hover:text-brand-700 dark:hover:text-brand-300 transition"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="px-5 pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="text-[10px] uppercase tracking-wider text-slate-400">
                Owner
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                ASEAN Holding
              </div>
              <div className="text-[10px] text-slate-400 mt-3">v0.1.0 · dev</div>
            </div>
          </aside>
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </body>
    </html>
  );
}
