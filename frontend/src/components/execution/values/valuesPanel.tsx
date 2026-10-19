import type { useNavigate } from "@tanstack/react-router";
import { MipEraScope } from "@/components/charts/mipEraBar";
import { ExecutionTabCard } from "@/components/execution/executionTabCard";
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
}: {
  valueType: ValueType;
  search: Pick<ExecutionValuesSearch, "detect_outliers" | "include_unverified">;
  result: ReturnType<typeof useMetricValues>;
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
      initialFilters={initialFilters}
      onFiltersChange={handlers.onFiltersChange}
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
        />
      </MipEraScope>
    </div>
  );
}

type ExecutionValuesPanelProps = ValuesPanelProps<ExecutionValuesSearch> & {
  groupId: string;
};

/** An execution group's values, queried only once the group has run. */
function ExecutionValuesTable({
  groupId,
  search,
  navigate,
  valueType,
}: ExecutionValuesPanelProps) {
  const result = useExecutionMetricValues({
    groupId,
    search,
    valueType,
    navigate,
  });
  return (
    <MetricValuesTable valueType={valueType} search={search} result={result} />
  );
}

/** An execution group's scalar or series values. */
export function ExecutionValuesPanel(props: ExecutionValuesPanelProps) {
  const kind = props.valueType === "scalar" ? "Scalar" : "Series";
  return (
    <ExecutionTabCard
      groupId={props.groupId}
      title={`${kind} Values`}
      description={`${kind} metrics from the current execution. Use facets to filter and Export to download as CSV.`}
      what={`${kind.toLowerCase()} values`}
    >
      <ExecutionValuesTable {...props} />
    </ExecutionTabCard>
  );
}
