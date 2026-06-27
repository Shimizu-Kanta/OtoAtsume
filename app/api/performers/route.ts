import { NextResponse } from "next/server";

import { getPerformers, type PerformerSort } from "@/lib/data/performers";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const performers = await getPerformers({
    query: searchParams.get("q") ?? undefined,
    tagNames: getSelectedTags(searchParams),
    sort: normalizePerformerSort(searchParams.get("sort"))
  });
  return NextResponse.json({ performers });
}

function normalizePerformerSort(value: string | null): PerformerSort {
  return value === "debutDateAsc" || value === "debutDateDesc" ? value : "nameAsc";
}

function getSelectedTags(searchParams: URLSearchParams) {
  return Array.from(
    new Set(
      [
        ...searchParams.getAll("tag"),
        ...searchParams.getAll("tags").flatMap((value) => value.split(","))
      ]
        .map((value) => value.trim())
        .filter(Boolean)
    )
  );
}
