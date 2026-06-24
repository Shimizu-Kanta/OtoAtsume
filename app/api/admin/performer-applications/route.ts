import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/auth/admin";
import { listPerformerApplications } from "@/lib/data/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) {
    return auth.response;
  }

  const applications = await listPerformerApplications();
  return NextResponse.json({ applications });
}
