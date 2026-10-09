"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ExternalLink } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";

const LEAVE_CONFIRM_MESSAGE = "保存していない変更があります。移動しますか？";

// 編集画面の下に固定する保存バー。保存ボタンは form 属性で対象フォームを送信するので、
// バーがフォームの外にあってもよい。⌘S / Ctrl+S でも保存でき、未保存のまま離れようとすると警告する。
export function FormActionBar({
  formId,
  backHref,
  publicHref,
  submitLabel = "保存する",
  pending = false
}: {
  formId: string;
  backHref: string;
  publicHref?: string;
  submitLabel?: string;
  pending?: boolean;
}) {
  const dirty = useFormDirty(formId);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // IME の変換確定中は何もしない(日本語入力の誤送信を防ぐ)。
      if (event.isComposing || event.keyCode === 229) {
        return;
      }

      if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === "s") {
        event.preventDefault();
        const form = document.getElementById(formId);
        if (form instanceof HTMLFormElement) {
          form.requestSubmit();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [formId]);

  return (
    <div className="sticky bottom-0 z-20 mt-6 rounded-t-md border border-b-0 bg-card/95 px-4 py-3 backdrop-blur">
      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-auto min-h-5 text-xs text-muted-foreground" aria-live="polite">
          {dirty ? "● 未保存の変更があります" : null}
        </p>
        <Link
          href={backHref}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
          onClick={(event) => {
            if (dirty && !window.confirm(LEAVE_CONFIRM_MESSAGE)) {
              event.preventDefault();
            }
          }}
        >
          一覧に戻る
        </Link>
        {publicHref ? (
          <a
            href={publicHref}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            公開ページで確認
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </a>
        ) : null}
        <Button type="submit" form={formId} size="sm" disabled={pending} title="⌘S / Ctrl+S">
          {pending ? "保存中…" : submitLabel}
        </Button>
      </div>
    </div>
  );
}

// フォームの内容が読み込み時(または最後の送信時)から変わったかどうか。
// 入力欄の input/change に加えて、ボタン操作で hidden の値が変わるフォーム(特集の曲順など)にも
// 対応するため、フォームの値を丸ごと文字列にして比べている。
function useFormDirty(formId: string) {
  const [dirty, setDirty] = useState(false);
  const baselineRef = useRef<string | null>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const serialize = useCallback(() => {
    const form = document.getElementById(formId);
    if (!(form instanceof HTMLFormElement)) {
      return null;
    }

    const entries: string[] = [];
    new FormData(form).forEach((value, key) => {
      entries.push(`${key}=${typeof value === "string" ? value : value.name}`);
    });
    return entries.join("\u0000");
  }, [formId]);

  // 表示時と、保存後のリダイレクト(?updated=1 など)で戻ってきたときに基準を取り直す。
  useEffect(() => {
    const timer = window.setTimeout(() => {
      baselineRef.current = serialize();
      setDirty(false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [serialize, pathname, searchParams]);

  useEffect(() => {
    const form = document.getElementById(formId);
    if (!(form instanceof HTMLFormElement)) {
      return;
    }

    let timer: number | undefined;
    const check = () => {
      window.clearTimeout(timer);
      // React の状態更新が DOM に反映されてから比べる。
      timer = window.setTimeout(() => {
        const current = serialize();
        setDirty(baselineRef.current !== null && current !== baselineRef.current);
      }, 0);
    };
    const handleSubmit = () => {
      window.clearTimeout(timer);
      baselineRef.current = serialize();
      setDirty(false);
    };

    form.addEventListener("input", check);
    form.addEventListener("change", check);
    form.addEventListener("click", check);
    form.addEventListener("submit", handleSubmit);
    return () => {
      window.clearTimeout(timer);
      form.removeEventListener("input", check);
      form.removeEventListener("change", check);
      form.removeEventListener("click", check);
      form.removeEventListener("submit", handleSubmit);
    };
  }, [formId, serialize]);

  useEffect(() => {
    if (!dirty) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  return dirty;
}
