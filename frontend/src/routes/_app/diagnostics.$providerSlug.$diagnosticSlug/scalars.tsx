import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { useCallback, useMemo, useState } from "react";
import { z } from "zod";
import { diagnosticsListMetricValues } from "@/client";
import { diagnosticsListMetricValuesOptions } from "@/client/@tanstack/react-query.gen.ts";
import { CardTemplateGenerator } from "@/components/diagnostics/cardTemplateGenerator";
import { Values } from "@/components/execution/values";
import type { MetricValueCollection } from "@/components/execution/values/types.ts";

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

const filterNonEmptyValues = (search: Record<string, string | undefined>) => {
  return Object.entries(search).filter(
    ([, v]) => v !== undefined && v !== null && String(v).length > 0,
  );
};

export const ScalarsValuesTab = () => {
  const { providerSlug, diagnosticSlug } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const { data: metricValues, isLoading } = useQuery(
    diagnosticsListMetricValuesOptions({
      path: {
        provider_slug: providerSlug,
        diagnostic_slug: diagnosticSlug,
      },
      query: {
        ...Object.fromEntries(filterNonEmptyValues(search)),
        type: "scalar",
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
        initialFilters={(() => {
          // Build facet filters from URL search params (same as before)
          const facetFilters = Object.entries(search)
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
              // Normalize comma-separated values from the URL:
              // - split on commas
              // - trim whitespace
              // - remove empty tokens
              values: (value as string)
                .split(",")
                .map((v) => v.trim())
                .filter(Boolean),
            }));

          // Parse isolate/exclude id params from URL and convert into initial filters.
          const combinedFilters: any[] = [...facetFilters];

          if (search.isolate_ids) {
            const isolateIds = String(search.isolate_ids)
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
            if (isolateIds.length > 0) {
              combinedFilters.push({
                type: "isolate",
                id: crypto.randomUUID(),
                ids: new Set(isolateIds),
              });
            }
          }

          if (search.exclude_ids) {
            const excludeIds = String(search.exclude_ids)
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
            if (excludeIds.length > 0) {
              combinedFilters.push({
                type: "exclude",
                id: crypto.randomUUID(),
                ids: new Set(excludeIds),
              });
            }
          }

          return combinedFilters;
        })()}
        valueType={"scalars"}
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
              ...(search.tab ? { tab: String(search.tab) } : {}),
              ...(search.groupBy ? { groupBy: String(search.groupBy) } : {}),
              ...(search.hue ? { hue: String(search.hue) } : {}),
              ...(search.style ? { style: String(search.style) } : {}),
              ...(search.detect_outliers !== undefined
                ? { detect_outliers: String(search.detect_outliers) }
                : {}),
              ...(search.include_unverified !== undefined
                ? { include_unverified: String(search.include_unverified) }
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
          [search, navigate],
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
        onDownload={async () => {
          const response = await diagnosticsListMetricValues({
            path: {
              provider_slug: providerSlug,
              diagnostic_slug: diagnosticSlug,
            },
            query: {
              format: "csv",
              ...Object.fromEntries(filterNonEmptyValues(search)),
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
          availableData={(metricValues as MetricValueCollection)?.data ?? []}
          currentTab="scalars"
        />
      </div>
    </div>
  );
};

export const Route = createFileRoute(
  "/_app/diagnostics/$providerSlug/$diagnosticSlug/scalars",
)({
  component: ScalarsValuesTab,
  validateSearch: zodValidator(valuesSearchSchema),
});
