import type { useNavigate } from "@tanstack/react-router";
import { MipEraScope } from "@/components/charts/mipEraBar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useDiagnosticMetricValues } from "@/hooks/useDiagnosticMetricValues";
import { useExecutionMetricValues } from "@/hooks/useExecutionMetricValues";
import type { useMetricValues } from "@/hooks/useMetricValues";
import { useMipEra } from "@/hooks/useMipEra";
import type {
  DiagnosticValuesSearch,
  ExecutionValuesSearch,
} from "@/lib/valuesSearch";
import { Values } from "./values";

type ValueType = "scalar" | "series";

interface ValuesPanelProps<TSearch> {
  search: TSearch;
  navigate: ReturnType<typeof useNavigate>;
  valueType: ValueType;
}

/** The values table for one kind of value, wired to the URL through `useMetricValues`. */
function MetricValuesTable({
  valueType,
  search,
  result: { metricValues, isLoading, initialFilters, pagination, handlers },
  filtersInUrl,
}: {
  valueType: ValueType;
  search: Pick<ExecutionValuesSearch, "detect_outliers" | "include_unverified">;
  result: ReturnType<typeof useMetricValues>;
  filtersInUrl?: boolean;
}) {
  return (
    <Values
      facets={metricValues?.facets ?? []}
      values={metricValues?.data ?? []}
      loading={isLoading}
      hadOutliers={metricValues?.had_outliers ?? undefined}
      outlierCount={metricValues?.outlier_count ?? undefined}
      initialDetectOutliers={search.detect_outliers}
      onDetectOutliersChange={handlers.onDetectOutliersChange}
      initialIncludeUnverified={search.include_unverified}
      onIncludeUnverifiedChange={handlers.onIncludeUnverifiedChange}
      initialFilters={filtersInUrl ? initialFilters : undefined}
      onFiltersChange={filtersInUrl ? handlers.onFiltersChange : undefined}
      valueType={valueType === "scalar" ? "scalars" : "series"}
      onDownload={handlers.onDownload}
      pagination={pagination}
    />
  );
}

/** A diagnostic's scalar or series values across all its executions, scoped to a MIP era. */
export function DiagnosticValuesPanel({
  providerSlug,
  diagnosticSlug,
  search,
  navigate,
  valueType,
}: ValuesPanelProps<DiagnosticValuesSearch> & {
  providerSlug: string;
  diagnosticSlug: string;
}) {
  const { mipEra, setMipEra } = useMipEra(search.mip_era);

  // The era has to reach the query, because outlier detection and pagination both run over
  // whatever it returns.
  const result = useDiagnosticMetricValues({
    providerSlug,
    diagnosticSlug,
    search: { ...search, mip_era: mipEra },
    valueType,
    navigate,
  });

  return (
    <div className="space-y-4">
      <MipEraScope mipEra={mipEra} setMipEra={setMipEra}>
        <MetricValuesTable
          valueType={valueType}
          search={search}
          result={result}
          filtersInUrl
        />
      </MipEraScope>
    </div>
  );
}

/** An execution group's scalar or series values. */
export function ExecutionValuesPanel({
  groupId,
  search,
  navigate,
  valueType,
}: ValuesPanelProps<ExecutionValuesSearch> & { groupId: string }) {
  const result = useExecutionMetricValues({
    groupId,
    search,
    valueType,
    navigate,
  });
  const kind = valueType === "scalar" ? "Scalar" : "Series";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{kind} Values</CardTitle>
        <CardDescription>
          {kind} metrics from the current execution. Use facets to filter and
          Export to download as CSV.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <MetricValuesTable
          valueType={valueType}
          search={search}
          result={result}
        />
      </CardContent>
    </Card>
  );
}
