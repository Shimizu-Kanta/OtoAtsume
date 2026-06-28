import { MasterDataStatus } from "@prisma/client";

import { db } from "@/lib/db";
import type { PerformerApplicationCreateInput } from "@/lib/validations/performer-application";

export async function createPerformerApplication(input: PerformerApplicationCreateInput) {
  const existing = await db.performer.findFirst({
    where: {
      name: {
        equals: input.name,
        mode: "insensitive"
      }
    }
  });

  if (existing) {
    if (existing.status !== MasterDataStatus.PENDING) {
      throw new Error("この活動者はすでに登録されています。");
    }

    return db.performer.update({
      where: { id: existing.id },
      data: {
        groupId: input.groupId,
        officialUrl: input.url,
        status: MasterDataStatus.PENDING
      }
    });
  }

  return db.performer.create({
    data: {
      name: input.name,
      groupId: input.groupId,
      officialUrl: input.url,
      status: MasterDataStatus.PENDING
    }
  });
}