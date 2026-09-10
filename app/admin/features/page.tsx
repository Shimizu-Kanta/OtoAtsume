import Link from "next/link";
import { ContentStatus } from "@prisma/client";

import { AdminNav } from "@/components/admin/admin-nav";
import { DeleteSubmitButton } from "@/components/admin/delete-submit-button";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { requireAdminPage } from "@/lib/auth/admin";
import { listFeaturesForAdmin } from "@/lib/data/features";
import { formatDateTime, getSearchParam } from "@/lib/utils";
import { deleteFeatureAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminFeaturesPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const features = await listFeaturesForAdmin();
  const saved = getSearchParam(params, "saved") === "1";
  const deleted = getSearchParam(params, "deleted") === "1";

  return (
    <div className="space-y-6">
      <AdminNav />
      <PageHeading
        title="特集"
        description="スタッフのおすすめPOP（特集記事）を作成・編集します。"
        actions={
          <Link href="/admin/features/new">
            <Button>新規作成</Button>
          </Link>
        }
      />

      {saved ? (
        <div className="rounded-md border border-secondary/40 bg-secondary/10 p-4 text-sm">
          特集を保存しました。
        </div>
      ) : null}
      {deleted ? (
        <div className="rounded-md border border-secondary/40 bg-secondary/10 p-4 text-sm">
          特集を削除しました。
        </div>
      ) : null}

      <div className="overflow-hidden rounded-md border bg-card">
        {features.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">まだ特集がありません。</p>
        ) : (
          <div className="divide-y">
            {features.map((feature) => (
              <div key={feature.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/features/${feature.id}/edit`}
                      className="font-medium text-primary underline"
                    >
                      {feature.title}
                    </Link>
                    <StatusBadge status={feature.status} />
                  </div>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">/features/{feature.slug}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {feature._count.items}曲 / 更新 {formatDateTime(feature.updatedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/features/${feature.id}/edit`}
                    className="rounded-md border px-3 py-2 text-sm"
                  >
                    編集
                  </Link>
                  <form action={deleteFeatureAction.bind(null, feature.id)}>
                    <DeleteSubmitButton
                      size="sm"
                      confirmMessage={`特集「${feature.title}」を削除します。よろしいですか？`}
                    >
                      削除
                    </DeleteSubmitButton>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: ContentStatus }) {
  const published = status === ContentStatus.APPROVED;
  return (
    <span
      className={
        published
          ? "rounded-full bg-secondary/20 px-2 py-0.5 text-xs font-bold text-secondary-foreground"
          : "rounded-full bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground"
      }
    >
      {published ? "公開中" : "下書き"}
    </span>
  );
}
