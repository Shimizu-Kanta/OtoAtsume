import { NextResponse } from "next/server";

import { readJson, serverError, validationError } from "@/lib/api/response";
import { findPotentialDuplicateCoversForInput } from "@/lib/data/covers";
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

    const covers = await findPotentialDuplicateCoversForInput(parsed.data);
    return NextResponse.json({ covers });
  } catch (error) {
    return serverError(error);
  }
}
