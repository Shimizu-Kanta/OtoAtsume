import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { errorMessage, logAppError } from "@/lib/data/app-error-log";

// 本文が JSON として壊れている場合や、null・数値などオブジェクト以外の場合は {} を返す
// （呼び出し側で body.url のようにプロパティを読んでも TypeError にならないようにする）。
export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await request.json();
    return typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function validationError(error: ZodError) {
  return NextResponse.json(
    {
      error: "入力内容を確認してください。",
      issues: error.flatten()
    },
    { status: 400 }
  );
}

export async function serverError(
  error: unknown,
  options: {
    type?: string;
    path?: string;
  } = {}
) {
  console.error(error);

  await logAppError({
    type: options.type ?? "server_error",
    message: errorMessage(error),
    path: options.path
  });

  return NextResponse.json({ error: "サーバーエラーが発生しました。" }, { status: 500 });
}
