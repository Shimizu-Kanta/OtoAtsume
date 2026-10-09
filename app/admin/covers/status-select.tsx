"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

import { Select } from "@/components/ui/select";
import { contentStatusOptions } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { updateCoverStatusAction } from "./actions";

// 状態ごとの文字色。公開＝通常、確認待ち(保留)＝注意色、非表示・却下＝控えめ。
const statusTone: Record<string, string> = {
  APPROVED: "text-foreground",
  PENDING: "font-semibold text-amber-700",
  HIDDEN: "text-muted-foreground",
  REJECTED: "text-muted-foreground"
};

// 一覧の行で歌唱記録の状態をその場で変える。select を変えた時点で送信する。
export function CoverStatusSelect({ id, status, label }: { id: string; status: string; label: string }) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={updateCoverStatusAction} className="flex items-center gap-1.5">
      <input type="hidden" name="id" value={id} />
      <StatusSelectField status={status} label={label} onChange={() => formRef.current?.requestSubmit()} />
    </form>
  );
}

function StatusSelectField({
  status,
  label,
  onChange
}: {
  status: string;
  label: string;
  onChange: () => void;
}) {
  const { pending, data } = useFormStatus();
  // 送信中は送ったばかりの値で色を付ける(サーバーの再描画を待たずに見た目を合わせる)。
  const current = pending ? String(data?.get("status") ?? status) : status;

  return (
    <>
      <Select
        // 再検証後に新しい状態が届いたら、select の表示もそれに合わせ直す。
        key={status}
        name="status"
        defaultValue={status}
        disabled={pending}
        onChange={onChange}
        aria-label={`「${label}」の状態`}
        className={cn("h-8 w-[7.5rem] px-2 md:text-xs", statusTone[current])}
      >
        {contentStatusOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
      <span className="inline-flex size-4 items-center justify-center" aria-live="polite">
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden="true" />
            <span className="sr-only">保存中</span>
          </>
        ) : null}
      </span>
    </>
  );
}
