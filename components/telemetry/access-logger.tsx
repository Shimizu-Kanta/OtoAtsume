"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { isInternalViewer, syncInternalFlag } from "@/lib/telemetry/internal-viewer";

export function AccessLogger() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) {
      return;
    }

    syncInternalFlag();

    if (isInternalViewer()) {
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