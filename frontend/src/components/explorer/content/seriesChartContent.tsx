import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { diagnosticsListMetricValuesOptions } from "@/client/@tanstack/react-query.gen";
import { SeriesVisualization } from "@/components/execution/values/series";
import type {
  MetricValueCollection,
  SeriesValue,
} from "@/components/execution/values/types";
import { isSeriesValue } from "@/components/execution/values/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  FilterControl,
  SeriesChartContent as SeriesChartContentType,
} from "../types";

interface SeriesChartContentProps {
  contentItem: SeriesChartContentType;
}

/**
 * Build initial filter values from filter controls, keyed by filterKey.
 */
function buildInitialFilterValues(
  filterControls: FilterControl[] | undefined,
): Record<string, string> {
  const values: Record<string, string> = {};
  for (const control of filterControls ?? []) {
    if (control.defaultValue) {
      values[control.filterKey] = control.defaultValue;
    }
  }
  return values;
}

/**
 * Build the query filters by merging otherFilters with the active filter control values.
 */
function buildQueryFilters(
  otherFilters: Record<string, string> | undefined,
  filterValues: Record<string, string>,
): Record<string, string> {
  return {
    ...(otherFilters ?? {}),
    ...filterValues,
  };
}

export function SeriesChartContent({ contentItem }: SeriesChartContentProps) {
  const [filterValues, setFilterValues] = useState<Record<string, string>>(() =>
    buildInitialFilterValues(contentItem.filterControls),
  );

  const queryFilters = buildQueryFilters(
    contentItem.otherFilters,
    filterValues,
  );

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
        ...(isolateIdsParam ? { isolate_ids: isolateIdsParam } : {}),
        ...(excludeIdsParam ? { exclude_ids: excludeIdsParam } : {}),
      },
    }),
  );

  // Fetch facets for filter controls by querying without the controlled filter keys.
  // This gives us the full list of available values for each filter dropdown.
  const controlledKeys = new Set(
    (contentItem.filterControls ?? []).map((c) => c.filterKey),
  );
  const facetQueryFilters: Record<string, string> = {};
  for (const [key, value] of Object.entries(contentItem.otherFilters ?? {})) {
    if (!controlledKeys.has(key)) {
      facetQueryFilters[key] = value;
    }
  }

  const hasFilterControls =
    contentItem.filterControls && contentItem.filterControls.length > 0;

  const { data: facetData } = useQuery({
    ...diagnosticsListMetricValuesOptions({
      path: {
        provider_slug: contentItem.provider,
        diagnostic_slug: contentItem.diagnostic,
      },
      query: {
        ...facetQueryFilters,
        value_type: "series",
        limit: 1,
      },
    }),
    enabled: !!hasFilterControls,
  });

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

  // Build facet options for filter controls
  const facetCollection = facetData as MetricValueCollection | undefined;
  const facetMap = new Map<string, string[]>();
  for (const facet of facetCollection?.facets ?? []) {
    facetMap.set(facet.key, facet.values);
  }

  if (allSeriesValues.length === 0) {
    return (
      <div className="space-y-3">
        {hasFilterControls && (
          <FilterControlBar
            controls={contentItem.filterControls!}
            filterValues={filterValues}
            facetMap={facetMap}
            onFilterChange={(key, value) =>
              setFilterValues((prev) => ({ ...prev, [key]: value }))
            }
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
          onFilterChange={(key, value) =>
            setFilterValues((prev) => ({ ...prev, [key]: value }))
          }
        />
      )}
      <SeriesVisualization
        seriesValues={regularSeries}
        referenceSeriesValues={referenceSeries}
        maxSeriesLimit={500} // Limit for performance in preview
        symmetricalAxes={contentItem.symmetricalAxes ?? false}
        labelTemplate={contentItem.labelTemplate}
        metricName={contentItem.title}
        units={contentItem.metricUnits}
      />
    </div>
  );
}

interface FilterControlBarProps {
  controls: FilterControl[];
  filterValues: Record<string, string>;
  facetMap: Map<string, string[]>;
  onFilterChange: (key: string, value: string) => void;
}

function FilterControlBar({
  controls,
  filterValues,
  facetMap,
  onFilterChange,
}: FilterControlBarProps) {
  return (
    <div className="flex items-center gap-3">
      {controls.map((control) => {
        const allOptions = facetMap.get(control.filterKey) ?? [];
        const excludeSet = new Set(control.excludeValues ?? []);
        const options = allOptions.filter((v) => !excludeSet.has(v));

        return (
          <div key={control.filterKey} className="flex items-center gap-2">
            {control.label && (
              <span className="text-sm text-muted-foreground">
                {control.label}:
              </span>
            )}
            <Select
              value={filterValues[control.filterKey] ?? ""}
              onValueChange={(value) =>
                onFilterChange(control.filterKey, value)
              }
            >
              <SelectTrigger size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      })}
    </div>
  );
}
