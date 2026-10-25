import { CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Shown when nothing matching the filters is failing, with how many groups passed */
export function FailuresEmptyState({
  heading,
  totals,
  onShowPassing,
}: {
  heading: string;
  /** The groups the filters cover, left out when a reason or time range narrows the failures */
  totals?: { total: number; successful: number };
  /** Offered when passing groups are hidden and some exist */
  onShowPassing?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-8 text-center">
      <CircleCheck className="size-8 text-green-600 dark:text-green-500" />
      <div className="space-y-1">
        <p className="font-medium">{heading}</p>
        {totals && totals.total > 0 && (
          <p className="text-sm text-muted-foreground">
            {totals.successful} of {totals.total} execution groups passed at the
            current version of each diagnostic.
          </p>
        )}
      </div>
      {onShowPassing && (
        <Button variant="outline" size="sm" onClick={onShowPassing}>
          Show passing groups
        </Button>
      )}
    </div>
  );
}
