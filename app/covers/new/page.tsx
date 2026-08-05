import { ClipboardList, LinkIcon, Send } from "lucide-react";

import { TurnstileCaptcha } from "@/components/captcha/turnstile";
import { DuplicateCandidateChecker } from "@/components/covers/duplicate-candidate-checker";
import { FormSection } from "@/components/covers/form-section";
import { PublicCoverFields } from "@/components/covers/public-cover-fields";
import { YouTubeMetadataFetcher } from "@/components/covers/youtube-metadata-fetcher";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { ErrorBanner, InfoNote } from "@/components/ui/notice";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { coverTypeOptions } from "@/lib/constants";
import { getPerformerOptions } from "@/lib/data/performers";
import { getCaptchaSiteKey, isCaptchaRequired } from "@/lib/security/captcha";
import { getSearchParam, getSearchParamAll } from "@/lib/utils";
import { createCoverAction } from "./actions";

export const dynamic = "force-dynamic";

function normalizeCoverType(value: string | undefined) {
  return coverTypeOptions.some((option) => option.value === value) ? value : undefined;
}

export default async function NewCoverPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const error = getSearchParam(params, "error");
  const initialSourceUrl = getSearchParam(params, "sourceUrl");
  const autoFetchMetadata = Boolean(initialSourceUrl && getSearchParam(params, "autoFetch") === "1");
  // 連続登録（同じ動画から続けて登録）での引き継ぎ値
  const initialSourceTitle = getSearchParam(params, "sourceTitle");
  const initialPerformedAt = getSearchParam(params, "performedAt");
  const initialCoverType = normalizeCoverType(getSearchParam(params, "coverType"));
  const initialPerformerIds = getSearchParamAll(params, "performerIds");
  const performers = await getPerformerOptions();

  return (
    <div className="space-y-6">
      <PageHeading
        title="カバー記録登録"
        description="ログインなしで登録できます。投稿者名や投稿履歴は記録・表示しません。"
      />

      {error ? <ErrorBanner>{error}</ErrorBanner> : null}

      <InfoNote>
        <p className="font-semibold text-ink">登録前の確認</p>
        <p className="mt-1 leading-6">
          メンバー限定配信、非公開コンテンツ、購入者以外に公開されていない有料配信内の情報など、権利者や配信者が公開していない情報の登録は避けてください。有料ライブであっても、公式サイト・公式SNS・ニュース記事などでセットリストが公開されている場合は登録できます。
        </p>
      </InfoNote>

      <form id="cover-form" action={createCoverAction} className="space-y-6">
        <FormSection
          icon={<LinkIcon className="size-4" aria-hidden="true" />}
          title="1. 情報元"
          description="動画・配信・ライブなど、歌唱記録の根拠になるURLを入力します。YouTube URLの場合は補助機能で一部項目を自動入力できます。"
        >
          <div className="space-y-2">
            <Label htmlFor="sourceUrl">情報元URL</Label>
            <Input
              id="sourceUrl"
              name="sourceUrl"
              type="url"
              required
              defaultValue={initialSourceUrl ?? ""}
              placeholder="https://www.youtube.com/watch?v=..."
            />
            <Input id="sourceImageUrl" name="sourceImageUrl" type="hidden" />
          </div>
          <YouTubeMetadataFetcher autoFetch={autoFetchMetadata} />
        </FormSection>

        <PublicCoverFields
          performers={performers}
          initial={{
            coverType: initialCoverType ?? "COVER_VIDEO",
            performerIds: initialPerformerIds,
            songTitle: "",
            artistNames: "",
            performedAt: initialPerformedAt ?? "",
            sourceTitle: initialSourceTitle ?? ""
          }}
        />

        <FormSection
          icon={<ClipboardList className="size-4" aria-hidden="true" />}
          title="4. 登録前の確認"
          description="重複候補を確認し、必要に応じてCAPTCHAを完了してから登録してください。"
        >
          <DuplicateCandidateChecker />
          <TurnstileCaptcha siteKey={getCaptchaSiteKey()} required={isCaptchaRequired()} />
          <div className="flex flex-col gap-3 rounded-3xl border border-primary/10 bg-primary/10 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">内容を確認して登録</p>
              <p className="mt-1 text-sm text-muted-foreground">
                登録後、公開前に管理側で内容を確認します。
              </p>
            </div>
            <Button type="submit" size="lg" className="w-full sm:w-auto">
              <Send className="size-4" aria-hidden="true" />
              登録する
            </Button>
          </div>
        </FormSection>
      </form>
    </div>
  );
}
