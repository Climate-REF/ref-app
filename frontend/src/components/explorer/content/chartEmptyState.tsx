import type { ReactNode } from "react";

/** Stands in for a chart with nothing to plot, saying why. */
export function ChartEmptyState({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="h-64 flex items-center justify-center rounded bg-muted">
      <div className="text-center text-sm text-muted-foreground">
        <p>{title}</p>
        <p className="text-xs mt-1">{children}</p>
      </div>
    </div>
  );
}
