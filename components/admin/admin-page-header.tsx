import { Fragment } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

// 管理画面のページ見出し。公開側の PageHeading(text-3xl・英字キャッチ付き)は作業画面には
// 大きすぎるので、タイトル1行＋説明1行＋右端の操作に詰めている。
export function AdminPageHeader({
  title,
  description,
  actions,
  breadcrumbs
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  // 詳細・編集ページで使う。例: [{ href: "/admin/covers", label: "歌唱記録" }, { label: "編集" }]
  breadcrumbs?: { href?: string; label: string }[];
}) {
  return (
    <div className="mb-6 border-b pb-4">
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <nav aria-label="パンくずリスト" className="mb-1.5">
          <ol className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            {breadcrumbs.map((crumb, index) => (
              <Fragment key={`${crumb.label}-${index}`}>
                {index > 0 ? <ChevronRight className="size-3 shrink-0" aria-hidden="true" /> : null}
                <li className="min-w-0 truncate">
                  {crumb.href ? (
                    <Link href={crumb.href} className="hover:text-foreground hover:underline">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span aria-current={index === breadcrumbs.length - 1 ? "page" : undefined}>{crumb.label}</span>
                  )}
                </li>
              </Fragment>
            ))}
          </ol>
        </nav>
      ) : null}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-6">
        <div className="min-w-0">
          <h1 className="truncate font-sans text-xl font-bold text-foreground">{title}</h1>
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2 md:justify-end">{actions}</div> : null}
      </div>
    </div>
  );
}
