import { CrawlKeywordKind } from "@prisma/client";

import { AdminNav } from "@/components/admin/admin-nav";
import { DeleteSubmitButton } from "@/components/admin/delete-submit-button";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { requireAdminPage } from "@/lib/auth/admin";
import { listCrawlKeywords } from "@/lib/data/crawl-keywords";
import { getSearchParam } from "@/lib/utils";
import {
  createCrawlKeywordAction,
  deleteCrawlKeywordAction,
  toggleCrawlKeywordAction
} from "./actions";

export const dynamic = "force-dynamic";

const KIND_LABELS: Record<CrawlKeywordKind, string> = {
  COVER_VIDEO: "歌ってみた判定",
  KARAOKE_STREAM: "歌枠判定",
  MEDLEY: "メドレー判定",
  EXCLUDE: "除外"
};

export default async function AdminCrawlKeywordsPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const [keywords, params] = await Promise.all([listCrawlKeywords(), searchParams]);
  const error = getSearchParam(params, "error");

  return (
    <div className="space-y-6">
      <AdminNav />
      <PageHeading
        title="巡回キーワード管理"
        description="歌唱記録候補の巡回で使う判定キーワードを管理します。判定順は 除外 → 歌枠 → 歌ってみた です。"
      />

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm">{error}</div>
      ) : null}

      <form action={createCrawlKeywordAction} className="rounded-md border bg-card p-5">
        <div className="grid gap-3 md:grid-cols-[1fr_200px_auto] md:items-end">
          <div className="space-y-2">
            <Label htmlFor="keyword">キーワード</Label>
            <Input id="keyword" name="keyword" required maxLength={100} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kind">種別</Label>
            <Select id="kind" name="kind" defaultValue="COVER_VIDEO">
              <option value="COVER_VIDEO">歌ってみた判定</option>
              <option value="KARAOKE_STREAM">歌枠判定</option>
              <option value="MEDLEY">メドレー判定</option>
              <option value="EXCLUDE">除外</option>
            </Select>
          </div>
          <Button type="submit">追加</Button>
        </div>
      </form>

      <div className="overflow-hidden rounded-md border bg-card">
        <div className="divide-y">
          {keywords.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">キーワードがまだ登録されていません。</p>
          ) : (
            keywords.map((keyword) => (
              <div
                key={keyword.id}
                className="flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{keyword.keyword}</span>
                  <Badge variant="muted">{KIND_LABELS[keyword.kind]}</Badge>
                  {!keyword.enabled ? <Badge variant="outline">無効</Badge> : null}
                </div>
                <div className="flex items-center gap-2">
                  <form action={toggleCrawlKeywordAction.bind(null, keyword.id, !keyword.enabled)}>
                    <Button type="submit" size="sm" variant="ghost">
                      {keyword.enabled ? "無効化" : "有効化"}
                    </Button>
                  </form>
                  <form action={deleteCrawlKeywordAction.bind(null, keyword.id)}>
                    <DeleteSubmitButton
                      size="sm"
                      confirmMessage={`キーワード「${keyword.keyword}」を削除します。よろしいですか？`}
                    >
                      削除
                    </DeleteSubmitButton>
                  </form>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
