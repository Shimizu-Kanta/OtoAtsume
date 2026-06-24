import { ApplicationStatus } from "@prisma/client";

import { db } from "@/lib/db";
import type { PerformerApplicationCreateInput } from "@/lib/validations/performer-application";

export async function createPerformerApplication(input: PerformerApplicationCreateInput) {
  return db.performerApplication.create({
    data: {
      name: input.name,
      url: input.url,
      groupId: input.groupId,
      memo: input.memo,
      status: ApplicationStatus.PENDING
    }
  });
}
