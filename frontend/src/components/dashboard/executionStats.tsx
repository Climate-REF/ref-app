import { useQuery } from "@tanstack/react-query";
import { executionsGetExecutionStatisticsOptions } from "@/client/@tanstack/react-query.gen.ts";
import { StatCard } from "@/components/app/statCard";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCount } from "@/lib/format";

export function ExecutionStats() {
  const { data, isLoading, error } = useQuery(
    executionsGetExecutionStatisticsOptions(),
  );

  if (error) {
    return (
      <Card className="max-w-1/2">
        <CardHeader>
          <CardTitle>Execution Statistics</CardTitle>
          <CardDescription>Failed to load execution statistics</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const perEra = data?.groups_by_mip_era;
  return (
    <>
      <StatCard
        title="Total Execution Groups"
        loading={isLoading}
        value={formatCount(data?.groups.total)}
        hint={
          data
            ? `${formatCount(perEra?.CMIP6?.total ?? 0)} ran against CMIP6, ${formatCount(perEra?.CMIP7?.total ?? 0)} against CMIP7`
            : "..."
        }
      />
      <StatCard
        title="Success Rate"
        loading={isLoading}
        value={`${data?.success_rate_percentage}%`}
        hint={
          data
            ? `${formatCount(data.groups.successful)} successful, ${formatCount(data.groups.failed)} failed`
            : "..."
        }
      />
      <StatCard
        title="Number of unique Metric Values"
        loading={isLoading}
        value={formatCount(
          data && data.scalar_value_count + data.series_value_count,
        )}
        hint={
          data
            ? `${formatCount(data.scalar_value_count)} scalars, ${formatCount(data.series_value_count)} series`
            : "..."
        }
      />
      <StatCard
        title="Ingested Datasets"
        loading={isLoading}
        value={formatCount(data?.total_datasets)}
        hint={`${data ? formatCount(data.total_files) : "..."} files tracked`}
      />
    </>
  );
}
