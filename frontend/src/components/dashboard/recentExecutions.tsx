import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CheckCircle,
  CircleDashed,
  Clock,
  type LucideIcon,
  XCircle,
} from "lucide-react";
import type { ExecutionGroup } from "@/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useDiagnosticLookup } from "@/hooks/useDiagnosticLookup";
import {
  type ExecutionStatus,
  executionStatusDisplay,
  latestExecutionStatus,
} from "@/lib/executionStatus";

interface RecentExecutionsProps {
  executions: ExecutionGroup[];
}

/** The compact badge for each status, an icon named in its tooltip. */
const statusIcons: Record<
  ExecutionStatus,
  {
    icon: LucideIcon;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  success: { icon: CheckCircle, variant: "default" },
  failed: { icon: XCircle, variant: "destructive" },
  running: { icon: Clock, variant: "secondary" },
  not_run: { icon: CircleDashed, variant: "outline" },
};

function ExecutionStatusIcon({ status }: { status: ExecutionStatus }) {
  const { icon: Icon, variant } = statusIcons[status];
  const { label } = executionStatusDisplay[status];
  return (
    <Badge variant={variant} className="h-6" title={label}>
      <Icon className="h-3 w-3" />
      <span className="sr-only">{label}</span>
    </Badge>
  );
}

export function RecentExecutions({ executions }: RecentExecutionsProps) {
  const lookup = useDiagnosticLookup();

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Recent Execution Groups</CardTitle>
        <CardDescription>
          Latest evaluations across all diagnostics
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="space-y-4">
          {executions.map((execution) => {
            const diagnostic = lookup(
              execution.provider_slug,
              execution.diagnostic_slug,
            );
            return (
              <div
                key={execution.id}
                className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
              >
                <div className="flex flex-col gap-2 overflow-hidden">
                  <span className="font-medium text-nowrap">
                    {diagnostic?.name ?? execution.diagnostic_slug}
                  </span>
                  <div
                    className="text-sm text-muted-foreground overflow-hidden text-nowrap text-ellipsis"
                    title={execution.key}
                  >
                    {execution.key}
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <ExecutionStatusIcon
                      status={latestExecutionStatus(execution)}
                    />
                    <Badge className="h-6">
                      {diagnostic?.provider.name ?? execution.provider_slug}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {new Date(execution.updated_at).toLocaleString()}
                    </span>
                  </div>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link
                    to="/executions/$groupId"
                    params={{ groupId: execution.id.toString() }}
                  >
                    <span className="sr-only">View details</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
      <CardFooter>
        <div className="ml-auto">
          <Button variant="outline" asChild>
            <Link to="/executions">View All Executions</Link>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
