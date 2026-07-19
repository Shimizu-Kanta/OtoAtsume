"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  BarChart3,
  Database,
  FileText,
  Flag,
  Folder,
  Home,
  Import,
  Layers,
  ListMusic,
  LogOut,
  Menu,
  Music,
  Tags,
  UserCheck,
  Users,
  X
} from "lucide-react";

import { cn } from "@/lib/utils";

const adminNavSections = [
  {
    title: "概要",
    items: [
      { href: "/admin", label: "ダッシュボード", icon: Home },
      { href: "/admin/daily-reports", label: "日次レポート", icon: BarChart3 }
    ]
  },
  {
    title: "確認",
    items: [
      { href: "/admin/covers", label: "カバー記録", icon: ListMusic },
      { href: "/admin/reports", label: "通報", icon: Flag },
      { href: "/admin/performers?status=PENDING", label: "確認待ち活動者", icon: UserCheck }
    ]
  },
  {
    title: "マスタ",
    items: [
      { href: "/admin/groups", label: "所属グループ", icon: Folder },
      { href: "/admin/performers", label: "活動者", icon: Users },
      { href: "/admin/tags", label: "タグ", icon: Tags },
      { href: "/admin/tag-groups", label: "タググループ", icon: Layers },
      { href: "/admin/songs", label: "楽曲", icon: Music },
      { href: "/admin/artists", label: "アーティスト", icon: Database },
      { href: "/admin/imports", label: "一括インポート", icon: Import }
    ]
  }
] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    setOpen(false);
  }, [pathname, searchParams]);

  return (
    <div className="lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-6">
      <div className="sticky top-20 z-30 mb-4 rounded-2xl border bg-card/95 p-3 shadow-sm backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted"
          aria-expanded={open}
          aria-controls="admin-mobile-menu"
        >
          <span className="inline-flex items-center gap-2">
            <Menu className="size-4" aria-hidden="true" />
            管理メニュー
          </span>
          <span className="text-xs text-muted-foreground">開く</span>
        </button>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-foreground/30"
            aria-label="管理メニューを閉じる"
            onClick={() => setOpen(false)}
          />
          <div id="admin-mobile-menu" className="relative h-full w-72 max-w-[85vw] overflow-y-auto bg-card p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold">管理画面</p>
                <p className="text-xs text-muted-foreground">おとあつめ</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex size-9 items-center justify-center rounded-full border hover:bg-muted"
                aria-label="管理メニューを閉じる"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
            <AdminSidebarNavigation />
          </div>
        </div>
      ) : null}

      <aside className="hidden lg:block">
        <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto rounded-3xl border bg-card/90 p-4 shadow-sm">
          <div className="mb-4 border-b pb-4">
            <p className="text-sm font-bold">管理画面</p>
            <p className="mt-1 text-xs text-muted-foreground">よく使う項目をサイドバーにまとめています。</p>
          </div>
          <AdminSidebarNavigation />
        </div>
      </aside>

      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function AdminNav() {
  return null;
}

function AdminSidebarNavigation() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSearch = useMemo(() => searchParams.toString(), [searchParams]);

  return (
    <nav className="space-y-5" aria-label="管理画面メニュー">
      {adminNavSections.map((section) => (
        <div key={section.title}>
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {section.title}
          </p>
          <div className="space-y-1">
            {section.items.map((item) => {
              const Icon = item.icon;
              const active = isActiveAdminPath(item.href, pathname, currentSearch);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}

      <div className="border-t pt-4">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <FileText className="size-4" aria-hidden="true" />
          公開サイトへ
        </Link>
        <Link
          href="/api/auth/signout"
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <LogOut className="size-4" aria-hidden="true" />
          ログアウト
        </Link>
      </div>
    </nav>
  );
}

function isActiveAdminPath(href: string, pathname: string, currentSearch: string) {
  const [hrefPath, hrefSearch] = href.split("?");

  if (hrefSearch) {
    return pathname === hrefPath && currentSearch === hrefSearch;
  }

  if (hrefPath === "/admin") {
    return pathname === "/admin";
  }

  return pathname === hrefPath || pathname.startsWith(`${hrefPath}/`);
}
