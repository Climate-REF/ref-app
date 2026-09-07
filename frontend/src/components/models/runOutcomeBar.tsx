import type { RunCounts } from "@/client";
import { cn } from "@/lib/utils";

/** The outcomes a run bar shows, in the order they stack. */
const SEGMENTS = [
  { key: "successful", label: "Successful", colour: "bg-emerald-500" },
  { key: "failed", label: "Failed", colour: "bg-destructive" },
  { key: "running", label: "Running", colour: "bg-blue-500" },
  {
    key: "not_started",
    label: "Not started",
    colour: "bg-muted-foreground/40",
  },
] as const;

/**
 * A stacked bar of how a set of execution groups turned out.
 *
 * The counts come straight from the API, so a bar with no groups renders empty rather than full.
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
        {SEGMENTS.map(({ key, label, colour }) => {
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
      {SEGMENTS.map(({ key, label, colour }) => (
        <span key={key} className="flex items-center gap-1.5">
          <span className={cn("h-2 w-2 rounded-full", colour)} />
          {label}
        </span>
      ))}
    </div>
  );
}
