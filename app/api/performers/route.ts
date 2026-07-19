import { NextResponse } from "next/server";

import { getPerformers, type PerformerSort } from "@/lib/data/performers";
import { parsePageParam } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parsePageParam(searchParams.get("page") ?? undefined);
  const { items: performers, totalCount, totalPages } = await getPerformers(
    {
      query: searchParams.get("q") ?? undefined,
      tagIds: getSelectedTagIds(searchParams),
      sort: normalizePerformerSort(searchParams.get("sort"))
    },
    page
  );
  return NextResponse.json({ performers, totalCount, page, totalPages });
}

function normalizePerformerSort(value: string | null): PerformerSort {
  return value === "debutDateAsc" || value === "debutDateDesc" ? value : "nameAsc";
}

function getSelectedTagIds(searchParams: URLSearchParams) {
  return Array.from(
    new Set(
      searchParams
        .getAll("tags")
        .flatMap((value) => value.split(","))
        .map((value) => value.trim())
        .filter(Boolean)
    )
  );
}
