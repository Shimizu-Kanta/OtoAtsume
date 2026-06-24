import { ReportStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { readJson, validationError } from "@/lib/api/response";
import { requireAdminApi } from "@/lib/auth/admin";
import { getReport, updateReportStatus } from "@/lib/data/admin";
import { reportUpdateSchema } from "@/lib/validations/report";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminApi();
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  const report = await getReport(id);

  if (!report) {
    return NextResponse.json({ error: "通報が見つかりません。" }, { status: 404 });
  }

  return NextResponse.json({ report });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminApi();
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  const parsed = reportUpdateSchema.safeParse(await readJson(request));

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const report = await updateReportStatus(id, parsed.data.status as ReportStatus);
  return NextResponse.json({ report });
}
