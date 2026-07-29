"use client";

import { useState, useTransition } from "react";

import { PerformerPicker } from "@/components/covers/performer-picker";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { CrawlResult } from "@/lib/crawl/cover-candidates";
import { runFullCrawlAction, runScopedCrawlAction } from "./actions";

type PerformerOption = { id: string; name: string; group: { name: string } | null };

function describeResult(result: CrawlResult) {
  const reason =
    result.stoppedReason === "pendingLimitReached"
      ? "（打ち切り理由: 未処理上限に到達）"
      : "";
  const dryRun = result.dryRun ? "【ドライラン】" : "";
  return `${dryRun}${result.performersProcessed}人巡回・${result.scanned}件走査、${result.created}件の候補を追加しました${reason}`;
}

export function CrawlControls({ performers }: { performers: PerformerOption[] }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [showScoped, setShowScoped] = useState(false);

  return (
    <div className="space-y-3 rounded-md border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              setMessage(null);
              setMessage(describeResult(await runFullCrawlAction()));
            })
          }
        >
          {isPending ? "巡回中..." : "全体巡回を実行"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setShowScoped((value) => !value)}>
          {showScoped ? "条件指定を閉じる" : "条件を指定して実行"}
        </Button>
      </div>

      {showScoped ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            startTransition(async () => {
              setMessage(null);
              setMessage(describeResult(await runScopedCrawlAction(formData)));
            });
          }}
          className="space-y-3 rounded-md border bg-background p-3"
        >
          <div className="space-y-2">
            <Label>巡回する活動者（未選択なら全活動者）</Label>
            <PerformerPicker performers={performers} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="publishedAfter">公開日の開始日（未指定なら前回巡回日以降）</Label>
            <input
              id="publishedAfter"
              name="publishedAfter"
              type="date"
              className="rounded-md border px-3 py-2 text-sm"
            />
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? "巡回中..." : "選択した条件で巡回"}
          </Button>
        </form>
      ) : null}

      {message ? (
        <p className="rounded-md border border-secondary/40 bg-secondary/10 p-2 text-sm">{message}</p>
      ) : null}
    </div>
  );
}
