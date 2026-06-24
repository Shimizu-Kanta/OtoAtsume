import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

import { isAllowedAdminEmail } from "@/lib/auth/allowed";
import { authOptions } from "@/lib/auth/options";

export async function getAdminSession() {
  const session = await getServerSession(authOptions);

  if (!isAllowedAdminEmail(session?.user?.email)) {
    return null;
  }

  return session;
}

export async function requireAdminPage() {
  const session = await getAdminSession();

  if (!session) {
    redirect("/admin/login");
  }

  return session;
}

export async function requireAdminApi() {
  const session = await getAdminSession();

  if (!session) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "管理者認証が必要です。" }, { status: 401 })
    };
  }

  return { ok: true as const, session };
}
