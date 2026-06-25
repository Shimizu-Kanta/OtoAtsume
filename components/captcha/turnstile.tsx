"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback": () => void;
          "error-callback": () => void;
        }
      ) => string;
      remove: (widgetId: string) => void;
    };
  }
}

const scriptId = "cloudflare-turnstile-script";

export function TurnstileCaptcha({
  siteKey,
  required
}: {
  siteKey?: string;
  required: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [token, setToken] = useState("");

  useEffect(() => {
    if (!siteKey || !containerRef.current) {
      return;
    }

    let mounted = true;

    function renderWidget() {
      if (!mounted || !siteKey || !containerRef.current || !window.turnstile || widgetIdRef.current) {
        return;
      }

      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: (value) => setToken(value),
        "expired-callback": () => setToken(""),
        "error-callback": () => setToken("")
      });
    }

    if (window.turnstile) {
      renderWidget();
    } else {
      const existing = document.getElementById(scriptId) as HTMLScriptElement | null;
      const script = existing ?? document.createElement("script");

      if (!existing) {
        script.id = scriptId;
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);
      }

      script.addEventListener("load", renderWidget);
      return () => {
        mounted = false;
        script.removeEventListener("load", renderWidget);
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        }
      };
    }

    return () => {
      mounted = false;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey]);

  if (!siteKey) {
    return required ? (
      <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm">
        CAPTCHA が未設定のため、このフォームは送信できません。管理者に連絡してください。
        <input type="hidden" name="captchaToken" value="" />
      </div>
    ) : null;
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name="captchaToken" value={token} readOnly />
      <div ref={containerRef} />
      <p className="text-xs text-muted-foreground">Cloudflare Turnstile で送信元を確認します。</p>
    </div>
  );
}
