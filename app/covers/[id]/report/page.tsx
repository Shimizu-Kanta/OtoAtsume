import { notFound } from "next/navigation";

import { TurnstileCaptcha } from "@/components/captcha/turnstile";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { reportReasonOptions } from "@/lib/constants";
import { getCoverById } from "@/lib/data/covers";
import { getCaptchaSiteKey, isCaptchaRequired } from "@/lib/security/captcha";
import { getSearchParam } from "@/lib/utils";
import { createReportAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function ReportPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const cover = await getCoverById(id);

  if (!cover) {
    notFound();
  }

  const error = getSearchParam(query, "error");
  const action = createReportAction.bind(null, cover.id);

  return (
    <div className="space-y-6">
      <PageHeading title="カバー記録を通報" description={`${cover.song.title} の記録について`} />

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm">
          {error}
        </div>
      ) : null}

      <form action={action} className="space-y-4 rounded-md border bg-card p-5">
        <div className="space-y-2">
          <Label htmlFor="reason">通報理由</Label>
          <Select id="reason" name="reason" required>
            {reportReasonOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="memo">詳細メモ</Label>
          <Textarea id="memo" name="memo" />
        </div>
        <TurnstileCaptcha siteKey={getCaptchaSiteKey()} required={isCaptchaRequired()} />
        <Button type="submit">通報する</Button>
      </form>
    </div>
  );
}
