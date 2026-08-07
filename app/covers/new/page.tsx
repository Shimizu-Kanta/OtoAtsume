import { CoverRegistrationForm } from "@/components/covers/cover-registration-form";
import { IntroModal } from "@/components/onboarding/intro-modal";
import { PageHeading } from "@/components/page-heading";
import { InfoNote } from "@/components/ui/notice";
import { getPerformerOptions } from "@/lib/data/performers";
import { getCaptchaSiteKey, isCaptchaRequired } from "@/lib/security/captcha";
import { getSearchParam, getSearchParamAll } from "@/lib/utils";
import { createCoverAction } from "./actions";

export const dynamic = "force-dynamic";

const MAX_PUBLIC_ROWS = 20;

export default async function NewCoverPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const initialSourceUrl = getSearchParam(params, "sourceUrl") ?? "";
  const autoFetchMetadata = Boolean(initialSourceUrl && getSearchParam(params, "autoFetch") === "1");
  // 連続登録（同じ動画から続けて登録）での引き継ぎ値
  const initialSourceTitle = getSearchParam(params, "sourceTitle") ?? "";
  const initialPerformedAt = getSearchParam(params, "performedAt") ?? "";
  const initialCoverType = getSearchParam(params, "coverType");
  const initialPerformerIds = getSearchParamAll(params, "performerIds");
  const performers = await getPerformerOptions();

  return (
    <div className="space-y-6">
      <IntroModal variant="covers-new" />
      <PageHeading
        title="歌唱記録登録"
        description="ログインなしで登録できます。投稿者名や投稿履歴は記録・表示しません。"
      />

      <InfoNote>
        <p className="font-semibold text-ink">登録前の確認</p>
        <p className="mt-1 leading-6">
          メンバー限定配信、非公開コンテンツ、購入者以外に公開されていない有料配信内の情報など、権利者や配信者が公開していない情報の登録は避けてください。有料ライブであっても、公式サイト・公式SNS・ニュース記事などでセットリストが公開されている場合は登録できます。
        </p>
      </InfoNote>

      <CoverRegistrationForm
        mode="public"
        performers={performers}
        initial={{
          sourceUrl: initialSourceUrl,
          sourceTitle: initialSourceTitle,
          performedAt: initialPerformedAt,
          coverType: initialCoverType ?? "COVER_VIDEO",
          performerIds: initialPerformerIds
        }}
        autoFetchMetadata={autoFetchMetadata}
        maxRows={MAX_PUBLIC_ROWS}
        showCaptcha
        captchaSiteKey={getCaptchaSiteKey()}
        captchaRequired={isCaptchaRequired()}
        action={createCoverAction}
      />
    </div>
  );
}
