import { AlertTriangle, ClipboardList, Info, LinkIcon, Music2, Send, Sparkles, Users } from "lucide-react";

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
        <div className="rounded-3xl border border-destructive/40 bg-destructive/10 p-4 text-sm font-medium text-destructive shadow-sm">
          <div className="flex gap-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p>{error}</p>
          </div>
        </div>
      ) : null}

      <div className="rounded-3xl border border-accent/40 bg-accent/10 p-5 text-sm shadow-sm">
        <div className="flex gap-3">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-card/80 text-accent-foreground">
            <Info className="size-4" aria-hidden="true" />
          </span>
          <div>
            <p className="font-semibold">登録前の確認</p>
            <p className="mt-1 leading-6 text-muted-foreground">
              メンバー限定配信、非公開コンテンツ、購入者以外に公開されていない有料配信内の情報など、権利者や配信者が公開していない情報の登録は避けてください。有料ライブであっても、公式サイト・公式SNS・ニュース記事などでセットリストが公開されている場合は登録できます。
            </p>
          </div>
        </div>
      </div>

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

        <FormSection
          icon={<Users className="size-4" aria-hidden="true" />}
          title="2. 活動者と楽曲"
          description="既存の活動者を選ぶか、未登録の活動者名を直接入力してください。複数人の歌唱にも対応しています。"
        >
          <div className="grid gap-4 lg:grid-cols-2">
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
              <Input id="songTitle" name="songTitle" required placeholder="楽曲名" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="artistNames">原曲アーティスト名</Label>
              <Input id="artistNames" name="artistNames" required placeholder="複数はカンマ区切り" />
            </div>
          </div>
        </FormSection>

        <FormSection
          icon={<Music2 className="size-4" aria-hidden="true" />}
          title="3. 歌唱情報"
          description="歌唱日、種別、動画タイトル、開始位置などを入力します。タイムスタンプは秒数で登録できます。"
        >
          <div className="grid gap-4 md:grid-cols-2">
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
            <div className="space-y-2">
              <Label htmlFor="sourceTitle">配信・動画・ライブ名</Label>
              <Input id="sourceTitle" name="sourceTitle" placeholder="任意" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timestampSeconds">タイムスタンプ秒数</Label>
              <Input id="timestampSeconds" name="timestampSeconds" type="number" min="0" placeholder="例: 1234" />
            </div>
          </div>
        </FormSection>

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

function FormSection({
  icon,
  title,
  description,
  children
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-primary/10 bg-card/90 p-5 shadow-sm">
      <div className="mb-5 flex gap-3 border-b pb-4">
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          {icon}
        </span>
        <div>
          <h2 className="text-lg font-bold tracking-tight">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
