import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { diagnosticsListMetricValues } from "@/client";
import { diagnosticsListMetricValuesOptions } from "@/client/@tanstack/react-query.gen.ts";
import { Values } from "@/components/execution/values";
import type { MetricValueCollection } from "@/components/execution/values/types.ts";

const valuesSearchSchema = z.object({}).catchall(z.string().optional());

const filterNonEmptyValues = (search: Record<string, string | undefined>) => {
  return Object.entries(search).filter(
    ([, v]) => v !== undefined && v !== null && String(v).length > 0,
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
    }),
  );

  return (
    <div className="space-y-4">
      <Values
        facets={(metricValues as MetricValueCollection)?.facets ?? []}
        values={(metricValues as MetricValueCollection)?.data ?? []}
        loading={isLoading}
        initialFilters={Object.entries(search)
          .filter(([, value]) => value !== undefined)
          .map(([facetKey, value]) => ({
            id: crypto.randomUUID(),
            facetKey,
            value: value as string,
          }))}
        onFiltersChange={(newFilters) => {
          navigate({
            search:
              newFilters.length > 0
                ? Object.fromEntries(
                    newFilters.map((filter) => [filter.facetKey, filter.value]),
                  )
                : {},
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
    </div>
  );
};

export const Route = createFileRoute(
  "/_app/diagnostics/$providerSlug/$diagnosticSlug/values",
)({
  component: ValuesTab,
  validateSearch: zodValidator(valuesSearchSchema),
});
