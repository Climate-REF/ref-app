import type { CatalogDiagnostic } from "./diagnosticCatalog";
import {
  type FacetDescriptor,
  type FacetOption,
  type FacetSelections,
  facetOptions,
  matchesFacetSelections,
} from "./facetedFilter";

/** What the diagnostics catalog is narrowed to */
export interface DiagnosticFilterState {
  /** Text to find in the name, description or provider */
  search: string;
  /** Provider slugs */
  providers: string[];
  /** CMIP7 AFT diagnostic ids */
  aftIds: string[];
  /** CMIP7 AFT themes */
  themes: string[];
  /** Keep only diagnostics with (true) or without (false) metric values, or null for all */
  metricValues: boolean | null;
}

export const NO_DIAGNOSTIC_FILTERS: DiagnosticFilterState = {
  search: "",
  providers: [],
  aftIds: [],
  themes: [],
  metricValues: null,
};

export function hasActiveFilters(filters: DiagnosticFilterState): boolean {
  return filters.search !== "" || hasSelections(filters);
}

/** Whether anything other than the search is filtered on */
export function hasSelections(filters: DiagnosticFilterState): boolean {
  return (
    filters.providers.length > 0 ||
    filters.aftIds.length > 0 ||
    filters.themes.length > 0 ||
    filters.metricValues !== null
  );
}

/** The text search, which is case-insensitive and does nothing when blank */
function matchesSearch(diagnostic: CatalogDiagnostic, search: string): boolean {
  const needle = search.toLowerCase();
  return [
    diagnostic.name,
    diagnostic.description,
    diagnostic.provider.name,
    diagnostic.provider.slug,
  ].some((field) => field?.toLowerCase().includes(needle));
}

/** The search as a base filter, so a whitespace-only search keeps every diagnostic. */
const searchFilter =
  (search: string) =>
  (diagnostic: CatalogDiagnostic): boolean =>
    !search.trim() || matchesSearch(diagnostic, search);

const METRIC_VALUES = ["true", "false"] as const;

/**
 * The diagnostic facets. Metric values overrides matching so diagnostics whose flags
 * have not loaded yet are kept by either choice rather than treated as false.
 */
const diagnosticFacetDescriptors: FacetDescriptor<CatalogDiagnostic>[] = [
  {
    key: "providers",
    valuesOf: (diagnostic) => [diagnostic.provider.slug],
  },
  {
    key: "aftIds",
    valuesOf: (diagnostic) =>
      diagnostic.aft_link ? [diagnostic.aft_link.id] : [],
  },
  {
    key: "themes",
    valuesOf: (diagnostic) =>
      diagnostic.aft_link?.theme ? [diagnostic.aft_link.theme] : [],
  },
  {
    key: "metricValues",
    valuesOf: (diagnostic) =>
      diagnostic.has_metric_values === null
        ? METRIC_VALUES
        : [diagnostic.has_metric_values ? "true" : "false"],
    matches: (diagnostic, selected) =>
      selected.some((value) =>
        value === "true"
          ? diagnostic.has_metric_values !== false
          : value === "false"
            ? diagnostic.has_metric_values !== true
            : false,
      ),
  },
];

/** The facet selections held by a filter state, with metric values as text. */
function diagnosticFacetSelections(
  filters: DiagnosticFilterState,
): FacetSelections {
  return {
    providers: filters.providers,
    aftIds: filters.aftIds,
    themes: filters.themes,
    metricValues:
      filters.metricValues === null ? [] : [`${filters.metricValues}`],
  };
}

/**
 * Keep the diagnostics matching the search and every facet selection.
 *
 * Diagnostics whose metric value flags have not loaded yet are kept by the metric values filter.
 */
export function filterDiagnostics(
  diagnostics: CatalogDiagnostic[],
  filters: DiagnosticFilterState,
): CatalogDiagnostic[] {
  const matchesSearchFilter = searchFilter(filters.search);
  const selections = diagnosticFacetSelections(filters);
  return diagnostics.filter(
    (diagnostic) =>
      matchesSearchFilter(diagnostic) &&
      matchesFacetSelections(
        diagnostic,
        diagnosticFacetDescriptors,
        selections,
      ),
  );
}

/** The options each diagnostics filter offers, counted against the other filters. */
export interface DiagnosticFilterOptions {
  providers: FacetOption[];
  aftLinks: { id: string; name: string; count: number }[];
  themes: FacetOption[];
  metricValues: FacetOption[];
}

export function diagnosticFilterOptions(
  diagnostics: CatalogDiagnostic[],
  filters: DiagnosticFilterState,
): DiagnosticFilterOptions {
  const options = facetOptions(
    diagnostics,
    diagnosticFacetDescriptors,
    diagnosticFacetSelections(filters),
    searchFilter(filters.search),
  );

  const aftNames = new Map<string, string>();
  for (const { aft_link } of diagnostics) {
    if (aft_link) {
      aftNames.set(aft_link.id, aft_link.name || aft_link.id);
    }
  }

  const metricCounts = new Map(
    (options.metricValues ?? []).map((option) => [option.value, option.count]),
  );

  return {
    providers: options.providers ?? [],
    aftLinks: (options.aftIds ?? []).map(({ value, count }) => ({
      id: value,
      name: aftNames.get(value) ?? value,
      count,
    })),
    themes: options.themes ?? [],
    // Both choices are always offered, with no count when no diagnostic offers them.
    metricValues: METRIC_VALUES.map((value) => ({
      value,
      count: metricCounts.get(value) ?? 0,
    })),
  };
}

/** The filters as the catalog's URL search params, with lists joined by commas */
export interface DiagnosticFilterSearch {
  search?: string;
  providers?: string;
  aftIds?: string;
  themes?: string;
  metricValues?: "true" | "false";
}

const splitList = (value: string | undefined) =>
  value?.split(",").filter(Boolean) ?? [];

const joinList = (values: string[]) =>
  values.length > 0 ? values.join(",") : undefined;

export function parseDiagnosticFilters(
  search: DiagnosticFilterSearch,
): DiagnosticFilterState {
  return {
    search: search.search ?? "",
    providers: splitList(search.providers),
    aftIds: splitList(search.aftIds),
    themes: splitList(search.themes),
    metricValues:
      search.metricValues === undefined ? null : search.metricValues === "true",
  };
}

/** Turn the filters into URL search params, leaving out the ones not filtered on. */
export function serialiseDiagnosticFilters(
  filters: DiagnosticFilterState,
): DiagnosticFilterSearch {
  return {
    search: filters.search || undefined,
    providers: joinList(filters.providers),
    aftIds: joinList(filters.aftIds),
    themes: joinList(filters.themes),
    metricValues:
      filters.metricValues === null ? undefined : `${filters.metricValues}`,
  };
}
