import { z } from "zod";

import { optionalText } from "@/lib/validations/shared";

export const performerApplicationCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  url: z.string().trim().url().max(2000),
  groupId: optionalText(200),
  memo: optionalText(2000)
});

export const performerApplicationUpdateSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"])
});

export type PerformerApplicationCreateInput = z.infer<
  typeof performerApplicationCreateSchema
>;
