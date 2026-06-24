import { LoginButtons } from "@/components/admin/login-buttons";
import { PageHeading } from "@/components/page-heading";
import { getAllowedAdminEmails } from "@/lib/auth/allowed";

export default function AdminLoginPage() {
  const configured = getAllowedAdminEmails().length > 0;
  const googleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  const devLoginEnabled = process.env.NODE_ENV === "development" && configured;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeading
        title="管理者ログイン"
        description="管理画面は許可されたメールアドレスの Google アカウントのみアクセスできます。"
      />

      {!configured ? (
        <div className="rounded-md border border-accent/50 bg-accent/10 p-4 text-sm">
          `ADMIN_ALLOWED_EMAILS` が未設定です。.env に管理者メールアドレスをカンマ区切りで設定してください。
        </div>
      ) : null}

      <div className="rounded-md border bg-card p-5">
        <LoginButtons googleConfigured={googleConfigured} devLoginEnabled={devLoginEnabled} />
      </div>
    </div>
  );
}
