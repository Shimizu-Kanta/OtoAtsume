"use server";

import { ApplicationStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { requireAdminPage } from "@/lib/auth/admin";
import {
  approvePerformerApplication,
  updatePerformerApplicationStatus
} from "@/lib/data/admin";

export async function approveApplicationAction(applicationId: string) {
  await requireAdminPage();
  await approvePerformerApplication(applicationId);
  revalidatePath(`/admin/performer-applications/${applicationId}`);
  revalidatePath("/admin/performer-applications");
}

export async function updateApplicationStatusAction(applicationId: string, formData: FormData) {
  await requireAdminPage();
  const status = String(formData.get("status") ?? "") as ApplicationStatus;

  if (!Object.values(ApplicationStatus).includes(status)) {
    return;
  }

  await updatePerformerApplicationStatus(applicationId, status);
  revalidatePath(`/admin/performer-applications/${applicationId}`);
  revalidatePath("/admin/performer-applications");
}
