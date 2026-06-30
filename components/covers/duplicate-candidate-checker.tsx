"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

type Candidate = {
  id: string;
  performedAt: string;
  sourceUrl: string;
  song: {
    title: string;
  };
  performers: Array<{
    performer: {
      name: string;
    };
  }>;
};

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "empty" }
  | { status: "found"; candidates: Candidate[] }
  | { status: "error"; message: string };

type DuplicatePayload = {
  performerIds: string[];
  performerNames: FormDataEntryValue | null;
  songTitle: FormDataEntryValue | null;
  performedAt: FormDataEntryValue | null;
  sourceUrl: FormDataEntryValue | null;
  timestampSeconds: FormDataEntryValue | null;
};

type CheckDuplicateOptions = {
  silent?: boolean;
};

const DUPLICATE_CHECK_EVENT = "otoatsume:check-duplicates";

export function DuplicateCandidateChecker() {
  const [state, setState] = useState<State>({ status: "idle" });

  const checkDuplicates = useCallback(async (options: CheckDuplicateOptions = {}) => {
    const form = document.getElementById("cover-form");

    if (!(form instanceof HTMLFormElement)) {
      if (!options.silent) {
        setState({ status: "error", message: "フォームを確認できませんでした。" });
      }
      return;
    }

    const formData = new FormData(form);
    const payload: DuplicatePayload = {
      performerIds: formData.getAll("performerIds").map(String).filter(Boolean),
      performerNames: formData.get("performerNames"),
      songTitle: formData.get("songTitle"),
      performedAt: formData.get("performedAt"),
      sourceUrl: formData.get("sourceUrl"),
      timestampSeconds: formData.get("timestampSeconds")
    };

    if (!isDuplicatePayloadReady(payload)) {
      if (!options.silent) {
        setState({
          status: "error",
          message: "重複候補の確認に必要な項目を入力してください。"
        });
      }
      return;
    }

    setState({ status: "loading" });

    try {
      const response = await fetch("/api/covers/duplicate-candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        setState({
          status: "error",
          message: "重複候補の確認に必要な項目を入力してください。"
        });
        return;
      }

      const data = (await response.json()) as { covers: Candidate[] };

      setState(
        data.covers.length > 0
          ? { status: "found", candidates: data.covers }
          : { status: "empty" }
      );
    } catch (error) {
      console.error("Duplicate candidate check failed", error);
      setState({
        status: "error",
        message: "重複候補の確認に失敗しました。"
      });
    }
  }, []);

  useEffect(() => {
    function handleAutoCheck() {
      void checkDuplicates({ silent: true });
    }

    window.addEventListener(DUPLICATE_CHECK_EVENT, handleAutoCheck);

    return () => {
      window.removeEventListener(DUPLICATE_CHECK_EVENT, handleAutoCheck);
    };
  }, [checkDuplicates]);

  return (
    <div className="rounded-md border bg-background p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">重複候補チェック</p>
          <p className="mt-1 text-sm text-muted-foreground">
            登録前に、同じ情報元・楽曲・活動者・歌唱日の記録がないか確認できます。
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => void checkDuplicates()}
          disabled={state.status === "loading"}
        >
          <Search className="size-4" />
          {state.status === "loading" ? "確認中" : "確認する"}
        </Button>
      </div>

      {state.status === "empty" ? (
        <p className="mt-3 text-sm text-secondary">重複候補は見つかりませんでした。</p>
      ) : null}

      {state.status === "error" ? (
        <p className="mt-3 text-sm text-destructive">{state.message}</p>
      ) : null}

      {state.status === "found" ? (
        <div className="mt-4 rounded-md border border-accent/60 bg-accent/10 p-3">
          <div className="flex gap-2 text-sm font-medium">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            似た登録がすでに存在します。重複していないか確認してください。
          </div>
          <div className="mt-3 space-y-2">
            {state.candidates.map((candidate) => (
              <div key={candidate.id} className="text-sm">
                <Link href={`/covers/${candidate.id}`} className="text-primary underline">
                  {candidate.song.title}
                </Link>
                <span className="text-muted-foreground">
                  {" "}
                  / {candidate.performers.map(({ performer }) => performer.name).join(", ")} /{" "}
                  {formatDate(candidate.performedAt)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function formText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function isDuplicatePayloadReady(payload: DuplicatePayload) {
  const hasPerformer =
    payload.performerIds.length > 0 || formText(payload.performerNames).length > 0;

  return (
    hasPerformer &&
    formText(payload.songTitle).length > 0 &&
    formText(payload.performedAt).length > 0 &&
    formText(payload.sourceUrl).length > 0
  );
}