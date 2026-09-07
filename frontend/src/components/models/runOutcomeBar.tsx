import type { RunCounts } from "@/client";
import { OUTCOMES } from "@/components/models/outcomes";
import { cn } from "@/lib/utils";

/**
 * A stacked bar of how a set of execution groups turned out.
 *
 * A group that has never run names no model, so it is absent from the counts rather than shown.
 */
export function RunOutcomeBar({
  counts,
  className,
}: {
  counts: RunCounts;
  className?: string;
}) {
  if (counts.total === 0) {
    return <span className="text-sm text-muted-foreground">No runs</span>;
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex h-2 w-32 overflow-hidden rounded-full bg-muted">
        {OUTCOMES.map(({ key, label, colour }) => {
          const count = counts[key];
          if (count === 0) return null;
          return (
            <div
              key={key}
              className={colour}
              style={{ width: `${(count / counts.total) * 100}%` }}
              title={`${label}: ${count}`}
            />
          );
        })}
      </div>
      <span className="text-sm tabular-nums whitespace-nowrap">
        {counts.successful} / {counts.total}
      </span>
    </div>
  );
}

/** The legend that names the colours, shown once per page rather than per bar. */
export function RunOutcomeLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
      {OUTCOMES.map(({ key, label, colour }) => (
        <span key={key} className="flex items-center gap-1.5">
          <span className={cn("h-2 w-2 rounded-full", colour)} />
          {label}
        </span>
      ))}
    </div>
  );
}
