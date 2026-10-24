import { useSuspenseQuery } from "@tanstack/react-query";
import { diagnosticsListMetricValuesOptions } from "@/client/@tanstack/react-query.gen";
import type {
  DiagnosticsListMetricValuesData,
  MetricValueCollection,
} from "@/client/types.gen";
import { useSelectedMipEra } from "@/components/charts/mipEraContext";
import { type FilterableCard, useFilterControls } from "./filterControls";

/** The query parameters of the metric values a chart card shows, with its dimension filters. */
export type MetricValuesQuery = DiagnosticsListMetricValuesData["query"] & {
  [dimension: string]: string | number | boolean | null | undefined;
};

/** Query parameters a chart adds on top of the card's filters, such as outlier handling. */
export type ExtraMetricValuesQuery = Pick<
  MetricValuesQuery,
  "detect_outliers" | "include_unverified"
>;

/**
 * The metric values a chart card shows, with the bar of its filter controls and the query
 *
 * The card's filters and the filter controls are applied first, so they cannot override
 * the value type, the limit or the selected MIP era.
 * Suspends until the values are in.
 */
export function useExplorerMetricValues(
  contentItem: FilterableCard,
  valueType: "scalar" | "series",
  extraQuery: ExtraMetricValuesQuery = {},
) {
  const selectedMipEra = useSelectedMipEra();
  const { filterBar, queryFilters } = useFilterControls(contentItem, valueType);

  const query: MetricValuesQuery = {
    ...queryFilters,
    ...extraQuery,
    value_type: valueType,
    limit: 500,
    // Outlier detection runs over whatever the query returns, so the era has to be filtered
    // here rather than when the sections are split.
    mip_era: selectedMipEra ?? undefined,
  };
  const { data } = useSuspenseQuery(
    diagnosticsListMetricValuesOptions({
      path: {
        provider_slug: contentItem.provider,
        diagnostic_slug: contentItem.diagnostic,
      },
      // The filter controls read the facets on their own
      query: { ...query, with_facets: false },
    }),
  );

  return { filterBar, collection: data as MetricValueCollection, query };
}
