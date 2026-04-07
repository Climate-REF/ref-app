import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { Values } from "@/components/execution/values";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useExecutionMetricValues } from "@/hooks/useExecutionMetricValues";
import { DEFAULT_PAGE_SIZE } from "@/hooks/useMetricValues";

const seriesValuesSearchSchema = z
  .object({
    detect_outliers: z.enum(["off", "iqr"]).default("iqr"),
    include_unverified: z.coerce
      .string()
      .default("false")
      .transform((v) => v === "true"),
    offset: z.coerce.number().int().nonnegative().default(0),
    limit: z.coerce.number().int().positive().default(DEFAULT_PAGE_SIZE),
  })
  .catchall(z.string().optional());

export const SeriesValuesTab = () => {
  const { groupId } = Route.useParams();
  const search = Route.useSearch();
  const { detect_outliers, include_unverified } = search;
  const navigate = useNavigate({ from: Route.fullPath });

  const { metricValues, isLoading, pagination, handlers } =
    useExecutionMetricValues({
      groupId,
      search,
      valueType: "series",
      navigate,
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Series Values</CardTitle>
        <CardDescription>
          Series metrics from the current execution. Use facets to filter and
          Export to download as CSV.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Values
          facets={metricValues?.facets ?? []}
          values={metricValues?.data ?? []}
          loading={isLoading}
          hadOutliers={metricValues?.had_outliers ?? undefined}
          outlierCount={metricValues?.outlier_count ?? undefined}
          initialDetectOutliers={detect_outliers}
          onDetectOutliersChange={handlers.onDetectOutliersChange}
          initialIncludeUnverified={include_unverified}
          onIncludeUnverifiedChange={handlers.onIncludeUnverifiedChange}
          valueType="series"
          onDownload={handlers.onDownload}
          pagination={pagination}
        />
      </CardContent>
    </Card>
  );
};

export const Route = createFileRoute("/_app/executions/$groupId/series")({
  component: SeriesValuesTab,
  validateSearch: zodValidator(seriesValuesSearchSchema),
  staticData: {
    title: "Series Values",
  },
});
