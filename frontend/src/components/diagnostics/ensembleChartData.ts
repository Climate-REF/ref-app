import * as d3 from "d3-array";
import { scaleLinear } from "d3-scale";
import type { ScalarValue } from "@/client/types.gen";
import {
  EXPERIMENT_ORDER,
  getFixedDimensionColor,
} from "@/components/charts/experimentColors";
import type { BoxPlot } from "@/components/execution/values/types";

// Well-known category orderings for common climate dimensions (matched case-insensitively)
export const KNOWN_CATEGORY_ORDERS: Record<string, string[]> = {
  // Meteorological seasons (Annual first, then chronological)
  season: ["Annual", "ANN", "DJF", "MAM", "JJA", "SON"],
  experiment_id: EXPERIMENT_ORDER,
};

// Display labels for abbreviated category values (keyed by lowercase value)
const CATEGORY_LABELS: Record<string, string> = {
  ann: "annual",
};

export function formatCategoryLabel(name: string): string {
  return CATEGORY_LABELS[name.toLowerCase()] ?? name;
}

function indexOfIgnoreCase(order: string[], name: string): number {
  const lower = name.toLowerCase();
  return order.findIndex((item) => item.toLowerCase() === lower);
}

/**
 * Sort chart categories using a known ordering if one exists,
 * otherwise preserve the original order.
 */
export function sortCategories<T extends { name: string }>(
  items: T[],
  categoryOrder?: string[],
): T[] {
  const order = categoryOrder;
  if (!order) {
    // Auto-detect: check if all category names match a known ordering
    for (const knownOrder of Object.values(KNOWN_CATEGORY_ORDERS)) {
      const ranked = items.map((item) => ({
        item,
        rank: indexOfIgnoreCase(knownOrder, item.name),
      }));
      if (ranked.every(({ rank }) => rank !== -1)) {
        return ranked.sort((a, b) => a.rank - b.rank).map(({ item }) => item);
      }
    }
    return items;
  }

  return [...items].sort((a, b) => {
    const aIdx = indexOfIgnoreCase(order, a.name);
    const bIdx = indexOfIgnoreCase(order, b.name);
    // Items not in the order go to the end, preserving relative order
    if (aIdx === -1 && bIdx === -1) return 0;
    if (aIdx === -1) return 1;
    if (bIdx === -1) return -1;
    return aIdx - bIdx;
  });
}

// Color palette for different groups
const COLORS = [
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#ff7300",
  "#00ff00",
  "#0088fe",
  "#00c49f",
  "#ffbb28",
  "#ff8042",
  "#8dd1e1",
];

// Reserved colours win, so an experiment looks the same on every chart.
export function groupColor(
  dimension: string | undefined,
  value: string,
  index: number,
): string {
  return (
    getFixedDimensionColor(dimension, value) ?? COLORS[index % COLORS.length]
  );
}

/** The name of the single box drawn per category when the chart has no hue groups */
export const ENSEMBLE_GROUP = "ensemble";

/** One x-axis category of the ensemble chart, with a box per hue group */
export interface EnsembleCategory {
  name: string;
  /** Box statistics by hue group, or null when clipping left the group no values */
  groups: Record<string, BoxPlot | null>;
  /** How many of each group's values fell outside the clip range */
  __outliers: Record<string, number>;
  /** The colour of every box in the category, when the hue is the category itself */
  __categoryColor?: string;
}

export interface EnsembleChartOptions {
  /** The dimension the categories come from, "metric" if not given */
  groupBy?: string;
  /** The dimension the boxes within a category are coloured by, or "none" */
  hue?: string;
  /** The category of values without the groupBy dimension */
  fallbackCategory: string;
  clipMin?: number;
  clipMax?: number;
  categoryOrder?: string[];
}

/** Box plot statistics of points sorted by value */
function boxStats(points: ScalarValue[]): BoxPlot {
  const values = points.map((point) => Number(point.value));
  return {
    min: values[0],
    lowerQuartile: d3.quantile(values, 0.25)!,
    median: d3.median(values)!,
    upperQuartile: d3.quantile(values, 0.75)!,
    max: values[values.length - 1],
    values,
    points,
  };
}

/** `Object.groupBy` as entries, which never holds an empty group */
function groupEntries(
  values: ScalarValue[],
  key: (value: ScalarValue) => string,
): [string, ScalarValue[]][] {
  return Object.entries(Object.groupBy(values, key)) as [
    string,
    ScalarValue[],
  ][];
}

