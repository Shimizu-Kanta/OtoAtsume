"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { isAdEnabledPath } from "@/lib/ads/placement";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

// NEXT_PUBLIC_ 変数はビルド時にインライン化されるため、
// 本番Dockerビルドでは build-arg で渡す必要がある（Dockerfile / cloud-run.yml 参照）。
const adsenseClientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
const isProduction = process.env.NODE_ENV === "production";

export function AdUnit({
  adSlot,
  adFormat = "auto",
  className,
  // 呼び出し側から明示的に無効化するためのフラグ（false の場合は必ず null を返す）。
  enabled = true,
  // 検索結果0件などコンテンツが乏しい場合は false を渡す。
  hasResults = true
}: {
  adSlot: string;
  adFormat?: string;
  className?: string;
  enabled?: boolean;
  hasResults?: boolean;
}) {
  const pathname = usePathname();
  const allowed =
    enabled && Boolean(adsenseClientId) && isAdEnabledPath(pathname, hasResults);

  // App Router の SPA 遷移では <ins> を置いただけでは 2 ページ目以降に
  // 広告が表示されないため、パスが変わるたびに再初期化する。
  useEffect(() => {
    if (!allowed || !isProduction) {
      return;
    }

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (error) {
      console.error("AdSense initialization failed", error);
    }
  }, [allowed, pathname]);

  if (!allowed) {
    return null;
  }

  if (!isProduction) {
    return (
      <div
        key={pathname}
        className={cn(
          "flex min-h-[280px] items-center justify-center rounded-3xl border border-dashed bg-muted/30 text-sm text-muted-foreground",
          className
        )}
      >
        広告枠（開発環境プレースホルダ / slot: {adSlot}）
      </div>
    );
  }

  return (
    <div key={pathname} className={cn("min-h-[280px]", className)}>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={adsenseClientId}
        data-ad-slot={adSlot}
        data-ad-format={adFormat}
        data-full-width-responsive="true"
      />
    </div>
  );
}
