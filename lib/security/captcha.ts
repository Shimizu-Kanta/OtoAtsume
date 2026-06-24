export async function verifyCaptchaToken(token: string | null | undefined) {
  const secret = process.env.CAPTCHA_SECRET_KEY;

  if (!secret) {
    return { ok: true, skipped: true };
  }

  if (!token) {
    return { ok: false, skipped: false };
  }

  // Provider-specific verification is intentionally isolated here.
  // Wire Cloudflare Turnstile or Google reCAPTCHA by replacing this body.
  return { ok: true, skipped: false };
}
