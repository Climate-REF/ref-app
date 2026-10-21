import { Badge } from "@/components/ui/badge";
import {
  type ExecutionStatus,
  executionStatusDisplay,
} from "@/lib/executionStatus";

/** A badge naming an execution status, described in its tooltip. */
export function ExecutionStatusBadge({
  status,
  className,
}: {
  status: ExecutionStatus;
  className?: string;
}) {
  const { label, description, badgeVariant } = executionStatusDisplay[status];
  return (
    <Badge variant={badgeVariant} className={className} title={description}>
      {label}
    </Badge>
  );
}
