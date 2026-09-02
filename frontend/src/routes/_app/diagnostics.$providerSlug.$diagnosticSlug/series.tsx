import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { MipEraScope } from "@/components/charts/mipEraBar";
import { Values } from "@/components/execution/values";
import { useDiagnosticMetricValues } from "@/hooks/useDiagnosticMetricValues";
import { DEFAULT_PAGE_SIZE } from "@/hooks/useMetricValues";
import { useMipEra } from "@/hooks/useMipEra";
import { mipEraSearchFields } from "@/lib/mipEras";

const valuesSearchSchema = z
  .object({
    // Series visualization parameters
    groupBy: z.string().optional(),
    hue: z.string().optional(),
    style: z.string().optional(),
    // Outlier detection parameters
    detect_outliers: z.enum(["off", "iqr"]).default("iqr"),
    include_unverified: z.coerce
      .string()
      .default("false")
      .transform((v) => v === "true"),
    // Pagination parameters
    offset: z.coerce.number().int().nonnegative().default(0),
    limit: z.coerce.number().int().positive().default(DEFAULT_PAGE_SIZE),
    ...mipEraSearchFields,
  })
  .catchall(z.string().optional());

const SeriesValuesTab = () => {
  const { providerSlug, diagnosticSlug } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { mipEra, setMipEra } = useMipEra(search.mip_era);

  // The era has to reach the query, because outlier detection and pagination both run over
  // whatever it returns.
  const { metricValues, isLoading, initialFilters, pagination, handlers } =
    useDiagnosticMetricValues({
      providerSlug,
      diagnosticSlug,
      search: { ...search, mip_era: mipEra },
      valueType: "series",
      navigate,
    });

  return (
    <div className="space-y-4">
      <MipEraScope mipEra={mipEra} setMipEra={setMipEra}>
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
          valueType="series"
          onFiltersChange={handlers.onFiltersChange}
          onCurrentGroupingChange={handlers.onCurrentGroupingChange}
          onFilteredDataChange={handlers.onFilteredDataChange}
          onDownload={handlers.onDownload}
          pagination={pagination}
        />
      </MipEraScope>
    </div>
  );
};

export const Route = createFileRoute(
  "/_app/diagnostics/$providerSlug/$diagnosticSlug/series",
)({
  component: SeriesValuesTab,
  validateSearch: zodValidator(valuesSearchSchema),
  staticData: {
    title: "Series Values",
  },
});
