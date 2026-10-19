import type { MetricFilter } from "@/components/explorer/types";
import { parseCommaList } from "./metricFilters";

export const DEFAULT_PAGE_SIZE = 50;

// Search params that are not facet filters
const NOT_FACET_PARAMS = [
  "tab",
  "groupBy",
  "hue",
  "style",
  "detect_outliers",
  "include_unverified",
  "mip_era",
  "isolate_ids",
  "exclude_ids",
  "offset",
  "limit",
  "execution_id",
];

// Search params kept when the filters change
const KEPT_ON_FILTER_CHANGE = [
  "tab",
  "groupBy",
  "hue",
  "style",
  "detect_outliers",
  "include_unverified",
  "mip_era",
  "limit",
];

type Search = Record<string, unknown>;

/**
 * The filters a values tab's search params describe
 *
 * Every param that is not a view, outlier, era or pagination param filters its facet by a comma separated list of values.
 * `isolate_ids` and `exclude_ids` become an isolate and an exclude filter.
 */
export function searchToFilters(search: Search): MetricFilter[] {
  const filters: MetricFilter[] = Object.entries(search)
    .filter(
      ([key, value]) => value !== undefined && !NOT_FACET_PARAMS.includes(key),
    )
    .map(([facetKey, value]) => ({
      type: "facet",
      id: crypto.randomUUID(),
      facetKey,
      values: parseCommaList(String(value)),
    }));

  for (const type of ["isolate", "exclude"] as const) {
    const ids = parseCommaList(String(search[`${type}_ids`] ?? ""));
    if (ids.length > 0) {
      filters.push({ type, id: crypto.randomUUID(), ids: new Set(ids) });
    }
  }
  return filters;
}

/**
 * The search params for `filters`, going back to the first page
 *
 * The view, outlier, era and page size params of `search` are kept, any other param is replaced.
 */
export function filtersToSearch(
  filters: MetricFilter[],
  search: Search,
): Search {
  const params: Search = {};
  for (const filter of filters) {
    if (filter.type === "facet") {
      params[filter.facetKey] = filter.values.join(",");
    }
  }
  for (const key of KEPT_ON_FILTER_CHANGE) {
    if (search[key]) {
      params[key] = search[key];
    }
  }
  for (const type of ["isolate", "exclude"] as const) {
    const ids = filters.flatMap((filter) =>
      filter.type === type ? Array.from(filter.ids) : [],
    );
    if (ids.length > 0) {
      params[`${type}_ids`] = ids.join(",");
    }
  }
  return { ...params, offset: 0 };
}
