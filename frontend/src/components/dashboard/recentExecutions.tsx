import { Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle, Clock, XCircle } from "lucide-react";
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

interface RecentExecutionsProps {
  executions: ExecutionGroup[];
}

/** Null while the execution is still running. */
function ExecutionStatusBadge({ successful }: { successful: boolean | null }) {
  if (successful === null) {
    return (
      <Badge variant="secondary" className="h-6" title="Running">
        <Clock className="h-3 w-3" />
      </Badge>
    );
  }
  return (
    <Badge variant={successful ? "default" : "destructive"} className="h-6">
      {successful && <CheckCircle className="h-3 w-3" />}
      {!successful && <XCircle className="h-3 w-3" />}
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
            // Its successful is null while it runs, which the badge shows
            const latest = execution.executions.at(-1);
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
                    <ExecutionStatusBadge
                      successful={latest ? latest.successful : false}
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
