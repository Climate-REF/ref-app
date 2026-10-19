import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { FailureCount } from "@/lib/failures";
import { cn } from "@/lib/utils";

/** Entries listed before the rest are hidden behind "Show all". */
const INITIAL_ENTRIES = 12;

/**
 * Failed execution groups counted by something they share, such as a model or a failure reason,
 * each selectable to list only its failures
 */
export function FailureCountsList({
  counts,
  selected,
  onSelect,
  labelOf = (key) => key,
  titleOf = (key) => key,
  noun,
}: {
  counts: FailureCount[];
  selected?: string;
  onSelect: (key: string | undefined) => void;
  labelOf?: (key: string) => string;
  titleOf?: (key: string) => string;
  /** What the entries are, for "Show all 40 models" */
  noun: string;
}) {
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? counts : counts.slice(0, INITIAL_ENTRIES);

  return (
    <div className="space-y-2">
      <ul className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map(({ key, groups, diagnostics }) => {
          const active = key === selected;
          return (
            <li key={key}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => onSelect(active ? undefined : key)}
                title={titleOf(key)}
                className={cn(
                  "flex w-full items-baseline justify-between gap-2 rounded-md border px-2 py-1 text-left text-sm hover:bg-accent",
                  active && "border-primary bg-accent",
                )}
              >
                <span className="truncate font-medium">{labelOf(key)}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {groups} failed in {diagnostics}{" "}
                  {diagnostics === 1 ? "diagnostic" : "diagnostics"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {counts.length > INITIAL_ENTRIES && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAll((prev) => !prev)}
        >
          {showAll ? "Show fewer" : `Show all ${counts.length} ${noun}`}
        </Button>
      )}
    </div>
  );
}
