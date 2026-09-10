import Link from "next/link";
import { Newspaper } from "lucide-react";

import type { FeatureLinkRef } from "@/lib/data/features";

// 歌唱記録・楽曲・活動者の各ページに置く「登場する特集」への内部リンク。
// 該当が無いときは何も描かない（空セクションを出さない）。
export function RelatedFeatures({
  features,
  title,
  description
}: {
  features: FeatureLinkRef[];
  title: string;
  description: string;
}) {
  if (features.length === 0) {
    return null;
  }

  return (
    <section className="rounded-3xl border border-rule bg-panel p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="inline-flex size-9 items-center justify-center rounded-[2px] border border-rule bg-panel text-stamp">
          <Newspaper className="size-4" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-lg font-bold tracking-tight text-ink">{title}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>

      <ul className="mt-4 flex flex-col gap-2">
        {features.map((feature) => (
          <li key={feature.slug}>
            <Link
              href={`/features/${feature.slug}`}
              className="inline-flex text-[15px] font-bold text-stamp underline-offset-4 hover:underline"
            >
              {feature.title}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
