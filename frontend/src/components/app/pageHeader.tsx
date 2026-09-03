import type { ReactNode } from "react";

/** The title block every list page opens with, above the card holding its content. */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {description ? (
          <div className="text-muted-foreground mt-2 max-w-prose">
            {description}
          </div>
        ) : null}
      </div>
      {actions ? (
        <div className="flex items-center gap-4 text-sm">{actions}</div>
      ) : null}
    </div>
  );
}
