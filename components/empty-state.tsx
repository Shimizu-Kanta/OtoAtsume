export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-md border bg-card p-6 text-sm">
      <p className="font-medium">{title}</p>
      {description ? <p className="mt-2 text-muted-foreground">{description}</p> : null}
    </div>
  );
}
