import { AdminNav } from "@/components/admin/admin-nav";
import { PageHeading } from "@/components/page-heading";
import { requireAdminPage } from "@/lib/auth/admin";
import { getInitialImportState } from "@/lib/imports/master-data";
import { ImportForm } from "./import-form";

export const dynamic = "force-dynamic";

export default async function AdminImportsPage() {
  await requireAdminPage();

  return (
    <div className="space-y-6">
      <AdminNav />
      <PageHeading title="一括インポート" description="マスターデータを CSV / JSON で追加・更新します。" />
      <ImportForm initialState={getInitialImportState()} />
    </div>
  );
}
