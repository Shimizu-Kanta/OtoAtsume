import { NextResponse } from "next/server";

import { readJson, serverError, validationError } from "@/lib/api/response";
import {
  findPotentialDuplicateCoversForInput,
  findSameSingingCandidatesForInput
} from "@/lib/data/covers";
import { checkRouteRateLimit, rateLimitPresets } from "@/lib/rate-limit/http";
import { duplicateCandidateSchema } from "@/lib/validations/cover";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const limited = await checkRouteRateLimit(
      request,
      "api:covers:duplicate-candidates",
      rateLimitPresets.duplicateCheck
    );

    if (limited) {
      return limited;
    }

    const parsed = duplicateCandidateSchema.safeParse(await readJson(request));

    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const [covers, sameSinging] = await Promise.all([
      findPotentialDuplicateCoversForInput(parsed.data),
      // 同じ曲・活動者・歌唱日で sourceUrl だけが異なる記録（URL違いの二重登録の保険）
      findSameSingingCandidatesForInput({
        songTitle: parsed.data.songTitle,
        performerIds: parsed.data.performerIds,
        performerNames: parsed.data.performerNames ?? "",
        performedAt: parsed.data.performedAt,
        sourceUrl: parsed.data.sourceUrl
      })
    ]);

    // 厳密な重複（sourceUrl 一致）で既に出ているものは、緩い警告からは除く
    const strictIds = new Set(covers.map((cover) => cover.id));
    const sameSingingFiltered = sameSinging.filter((cover) => !strictIds.has(cover.id));

    return NextResponse.json({ covers, sameSinging: sameSingingFiltered });
  } catch (error) {
    return serverError(error, {
      type: "duplicate_check_error",
      path: "/api/covers/duplicate-candidates"
    });
  }
}
