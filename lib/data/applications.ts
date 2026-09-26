import { MasterDataStatus } from "@prisma/client";

import { db } from "@/lib/db";
import { escapeLikePattern } from "@/lib/utils";
import type { PerformerApplicationCreateInput } from "@/lib/validations/performer-application";

// 申請内容に起因する想定内のエラー。メッセージは利用者にそのまま表示してよい。
export class PerformerApplicationError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "PerformerApplicationError";
  }
}

export async function createPerformerApplication(input: PerformerApplicationCreateInput) {
  // 存在しないグループIDを指定されると FK エラー（500）になるため、事前に確認する。
  if (input.groupId) {
    const group = await db.group.findUnique({ where: { id: input.groupId }, select: { id: true } });

    if (!group) {
      throw new PerformerApplicationError("指定されたグループが見つかりません。", 400);
    }
  }

  const existing = await db.performer.findFirst({
    where: {
      name: {
        equals: escapeLikePattern(input.name),
        mode: "insensitive"
      }
    }
  });

  if (existing) {
    if (existing.status !== MasterDataStatus.PENDING) {
      throw new PerformerApplicationError("この活動者はすでに登録されています。", 409);
    }

    // 確認待ちの活動者への再申請では、未入力の項目だけを補う。
    // 既に入っている公式URL・グループを第三者の申請で上書きできないようにする。
    return db.performer.update({
      where: { id: existing.id },
      data: {
        ...(existing.groupId ? {} : { groupId: input.groupId }),
        ...(existing.officialUrl ? {} : { officialUrl: input.url })
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
