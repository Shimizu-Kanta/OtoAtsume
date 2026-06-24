import { NextResponse } from "next/server";

import { readJson, serverError, validationError } from "@/lib/api/response";
import { createPerformerApplication } from "@/lib/data/applications";
import { checkRouteRateLimit, rateLimitPresets } from "@/lib/rate-limit/http";
import { performerApplicationCreateSchema } from "@/lib/validations/performer-application";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const limited = checkRouteRateLimit(
      request,
      "api:performer-applications:create",
      rateLimitPresets.performerApplicationCreate
    );

    if (limited) {
      return limited;
    }

    const body = await readJson(request);
    const parsed = performerApplicationCreateSchema.safeParse(body);

    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const application = await createPerformerApplication(parsed.data);
    return NextResponse.json({ application }, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}
