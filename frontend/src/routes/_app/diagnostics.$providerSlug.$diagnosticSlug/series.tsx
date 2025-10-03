import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { useCallback, useMemo, useState } from "react";
import { z } from "zod";
import { diagnosticsListMetricValues } from "@/client";
import { diagnosticsListMetricValuesOptions } from "@/client/@tanstack/react-query.gen.ts";
import { CardTemplateGenerator } from "@/components/diagnostics/cardTemplateGenerator";
import { Values } from "@/components/execution/values";
import type {
  MetricValue,
  MetricValueCollection,
  SeriesValue,
} from "@/components/execution/values/types.ts";

const valuesSearchSchema = z
  .object({
    // Series visualization parameters
    groupBy: z.string().optional(),
    hue: z.string().optional(),
    style: z.string().optional(),
    // Outlier detection parameters
    detect_outliers: z.enum(["off", "iqr"]).default("iqr"),
    include_unverified: z.coerce.boolean().default(false),
  })
  .catchall(z.string().optional());

export const SeriesValuesTab = () => {
  const { providerSlug, diagnosticSlug } = Route.useParams() as {
    providerSlug: string;
    diagnosticSlug: string;
  };
  const search = Route.useSearch() as typeof valuesSearchSchema._type;
  const navigate = useNavigate({ from: Route.fullPath });

  // Extract search values to prevent unnecessary callback recreation
  const searchTab = search.tab;
  const searchGroupBy = search.groupBy;
  const searchHue = search.hue;
  const searchStyle = search.style;
  const searchDetectOutliers = search.detect_outliers;
  const searchIncludeUnverified = search.include_unverified;

  const valueType = "series";

  const { data: metricValues, isLoading } = useQuery(
    diagnosticsListMetricValuesOptions({
      path: {
        provider_slug: providerSlug,
        diagnostic_slug: diagnosticSlug,
      },
      query: {
        ...Object.fromEntries(
          Object.entries(search).filter(
            ([key, value]) =>
              value !== undefined &&
              ![
                "tab",
                "groupBy",
                "hue",
                "style",
                "detect_outliers",
                "include_unverified",
              ].includes(key),
          ),
        ),
        type: "series",
        detect_outliers: search.detect_outliers,
        include_unverified: search.include_unverified,
      },
    }),
  );

  // Extract current filters (excluding tab, series, and outlier params)
  const currentFilters = useMemo(() => {
    const filtered = Object.fromEntries(
      Object.entries(search).filter(
        ([key, value]) =>
          value !== undefined &&
          ![
            "tab",
            "groupBy",
            "hue",
            "style",
            "detect_outliers",
            "include_unverified",
          ].includes(key),
      ),
    );
    // Ensure all values are strings, not undefined
    return Object.fromEntries(
      Object.entries(filtered).filter(([, value]) => value !== undefined),
    ) as Record<string, string>;
  }, [search]);

  // State to track current grouping configuration from the main chart
  const [currentGroupingConfig, setCurrentGroupingConfig] = useState({
    groupBy: search.groupBy,
    hue: search.hue,
    style: search.style,
  });

  // Track filtered data from the Values component
  const [filteredData, setFilteredData] = useState<
    (MetricValue | SeriesValue)[]
  >([]);

  // Callback to receive filtered data from Values component
  const handleFilteredDataChange = useCallback(
    (data: (MetricValue | SeriesValue)[]) => {
      setFilteredData(data);
    },
    [],
  );

  return (
    <div className="space-y-4">
      <Values
        facets={(metricValues as MetricValueCollection)?.facets ?? []}
        values={(metricValues as MetricValueCollection)?.data ?? []}
        loading={isLoading}
        hadOutliers={
          (metricValues as MetricValueCollection)?.had_outliers ?? undefined
        }
        outlierCount={
          (metricValues as MetricValueCollection)?.outlier_count ?? undefined
        }
        initialDetectOutliers={search.detect_outliers}
        onDetectOutliersChange={(value) => {
          navigate({
            search: { ...search, detect_outliers: String(value) } as any,
            replace: true,
          });
        }}
        initialIncludeUnverified={search.include_unverified}
        onIncludeUnverifiedChange={(value) => {
          navigate({
            search: { ...search, include_unverified: String(value) } as any,
            replace: true,
          });
        }}
        initialFilters={Object.entries(search)
          .filter(
            ([key, value]) =>
              value !== undefined &&
              ![
                "tab",
                "groupBy",
                "hue",
                "style",
                "detect_outliers",
                "include_unverified",
              ].includes(key),
          )
          .map(([facetKey, value]) => ({
            type: "facet",
            id: crypto.randomUUID(),
            facetKey,
            values: (value as string)
              .split(",")
              .map((v) => v.trim())
              .filter(Boolean), // Support comma-separated values
          }))}
        valueType={valueType}
        onFiltersChange={useCallback(
          (newFilters: any[]) => {
            // Build facet filter params
            const facetFilters = (newFilters ?? []).filter(
              (f) => f.type === "facet",
            );
            const filterParams =
              facetFilters.length > 0
                ? Object.fromEntries(
                    facetFilters.map((filter: any) => [
                      filter.facetKey,
                      filter.values.join(","),
                    ]),
                  )
                : {};

            // Collect isolate and exclude ids (may be multiple filters of each type)
            const isolateIds = (newFilters ?? [])
              .filter((f) => f.type === "isolate")
              .flatMap((f: any) => Array.from(f.ids ?? []));
            const excludeIds = (newFilters ?? [])
              .filter((f) => f.type === "exclude")
              .flatMap((f: any) => Array.from(f.ids ?? []));

            // Preserve tab, series visualization, and outlier parameters
            const otherParams: Record<string, string> = {
              ...(searchTab ? { tab: String(searchTab) } : {}),
              ...(searchGroupBy ? { groupBy: String(searchGroupBy) } : {}),
              ...(searchHue ? { hue: String(searchHue) } : {}),
              ...(searchStyle ? { style: String(searchStyle) } : {}),
              ...(searchDetectOutliers !== undefined
                ? { detect_outliers: String(searchDetectOutliers) }
                : {}),
              ...(searchIncludeUnverified !== undefined
                ? { include_unverified: String(searchIncludeUnverified) }
                : {}),
            };

            // Add isolate/exclude params if present
            if (isolateIds.length > 0) {
              otherParams.isolate_ids = isolateIds.join(",");
            }
            if (excludeIds.length > 0) {
              otherParams.exclude_ids = excludeIds.join(",");
            }

            navigate({
              search: { ...filterParams, ...otherParams } as any,
              replace: true,
            });
          },
          [
            searchTab,
            searchGroupBy,
            searchHue,
            searchStyle,
            searchDetectOutliers,
            searchIncludeUnverified,
            navigate,
          ],
        )}
        onCurrentGroupingChange={useCallback(
          (groupingConfig: {
            groupBy?: string;
            hue?: string;
            style?: string;
          }) => {
            // Update current grouping config state for card generator sync
            setCurrentGroupingConfig({
              groupBy: groupingConfig.groupBy,
              hue: groupingConfig.hue,
              style: groupingConfig.style,
            });
          },
          [],
        )}
        onFilteredDataChange={handleFilteredDataChange}
        onDownload={async () => {
          const response = await diagnosticsListMetricValues({
            path: {
              provider_slug: providerSlug,
              diagnostic_slug: diagnosticSlug,
            },
            query: {
              format: "csv",
              ...Object.fromEntries(
                Object.entries(search).filter(
                  ([key, value]) =>
                    value !== undefined &&
                    ![
                      "tab",
                      "groupBy",
                      "hue",
                      "style",
                      "detect_outliers",
                      "include_unverified",
                    ].includes(key),
                ),
              ),
              detect_outliers: search.detect_outliers,
              include_unverified: search.include_unverified,
            },
            meta: {
              // Tell the client to expect a text response, not JSON
              responseType: "text",
            },
          });
          const blob = new Blob([response.data as unknown as string], {
            type: "text/csv",
          });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `metric-values-${providerSlug}-${diagnosticSlug}.csv`;
          a.click();
          window.URL.revokeObjectURL(url);
        }}
      />

      {/* Card Template Generator - Inline for visibility */}
      <div className="mt-4 p-4 border rounded-lg bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-800">
        <h3 className="text-lg font-semibold mb-2">
          Generate Card Template - For MBTT
        </h3>
        <p className="text-sm text-gray-600 dark:text-muted-foreground mb-4">
          Create a template for this diagnostic to include in the data explorer.
        </p>
        <CardTemplateGenerator
          providerSlug={providerSlug}
          diagnosticSlug={diagnosticSlug}
          currentFilters={currentFilters}
          currentGroupingConfig={currentGroupingConfig}
          availableData={
            filteredData.length > 0
              ? filteredData
              : ((metricValues as MetricValueCollection)?.data ?? [])
          }
          currentTab="series"
        />
      </div>
    </div>
  );
};

export const Route = createFileRoute(
  "/_app/diagnostics/$providerSlug/$diagnosticSlug/series",
)({
  component: SeriesValuesTab,
  validateSearch: zodValidator(valuesSearchSchema),
});
