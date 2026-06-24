import { NextResponse } from "next/server";

import { readJson, validationError } from "@/lib/api/response";
import { requireAdminApi } from "@/lib/auth/admin";
import { getCoverById, updateAdminCover, updateCover } from "@/lib/data/covers";
import { adminCoverEditSchema, coverUpdateSchema } from "@/lib/validations/cover";

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
  const cover = await getCoverById(id, true);

  if (!cover) {
    return NextResponse.json({ error: "カバー記録が見つかりません。" }, { status: 404 });
  }

  return NextResponse.json({ cover });
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
  const body = await readJson(request);
  const fullEdit = adminCoverEditSchema.safeParse(body);

  if (fullEdit.success) {
    const cover = await updateAdminCover(id, fullEdit.data);
    return NextResponse.json({ cover });
  }

  const parsed = coverUpdateSchema.safeParse(body);

  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return validationError(fullEdit.error);
  }

  const cover = await updateCover(id, parsed.data);
  return NextResponse.json({ cover });
}
