import { useSuspenseQuery } from "@tanstack/react-query";
import { diagnosticsListMetricValuesOptions } from "@/client/@tanstack/react-query.gen";
import { SeriesVisualization } from "@/components/execution/values/series/seriesVisualization";
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
  const { data } = useSuspenseQuery(
    diagnosticsListMetricValuesOptions({
      path: {
        provider_slug: contentItem.provider,
        diagnostic_slug: contentItem.diagnostic,
      },
      query: { ...contentItem.otherFilters, type: "series" },
    }),
  );

  // Extract series values from the data
  const collection = data as MetricValueCollection;
  const seriesValues = (collection?.data ?? []).filter(
    isSeriesValue,
  ) as SeriesValue[];

  if (seriesValues.length === 0) {
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
      seriesValues={seriesValues}
      initialGroupBy={contentItem.groupingConfig?.groupBy}
      initialHue={contentItem.groupingConfig?.hue}
      initialStyle={contentItem.groupingConfig?.style}
      maxSeriesLimit={100} // Limit for performance in preview
      maxLegendItems={10}
      enableZoom={false} // Disable zoom in preview
      maxVisibleGroups={5}
      hideControls={true} // Hide the groupBy/hue/style controls for explorer cards
      symmetricalAxes={contentItem.symmetricalAxes ?? false}
    />
  );
}
