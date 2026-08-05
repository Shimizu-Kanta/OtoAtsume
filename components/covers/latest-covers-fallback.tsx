import { Sparkles } from "lucide-react";

import { CoverCard } from "@/components/covers/cover-card";
import { CoverCarousel } from "@/components/home/cover-carousel";
import { getLatestCovers } from "@/lib/data/covers";

// 関連コンテンツが無い個別ページの下部に「最近追加されたカバー記録」を表示し、
// 関連性の有無に関わらず新しいコンテンツへの内部リンク経路を確保する（クロール導線の底上げ）。
export async function LatestCoversFallback({ excludeCoverId }: { excludeCoverId?: string }) {
  const covers = (await getLatestCovers(excludeCoverId ? 7 : 6))
    .filter((cover) => cover.id !== excludeCoverId)
    .slice(0, 6);

  if (covers.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="inline-flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Sparkles className="size-4" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-xl font-bold tracking-tight">最近追加されたカバー記録</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            関連する記録がまだ少ないため、最近登録されたカバー記録を表示しています。
          </p>
        </div>
      </div>

      <CoverCarousel>
        {covers.map((cover) => (
          <CoverCard key={cover.id} cover={cover} />
        ))}
      </CoverCarousel>
    </section>
  );
}
