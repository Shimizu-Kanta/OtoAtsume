import Link from "next/link";

const navItems = [
  { href: "/covers", label: "カバー記録" },
  { href: "/performers", label: "活動者" },
  { href: "/songs", label: "楽曲" },
  { href: "/covers/new", label: "登録" }
];

const siteLogoSrc = process.env.NEXT_PUBLIC_SITE_LOGO_SRC ?? "/site-logo.svg";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/75">
      <div className="container-page flex min-h-16 flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="group inline-flex items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="おとあつめ ホーム"
          >
            <img
              src={siteLogoSrc}
              alt="おとあつめ"
              className="h-10 w-auto max-w-[180px] object-contain transition-opacity group-hover:opacity-85 sm:h-12 sm:max-w-[220px]"
            />
          </Link>
          <span className="hidden rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary sm:inline-flex">
            歌唱記録DB
          </span>
        </div>
        <nav className="flex flex-wrap items-center gap-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
