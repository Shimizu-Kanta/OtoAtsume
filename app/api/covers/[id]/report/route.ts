import { NextResponse } from "next/server";

import { readJson, serverError, validationError } from "@/lib/api/response";
import { createReport } from "@/lib/data/covers";
import { checkRouteRateLimit, rateLimitPresets } from "@/lib/rate-limit/http";
import { reportCreateSchema } from "@/lib/validations/report";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const limited = checkRouteRateLimit(request, "api:reports:create", rateLimitPresets.reportCreate);

    if (limited) {
      return limited;
    }

    const { id } = await context.params;
    const body = await readJson(request);
    const parsed = reportCreateSchema.safeParse(body);

    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const report = await createReport(id, parsed.data);
    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}
