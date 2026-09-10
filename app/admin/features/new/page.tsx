import { AdminNav } from "@/components/admin/admin-nav";
import { PageHeading } from "@/components/page-heading";
import { requireAdminPage } from "@/lib/auth/admin";
import { FeatureForm } from "../feature-form";

export const dynamic = "force-dynamic";

export default async function NewFeaturePage() {
  await requireAdminPage();

  return (
    <div className="space-y-6">
      <AdminNav />
      <PageHeading title="特集を作成" description="下書きとして保存し、内容が固まったら公開します。" />

      <FeatureForm
        featureId={null}
        defaults={{ title: "", slug: "", lead: "", outro: "", items: [], links: [] }}
      />
    </div>
  );
}
