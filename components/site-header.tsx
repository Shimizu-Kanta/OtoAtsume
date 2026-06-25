import Link from "next/link";

const navItems = [
  { href: "/covers", label: "カバー記録" },
  { href: "/performers", label: "活動者" },
  { href: "/songs", label: "楽曲" },
  { href: "/covers/new", label: "登録" }
];

export function SiteHeader() {
  return (
    <header className="border-b bg-card">
      <div className="container-page flex min-h-16 flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-lg font-semibold tracking-normal">
            うたあつめ
          </Link>
          <span className="hidden rounded-sm bg-muted px-2 py-1 text-xs text-muted-foreground sm:inline-flex">
            歌唱記録DB
          </span>
        </div>
        <nav className="flex flex-wrap items-center gap-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-sm px-2 py-1 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
