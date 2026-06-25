type CaptchaVerifyResult = {
  ok: boolean;
  skipped: boolean;
  message?: string;
};

const turnstileVerifyUrl = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function getCaptchaSiteKey() {
  return process.env.NEXT_PUBLIC_CAPTCHA_SITE_KEY;
}

export function isCaptchaRequired() {
  return process.env.NODE_ENV === "production";
}

export async function verifyCaptchaToken(
  token: string | null | undefined,
  remoteIp?: string | null
): Promise<CaptchaVerifyResult> {
  const secret = process.env.CAPTCHA_SECRET_KEY;

  if (!secret) {
    if (isCaptchaRequired()) {
      return {
        ok: false,
        skipped: false,
        message: "CAPTCHA設定が未完了です。管理者に連絡してください。"
      };
    }

    return { ok: true, skipped: true };
  }

  if (!token) {
    return {
      ok: false,
      skipped: false,
      message: "CAPTCHA認証を完了してください。"
    };
  }

  const body = new URLSearchParams({
    secret,
    response: token
  });

  if (remoteIp) {
    body.set("remoteip", remoteIp);
  }

  try {
    const response = await fetch(turnstileVerifyUrl, {
      method: "POST",
      body,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      }
    });

    if (!response.ok) {
      return {
        ok: false,
        skipped: false,
        message: "CAPTCHA認証に失敗しました。時間をおいて再試行してください。"
      };
    }

    const result = (await response.json()) as { success?: boolean };
    return result.success
      ? { ok: true, skipped: false }
      : {
          ok: false,
          skipped: false,
          message: "CAPTCHA認証に失敗しました。もう一度お試しください。"
        };
  } catch {
    return {
      ok: false,
      skipped: false,
      message: "CAPTCHA認証サービスに接続できませんでした。時間をおいて再試行してください。"
    };
  }
}

export function captchaTokenFromBody(body: unknown) {
  if (typeof body !== "object" || body === null || !("captchaToken" in body)) {
    return undefined;
  }

  const token = (body as { captchaToken?: unknown }).captchaToken;
  return typeof token === "string" ? token : undefined;
}
