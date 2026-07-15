import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn, formatDateInput } from "@/lib/utils";

export type PerformerCardData = {
  id: string;
  name: string;
  colorCode: string | null;
  debutDate: Date | null;
  _count: { covers: number };
};

export function PerformerCard({ performer }: { performer: PerformerCardData }) {
  return (
    <article
      className="overflow-hidden rounded-3xl border border-primary/10 bg-card/90 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
      style={{
        borderTopColor: performer.colorCode ?? undefined,
        borderTopWidth: performer.colorCode ? 4 : undefined,
        backgroundImage: performer.colorCode
          ? `linear-gradient(135deg, ${performer.colorCode}14, transparent 42%)`
          : undefined
      }}
    >
      <div className="flex h-full flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              href={`/performers/${performer.id}`}
              className="text-lg font-bold text-foreground underline-offset-4 hover:text-primary hover:underline"
            >
              {performer.name}
            </Link>
            <p className="mt-1 text-sm text-muted-foreground">
              歌唱記録 {performer._count.covers} 件
              {performer.debutDate ? ` / デビュー日 ${formatDateInput(performer.debutDate)}` : ""}
            </p>
          </div>
          {performer.colorCode ? (
            <span
              aria-label={`活動者カラー ${performer.colorCode}`}
              className="mt-1 size-8 shrink-0 rounded-full border shadow-sm"
              style={{ backgroundColor: performer.colorCode }}
            />
          ) : null}
        </div>

        <div className="mt-auto flex justify-end border-t pt-4">
          <Link
            href={`/performers/${performer.id}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            詳細を見る
          </Link>
        </div>
      </div>
    </article>
  );
}
