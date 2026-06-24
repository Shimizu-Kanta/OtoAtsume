import { NextResponse } from "next/server";

import { getPerformers } from "@/lib/data/performers";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const performers = await getPerformers(searchParams.get("q") ?? undefined);
  return NextResponse.json({ performers });
}
