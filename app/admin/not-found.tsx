import Link from "next/link";

export default function AdminNotFound() {
  return (
    <div className="rounded-md border bg-card p-6 text-sm">
      <p className="font-medium">見つかりません</p>
      <p className="mt-2 text-muted-foreground">指定されたデータまたはページは存在しません。</p>
      <Link href="/admin" className="mt-4 inline-block font-medium text-primary underline">
        管理画面トップへ
      </Link>
    </div>
  );
}
