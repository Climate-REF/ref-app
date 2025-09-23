import { useQuery } from "@tanstack/react-query";
import { executionsGetExecutionStatisticsOptions } from "@/client/@tanstack/react-query.gen.ts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const maybeShowLoading = (isLoading: boolean, content: React.ReactNode) =>
  isLoading ? "..." : content?.toLocaleString();

export function ExecutionStats() {
  const { data, isLoading, error } = useQuery(
    executionsGetExecutionStatisticsOptions(),
  );

  const totalCount = data?.total_execution_groups ?? 0;
  const successCount = data?.successful_execution_groups ?? 0;
  const failedCount = data?.failed_execution_groups ?? 0;
  const successRate = data?.success_rate_percentage ?? 0;
  const scalarCount = data?.scalar_value_count ?? 0;
  const seriesCount = data?.series_value_count ?? 0;
  const metricValueCount = scalarCount + seriesCount;
  const totalDatasets = data?.total_datasets ?? 0;
  const totalFiles = data?.total_files ?? 0;

  if (error) {
    return (
      <Card className="max-w-1/2]">
        <CardHeader>
          <CardTitle>Execution Statistics</CardTitle>
          <CardDescription>Failed to load execution statistics</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      {/* Total Execution Groups */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="leading-none font-semibold">
            Total Execution Groups
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {maybeShowLoading(isLoading, totalCount)}
          </div>
          <p className="text-xs text-muted-foreground">
            All diagnostic execution groups
          </p>
        </CardContent>
      </Card>

      {/* Success Rate */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="leading-none font-semibold">
            Success Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {maybeShowLoading(isLoading, `${successRate}%`)}
          </div>
          <p className="text-xs text-muted-foreground">
            {successCount} successful, {failedCount} failed
          </p>
        </CardContent>
      </Card>

      {/* Metric Values */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="leading-none font-semibold">
            Number of unique Metric Values
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {maybeShowLoading(isLoading, metricValueCount)}
          </div>
          <p className="text-xs text-muted-foreground">
            {scalarCount} scalars, {seriesCount} series
          </p>
        </CardContent>
      </Card>

      {/* Datasets & Files */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="leading-none font-semibold">
            Ingested Datasets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {maybeShowLoading(isLoading, totalDatasets)}
          </div>
          <p className="text-xs text-muted-foreground">
            {maybeShowLoading(isLoading, totalFiles)} files tracked
          </p>
        </CardContent>
      </Card>
    </>
  );
}
