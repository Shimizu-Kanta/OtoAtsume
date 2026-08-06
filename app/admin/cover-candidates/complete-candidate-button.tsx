"use client";

import { Button } from "@/components/ui/button";
import { completeCoverCandidateAction } from "./actions";

// Cover が0件のときだけ確認ダイアログを出して「登録完了にする」。
export function CompleteCandidateButton({
  candidateId,
  coverCount
}: {
  candidateId: string;
  coverCount: number;
}) {
  return (
    <form action={completeCoverCandidateAction.bind(null, candidateId)}>
      <Button
        type="submit"
        size="sm"
        variant="outline"
        onClick={(event) => {
          if (
            coverCount === 0 &&
            !window.confirm("この動画から歌唱記録が登録されていませんが、完了にしますか？")
          ) {
            event.preventDefault();
          }
        }}
      >
        登録完了にする
      </Button>
    </form>
  );
}
