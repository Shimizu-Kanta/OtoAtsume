"use server";

import { ContentStatus, ReportStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { requireAdminPage } from "@/lib/auth/admin";
import { updateAdminCoverStatus, updateReportStatus } from "@/lib/data/admin";

export async function updateReportStatusAction(reportId: string, formData: FormData) {
  await requireAdminPage();
  const status = String(formData.get("status") ?? "") as ReportStatus;

  if (!Object.values(ReportStatus).includes(status)) {
    return;
  }

  await updateReportStatus(reportId, status);
  revalidatePath(`/admin/reports/${reportId}`);
  revalidatePath("/admin/reports");
}

export async function hideReportedCoverAction(reportId: string, coverId: string) {
  await requireAdminPage();
  await updateAdminCoverStatus(coverId, ContentStatus.HIDDEN);
  await updateReportStatus(reportId, ReportStatus.RESOLVED);
  revalidatePath(`/admin/reports/${reportId}`);
  revalidatePath("/admin/reports");
}
