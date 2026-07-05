import { Info } from "lucide-react";

import { TurnstileCaptcha } from "@/components/captcha/turnstile";
import { DuplicateCandidateChecker } from "@/components/covers/duplicate-candidate-checker";
import { PerformerPicker } from "@/components/covers/performer-picker";
import { YouTubeMetadataFetcher } from "@/components/covers/youtube-metadata-fetcher";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { coverTypeOptions } from "@/lib/constants";
import { getPerformerOptions } from "@/lib/data/performers";
import { getCaptchaSiteKey, isCaptchaRequired } from "@/lib/security/captcha";
import { getSearchParam } from "@/lib/utils";
import { createCoverAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function NewCoverPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const error = getSearchParam(params, "error");
  const initialSourceUrl = getSearchParam(params, "sourceUrl");
  const autoFetchMetadata = Boolean(initialSourceUrl && getSearchParam(params, "autoFetch") === "1");
  const performers = await getPerformerOptions();

  return (
    <div className="space-y-6">
      <PageHeading
        title="カバー記録登録"
        description="ログインなしで登録できます。投稿者名や投稿履歴は記録・表示しません。"
      />

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm">
          {error}
        </div>
      ) : null}

      <div className="rounded-md border border-accent/50 bg-accent/10 p-4 text-sm">
        <div className="flex gap-2">
          <Info className="mt-0.5 size-4 shrink-0" />
          <p>
            メンバー限定配信、非公開コンテンツ、購入者以外に公開されていない有料配信内の情報など、権利者や配信者が公開していない情報の登録は避けてください。有料ライブであっても、公式サイト・公式SNS・ニュース記事などでセットリストが公開されている場合は登録できます。
          </p>
        </div>
      </div>

      <form id="cover-form" action={createCoverAction} className="space-y-6 rounded-md border bg-card p-5">

        <section className="form-grid">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="sourceUrl">情報元URL</Label>
            <Input id="sourceUrl" name="sourceUrl" type="url" required defaultValue={initialSourceUrl ?? ""} />
          </div>
          <div className="md:col-span-2">
            <YouTubeMetadataFetcher autoFetch={autoFetchMetadata} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sourceTitle">配信・動画・ライブ名</Label>
            <Input id="sourceTitle" name="sourceTitle" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="timestampSeconds">タイムスタンプ秒数</Label>
            <Input id="timestampSeconds" name="timestampSeconds" type="number" min="0" />
          </div>
        </section>

        <section className="form-grid">
          <div className="space-y-2">
            <Label htmlFor="performerIds">既存の活動者</Label>
            <PerformerPicker performers={performers} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="performerNames">活動者名を直接入力</Label>
            <Textarea
              id="performerNames"
              name="performerNames"
              placeholder="未登録の活動者や複数名を入力できます。改行・カンマ区切り対応。"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="songTitle">楽曲名</Label>
            <Input id="songTitle" name="songTitle" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="artistNames">原曲アーティスト名</Label>
            <Input id="artistNames" name="artistNames" required placeholder="複数はカンマ区切り" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="performedAt">歌唱日</Label>
            <Input id="performedAt" name="performedAt" type="date" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="coverType">歌唱種別</Label>
            <Select id="coverType" name="coverType" required defaultValue="COVER_VIDEO">
              {coverTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </section>

        <DuplicateCandidateChecker />

        <TurnstileCaptcha siteKey={getCaptchaSiteKey()} required={isCaptchaRequired()} />

        <Button type="submit">登録する</Button>
      </form>
    </div>
  );
}
