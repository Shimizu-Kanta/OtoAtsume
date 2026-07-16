"use client";

import { useEffect, useState } from "react";
import { Check, Link as LinkIcon, Share2 } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ShareButton({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Copy to clipboard failed", error);
    }
  }

  async function handleNativeShare() {
    try {
      await navigator.share({ url, title });
    } catch {
      // ユーザーが共有をキャンセルした場合などは何もしない
    }
  }

  const xShareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
  const lineShareUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`;
  const buttonClass = cn(buttonVariants({ variant: "outline" }));

  return (
    <div className="contents">
      <button type="button" onClick={handleCopy} className={buttonClass}>
        {copied ? (
          <Check className="size-4" aria-hidden="true" />
        ) : (
          <LinkIcon className="size-4" aria-hidden="true" />
        )}
        {copied ? "コピーしました" : "URLをコピー"}
      </button>
      <a href={xShareUrl} target="_blank" rel="noreferrer" className={buttonClass}>
        Xでシェア
      </a>
      <a href={lineShareUrl} target="_blank" rel="noreferrer" className={buttonClass}>
        LINEでシェア
      </a>
      {canNativeShare ? (
        <button type="button" onClick={handleNativeShare} className={buttonClass}>
          <Share2 className="size-4" aria-hidden="true" />
          共有
        </button>
      ) : null}
    </div>
  );
}
