import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Download } from "lucide-react";
import {
  diagnosticsListOptions,
  executionsGetExecutionStatisticsOptions,
} from "@/client/@tanstack/react-query.gen";
import { ResourceUsageTable } from "@/components/execution/resourceUsageTable";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { downloadTextFile } from "@/lib/downloadUtils";
import { formatBytes, formatCount, formatDuration } from "@/lib/format";
import { resourceUsageCsv } from "@/lib/resourceUsageCsv";

export const Route = createFileRoute("/_app/executions/resources")({
  component: ResourceUsagePage,
  staticData: {
    title: "Resource Usage",
  },
});

function Stat({
  label,
  value,
  loading,
}: {
  label: string;
  value: string;
  loading: boolean;
}) {
  return (
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold tabular-nums">
        {loading ? "..." : value}
      </p>
    </div>
  );
}

function ResourceUsagePage() {
  const diagnostics = useQuery(diagnosticsListOptions());
  const statistics = useQuery(executionsGetExecutionStatisticsOptions());
  const usage = statistics.data?.resource_usage;

  return (
    <div className="container mx-auto p-4 space-y-8">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <CardTitle>Resource Usage</CardTitle>
            <Button
              variant="outline"
              disabled={!diagnostics.data}
              onClick={() =>
                downloadTextFile(
                  resourceUsageCsv(diagnostics.data?.data ?? []),
                  "resource-usage.csv",
                  "text/csv",
                )
              }
            >
              <Download className="h-4 w-4" />
              Download CSV
            </Button>
          </div>
          <CardDescription>
            <p className="max-w-1/2">
              Wall clock time, CPU time and peak memory recorded by the workers
              for every execution, rolled up by diagnostic. Only executions that
              recorded a wall time are counted, so older executions may be
              missing.
            </p>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat
              label="Timed executions"
              value={formatCount(usage?.timed_execution_count)}
              loading={statistics.isLoading}
            />
            <Stat
              label="Total wall time"
              value={formatDuration(usage?.wall_seconds_total)}
              loading={statistics.isLoading}
            />
            <Stat
              label="Total CPU time"
              value={formatDuration(usage?.cpu_seconds_total)}
              loading={statistics.isLoading}
            />
            <Stat
              label="Peak memory"
              value={formatBytes(usage?.peak_memory_bytes_max)}
              loading={statistics.isLoading}
            />
          </div>
          {statistics.error && (
            <div className="text-destructive">
              Error loading statistics: {String(statistics.error)}
            </div>
          )}
          {diagnostics.isLoading && <div>Loading diagnostics...</div>}
          {diagnostics.error && (
            <div className="text-destructive">
              Error loading diagnostics: {String(diagnostics.error)}
            </div>
          )}
          {diagnostics.data && (
            <ResourceUsageTable diagnostics={diagnostics.data.data} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
