"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Compass, ListChecks, Wand2, X } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type IntroVariant = "home" | "covers-new";

const STORAGE_VERSION = "v1";

function storageKeyFor(variant: IntroVariant) {
  return `oto-atsume:intro-seen:${variant}:${STORAGE_VERSION}`;
}

export function IntroModal({
  variant,
  forceOpen = false,
  onClose
}: {
  variant: IntroVariant;
  forceOpen?: boolean;
  onClose?: () => void;
}) {
  // forceOpen（ヘルプボタン起動）の場合は初回描画から開いた状態にする。
  // それ以外（ページ埋め込みの自動表示）は閉じた状態から始め、
  // マウント後に useEffect で localStorage を確認してから開く
  // （SSR と初期クライアント描画を一致させ、ハイドレーションずれを避けるため）。
  const [open, setOpen] = useState(forceOpen);
  // 現在の表示が「自動オープン」によるものかどうか。既読フラグの保存要否に使う。
  const autoOpenedRef = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(forceOpen);

  useEffect(() => {
    if (forceOpen) {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    try {
      if (!window.localStorage.getItem(storageKeyFor(variant))) {
        autoOpenedRef.current = true;
        setOpen(true);
      }
    } catch {
      // localStorage が使えない環境（プライベートモード等）では自動表示しない。
    }
    // マウント時に一度だけ確認する。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!open) {
      setVisible(false);
      return;
    }

    // フェードイン: 開いた直後の1フレーム後にクラスを付与して transition を発火させる。
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const panel = panelRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    function getFocusable(): HTMLElement[] {
      if (!panel) {
        return [];
      }
      return Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        )
      );
    }

    const focusables = getFocusable();
    (focusables[0] ?? panel)?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const items = getFocusable();
      if (items.length === 0) {
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
      previouslyFocused?.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function close() {
    setOpen(false);

    if (autoOpenedRef.current && !forceOpen) {
      try {
        window.localStorage.setItem(storageKeyFor(variant), "1");
      } catch {
        // 保存に失敗しても致命的ではないため無視する。
      }
    }

    autoOpenedRef.current = false;
    onClose?.();
  }

  if (!open) {
    return null;
  }

  const titleId = `intro-modal-title-${variant}`;

  return (
    <div
      className={cn(
        // "bg-ink/70" のようなスラッシュ不透明度指定は、--ink が hex 値の CSS 変数のため
        // Tailwind がアルファ合成できず透明になってしまう。ブラケット記法の hex 直書きなら
        // Tailwind がビルド時に色を解釈できるため、不透明度指定が正しく機能する。
        "fixed inset-0 z-[100] flex items-center justify-center bg-[#16212b]/70 p-4 transition-opacity duration-150",
        visible ? "opacity-100" : "opacity-0"
      )}
      onClick={close}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
        className={cn(
          "max-h-[85vh] w-full max-w-md overflow-y-auto rounded-[4px] border border-rule bg-panel p-6 shadow-none transition-[opacity,transform] duration-150",
          visible ? "translate-y-0 scale-100 opacity-100" : "translate-y-1 scale-95 opacity-0"
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-lg font-bold tracking-tight text-ink">
            {variant === "home" ? "おとあつめとは" : "歌唱記録の登録方法"}
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="閉じる"
            className="shrink-0 rounded-[3px] p-1 text-slate transition-colors hover:bg-[#FAFCFD] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4">{variant === "home" ? <HomeIntroBody /> : <CoversNewIntroBody />}</div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {variant === "home" ? (
            <>
              <Button variant="outline" onClick={close}>
                使ってみる
              </Button>
              <Link href="/covers" onClick={close} className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}>
                楽曲を探す
              </Link>
              <Link href="/covers/new" onClick={close} className={cn(buttonVariants(), "w-full sm:w-auto")}>
                登録してみる
              </Link>
            </>
          ) : (
            <Button variant="outline" onClick={close} className="sm:w-auto">
              閉じる
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function HomeIntroBody() {
  return (
    <div className="space-y-4 text-sm leading-6 text-slate">
      <div className="flex gap-3">
        <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-[3px] border border-rule bg-[color:var(--paper)] text-[color:var(--aqua-deep)]">
          <Compass className="size-4" aria-hidden="true" />
        </span>
        <p>
          <span className="font-semibold text-ink">歌唱記録を探す：</span>
          検索フォームや、活動者・楽曲それぞれのページから、歌ってみた・歌枠・ライブの歌唱記録を探せます。
        </p>
      </div>
      <div className="flex gap-3">
        <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-[3px] border border-rule bg-[color:var(--paper)] text-[color:var(--aqua-deep)]">
          <Wand2 className="size-4" aria-hidden="true" />
        </span>
        <p>
          <span className="font-semibold text-ink">歌唱記録を登録する：</span>
          ログイン不要で、誰でも記録を登録できます。下の「登録してみる」から始められます。
        </p>
      </div>
    </div>
  );
}

function CoversNewIntroBody() {
  return (
    <div className="space-y-4 text-sm leading-6 text-slate">
      <div className="flex gap-3">
        <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-[3px] border border-rule bg-[color:var(--paper)] text-[color:var(--aqua-deep)]">
          <Wand2 className="size-4" aria-hidden="true" />
        </span>
        <p>
          YouTubeのURLを入力すると、タイトルや投稿日などの情報を自動で取得できます。まずは「1. 情報元」にURLを入力してください。
        </p>
      </div>
      <div className="flex gap-3">
        <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-[3px] border border-rule bg-[color:var(--paper)] text-[color:var(--aqua-deep)]">
          <ListChecks className="size-4" aria-hidden="true" />
        </span>
        <div className="space-y-2">
          <p>手入力が必要なのは、活動者・楽曲名・原曲アーティスト・歌唱日・歌唱種別です。</p>
          <p>
            歌枠・ライブ・メドレーを選ぶと、1本のアーカイブから複数曲をまとめて登録できます（曲ごとにタイムスタンプを入力）。
          </p>
          <p>
            情報元URLに再生開始位置（<span className="font-mono text-xs">?t=…</span>）が含まれていても問題ありません。単曲の場合は「タイムスタンプ秒数」欄に個別に入力できます。
          </p>
        </div>
      </div>
      <p className="border-t border-rule pt-3 text-xs text-[color:var(--slate-light)]">
        入力後は重複候補チェック・CAPTCHAを経て送信します。送信後、内容は管理側で確認されたうえで公開されます。
      </p>
    </div>
  );
}
