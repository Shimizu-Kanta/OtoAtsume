import { ApplicationStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { readJson, validationError } from "@/lib/api/response";
import { requireAdminApi } from "@/lib/auth/admin";
import {
  getPerformerApplication,
  updatePerformerApplicationStatus
} from "@/lib/data/admin";
import { performerApplicationUpdateSchema } from "@/lib/validations/performer-application";

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
  const application = await getPerformerApplication(id);

  if (!application) {
    return NextResponse.json({ error: "活動者申請が見つかりません。" }, { status: 404 });
  }

  return NextResponse.json({ application });
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
  const parsed = performerApplicationUpdateSchema.safeParse(await readJson(request));

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const application = await updatePerformerApplicationStatus(
    id,
    parsed.data.status as ApplicationStatus
  );
  return NextResponse.json({ application });
}
