import { MasterDataStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { readJson, validationError } from "@/lib/api/response";
import { requireAdminApi } from "@/lib/auth/admin";
import { updateAdminPerformer } from "@/lib/data/admin";
import { optionalText } from "@/lib/validations/shared";

const performerPatchSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  groupId: optionalText(200),
  youtubeUrl: optionalText(2000),
  officialUrl: optionalText(2000),
  status: z.enum(["PENDING", "APPROVED", "HIDDEN"]).optional()
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
  const parsed = performerPatchSchema.safeParse(await readJson(request));

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const performer = await updateAdminPerformer(id, {
    ...parsed.data,
    groupId: parsed.data.groupId ?? null,
    youtubeUrl: parsed.data.youtubeUrl ?? null,
    officialUrl: parsed.data.officialUrl ?? null,
    status: parsed.data.status as MasterDataStatus | undefined
  });
  return NextResponse.json({ performer });
}
