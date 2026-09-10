import { notFound } from "next/navigation";
import { ContentStatus } from "@prisma/client";

import { AdminNav } from "@/components/admin/admin-nav";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { requireAdminPage } from "@/lib/auth/admin";
import { getFeatureForAdmin } from "@/lib/data/features";
import { parseFeatureLinks } from "@/lib/validations/feature";
import { formatDateTime, getSearchParam } from "@/lib/utils";
import { FeatureForm, type FeatureFormItem } from "../../feature-form";
import { publishFeatureAction, unpublishFeatureAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function EditFeaturePage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const feature = await getFeatureForAdmin(id);

  if (!feature) {
    notFound();
  }

  const published = feature.status === ContentStatus.APPROVED;
  const publishedNotice = getSearchParam(query, "published") === "1";
  const unpublishedNotice = getSearchParam(query, "unpublished") === "1";

  const items: FeatureFormItem[] = feature.items.map((item) => ({
    coverId: item.coverId,
    songTitle: item.cover.song.title,
    performerNames: item.cover.performers.map(({ performer }) => performer.name).join(", "),
    artistNames: item.cover.song.artists.map(({ artist }) => artist.name).join(", "),
    performedAt: item.cover.performedAt.toISOString().slice(0, 10),
    comment: item.comment
  }));

  return (
    <div className="space-y-6">
      <AdminNav />
      <PageHeading
        title="特集を編集"
        description={
          published
            ? `公開中です。公開日 ${feature.publishedAt ? formatDateTime(feature.publishedAt) : "-"}`
            : "下書きです。内容が固まったら公開してください。"
        }
      />

      {publishedNotice ? (
        <div className="rounded-md border border-secondary/40 bg-secondary/10 p-4 text-sm">
          特集を公開しました。
        </div>
      ) : null}
      {unpublishedNotice ? (
        <div className="rounded-md border border-secondary/40 bg-secondary/10 p-4 text-sm">
          特集を下書きに戻しました。
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 rounded-md border bg-card p-4">
        <span className="text-sm font-medium">状態: {published ? "公開中" : "下書き"}</span>
        {published ? (
          <form action={unpublishFeatureAction.bind(null, feature.id)}>
            <Button type="submit" variant="outline" size="sm">
              下書きに戻す
            </Button>
          </form>
        ) : (
          <form action={publishFeatureAction.bind(null, feature.id)}>
            <Button type="submit" size="sm">
              公開する
            </Button>
          </form>
        )}
        {published ? (
          <a
            href={`/features/${feature.slug}`}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-primary underline"
          >
            公開ページを開く
          </a>
        ) : null}
      </div>

      <FeatureForm
        featureId={feature.id}
        defaults={{
          title: feature.title,
          slug: feature.slug,
          lead: feature.lead,
          outro: feature.outro ?? "",
          items,
          links: parseFeatureLinks(feature.links)
        }}
      />
    </div>
  );
}
