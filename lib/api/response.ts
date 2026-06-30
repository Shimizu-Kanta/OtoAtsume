import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { errorMessage, logAppError } from "@/lib/data/app-error-log";

export async function readJson(request: Request) {
  try {
    return await request.json();
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
