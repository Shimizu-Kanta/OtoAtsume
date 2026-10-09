import type { Metadata } from "next";

import { AdminShell } from "@/components/admin/admin-shell";
import { getAdminSession } from "@/lib/auth/admin";
import { getAdminNavCounts } from "@/lib/data/stats";

export const metadata: Metadata = {
  title: { default: "管理画面", template: "%s | 管理画面 | おとあつめ" },
  robots: { index: false, follow: false }
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();

  // 未ログイン(= /admin/login、または各ページの requireAdminPage() がリダイレクトする直前)は
  // 外枠を出さない。リダイレクトはこれまでどおり各ページ側に任せる。
  if (!session) {
    return (
      <div className="admin-theme flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md">{children}</div>
      </div>
    );
  }

  const counts = await getAdminNavCounts();

  return (
    <AdminShell email={session.user?.email ?? ""} counts={counts}>
      {children}
    </AdminShell>
  );
}
