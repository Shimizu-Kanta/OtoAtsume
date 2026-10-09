import type { Metadata } from "next";

import { LoginButtons } from "@/components/admin/login-buttons";
import { getAllowedAdminEmails } from "@/lib/auth/allowed";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ログイン"
};

export default function AdminLoginPage() {
  const configured = getAllowedAdminEmails().length > 0;
  const googleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  const devLoginEnabled = process.env.NODE_ENV === "development" && configured;

  return (
    <div className="rounded-lg border bg-card p-6 sm:p-8">
      <div className="mb-6 text-center">
        <p className="inline-flex items-center gap-2 font-heading text-xl font-bold tracking-wide">
          おとあつめ
          <span className="rounded bg-[#111827] px-1.5 py-0.5 font-mono text-[10px] font-semibold leading-none tracking-[0.12em] text-white">
            ADMIN
          </span>
        </p>
        <h1 className="mt-3 font-sans text-base font-bold">管理者ログイン</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          許可されたメールアドレスの Google アカウントでのみログインできます。
        </p>
      </div>

      {!configured ? (
        <div className="mb-4 rounded-md border border-accent/50 bg-accent/10 p-4 text-sm">
          `ADMIN_ALLOWED_EMAILS` が未設定です。.env に管理者メールアドレスをカンマ区切りで設定してください。
        </div>
      ) : null}

      <LoginButtons googleConfigured={googleConfigured} devLoginEnabled={devLoginEnabled} />
    </div>
  );
}
