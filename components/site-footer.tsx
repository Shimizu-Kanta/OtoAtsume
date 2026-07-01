import Link from "next/link";

const footerLinks = [
  { href: "/terms", label: "利用規約" },
  { href: "/privacy", label: "プライバシーポリシー" },
  { href: "/contact", label: "問い合わせ" }
];

export function SiteFooter() {
  return (
    <footer className="mt-12 border-t bg-card">
      <div className="container-page flex flex-col gap-3 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>© うたあつめ</p>
        <nav className="flex flex-wrap items-center gap-3">
          {footerLinks.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-foreground hover:underline">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
