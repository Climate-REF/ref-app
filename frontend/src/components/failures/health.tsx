import type React from "react";
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

/** A diagnostic's health, or a grey swelling dot while `pending` new counts */
export function HealthDot({
  health,
  pending = false,
  className,
  style,
}: {
  health: DiagnosticHealth;
  pending?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      role="img"
      aria-label={pending ? "Updating" : HEALTH[health].label}
      style={style}
      className={cn(
        "inline-block size-3 shrink-0 rounded-full",
        pending
          ? cn(HEALTH.not_run.colour, "motion-safe:animate-swell")
          : HEALTH[health].colour,
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
