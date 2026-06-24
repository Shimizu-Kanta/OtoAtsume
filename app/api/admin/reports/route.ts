import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/auth/admin";
import { listReports } from "@/lib/data/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) {
    return auth.response;
  }

  const reports = await listReports();
  return NextResponse.json({ reports });
}
