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
const captchaLoadError = "CAPTCHA の読み込みに失敗しました。ページを再読み込みしてください。";
const captchaIncompleteMessage = "CAPTCHA を完了してから送信してください。";

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
  const [error, setError] = useState<string | null>(null);
  const normalizedSiteKey = siteKey?.trim() || undefined;

  useEffect(() => {
    if (!normalizedSiteKey || !containerRef.current) {
      setToken("");
      return;
    }

    let mounted = true;

    function removeWidget() {
      if (!widgetIdRef.current || !window.turnstile) {
        return;
      }

      try {
        window.turnstile.remove(widgetIdRef.current);
      } catch (removeError) {
        console.error("Turnstile remove failed", removeError);
      } finally {
        widgetIdRef.current = null;
      }
    }

    function renderWidget() {
      if (
        !mounted ||
        !normalizedSiteKey ||
        !containerRef.current ||
        !window.turnstile ||
        widgetIdRef.current
      ) {
        return;
      }

      try {
        setError(null);
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: normalizedSiteKey,
          callback: (value) => {
            setToken(value);
            setError(null);
          },
          "expired-callback": () => setToken(""),
          "error-callback": () => setToken("")
        });
      } catch (renderError) {
        console.error("Turnstile render failed", renderError);
        setToken("");
        setError(captchaLoadError);
      }
    }

    function handleScriptError() {
      if (!mounted) {
        return;
      }

      console.error("Turnstile script failed to load");
      setToken("");
      setError(captchaLoadError);
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

      script.addEventListener("error", handleScriptError);
      script.addEventListener("load", renderWidget);
      return () => {
        mounted = false;
        script.removeEventListener("error", handleScriptError);
        script.removeEventListener("load", renderWidget);
        removeWidget();
      };
    }

    return () => {
      mounted = false;
      removeWidget();
    };
  }, [normalizedSiteKey]);

  if (!normalizedSiteKey) {
    return (
      <>
        <input type="hidden" name="captchaToken" value="" />
        {required ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm">
            CAPTCHA が未設定のため、このフォームは送信できません。管理者に連絡してください。
          </div>
        ) : null}
      </>
    );
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name="captchaToken" value={token} readOnly />
      <div ref={containerRef} />
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : required && !token ? (
        <p className="text-sm text-muted-foreground">{captchaIncompleteMessage}</p>
      ) : null}
      <p className="text-xs text-muted-foreground">Cloudflare Turnstile で送信元を確認します。</p>
    </div>
  );
}
