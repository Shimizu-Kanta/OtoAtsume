import { cn } from "@/lib/utils";

// 管理画面の一覧で使い回す表の部品(見た目だけ)。1 行 40〜44px を目安に情報密度を上げている。
// 日付・件数・ID のセルには font-mono tabular-nums を付けて桁をそろえる。

export function AdminTable({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto rounded-md border bg-card", className)}>
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

export function AdminTh({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={cn(
        "h-9 whitespace-nowrap bg-muted/60 px-3 text-left align-middle text-xs font-medium text-muted-foreground",
        className
      )}
    >
      {children}
    </th>
  );
}

export function AdminTd({
  children,
  className,
  colSpan
}: {
  children?: React.ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td colSpan={colSpan} className={cn("px-3 py-2 align-middle", className)}>
      {children}
    </td>
  );
}

export function AdminTr({ children, className }: { children: React.ReactNode; className?: string }) {
  return <tr className={cn("border-t hover:bg-muted/40", className)}>{children}</tr>;
}

export function AdminEmptyRow({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
  return (
    <tr className="border-t">
      <td colSpan={colSpan} className="px-3 py-10 text-center text-sm text-muted-foreground">
        {children}
      </td>
    </tr>
  );
}
