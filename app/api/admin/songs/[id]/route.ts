import { NextResponse } from "next/server";
import { z } from "zod";

import { readJson, validationError } from "@/lib/api/response";
import { requireAdminApi } from "@/lib/auth/admin";
import { updateAdminSong } from "@/lib/data/admin";
import { optionalText } from "@/lib/validations/shared";

const songPatchSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  originalUrl: optionalText(2000)
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminApi();
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  const parsed = songPatchSchema.safeParse(await readJson(request));

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const song = await updateAdminSong(id, parsed.data);
  return NextResponse.json({ song });
}
