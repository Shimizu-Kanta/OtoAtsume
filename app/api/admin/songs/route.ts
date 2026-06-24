import { NextResponse } from "next/server";

import { readJson, validationError } from "@/lib/api/response";
import { requireAdminApi } from "@/lib/auth/admin";
import { createAdminSong, listAdminSongs } from "@/lib/data/admin";
import { songCreateSchema } from "@/lib/validations/master-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) {
    return auth.response;
  }

  const songs = await listAdminSongs();
  return NextResponse.json({ songs });
}

export async function POST(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) {
    return auth.response;
  }

  const parsed = songCreateSchema.safeParse(await readJson(request));

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const song = await createAdminSong(parsed.data);
  return NextResponse.json({ song }, { status: 201 });
}
