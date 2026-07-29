"use client";

import { useState, useTransition } from "react";

import { PerformerPicker } from "@/components/covers/performer-picker";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { CrawlResult } from "@/lib/crawl/cover-candidates";
import { runFullCrawlAction, runScopedCrawlAction } from "./actions";

type PerformerOption = { id: string; name: string; group: { name: string } | null };

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(value)
  );
}

function formatDateTime(value: Date | string) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function describeResult(result: CrawlResult): string {
  const lines: string[] = [];
  const dryRun = result.dryRun ? "【ドライラン】" : "";
  const period = result.effectivePeriod.from ? `（${formatDate(result.effectivePeriod.from)}以降）` : "";

  lines.push(`${dryRun}${result.performerCount}人巡回・${result.scanned}件走査${period}`);
  lines.push(
    `→ 候補追加 ${result.created}件 / 既知でスキップ ${result.skippedAlreadyKnown}件 / 歌唱動画と判定されず ${result.skippedNotSinging}件`
  );

  if (result.scanned > 0 && result.skippedNotSinging === result.scanned) {
    lines.push("キーワードにヒットする動画がありませんでした。巡回キーワードの設定を確認してください。");
  }

  if (result.scanned === 0 && result.performerCount > 0 && !result.effectivePeriod.from) {
    const dt = result.lastCrawledAt ? `（${formatDateTime(result.lastCrawledAt)}）` : "";
    lines.push(
      `前回巡回日${dt}以降に新しい動画はありませんでした。過去分を対象にする場合は公開日の開始日を指定してください。`
    );
  }

  if (result.stoppedReason === "pendingLimitReached") {
    lines.push("未処理候補が上限に達したため打ち切りました。確認・確定を進めてから再実行してください。");
  } else if (result.stoppedReason === "performerLimitReached") {
    lines.push("対象活動者が多いため一部のみ巡回しました。続けて実行すると残りを巡回します。");
  }

  return lines.join("\n");
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
        <p className="whitespace-pre-line rounded-md border border-secondary/40 bg-secondary/10 p-2 text-sm leading-6">
          {message}
        </p>
      ) : null}
    </div>
  );
}
