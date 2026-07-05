export function PageHeading({
  title,
  description,
  actions
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-8 overflow-hidden rounded-3xl border border-primary/10 bg-card/90 p-5 shadow-sm md:flex md:items-end md:justify-between md:gap-6">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h1>
        {description ? (
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="mt-4 flex flex-wrap gap-2 md:mt-0 md:justify-end">{actions}</div> : null}
    </div>
  );
}
