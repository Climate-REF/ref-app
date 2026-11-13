import type { ExecutionGroup, ExecutionOutput } from "@/client";
import {
  type FacetDescriptor,
  type FacetOption,
  type FacetSelections,
  facetOptions,
  matchesFacetSelections,
} from "@/lib/facetedFilter";

/** A figure and the execution group that produced it */
export interface FigureWithGroup {
  figure: ExecutionOutput;
  executionGroup: ExecutionGroup;
}

/**
 * The plots of each group's latest execution
 *
 * Earlier executions are left out, so a group's figures are not shown twice or out of date.
 */
export function collectLatestPlotFigures(
  groups: ExecutionGroup[],
): FigureWithGroup[] {
  return groups.flatMap((group) =>
    // Executions are oldest first, so the last one is the latest
    (group.executions.at(-1)?.outputs ?? [])
      .filter((output) => output.output_type === "plot")
      .map((figure) => ({ figure, executionGroup: group })),
  );
}

/**
 * A group's values for one selector key
 *
 * Selectors are grouped by source type, so the same key can hold values in several
 * source types. All of them are values of the facet.
 */
function selectorValues(
  selectors: ExecutionGroup["selectors"],
  key: string,
): string[] {
  return Object.values(selectors).flatMap((pairs) =>
    pairs.filter(([pairKey]) => pairKey === key).map(([, value]) => value),
  );
}

/**
 * The facet value of a figure that offers no value for the facet's key
 *
 * Some figures are not tagged with a dimension that others are, for example plots from
 * executions that ran before the diagnostic tagged its outputs. They get this value, so
 * they can still be picked and are not hidden by every selection of the facet.
 */
export const UNKNOWN_FACET_VALUE = "(unknown)";

/**
 * A figure's values for one facet key
 *
 * The dimension the figure itself is tagged with is the most precise, since a group can
 * cover several variables or regions while each plot shows one. Without it the group's
 * selectors are used, and without those the figure's value is unknown.
 */
function figureValues(
  { figure, executionGroup }: FigureWithGroup,
  key: string,
) {
  const dimension = figure.dimensions?.[key];
  if (dimension !== undefined) {
    return [dimension];
  }
  const selected = selectorValues(executionGroup.selectors, key);
  return selected.length > 0 ? selected : [UNKNOWN_FACET_VALUE];
}

/** The keys the figures' dimensions and their groups' selectors offer. */
function offeredKeys(figures: FigureWithGroup[]): Set<string> {
  const keys = new Set<string>();
  for (const { figure, executionGroup } of figures) {
    for (const key of Object.keys(figure.dimensions ?? {})) {
      keys.add(key);
    }
    for (const pairs of Object.values(executionGroup.selectors)) {
      for (const [key] of pairs) {
        keys.add(key);
      }
    }
  }
  return keys;
}

/** Whether the figures offer more than one value for `key`, so filtering by it can narrow them. */
function variesAcross(figures: FigureWithGroup[], key: string): boolean {
  const values = new Set<string>();
  for (const item of figures) {
    for (const value of figureValues(item, key)) {
      values.add(value);
      if (values.size > 1) return true;
    }
  }
  return false;
}

/**
 * One descriptor per key the figures offer values of, sorted by key, plus any selected key
 *
 * Keys come from the figures' own dimensions and from their groups' selectors, only for
 * the figures passed in, so a group without plot outputs contributes none. A key whose
 * value is the same for every figure is left out, since filtering by it changes nothing.
 *
 * A selection left over from an older URL must not be silently ignored: its key keeps a
 * descriptor even when no figure offers it, so items match it only if they offer one of
 * the selected values, which none of them do. Its options therefore stay empty while
 * `withUnavailableSelections` keeps the selected value visible with count 0.
 */
function descriptorsFor(
  figures: FigureWithGroup[],
  selections: FacetSelections,
): FacetDescriptor<FigureWithGroup>[] {
  const figureKeys = offeredKeys(figures);
  const keys = new Set(
    [...figureKeys].filter((key) => variesAcross(figures, key)),
  );
  for (const [key, values] of Object.entries(selections)) {
    if (values.length > 0) {
      keys.add(key);
    }
  }

  return [...keys]
    .sort((a, b) => a.localeCompare(b))
    .map((key) =>
      figureKeys.has(key)
        ? { key, valuesOf: (item) => figureValues(item, key) }
        : { key, valuesOf: () => [] },
    );
}

/** Compile `text` as a case-insensitive regular expression, or null when it is not a valid one */
function compilePattern(text: string): RegExp | null {
  try {
    return new RegExp(text, "i");
  } catch {
    return null;
  }
}

/**
 * Whether `text` matches the figure's description or filename
 *
 * Text that is empty or not a valid regular expression does not filter.
 */
function matchesText(
  { figure }: FigureWithGroup,
  pattern: RegExp | null,
): boolean {
  return (
    !pattern ||
    [figure.description, figure.filename].some(
      (field) => field != null && pattern.test(field),
    )
  );
}

/** The text filter compiled once for a set of figures. */
function textPattern(text: string): RegExp | null {
  return text ? compilePattern(text) : null;
}

/**
 * The options of every figure facet, counted against the text filter and every
 * *other* active facet, so a facet's own selection does not hide its options.
 */
export function figureFacetOptions(
  figures: FigureWithGroup[],
  text: string,
  selections: FacetSelections,
): Record<string, FacetOption[]> {
  const pattern = textPattern(text);
  const options = facetOptions(
    figures,
    descriptorsFor(figures, selections),
    selections,
    (item) => matchesText(item, pattern),
  );
  // The unknown value is not a value like the others, so it is listed after them.
  return Object.fromEntries(
    Object.entries(options).map(([key, values]) => [
      key,
      [
        ...values.filter(({ value }) => value !== UNKNOWN_FACET_VALUE),
        ...values.filter(({ value }) => value === UNKNOWN_FACET_VALUE),
      ],
    ]),
  );
}

/**
 * Keep the figures matching the facet selections
 * and whose description or filename matches `text` as a regular expression
 *
 * Selections match any value within a facet and every selected facet.
 * Text that is empty or not a valid regular expression does not filter.
 */
export function filterFigures(
  figures: FigureWithGroup[],
  text: string,
  selections: FacetSelections,
): FigureWithGroup[] {
  const pattern = textPattern(text);
  const descriptors = descriptorsFor(figures, selections);
  return figures.filter(
    (item) =>
      matchesText(item, pattern) &&
      matchesFacetSelections(item, descriptors, selections),
  );
}
