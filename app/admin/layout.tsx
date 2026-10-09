import type { Metadata } from "next";

import { AdminShell } from "@/components/admin/admin-nav";

export const metadata: Metadata = {
  title: { default: "管理画面", template: "%s | 管理画面 | おとあつめ" },
  robots: { index: false, follow: false }
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container-page py-8">
      <AdminShell>{children}</AdminShell>
    </div>
  );
}
