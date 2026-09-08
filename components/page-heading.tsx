export function PageHeading({
  eyebrow,
  title,
  description,
  actions
}: {
  // 見出しの上に置く英字キャッチ（値札の刷り込みに見立てた等幅）。
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-6">
      <div className="min-w-0">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1 className="mt-2.5 text-2xl font-bold tracking-tight text-ink sm:text-3xl">{title}</h1>
        {description ? (
          <p className="mt-2.5 max-w-3xl text-[13px] leading-[1.9] text-slate">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2 md:justify-end">{actions}</div> : null}
    </div>
  );
}
