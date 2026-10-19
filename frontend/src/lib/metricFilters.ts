import type { FacetFilter, MetricFilter } from "@/components/explorer/types";

/**
 * Split a comma separated list, trimming each entry and dropping empty ones.
 */
export function parseCommaList(text: string): string[] {
  return text
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/**
 * The values matching every facet filter in `filters`
 *
 * A value matches a facet filter when its dimension is one of the filter's values, ignoring surrounding whitespace.
 * Isolate and exclude filters are left to the API.
 */
export function applyFacetFilters<
  T extends { dimensions: Record<string, unknown> },
>(values: T[], filters: MetricFilter[]): T[] {
  const facetFilters = filters.filter(
    (filter): filter is FacetFilter => filter.type === "facet",
  );
  if (facetFilters.length === 0) {
    return values;
  }
  return values.filter((value) =>
    facetFilters.every((filter) => {
      const dimension = value.dimensions[filter.facetKey];
      if (dimension === undefined || dimension === null) {
        return false;
      }
      return filter.values
        .map((v) => String(v).trim())
        .includes(String(dimension).trim());
    }),
  );
}