/**
 * Group the values into categories by the groupBy dimension and into boxes by the hue dimension
 *
 * Non-finite values are dropped, and values outside the clip range are counted but not drawn.
 * When the hue is the groupBy dimension or "none", each category has one box, named `ENSEMBLE_GROUP`,
 * which is coloured by its category when the hue is the groupBy dimension.
 * Categories are sorted by `categoryOrder` or a known ordering, such as seasons.
 */
export function buildEnsembleChartData(
  data: ScalarValue[],
  {
    groupBy,
    hue,
    fallbackCategory,
    clipMin,
    clipMax,
    categoryOrder,
  }: EnsembleChartOptions,
): EnsembleCategory[] {
  const categoryDimension = groupBy || "metric";
  const isSelfHued = hue === categoryDimension;
  // When the hue is the category itself, splitting would leave one box per category off centre
  const hueDimension = !isSelfHued && hue && hue !== "none" ? hue : undefined;
  const inClipRange = (value: number) =>
    (clipMin === undefined || value >= clipMin) &&
    (clipMax === undefined || value <= clipMax);

  const categories = groupEntries(
    data,
    (d) => d.dimensions[categoryDimension] ?? fallbackCategory,
  ).map(([name, values], index): EnsembleCategory => {
    const subGroups = hueDimension
      ? groupEntries(values, (d) => d.dimensions[hueDimension] ?? "Unknown")
      : [[ENSEMBLE_GROUP, values] as const];
    const groups: EnsembleCategory["groups"] = {};
    const outliers: EnsembleCategory["__outliers"] = {};
    for (const [groupName, groupValues] of subGroups) {
      const finite = groupValues.filter((d) =>
        Number.isFinite(Number(d.value)),
      );
      const points = finite
        .filter((d) => inClipRange(Number(d.value)))
        .sort((a, b) => Number(a.value) - Number(b.value));
      groups[groupName] = points.length > 0 ? boxStats(points) : null;
      outliers[groupName] = finite.length - points.length;
    }
    return {
      name,
      groups,
      __outliers: outliers,
      __categoryColor: isSelfHued
        ? groupColor(categoryDimension, name, index)
        : undefined,
    };
  });

  return sortCategories(categories, categoryOrder);
}

/** The names of the boxes across all categories, in a known order for the hue dimension or alphabetically */
export function hueGroupNames(
  categories: EnsembleCategory[],
  hue: string | undefined,
): string[] {
  const names = [
    ...new Set(categories.flatMap((category) => Object.keys(category.groups))),
  ]
    .sort()
    .map((name) => ({ name }));
  return sortCategories(
    names,
    hue ? KNOWN_CATEGORY_ORDERS[hue] : undefined,
  ).map((item) => item.name);
}

export interface YDomainOptions {
  /** Centre the axis on zero */
  symmetricalAxes?: boolean;
  /** Fixed lower bound, replacing the one from the data */
  yMin?: number;
  /** Fixed upper bound, replacing the one from the data */
  yMax?: number;
}

/**
 * The y-axis range covering every box, padded by 5% and rounded to nice values
 *
 * Without values it covers 0 to 1, and when all values are equal it is widened around them.
 */
export function computeYDomain(
  categories: EnsembleCategory[],
  { symmetricalAxes, yMin, yMax }: YDomainOptions = {},
): [number, number] {
  const extremes = categories.flatMap((category) =>
    Object.values(category.groups).flatMap((group) =>
      group ? [group.min, group.max] : [],
    ),
  );

  let [minVal, maxVal] = [0, 1];
  if (extremes.length > 0 && symmetricalAxes) {
    const maxAbs = Math.max(...extremes.map(Math.abs));
    [minVal, maxVal] = [-maxAbs, maxAbs];
  } else if (extremes.length > 0) {
    [minVal, maxVal] = [Math.min(...extremes), Math.max(...extremes)];
  }

  // If all values are identical, add some padding to ensure a range
  if (minVal === maxVal) {
    const pad = Math.max(1, Math.abs(minVal) * 0.1);
    minVal -= pad;
    maxVal += pad;
  }
  const padding = (maxVal - minVal) * 0.05;

  return scaleLinear()
    .domain([yMin ?? minVal - padding, yMax ?? maxVal + padding])
    .nice()
    .domain() as [number, number];
}

/** How the x-axis fits `count` categories, rotating the labels and narrowing the gaps when there are many */
export function categoryAxisLayout(count: number) {
  const rotate = count > 6;
  return {
    angle: rotate ? -45 : 0,
    textAnchor: rotate ? "end" : "middle",
    height: rotate ? 100 : 30,
    // Label every nth category, so about 20 are labelled at most
    interval: count > 20 ? Math.floor(count / 20) : 0,
    barCategoryGap: count > 20 ? "2%" : count > 10 ? "5%" : "20%",
  } as const;
}
