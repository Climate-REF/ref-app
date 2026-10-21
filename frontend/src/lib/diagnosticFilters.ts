import type { CatalogDiagnostic } from "./diagnosticCatalog";

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

function matchesSearch(diagnostic: CatalogDiagnostic, search: string) {
  const needle = search.toLowerCase();
  return [
    diagnostic.name,
    diagnostic.description,
    diagnostic.provider.name,
    diagnostic.provider.slug,
  ].some((field) => field?.toLowerCase().includes(needle));
}

/** Whether `value` is one of the selections, where selecting nothing keeps everything */
const isSelected = (selected: string[], value: string | null | undefined) =>
  selected.length === 0 || (value != null && selected.includes(value));

/**
 * Keep the diagnostics matching every filter, and any of the selections within each filter
 *
 * Diagnostics whose metric value flags have not loaded yet are kept by the metric values filter.
 */
export function filterDiagnostics(
  diagnostics: CatalogDiagnostic[],
  { search, providers, aftIds, themes, metricValues }: DiagnosticFilterState,
): CatalogDiagnostic[] {
  return diagnostics.filter(
    (diagnostic) =>
      (!search.trim() || matchesSearch(diagnostic, search)) &&
      isSelected(providers, diagnostic.provider.slug) &&
      isSelected(aftIds, diagnostic.aft_link?.id) &&
      isSelected(themes, diagnostic.aft_link?.theme) &&
      (metricValues === null ||
        diagnostic.has_metric_values === null ||
        diagnostic.has_metric_values === metricValues),
  );
}

/** The values each diagnostics filter can select, sorted */
export interface DiagnosticFilterOptions {
  providers: string[];
  aftLinks: { id: string; name: string }[];
  themes: string[];
}

export function diagnosticFilterOptions(
  diagnostics: CatalogDiagnostic[],
): DiagnosticFilterOptions {
  const aftLinks = new Map<string, { id: string; name: string }>();
  const themes = new Set<string>();
  for (const { aft_link } of diagnostics) {
    if (aft_link) {
      aftLinks.set(aft_link.id, { id: aft_link.id, name: aft_link.name });
      if (aft_link.theme) {
        themes.add(aft_link.theme);
      }
    }
  }
  return {
    providers: [...new Set(diagnostics.map((d) => d.provider.slug))].sort(),
    aftLinks: [...aftLinks.values()].sort((a, b) => a.id.localeCompare(b.id)),
    themes: [...themes].sort(),
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
