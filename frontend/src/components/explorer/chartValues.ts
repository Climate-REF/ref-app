import { diagnosticsListMetricValues } from "@/client/sdk.gen";
import { downloadBlob } from "@/lib/downloadUtils";
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

/**
 * Download the values a chart card shows as a CSV file
 *
 * The file holds every matching value, as the CSV export ignores the chart's limit.
 * Throws if the request fails.
 */
export async function downloadChartValues(
  card: { provider: string; diagnostic: string },
  query: MetricValuesQuery,
): Promise<void> {
  // TODO: replace with generic fetchDownload from useMetricValues when available
  const { data, error } = await diagnosticsListMetricValues({
    path: { provider_slug: card.provider, diagnostic_slug: card.diagnostic },
    query: { ...query, format: "csv" },
    parseAs: "blob",
  });
  if (error) throw error;
  downloadBlob(
    data as unknown as Blob,
    `${card.provider}-${card.diagnostic}-values.csv`,
  );
}
