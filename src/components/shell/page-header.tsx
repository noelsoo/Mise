export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
      <div>
        {eyebrow ? <p className="label-caps text-primary">{eyebrow}</p> : null}
        <h1 className="headline-xl mt-1">{title}</h1>
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </header>
  );
}

export function Container({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[1280px] px-4 py-6 md:px-8 lg:px-12 lg:py-8 ${className}`}>{children}</div>;
}
