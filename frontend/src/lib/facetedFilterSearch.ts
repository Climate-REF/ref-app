import { z } from "zod";
import type { FacetSelections } from "./facetedFilter";
import { joinCommaList, parseCommaList } from "./metricFilters";

export interface FacetedFilterState {
  text: string;
  selections: FacetSelections;
}

export const NO_FACETED_FILTER: FacetedFilterState = {
  text: "",
  selections: {},
};

/** The string a search param value stands for, or undefined when it is not a single value. */
function paramText(value: unknown): string | undefined {
  return typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
    ? String(value)
    : undefined;
}

/**
 * A catch-all search param value, coerced to the string a facet value is.
 *
 * The router parses values that look like JSON, so `?x=null` or `?x=[1]` arrive as null or
 * an array. Those are dropped rather than failing the route's search validation.
 */
export const facetedFilterParam = z.unknown().transform(paramText);

/** The namespace prefix every filter param of `namespace` starts with. */
function prefixOf(namespace: string): string {
  return `${namespace}.`;
}

/** The search param holding the text filter of `namespace`. */
function textParamOf(namespace: string): string {
  return `${prefixOf(namespace)}q`;
}

/**
 * Read the filter of one namespace from a route's search params.
 *
 * All params are `<namespace>.q` for the text filter and `<namespace>.<facetKey>`
 * for a facet, with values comma separated (`\,` is a comma inside a value). Every other
 * param is ignored. Without a text param the text is `defaultText`.
 */
export function parseFacetedFilter(
  search: Record<string, unknown>,
  namespace: string,
  defaultText = "",
): FacetedFilterState {
  const prefix = prefixOf(namespace);
  const textParam = textParamOf(namespace);
  const selections: FacetSelections = {};

  for (const [key, value] of Object.entries(search)) {
    if (!key.startsWith(prefix) || key === textParam) {
      continue;
    }
    const text = paramText(value);
    if (text === undefined) {
      continue;
    }
    const values = parseCommaList(text);
    if (values.length > 0) {
      selections[key.slice(prefix.length)] = values;
    }
  }

  return {
    text: paramText(search[textParam]) ?? defaultText,
    selections,
  };
}

/**
 * Replace one namespace's params with `filter`, leaving every other search param alone.
 *
 * Text equal to `defaultText` and empty selections remove their params rather than writing
 * blanks. Any other text is written as it is, so clearing a default text is kept as an empty
 * text param and text made only of spaces is kept too.
 */
export function writeFacetedFilter<T extends Record<string, unknown>>(
  search: T,
  namespace: string,
  filter: FacetedFilterState,
  defaultText = "",
): T {
  const prefix = prefixOf(namespace);
  const next: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(search)) {
    if (!key.startsWith(prefix)) {
      next[key] = value;
    }
  }

  if (filter.text !== defaultText) {
    next[textParamOf(namespace)] = filter.text;
  }
  for (const [facetKey, values] of Object.entries(filter.selections)) {
    if (values.length > 0) {
      next[`${prefix}${facetKey}`] = joinCommaList(values);
    }
  }

  return next as T;
}
