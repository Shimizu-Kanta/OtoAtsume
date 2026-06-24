import { MasterDataStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { readJson, validationError } from "@/lib/api/response";
import { requireAdminApi } from "@/lib/auth/admin";
import { createAdminPerformer, listAdminPerformers } from "@/lib/data/admin";
import { performerCreateSchema } from "@/lib/validations/master-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) {
    return auth.response;
  }

  const performers = await listAdminPerformers();
  return NextResponse.json({ performers });
}

export async function POST(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) {
    return auth.response;
  }

  const parsed = performerCreateSchema.safeParse(await readJson(request));

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const performer = await createAdminPerformer({
    ...parsed.data,
    status: parsed.data.status as MasterDataStatus
  });
  return NextResponse.json({ performer }, { status: 201 });
}
