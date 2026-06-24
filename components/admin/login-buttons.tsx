"use client";

import { signIn } from "next-auth/react";
import { LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";

export function LoginButtons({
  googleConfigured,
  devLoginEnabled
}: {
  googleConfigured: boolean;
  devLoginEnabled: boolean;
}) {
  return (
    <div className="space-y-3">
      {googleConfigured ? (
        <Button className="w-full" onClick={() => signIn("google", { callbackUrl: "/admin" })}>
          <LogIn className="size-4" />
          Googleでログイン
        </Button>
      ) : (
        <div className="rounded-md border border-accent/50 bg-accent/10 p-4 text-sm">
          Google OAuth が未設定です。`GOOGLE_CLIENT_ID` と `GOOGLE_CLIENT_SECRET` を設定すると Google ログインを使えます。
        </div>
      )}

      {devLoginEnabled ? (
        <Button
          className="w-full"
          variant="outline"
          onClick={() => signIn("dev-admin", { callbackUrl: "/admin" })}
        >
          <LogIn className="size-4" />
          開発用ログイン
        </Button>
      ) : null}
    </div>
  );
}
