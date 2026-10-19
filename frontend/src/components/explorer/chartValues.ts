import type { MetricValuesQuery } from "./content/useExplorerMetricValues";

/**
 * The search of the values page listing the values a chart card shows
 *
 * The page pages through the values itself, so the chart's limit is left out.
 * Outliers are detected and unverified values hidden unless the chart says otherwise.
 */
export function chartValuesSearch(
  query: MetricValuesQuery,
): Record<string, string> {
  const {
    value_type: _valueType,
    limit: _limit,
    offset: _offset,
    format: _format,
    detect_outliers,
    include_unverified,
    ...filters
  } = query;
  const search: Record<string, string> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value !== null && value !== undefined) {
      search[key] = String(value);
    }
  }
  return {
    ...search,
    detect_outliers: detect_outliers ?? "iqr",
    include_unverified: String(include_unverified ?? false),
  };
}
