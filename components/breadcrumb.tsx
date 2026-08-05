import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { absoluteUrl } from "@/lib/site-url";

export type BreadcrumbItem = {
  name: string;
  href: string;
};

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  if (items.length === 0) {
    return null;
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.href)
    }))
  };

  return (
    <nav aria-label="パンくずリスト">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <ol className="flex flex-wrap items-center gap-1.5 font-mono text-xs tracking-tight text-[color:var(--slate-light)]">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={item.href} className="flex min-w-0 items-center gap-1.5">
              {isLast ? (
                <span aria-current="page" className="truncate text-slate">
                  {item.name}
                </span>
              ) : (
                <>
                  <Link
                    href={item.href}
                    className="shrink-0 underline-offset-4 hover:text-[color:var(--aqua-deep)] hover:underline"
                  >
                    {item.name}
                  </Link>
                  <ChevronRight className="size-3 shrink-0" aria-hidden="true" />
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
