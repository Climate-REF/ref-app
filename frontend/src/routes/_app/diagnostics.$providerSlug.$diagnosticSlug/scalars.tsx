import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { CardTemplateGenerator } from "@/components/diagnostics/cardTemplateGenerator";
import { Values } from "@/components/execution/values";
import { useDiagnosticValuesTab } from "@/hooks/useDiagnosticValuesTab";

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

export const ScalarsValuesTab = () => {
  const { providerSlug, diagnosticSlug } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const {
    metricValues,
    isLoading,
    currentFilters,
    currentGroupingConfig,
    initialFilters,
    isolateIds,
    excludeIds,
    handlers,
  } = useDiagnosticValuesTab({
    providerSlug,
    diagnosticSlug,
    search,
    valueType: "scalar",
    navigate,
  });

  return (
    <div className="space-y-4">
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
        valueType="scalars"
        onFiltersChange={handlers.onFiltersChange}
        onCurrentGroupingChange={handlers.onCurrentGroupingChange}
        onDownload={handlers.onDownload}
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
          availableData={metricValues?.data ?? []}
          currentTab="scalars"
          isolateIds={isolateIds}
          excludeIds={excludeIds}
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
  staticData: {
    title: "Scalar Values",
  },
});
