import Link from "next/link";
import { Clock } from "lucide-react";

import { Breadcrumb } from "@/components/breadcrumb";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PendingPerformerNotice({ name }: { name: string }) {
  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { name: "ホーム", href: "/" },
          { name: "活動者", href: "/performers" },
          { name, href: "#" }
        ]}
      />

      <section className="flex flex-col items-center gap-4 rounded-[2rem] border border-primary/10 bg-card/90 p-10 text-center shadow-sm">
        <span className="inline-flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Clock className="size-8" aria-hidden="true" />
        </span>
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          「{name}」は現在確認中です
        </h1>
        <p className="max-w-md text-sm leading-6 text-muted-foreground">
          この活動者ページは、内容を確認したうえで公開される準備を進めています。
          しばらく経ってから、あらためてアクセスしてみてください。
        </p>
        <Link href="/performers" className={cn(buttonVariants({ variant: "outline" }))}>
          活動者一覧に戻る
        </Link>
      </section>
    </div>
  );
}
