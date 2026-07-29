import Image from "next/image";
import Link from "next/link";

import { CoverCandidateStatus, CoverCandidateType } from "@prisma/client";
import { AdminNav } from "@/components/admin/admin-nav";
import { PageHeading } from "@/components/page-heading";
import { Pagination } from "@/components/pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { requireAdminPage } from "@/lib/auth/admin";
import {
  getCoverCandidateStatusCounts,
  listCoverCandidates
} from "@/lib/data/cover-candidates";
import { getPerformerOptions } from "@/lib/data/performers";
import { MAX_PENDING_CANDIDATES } from "@/lib/crawl/cover-candidates";
import { cn, formatDate, getSearchParam, parsePageParam } from "@/lib/utils";
import { CrawlControls } from "./crawl-controls";
import { rejectCoverCandidateAction, restoreCoverCandidateAction } from "./actions";

export const dynamic = "force-dynamic";

const STATUS_TABS: { value: CoverCandidateStatus; label: string }[] = [
  { value: "PENDING", label: "未処理" },
  { value: "ADOPTED", label: "承認済み" },
  { value: "REJECTED", label: "除外済み" }
];

function normalizeStatus(value: string | undefined): CoverCandidateStatus {
  return value === "ADOPTED" || value === "REJECTED" ? value : "PENDING";
}

const TYPE_TABS: { value: CoverCandidateType | "ALL"; label: string }[] = [
  { value: "ALL", label: "すべて" },
  { value: "COVER_VIDEO", label: "歌ってみた" },
  { value: "KARAOKE_STREAM", label: "歌枠" },
  { value: "SHORT", label: "ショート" }
];

function normalizeType(value: string | undefined): CoverCandidateType | undefined {
  return value === "COVER_VIDEO" || value === "KARAOKE_STREAM" || value === "SHORT" ? value : undefined;
}

function typeLabel(type: CoverCandidateType) {
  if (type === "KARAOKE_STREAM") return "歌枠";
  if (type === "SHORT") return "ショート";
  return "歌ってみた";
}

export default async function AdminCoverCandidatesPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const status = normalizeStatus(getSearchParam(params, "status"));
  const detectedType = normalizeType(getSearchParam(params, "type"));
  const page = parsePageParam(getSearchParam(params, "page"));

  const [{ items, totalCount, totalPages }, counts, performers] = await Promise.all([
    listCoverCandidates(status, detectedType, page),
    getCoverCandidateStatusCounts(),
    getPerformerOptions()
  ]);

  const adopted = getSearchParam(params, "adopted") === "1";
  const rejected = getSearchParam(params, "rejected") === "1";
  const restored = getSearchParam(params, "restored") === "1";
  const error = getSearchParam(params, "error");

  return (
    <div className="space-y-6">
      <AdminNav />
      <PageHeading
        title="歌唱記録候補"
        description="活動者のYouTubeチャンネルを巡回して集めた、未登録の歌唱動画候補です。確認して確定すると正式なカバー記録になります。"
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          未処理 <span className="font-semibold text-foreground">{counts.PENDING}</span> 件 / 上限{" "}
          {MAX_PENDING_CANDIDATES} 件
        </p>
      </div>

      <CrawlControls performers={performers} />

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm">{error}</div>
      ) : null}
      {adopted ? (
        <div className="rounded-md border border-secondary/40 bg-secondary/10 p-4 text-sm">
          カバー記録を作成しました。
        </div>
      ) : null}
      {rejected ? (
        <div className="rounded-md border border-secondary/40 bg-secondary/10 p-4 text-sm">
          候補を除外しました。
        </div>
      ) : null}
      {restored ? (
        <div className="rounded-md border border-secondary/40 bg-secondary/10 p-4 text-sm">
          候補を未処理に戻しました。
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 border-b pb-2">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={`/admin/cover-candidates?status=${tab.value}${detectedType ? `&type=${detectedType}` : ""}`}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              status === tab.value
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            {tab.label}（{counts[tab.value]}）
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">種別:</span>
        {TYPE_TABS.map((tab) => {
          const active = (tab.value === "ALL" && !detectedType) || tab.value === detectedType;
          const typeQuery = tab.value === "ALL" ? "" : `&type=${tab.value}`;
          return (
            <Link
              key={tab.value}
              href={`/admin/cover-candidates?status=${status}${typeQuery}`}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                active
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      <p className="text-sm text-muted-foreground">
        全 {totalCount.toLocaleString("ja-JP")} 件 / {page}ページ目（表示中 {items.length} 件）
      </p>

      {items.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((candidate) => (
            <article key={candidate.id} className="overflow-hidden rounded-3xl border border-primary/10 bg-card/90 shadow-sm">
              <a href={candidate.videoUrl} target="_blank" rel="noreferrer" className="block">
                {candidate.thumbnailUrl ? (
                  <Image
                    src={candidate.thumbnailUrl}
                    alt={candidate.title}
                    width={480}
                    height={270}
                    unoptimized
                    className="aspect-video w-full object-cover"
                  />
                ) : null}
              </a>
              <div className="space-y-3 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={candidate.detectedType === "KARAOKE_STREAM" ? "accent" : "default"}>
                    {typeLabel(candidate.detectedType)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{formatDate(candidate.publishedAt)}</span>
                </div>

                <a
                  href={candidate.videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block font-semibold text-foreground underline-offset-4 hover:text-primary hover:underline"
                >
                  {candidate.title}
                </a>
                <p className="text-sm text-muted-foreground">
                  {candidate.channelTitle}
                  {candidate.sourcePerformer ? ` / 巡回元: ${candidate.sourcePerformer.name}` : ""}
                </p>

                <div className="flex flex-wrap gap-2 border-t pt-3">
                  {candidate.status === "PENDING" ? (
                    candidate.detectedType === "KARAOKE_STREAM" ? (
                      <Link
                        href={`/covers/new?sourceUrl=${encodeURIComponent(candidate.videoUrl)}&autoFetch=1`}
                        className={cn(buttonVariants({ size: "sm" }))}
                      >
                        歌枠として手動登録する
                      </Link>
                    ) : (
                      <Link
                        href={`/admin/cover-candidates/${candidate.id}`}
                        className={cn(buttonVariants({ size: "sm" }))}
                      >
                        確定する
                      </Link>
                    )
                  ) : null}

                  {candidate.status === "ADOPTED" && candidate.adoptedCoverId ? (
                    <Link
                      href={`/admin/covers/${candidate.adoptedCoverId}`}
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                    >
                      作成されたカバー記録
                    </Link>
                  ) : null}

                  {candidate.status !== "REJECTED" ? (
                    <form action={rejectCoverCandidateAction.bind(null, candidate.id)}>
                      <Button type="submit" size="sm" variant="ghost">
                        これは違う
                      </Button>
                    </form>
                  ) : (
                    <form action={restoreCoverCandidateAction.bind(null, candidate.id)}>
                      <Button type="submit" size="sm" variant="ghost">
                        未処理に戻す
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-primary/10 bg-card/90 p-6 text-sm text-muted-foreground shadow-sm">
          この状態の候補はありません。
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} basePath="/admin/cover-candidates" params={params} />
    </div>
  );
}
