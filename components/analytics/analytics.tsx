"use client";

import { useEffect, useState } from "react";
import { GoogleAnalytics } from "@next/third-parties/google";

import { GA_ALLOWED_HOSTNAME, GA_MEASUREMENT_ID } from "@/lib/analytics";
import { isInternalViewer, syncInternalFlag } from "@/lib/telemetry/internal-viewer";

// App Router のクライアント遷移は GA4 側の「ブラウザの履歴イベントに基づくページの変更」で
// page_view として計測されるため、ここでルート変更を監視して送信してはいけない（二重計測になる）。
export function Analytics() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (window.location.hostname !== GA_ALLOWED_HOSTNAME) {
      return;
    }

    syncInternalFlag();
    if (isInternalViewer()) {
      return;
    }

    setEnabled(true);
  }, []);

  if (!enabled) {
    return null;
  }

  return <GoogleAnalytics gaId={GA_MEASUREMENT_ID} />;
}
