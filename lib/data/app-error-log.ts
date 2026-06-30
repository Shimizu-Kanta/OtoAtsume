import { db } from "@/lib/db";

type AppErrorLogInput = {
  type: string;
  message?: string;
  path?: string;
};

export async function logAppError(input: AppErrorLogInput) {
  try {
    await db.appErrorLog.create({
      data: {
        type: input.type.slice(0, 100),
        message: input.message?.slice(0, 1000),
        path: input.path?.slice(0, 300)
      }
    });
  } catch (error) {
    console.error("Failed to save app error log", error);
  }
}

export function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Unknown error";
}