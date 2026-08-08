"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// 運営者自身の動作確認アクセスをアクセス数集計から除外するためのフラグ。
// 日本の家庭・モバイル回線はIPが動的でCGNATも多いため、IPベースの除外ではなく
// ブラウザ単位(localStorage)のフラグ方式を採用している。
// `/?internal=1` でON、`/?internal=0` でOFFにできる（本人のみが使う想定）。
const INTERNAL_FLAG_KEY = "oa_internal_viewer";

function syncInternalFlag() {
  if (typeof window === "undefined") {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  try {
    if (params.get("internal") === "1") {
      window.localStorage.setItem(INTERNAL_FLAG_KEY, "1");
    } else if (params.get("internal") === "0") {
      window.localStorage.removeItem(INTERNAL_FLAG_KEY);
    }
  } catch {
    // localStorage が使えない環境では除外フラグを扱わない。
  }
}

function shouldSkipTelemetry() {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem(INTERNAL_FLAG_KEY) === "1";
  } catch {
    return false;
  }
}

export function AccessLogger() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) {
      return;
    }

    syncInternalFlag();

    if (shouldSkipTelemetry()) {
      return;
    }

    const controller = new AbortController();

    fetch("/api/telemetry/access", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ path: pathname }),
      signal: controller.signal,
      keepalive: true
    }).catch(() => {
      // アクセスログの失敗はユーザー体験に影響させない
    });

    return () => {
      controller.abort();
    };
  }, [pathname]);

  return null;
}