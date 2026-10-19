import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { ModelFailures } from "@/lib/failures";
import { cn } from "@/lib/utils";

/** Models listed before the rest are hidden behind "Show all". */
const INITIAL_MODELS = 12;

/**
 * The models with the most failed execution groups, each selectable to list only its failures
 */
export function ModelFailuresList({
  models,
  selected,
  onSelect,
}: {
  models: ModelFailures[];
  selected?: string;
  onSelect: (model: string | undefined) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  if (models.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No failed execution group names a model.
      </p>
    );
  }
  const shown = showAll ? models : models.slice(0, INITIAL_MODELS);

  return (
    <div className="space-y-2">
      <ul className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map(({ model, groups, diagnostics }) => {
          const active = model === selected;
          return (
            <li key={model}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => onSelect(active ? undefined : model)}
                className={cn(
                  "flex w-full items-baseline justify-between gap-2 rounded-md border px-2 py-1 text-left text-sm hover:bg-accent",
                  active && "border-primary bg-accent",
                )}
              >
                <span className="truncate font-medium" title={model}>
                  {model}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {groups} failed in {diagnostics}{" "}
                  {diagnostics === 1 ? "diagnostic" : "diagnostics"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {models.length > INITIAL_MODELS && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAll((prev) => !prev)}
        >
          {showAll ? "Show fewer" : `Show all ${models.length} models`}
        </Button>
      )}
    </div>
  );
}
