import { Badge } from "@/components/ui/badge";
import { describeFailureReason } from "@/lib/failureReasons";
import { cn } from "@/lib/utils";

/** Reasons outside the diagnostic, set apart from the diagnostic's own errors */
const REASON_STYLES: Record<string, string> = {
  diagnostic_error: "border-destructive/50 text-destructive",
  result_error: "border-destructive/50 text-destructive",
  system_error: "border-amber-500/60 text-amber-700 dark:text-amber-300",
  abandoned: "border-amber-500/60 text-amber-700 dark:text-amber-300",
  not_started: "border-amber-500/60 text-amber-700 dark:text-amber-300",
};

/** Why an execution failed, described on hover */
export function FailureReasonBadge({
  reason,
  className,
}: {
  reason: string;
  className?: string;
}) {
  const { label, description } = describeFailureReason(reason);
  return (
    <Badge
      variant="outline"
      title={description}
      className={cn(
        "font-normal",
        REASON_STYLES[reason] ?? "text-muted-foreground",
        className,
      )}
    >
      {label}
    </Badge>
  );
}
