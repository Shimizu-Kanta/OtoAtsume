import { NextResponse } from "next/server";

import { readJson, validationError } from "@/lib/api/response";
import { requireAdminApi } from "@/lib/auth/admin";
import { createAdminArtist, listAdminArtists } from "@/lib/data/admin";
import { artistCreateSchema } from "@/lib/validations/master-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) {
    return auth.response;
  }

  const artists = await listAdminArtists();
  return NextResponse.json({ artists });
}

export async function POST(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) {
    return auth.response;
  }

  const parsed = artistCreateSchema.safeParse(await readJson(request));

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const artist = await createAdminArtist(parsed.data.name);
  return NextResponse.json({ artist }, { status: 201 });
}
