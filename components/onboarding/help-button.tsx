"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { CircleHelp } from "lucide-react";

import { IntroModal, type IntroVariant } from "@/components/onboarding/intro-modal";

// 現在地から、ヘルプボタン起動時に見せるべき案内の variant を決める。
// home / covers/new 以外のページでは、汎用フォールバックとして home 用の概要を表示する。
function resolveVariant(pathname: string | null): IntroVariant {
  if (pathname === "/covers/new") {
    return "covers-new";
  }
  return "home";
}

// 全ページ共通のヘルプ起動ボタン。押すたびに、既読状態に関わらず案内を開く。
// （ページ埋め込みの自動表示用 IntroModal とは別インスタンス。クリックされるまでは
// マウントすらしないため、他ページで自動オープンと競合したり誤発火したりしない。）
export function HelpButton() {
  const pathname = usePathname();
  const variant = resolveVariant(pathname);
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="使い方を見る"
        title="使い方を見る"
        className="fixed bottom-4 right-4 z-40 inline-flex size-11 items-center justify-center rounded-full border border-rule bg-ink text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:bottom-6 sm:right-6"
      >
        <CircleHelp className="size-5" aria-hidden="true" />
      </button>

      {open ? <IntroModal variant={variant} forceOpen onClose={() => setOpen(false)} /> : null}
    </>
  );
}
