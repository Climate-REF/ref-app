import type { ExecutionGroup, ExecutionOutput } from "@/client";
import { matchesSelectorFilters } from "./selectorFilterPanel.tsx";

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

/** Compile `text` as a case-insensitive regular expression, or null when it is not a valid one */
function compilePattern(text: string): RegExp | null {
  try {
    return new RegExp(text, "i");
  } catch {
    return null;
  }
}

/**
 * Keep the figures whose group matches the selector filters
 * and whose description or filename matches `text` as a regular expression
 *
 * Text that is empty or not a valid regular expression does not filter.
 */
export function filterFigures(
  figures: FigureWithGroup[],
  text: string,
  selectorFilters: Record<string, string[]>,
): FigureWithGroup[] {
  const pattern = text ? compilePattern(text) : null;
  return figures.filter(
    ({ figure, executionGroup }) =>
      matchesSelectorFilters(executionGroup.selectors, selectorFilters) &&
      (!pattern ||
        pattern.test(figure.description) ||
        pattern.test(figure.filename)),
  );
}
