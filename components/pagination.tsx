import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Pagination({
  page,
  totalPages,
  basePath,
  params
}: {
  page: number;
  totalPages: number;
  basePath: string;
  params?: Record<string, string | string[] | undefined>;
}) {
  if (totalPages <= 1) {
    return null;
  }

  const buildHref = (targetPage: number) => {
    const searchParams = new URLSearchParams();

    for (const [key, value] of Object.entries(params ?? {})) {
      if (key === "page" || value === undefined) {
        continue;
      }

      if (Array.isArray(value)) {
        for (const item of value) {
          searchParams.append(key, item);
        }
      } else {
        searchParams.append(key, value);
      }
    }

    if (targetPage > 1) {
      searchParams.set("page", String(targetPage));
    }

    const query = searchParams.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  return (
    <nav aria-label="ページネーション" className="flex flex-wrap items-center justify-center gap-2">
      {page > 1 ? (
        <Link href={buildHref(page - 1)} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          <ChevronLeft className="size-4" aria-hidden="true" />
          前へ
        </Link>
      ) : null}

      {buildPageWindow(page, totalPages).map((target, index) =>
        target === null ? (
          <span key={`gap-${index}`} className="px-1 text-sm text-muted-foreground">
            …
          </span>
        ) : (
          <Link
            key={target}
            href={buildHref(target)}
            aria-current={target === page ? "page" : undefined}
            className={cn(
              buttonVariants({ variant: target === page ? "default" : "outline", size: "sm" }),
              "min-w-9"
            )}
          >
            {target}
          </Link>
        )
      )}

      {page < totalPages ? (
        <Link href={buildHref(page + 1)} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          次へ
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      ) : null}
    </nav>
  );
}

// 現在ページの前後2ページ + 先頭/末尾を表示し、間が飛ぶ箇所は null（省略記号）で埋める。
function buildPageWindow(current: number, total: number): Array<number | null> {
  const pages = new Set<number>([1, total]);

  for (let page = current - 2; page <= current + 2; page += 1) {
    if (page >= 1 && page <= total) {
      pages.add(page);
    }
  }

  const sorted = Array.from(pages).sort((a, b) => a - b);
  const result: Array<number | null> = [];
  let previous = 0;

  for (const page of sorted) {
    if (page - previous > 1) {
      result.push(null);
    }

    result.push(page);
    previous = page;
  }

  return result;
}
