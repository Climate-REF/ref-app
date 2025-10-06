import { useSuspenseQuery } from "@tanstack/react-query";
import { diagnosticsListMetricValuesOptions } from "@/client/@tanstack/react-query.gen";
import { SeriesVisualization } from "@/components/execution/values/series";
import type {
  MetricValueCollection,
  SeriesValue,
} from "@/components/execution/values/types";
import { isSeriesValue } from "@/components/execution/values/types";
import type { ExplorerCardContent } from "../types";

interface SeriesChartContentProps {
  contentItem: Extract<ExplorerCardContent, { type: "series-chart" }>;
}

export function SeriesChartContent({ contentItem }: SeriesChartContentProps) {
  // Forward isolate/exclude id filters (if present) from card config to backend.
  const isolateIdsParam = contentItem.otherFilters?.isolate_ids;
  const excludeIdsParam = contentItem.otherFilters?.exclude_ids;

  const { data } = useSuspenseQuery(
    diagnosticsListMetricValuesOptions({
      path: {
        provider_slug: contentItem.provider,
        diagnostic_slug: contentItem.diagnostic,
      },
      query: {
        ...contentItem.otherFilters,
        value_type: "series",
        ...(isolateIdsParam ? { isolate_ids: isolateIdsParam } : {}),
        ...(excludeIdsParam ? { exclude_ids: excludeIdsParam } : {}),
      },
    }),
  );

  // Extract series values from the data
  const collection = data as MetricValueCollection;
  const allSeriesValues = (collection?.data ?? []).filter(
    isSeriesValue,
  ) as SeriesValue[];

  // Split into regular and reference series
  // TODO: support other times
  const regularSeries = allSeriesValues.filter(
    (series) => series.dimensions.source_id !== "Reference",
  );
  const referenceSeries = allSeriesValues.filter(
    (series) => series.dimensions.source_id === "Reference",
  );

  if (allSeriesValues.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-gray-100 rounded">
        <div className="text-center text-sm text-gray-500">
          <p>No series data available</p>
          <p className="text-xs mt-1">
            This diagnostic may not have series data or filters may be too
            restrictive
          </p>
        </div>
      </div>
    );
  }

  return (
    <SeriesVisualization
      seriesValues={regularSeries}
      referenceSeriesValues={referenceSeries}
      maxSeriesLimit={500} // Limit for performance in preview
      symmetricalAxes={contentItem.symmetricalAxes ?? false}
      labelTemplate={contentItem.labelTemplate}
    />
  );
}
