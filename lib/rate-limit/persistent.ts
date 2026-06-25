import { db } from "@/lib/db";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt?: number;
};

export async function checkRateLimit(
  key: string,
  options: {
    limit: number;
    windowMs: number;
  }
): Promise<RateLimitResult> {
  const now = new Date();
  const nextResetAt = new Date(now.getTime() + options.windowMs);

  return db.$transaction(async (client) => {
    const bucket = await client.rateLimitBucket.findUnique({
      where: { key }
    });

    if (!bucket || bucket.resetAt <= now) {
      const saved = await client.rateLimitBucket.upsert({
        where: { key },
        create: {
          key,
          count: 1,
          resetAt: nextResetAt
        },
        update: {
          count: 1,
          resetAt: nextResetAt
        }
      });

      return {
        allowed: true,
        remaining: Math.max(0, options.limit - saved.count),
        resetAt: saved.resetAt.getTime()
      };
    }

    const updated = await client.rateLimitBucket.update({
      where: { key },
      data: {
        count: { increment: 1 }
      }
    });

    const allowed = updated.count <= options.limit;
    return {
      allowed,
      remaining: Math.max(0, options.limit - updated.count),
      resetAt: updated.resetAt.getTime()
    };
  });
}

export async function cleanupExpiredRateLimitBuckets(before = new Date()) {
  return db.rateLimitBucket.deleteMany({
    where: {
      resetAt: { lt: before }
    }
  });
}
