import { z } from "zod";

import { reportReasonOptions } from "@/lib/constants";
import { optionalText } from "@/lib/validations/shared";

const reportReasonValues = reportReasonOptions.map((option) => option.value) as [
  string,
  ...string[]
];

export const reportCreateSchema = z.object({
  reason: z.enum(reportReasonValues),
  memo: optionalText(2000)
});

export const reportUpdateSchema = z.object({
  status: z.enum(["PENDING", "RESOLVED", "REJECTED"])
});

export type ReportCreateInput = z.infer<typeof reportCreateSchema>;
