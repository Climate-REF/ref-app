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
 * One descriptor per selector key the figures offer, sorted by key, plus any selected key
 * they no longer offer
 *
 * Keys and values come only from the figures passed in, so a group without plot
 * outputs contributes neither.
 *
 * A selection left over from an older URL must not be silently ignored: its key gets a
 * descriptor with no values, so items match it only if they offer one of the selected
 * values, which none of them do. Its options therefore stay empty while
 * `withUnavailableSelections` keeps the selected value visible with count 0.
 */
function descriptorsFor(
  figures: FigureWithGroup[],
  selections: FacetSelections,
): FacetDescriptor<FigureWithGroup>[] {
  const figureKeys = new Set<string>();
  for (const { executionGroup } of figures) {
    for (const pairs of Object.values(executionGroup.selectors)) {
      for (const [key] of pairs) {
        figureKeys.add(key);
      }
    }
  }

  const keys = new Set(figureKeys);
  for (const [key, values] of Object.entries(selections)) {
    if (values.length > 0) {
      keys.add(key);
    }
  }

  return [...keys]
    .sort((a, b) => a.localeCompare(b))
    .map((key) =>
      figureKeys.has(key)
        ? {
            key,
            valuesOf: ({ executionGroup }) =>
              selectorValues(executionGroup.selectors, key),
          }
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
  return facetOptions(
    figures,
    descriptorsFor(figures, selections),
    selections,
    (item) => matchesText(item, pattern),
  );
}

/**
 * Keep the figures whose group matches the facet selections
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
