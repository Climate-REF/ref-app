import type { DiagnosticHealth } from "@/lib/failures";
import { cn } from "@/lib/utils";

/** How each diagnostic health reads, in the order the legend lists them. */
export const HEALTH = {
  healthy: {
    label: "No failures",
    description: "No execution group failed",
    colour: "bg-emerald-500",
  },
  partial: {
    label: "Some failing",
    description: "Some execution groups failed",
    colour: "bg-yellow-400",
  },
  failed: {
    label: "All failing",
    description: "Every execution group that ran failed",
    colour: "bg-red-500",
  },
  not_run: {
    label: "Not run",
    description: "No execution group has finished yet",
    colour: "bg-muted-foreground/40",
  },
} as const satisfies Record<
  DiagnosticHealth,
  { label: string; description: string; colour: string }
>;

export function HealthDot({
  health,
  className,
}: {
  health: DiagnosticHealth;
  className?: string;
}) {
  return (
    <span
      role="img"
      aria-label={HEALTH[health].label}
      className={cn(
        "inline-block size-3 shrink-0 rounded-full",
        HEALTH[health].colour,
        className,
      )}
    />
  );
}

export function HealthLegend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {(Object.keys(HEALTH) as DiagnosticHealth[]).map((health) => (
        <li key={health} className="flex items-center gap-1.5">
          <HealthDot health={health} className="size-2.5" />
          <span title={HEALTH[health].description}>{HEALTH[health].label}</span>
        </li>
      ))}
    </ul>
  );
}
