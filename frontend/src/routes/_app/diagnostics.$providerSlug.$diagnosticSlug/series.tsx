import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { useMemo, useState } from "react";
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

export const SeriesValuesTab = () => {
  const { providerSlug, diagnosticSlug } = Route.useParams() as {
    providerSlug: string;
    diagnosticSlug: string;
  };
  const search = Route.useSearch() as typeof valuesSearchSchema._type;
  const navigate = useNavigate({ from: Route.fullPath });

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
  const [currentGroupingConfig, _] = useState({
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
            id: crypto.randomUUID(),
            facetKey,
            value: value as string,
          }))}
        valueType={valueType}
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
          availableData={(metricValues as MetricValueCollection)?.data ?? []}
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
