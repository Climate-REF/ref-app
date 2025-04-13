"use client";

import type { MetricExecutionGroup } from "@/client";
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
  executions: MetricExecutionGroup[];
}

export function RecentExecutions({ executions }: RecentExecutionsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Executions</CardTitle>
        <CardDescription>
          Latest metric evaluations across all groups
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {executions.map((execution) => (
            <div
              key={execution.id}
              className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{execution.metric.name}</span>
                  <Badge
                    variant={
                      execution.latest_result.successful
                        ? "default"
                        : "destructive"
                    }
                  >
                    {execution.latest_result.successful && (
                      <CheckCircle className="mr-1 h-3 w-3" />
                    )}
                    {!execution.latest_result.successful && (
                      <XCircle className="mr-1 h-3 w-3" />
                    )}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  <Badge>{execution.metric.provider.name}</Badge> •
                  {new Date(execution.updated_at).toLocaleString()} • 5m 34s
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
