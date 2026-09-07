import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { diagnosticsListMetricValuesOptions } from "@/client/@tanstack/react-query.gen";
import { useSelectedMipEra } from "@/components/charts/mipEraContext";
import { MipEraSections } from "@/components/charts/mipEraSections";
import { SeriesVisualization } from "@/components/execution/values/series";
import type {
  MetricValueCollection,
  SeriesValue,
} from "@/components/execution/values/types";
import { isSeriesValue } from "@/components/execution/values/types";
import type { SeriesChartContent as SeriesChartContentType } from "../types";
import { FilterControlBar, useFilterControls } from "./filterControls";

interface SeriesChartContentProps {
  contentItem: SeriesChartContentType;
}

export function SeriesChartContent({ contentItem }: SeriesChartContentProps) {
  const selectedMipEra = useSelectedMipEra();
  const {
    hasFilterControls,
    filterValues,
    setFilterValue,
    facetMap,
    queryFilters,
  } = useFilterControls({
    provider: contentItem.provider,
    diagnostic: contentItem.diagnostic,
    otherFilters: contentItem.otherFilters,
    filterControls: contentItem.filterControls,
    valueType: "series",
  });

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
        ...queryFilters,
        value_type: "series",
        limit: 500,
        mip_era: selectedMipEra ?? undefined,
        ...(isolateIdsParam ? { isolate_ids: isolateIdsParam } : {}),
        ...(excludeIdsParam ? { exclude_ids: excludeIdsParam } : {}),
      },
    }),
  );

  // Extract series values from the data
  const collection = data as MetricValueCollection;
  // Missing or "model" kind is a model series, only "reference" is a reference series.
  // Memoised because the charts below key their own memos on these array identities.
  const { allSeriesValues, regularSeries, referenceSeries } = useMemo(() => {
    const all = (collection?.data ?? []).filter(isSeriesValue) as SeriesValue[];
    return {
      allSeriesValues: all,
      regularSeries: all.filter((series) => series.kind !== "reference"),
      referenceSeries: all.filter((series) => series.kind === "reference"),
    };
  }, [collection?.data]);

  if (allSeriesValues.length === 0) {
    return (
      <div className="space-y-3">
        {hasFilterControls && (
          <FilterControlBar
            controls={contentItem.filterControls!}
            filterValues={filterValues}
            facetMap={facetMap}
            onFilterChange={setFilterValue}
          />
        )}
        <div className="h-64 flex items-center justify-center bg-gray-100 rounded">
          <div className="text-center text-sm text-gray-500">
            <p>No series data available</p>
            <p className="text-xs mt-1">
              This diagnostic may not have series data or filters may be too
              restrictive
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {hasFilterControls && (
        <FilterControlBar
          controls={contentItem.filterControls!}
          filterValues={filterValues}
          facetMap={facetMap}
          onFilterChange={setFilterValue}
        />
      )}
      {regularSeries.length === 0 ? (
        // Nothing to split on, so show the references rather than an empty panel.
        <SeriesVisualization
          seriesValues={regularSeries}
          referenceSeriesValues={referenceSeries}
          maxSeriesLimit={500} // Limit for performance in preview
          symmetricalAxes={contentItem.symmetricalAxes ?? false}
          labelTemplate={contentItem.labelTemplate}
          colorDimension={contentItem.groupingConfig?.hue}
          metricName={contentItem.title}
          units={contentItem.metricUnits}
        />
      ) : (
        <MipEraSections values={regularSeries}>
          {(mipEraSeries) => (
            <SeriesVisualization
              seriesValues={mipEraSeries}
              referenceSeriesValues={referenceSeries}
              maxSeriesLimit={500} // Limit for performance in preview
              symmetricalAxes={contentItem.symmetricalAxes ?? false}
              labelTemplate={contentItem.labelTemplate}
              colorDimension={contentItem.groupingConfig?.hue}
              metricName={contentItem.title}
              units={contentItem.metricUnits}
            />
          )}
        </MipEraSections>
      )}
    </div>
  );
}
