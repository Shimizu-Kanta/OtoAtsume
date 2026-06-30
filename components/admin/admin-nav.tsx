import Link from "next/link";

const adminNavItems = [
  { href: "/admin", label: "ダッシュボード" },
  { href: "/admin/daily-reports", label: "日次レポート" },
  { href: "/admin/covers", label: "カバー記録" },
  { href: "/admin/reports", label: "通報" },
  { href: "/admin/performers?status=PENDING", label: "確認待ち活動者" },
  { href: "/admin/groups", label: "所属グループ" },
  { href: "/admin/performers", label: "活動者" },
  { href: "/admin/tags", label: "タグ" },
  { href: "/admin/songs", label: "楽曲" },
  { href: "/admin/artists", label: "アーティスト" },
  { href: "/admin/imports", label: "一括インポート" }
];

export function AdminNav() {
  return (
    <nav className="mb-6 flex flex-wrap gap-2 border-b pb-4">
      {adminNavItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="rounded-sm px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
