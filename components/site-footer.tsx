import Link from "next/link";

const footerLinks = [
  { href: "/about", label: "この店について" },
  { href: "/rankings", label: "チャート" },
  { href: "/requests", label: "入荷ベル" },
  { href: "/stats", label: "統計" },
  { href: "/guide", label: "使い方" },
  { href: "/terms", label: "利用規約" },
  { href: "/privacy", label: "プライバシーポリシー" },
  { href: "/contact", label: "問い合わせ" }
];

export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-rule bg-panel-2">
      <div className="container-page flex flex-col gap-3.5 py-[22px] text-[13px] text-slate sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <p className="font-mono text-[11px] tracking-[0.1em]">© おとあつめ</p>
        <nav className="flex flex-wrap items-center gap-3.5">
          {footerLinks.map((item) => (
            <Link key={item.href} href={item.href} className="text-slate hover:text-ink hover:underline">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
