"use client";

import type { ExecutionGroup } from "@/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle, XCircle } from "lucide-react";

interface RecentExecutionsProps {
  executions: ExecutionGroup[];
}

function ExecutionStatusBadge({ successful }: { successful: boolean }) {
  return (
    <Badge variant={successful ? "default" : "destructive"} className="h-6">
      {successful && <CheckCircle className="h-3 w-3" />}
      {!successful && <XCircle className="h-3 w-3" />}
    </Badge>
  );
}

export function RecentExecutions({ executions }: RecentExecutionsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Executions</CardTitle>
        <CardDescription>Latest evaluations across all groups</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {executions.map((execution) => (
            <div
              key={execution.id}
              className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
            >
              <div className="flex flex-col gap-2 overflow-hidden">
                <span className="font-medium text-nowrap">
                  {execution.diagnostic.name}
                </span>
                <div
                  className="text-sm text-muted-foreground overflow-hidden text-nowrap text-ellipsis"
                  title={execution.key}
                >
                  {execution.key}
                </div>
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <ExecutionStatusBadge
                    successful={execution.latest_execution?.successful ?? false}
                  />
                  <Badge className="h-6">
                    {execution.diagnostic.provider.name}
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
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <Button variant="outline" asChild>
            <Link to="/executions">View All Executions</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
