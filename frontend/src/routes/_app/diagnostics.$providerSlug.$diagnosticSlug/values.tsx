import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { useMemo } from "react";
import { z } from "zod";
import { diagnosticsListMetricValues } from "@/client";
import { diagnosticsListMetricValuesOptions } from "@/client/@tanstack/react-query.gen.ts";
import { CardTemplateGenerator } from "@/components/diagnostics/cardTemplateGenerator";
import { Values } from "@/components/execution/values";
import type { MetricValueCollection } from "@/components/execution/values/types.ts";

const valuesSearchSchema = z
  .object({
    // View type parameter
    view: z.enum(["table", "bar", "series"]).optional(),
    // Series visualization parameters
    groupBy: z.string().optional(),
    hue: z.string().optional(),
    style: z.string().optional(),
  })
  .catchall(z.string().optional());

const filterNonEmptyValues = (search: Record<string, string | undefined>) => {
  return Object.entries(search).filter(
    ([, v]) => v !== undefined && v !== null && String(v).length > 0
  );
};

export const ValuesTab = () => {
  const { providerSlug, diagnosticSlug } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const { data: metricValues, isLoading } = useQuery(
    diagnosticsListMetricValuesOptions({
      path: {
        provider_slug: providerSlug,
        diagnostic_slug: diagnosticSlug,
      },
      query: Object.fromEntries(filterNonEmptyValues(search)),
    })
  );

  // Extract available dimensions from the data for the card template generator
  const availableDimensions = useMemo(() => {
    const collection = metricValues as MetricValueCollection;
    if (!collection?.data) return [];

    const dimensions = new Set<string>();
    collection.data.forEach((item) => {
      if (item.dimensions) {
        Object.keys(item.dimensions).forEach((dim) => dimensions.add(dim));
      }
    });
    return Array.from(dimensions).sort();
  }, [metricValues]);

  // Extract current filters (excluding view and series params)
  const currentFilters = useMemo(() => {
    const filtered = Object.fromEntries(
      Object.entries(search).filter(
        ([key, value]) =>
          value !== undefined &&
          !["view", "groupBy", "hue", "style"].includes(key)
      )
    );
    // Ensure all values are strings, not undefined
    return Object.fromEntries(
      Object.entries(filtered).filter(([, value]) => value !== undefined)
    ) as Record<string, string>;
  }, [search]);

  return (
    <div className="space-y-4">
      <Values
        facets={(metricValues as MetricValueCollection)?.facets ?? []}
        values={(metricValues as MetricValueCollection)?.data ?? []}
        loading={isLoading}
        initialFilters={Object.entries(search)
          .filter(
            ([key, value]) =>
              value !== undefined &&
              !["view", "groupBy", "hue", "style"].includes(key)
          )
          .map(([facetKey, value]) => ({
            id: crypto.randomUUID(),
            facetKey,
            value: value as string,
          }))}
        initialViewType={search.view as "table" | "bar" | "series" | undefined}
        seriesParams={{
          groupBy: search.groupBy,
          hue: search.hue,
          style: search.style,
        }}
        onViewTypeChange={(viewType) => {
          console.log("onViewTypeChange called with:", viewType);
          console.log("current search:", search);

          // Preserve existing parameters
          const existingParams = Object.fromEntries(
            Object.entries(search).filter(([key]) => !["view"].includes(key))
          );

          console.log("existingParams:", existingParams);
          const newSearch = { ...existingParams, view: viewType };
          console.log("newSearch:", newSearch);

          navigate({
            search: newSearch,
            replace: true,
          });
        }}
        onFiltersChange={(newFilters) => {
          const filterParams =
            newFilters.length > 0
              ? Object.fromEntries(
                  newFilters.map((filter) => [filter.facetKey, filter.value])
                )
              : {};

          // Preserve view type and series visualization parameters
          const otherParams = {
            ...(search.view && { view: search.view }),
            ...(search.groupBy && { groupBy: search.groupBy }),
            ...(search.hue && { hue: search.hue }),
            ...(search.style && { style: search.style }),
          };

          navigate({
            search: { ...filterParams, ...otherParams },
            replace: true,
          });
        }}
        onSeriesParamsChange={(seriesParams) => {
          // Preserve existing filter parameters
          const filterParams = Object.fromEntries(
            Object.entries(search).filter(
              ([key]) => !["groupBy", "hue", "style"].includes(key)
            )
          );

          navigate({
            search: { ...filterParams, ...seriesParams },
            replace: true,
          });
        }}
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
      <div className="mt-4 p-4 border rounded-lg bg-gray-50">
        <h3 className="text-lg font-semibold mb-2">Generate Card Template</h3>
        <p className="text-sm text-gray-600 mb-4">
          Create a template for this diagnostic to include in the data explorer.
        </p>
        <CardTemplateGenerator
          providerSlug={providerSlug}
          diagnosticSlug={diagnosticSlug}
          currentFilters={currentFilters}
          seriesParams={{
            groupBy: search.groupBy,
            hue: search.hue,
            style: search.style,
          }}
          availableDimensions={availableDimensions}
          availableData={(metricValues as MetricValueCollection)?.data ?? []}
          currentTab="values"
          currentViewType={
            search.view as "table" | "bar" | "series" | undefined
          }
        />
      </div>
    </div>
  );
};

export const Route = createFileRoute(
  "/_app/diagnostics/$providerSlug/$diagnosticSlug/values"
)({
  component: ValuesTab,
  validateSearch: zodValidator(valuesSearchSchema),
});
