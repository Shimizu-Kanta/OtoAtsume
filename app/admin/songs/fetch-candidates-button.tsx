"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { runOriginalUrlCandidateBatchAction } from "./original-url-actions";

export function FetchCandidatesButton() {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="outline"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            setMessage(null);
            const result = await runOriginalUrlCandidateBatchAction();
            setMessage(
              `${result.processed}件処理しました（成功${result.succeeded}件・失敗${result.failed}件）`
            );
          })
        }
      >
        {isPending ? "取得中..." : "候補を取得する（次の30件）"}
      </Button>
      {message ? (
        <p className="rounded-md border border-secondary/40 bg-secondary/10 p-2 text-sm">{message}</p>
      ) : null}
    </div>
  );
}
