"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  BarChart3,
  Database,
  Download,
  ExternalLink,
  Flag,
  Folder,
  Home,
  Import,
  Layers,
  ListMusic,
  ListVideo,
  LogOut,
  Menu,
  Music,
  Newspaper,
  Search,
  Sparkles,
  Tags,
  UserCheck,
  Users,
  X,
  type LucideIcon
} from "lucide-react";

import { CommandPalette } from "@/components/admin/command-palette";
import { cn } from "@/lib/utils";

export type AdminNavCounts = {
  pendingReports: number;
  pendingPerformers: number;
  pendingCandidates: number;
};

type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  // 要対応件数のバッジ。件数が 1 以上のときだけ出す。
  count?: keyof AdminNavCounts;
  tone?: "danger";
};

export const adminNavSections: { title: string; items: AdminNavItem[] }[] = [
  {
    title: "概要",
    items: [
      { href: "/admin", label: "ダッシュボード", icon: Home },
      { href: "/admin/daily-reports", label: "日次レポート", icon: BarChart3 }
    ]
  },
  {
    title: "要対応",
    items: [
      { href: "/admin/reports", label: "通報", icon: Flag, count: "pendingReports", tone: "danger" },
      {
        href: "/admin/performers?status=PENDING",
        label: "確認待ち活動者",
        icon: UserCheck,
        count: "pendingPerformers"
      },
      {
        href: "/admin/cover-candidates",
        label: "歌唱記録候補",
        icon: Sparkles,
        count: "pendingCandidates"
      }
    ]
  },
  {
    title: "編集",
    items: [
      { href: "/admin/covers", label: "歌唱記録", icon: ListMusic },
      { href: "/admin/features", label: "特集", icon: Newspaper },
      { href: "/admin/playlist-import", label: "プレイリスト取り込み", icon: ListVideo }
    ]
  },
  {
    title: "マスタ",
    items: [
      { href: "/admin/performers", label: "活動者", icon: Users },
      { href: "/admin/groups", label: "所属グループ", icon: Folder },
      { href: "/admin/songs", label: "楽曲", icon: Music },
      { href: "/admin/artists", label: "アーティスト", icon: Database },
      { href: "/admin/tags", label: "タグ", icon: Tags },
      { href: "/admin/tag-groups", label: "タググループ", icon: Layers }
    ]
  },
  {
    title: "ツール",
    items: [
      { href: "/admin/crawl-keywords", label: "巡回キーワード", icon: Search },
      { href: "/admin/imports", label: "一括インポート", icon: Import },
      { href: "/admin/exports", label: "データエクスポート", icon: Download }
    ]
  }
];

// ⌘K 検索の「ページ」候補。サイドバーと同じ並び。
const commandPalettePages = adminNavSections.flatMap((section) =>
  section.items.map(({ href, label, icon }) => ({ href, label, icon }))
);

export function AdminShell({
  email,
  counts,
  children
}: {
  email: string;
  counts: AdminNavCounts;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    setOpen(false);
  }, [pathname, searchParams]);

  return (
    <div className="admin-theme min-h-screen">
      <AdminTopBar email={email} menuOpen={open} onOpenMenu={() => setOpen(true)} />

      <div className="lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] overflow-y-auto border-r bg-card lg:block">
          <AdminSidebarNavigation counts={counts} />
        </aside>
        <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1400px]">{children}</div>
        </main>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="管理メニュー">
          <button
            type="button"
            className="absolute inset-0 bg-foreground/40"
            aria-label="管理メニューを閉じる"
            onClick={() => setOpen(false)}
          />
          <div id="admin-mobile-menu" className="relative h-full w-72 max-w-[85vw] overflow-y-auto bg-card">
            <div className="flex h-14 items-center justify-between gap-3 border-b px-4">
              <p className="text-sm font-bold">管理メニュー</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex size-9 items-center justify-center rounded-md border hover:bg-muted"
                aria-label="管理メニューを閉じる"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
            <AdminSidebarNavigation counts={counts} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AdminTopBar({
  email,
  menuOpen,
  onOpenMenu
}: {
  email: string;
  menuOpen: boolean;
  onOpenMenu: () => void;
}) {
  return (
    // 公開サイトとの見分けをいちばん強く付ける場所なので、濃色の帯にしている。
    <header className="sticky top-0 z-40 flex h-14 items-center gap-2 bg-[#111827] px-3 text-white sm:gap-3 sm:px-4">
      <button
        type="button"
        onClick={onOpenMenu}
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-white/80 hover:bg-white/10 hover:text-white lg:hidden"
        aria-label="管理メニューを開く"
        aria-expanded={menuOpen}
        aria-controls="admin-mobile-menu"
      >
        <Menu className="size-5" aria-hidden="true" />
      </button>

      <Link
        href="/admin"
        className="inline-flex shrink-0 items-center gap-2 rounded-md px-1 py-1 font-heading text-base font-bold tracking-wide hover:opacity-85"
      >
        おとあつめ
        <span className="rounded bg-[#3b82f6] px-1.5 py-0.5 font-mono text-[10px] font-semibold leading-none tracking-[0.12em] text-white">
          ADMIN
        </span>
      </Link>

      <div className="flex min-w-0 flex-1 justify-center px-1">
        <CommandPalette pages={commandPalettePages} />
      </div>

      <div className="flex shrink-0 items-center gap-1 text-sm sm:gap-2">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 items-center gap-1 rounded-md px-2 text-white/80 hover:bg-white/10 hover:text-white"
        >
          <span className="hidden md:inline">公開サイト</span>
          <ExternalLink className="size-4" aria-hidden="true" />
          <span className="sr-only md:hidden">公開サイト（新しいタブ）</span>
        </a>
        {email ? (
          <span className="hidden max-w-[16rem] truncate text-xs text-white/60 sm:inline" title={email}>
            {email}
          </span>
        ) : null}
        <Link
          href="/api/auth/signout"
          className="inline-flex h-9 items-center gap-1 rounded-md px-2 text-white/80 hover:bg-white/10 hover:text-white"
        >
          <LogOut className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">ログアウト</span>
          <span className="sr-only sm:hidden">ログアウト</span>
        </Link>
      </div>
    </header>
  );
}

function AdminSidebarNavigation({
  counts,
  onNavigate
}: {
  counts: AdminNavCounts;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSearch = useMemo(() => searchParams.toString(), [searchParams]);

  return (
    <nav className="space-y-4 px-3 py-4" aria-label="管理画面メニュー">
      {adminNavSections.map((section) => (
        <div key={section.title}>
          <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {section.title}
          </p>
          <div className="space-y-0.5">
            {section.items.map((item) => {
              const Icon = item.icon;
              const active = isActiveAdminPath(item.href, pathname, currentSearch);
              const count = item.count ? counts[item.count] : 0;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-foreground/80 hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {count > 0 ? (
                    <span
                      className={cn(
                        "ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums text-white",
                        item.tone === "danger" ? "bg-destructive" : "bg-primary"
                      )}
                    >
                      <span className="sr-only">要対応 </span>
                      {count}
                      <span className="sr-only"> 件</span>
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function isActiveAdminPath(href: string, pathname: string, currentSearch: string) {
  const [hrefPath, hrefSearch] = href.split("?");

  if (hrefSearch) {
    return pathname === hrefPath && currentSearch === hrefSearch;
  }

  if (hrefPath === "/admin") {
    return pathname === "/admin";
  }

  return pathname === hrefPath || pathname.startsWith(`${hrefPath}/`);
}
