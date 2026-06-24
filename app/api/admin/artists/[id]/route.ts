import { NextResponse } from "next/server";

import { readJson, validationError } from "@/lib/api/response";
import { requireAdminApi } from "@/lib/auth/admin";
import { updateAdminArtist } from "@/lib/data/admin";
import { artistCreateSchema } from "@/lib/validations/master-data";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminApi();
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  const parsed = artistCreateSchema.safeParse(await readJson(request));

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const artist = await updateAdminArtist(id, parsed.data.name);
  return NextResponse.json({ artist });
}
