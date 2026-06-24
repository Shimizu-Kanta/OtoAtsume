import { NextResponse } from "next/server";
import { ZodError } from "zod";

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

export function serverError(error: unknown) {
  console.error(error);
  return NextResponse.json({ error: "サーバーエラーが発生しました。" }, { status: 500 });
}
