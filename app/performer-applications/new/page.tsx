import { TurnstileCaptcha } from "@/components/captcha/turnstile";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { listGroups } from "@/lib/data/admin";
import { getCaptchaSiteKey, isCaptchaRequired } from "@/lib/security/captcha";
import { getSearchParam } from "@/lib/utils";
import { createPerformerApplicationAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function NewPerformerApplicationPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const error = getSearchParam(params, "error");
  const groups = await listGroups();

  return (
    <div className="space-y-6">
      <PageHeading
        title="活動者申請"
        description="一覧にない活動者を申請できます。承認後に活動者として登録されます。"
      />

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm">
          {error}
        </div>
      ) : null}

      <form action={createPerformerApplicationAction} className="space-y-4 rounded-md border bg-card p-5">
        <div className="space-y-2">
          <Label htmlFor="name">活動者名</Label>
          <Input id="name" name="name" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="url">活動場所URL</Label>
          <Input id="url" name="url" type="url" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="groupId">所属グループ</Label>
          <Select id="groupId" name="groupId" defaultValue="">
            <option value="">所属なし・不明</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="memo">補足メモ</Label>
          <Textarea id="memo" name="memo" />
        </div>
        <TurnstileCaptcha siteKey={getCaptchaSiteKey()} required={isCaptchaRequired()} />
        <Button type="submit">申請する</Button>
      </form>
    </div>
  );
}
