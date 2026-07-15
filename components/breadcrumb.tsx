import Link from "next/link";
import { ChevronRight } from "lucide-react";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://oto-atsume.com";

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
      item: `${siteUrl}${item.href}`
    }))
  };

  return (
    <nav aria-label="パンくずリスト">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={item.href} className="flex min-w-0 items-center gap-1.5">
              {isLast ? (
                <span aria-current="page" className="truncate font-medium text-foreground">
                  {item.name}
                </span>
              ) : (
                <>
                  <Link
                    href={item.href}
                    className="shrink-0 underline-offset-4 hover:text-primary hover:underline"
                  >
                    {item.name}
                  </Link>
                  <ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
