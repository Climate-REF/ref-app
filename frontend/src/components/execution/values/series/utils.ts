import * as d3 from "d3";
import {
  getFixedDimensionColor,
  unreservedPalette,
} from "@/components/charts/experimentColors";
import type { SeriesMetadata, SeriesValue } from "../types";

export interface ChartDataPoint {
  [key: string]: number | string | null;
}

export function isIntegerAxis(indexName: string): boolean {
  const lower = indexName.toLowerCase();
  return (
    lower.includes("year") ||
    lower.includes("month") ||
    lower.includes("day") ||
    lower === "time" ||
    lower === "index"
  );
}

/**
 * Format a numeric index value, such as an x axis tick
 *
 * Integers are shown whole, as are values within rounding noise of one on an integer axis.
 * Other values get six significant digits.
 */
export function formatIndexValue(value: number, indexName: string): string {
  if (Number.isInteger(value)) {
    return value.toString();
  }
  if (isIntegerAxis(indexName) && Math.abs(value - Math.round(value)) < 1e-9) {
    return Math.round(value).toString();
  }
  return value.toPrecision(6);
}

/**
 * Format a time axis tick by the coarsest unit it falls on, in local time
 *
 * New years show the year, other month starts the month and year,
 * other midnights the day and anything else the time of day too.
 */
export function formatTimeTick(date: Date): string {
  if (date.getHours() !== 0 || date.getMinutes() !== 0) {
    return d3.timeFormat("%b %d %H:%M")(date);
  }
  if (date.getDate() !== 1) {
    return d3.timeFormat("%b %d")(date);
  }
  return d3.timeFormat(date.getMonth() === 0 ? "%Y" : "%b %Y")(date);
}

/**
 * The x and y of series `seriesIndex` in `row`, or null when the row has no point to draw
 *
 * A row has no point when its index or the series' value is missing, or the value is not finite.
 */
export function plottablePoint(
  row: ChartDataPoint,
  indexName: string,
  seriesIndex: number,
): { x: number; y: number } | null {
  const x = row[indexName];
  const y = row[`series_${seriesIndex}`];
  if (typeof x !== "number" || typeof y !== "number" || !Number.isFinite(y)) {
    return null;
  }
  return { x, y };
}

/**
 * Check if a value looks like an ISO 8601 datetime string
 */
function isDatetimeString(value: unknown): value is string {
  if (typeof value !== "string") return false;
  // Match ISO 8601 patterns: "2020-01-15", "2020-01-15T00:00:00", "2020-01-15T00:00:00Z", etc.
  return /^\d{4}-\d{2}-\d{2}(T|\s)/.test(value);
}

/**
 * Detect if the index values in a series are datetime strings
 */
function detectTimeAxis(indexValues: ReadonlyArray<unknown>): boolean {
  if (indexValues.length === 0) return false;
  // Check the first non-null value
  for (const v of indexValues) {
    if (v == null) continue;
    return isDatetimeString(v);
  }
  return false;
}

/**
 * Parse a datetime string to a millisecond timestamp.
 * Returns null if the string is not a valid date.
 */
function parseDatetimeToTimestamp(value: string): number | null {
  const ts = new Date(value).getTime();
  return Number.isFinite(ts) ? ts : null;
}

/** Drop trailing zeros after the decimal point, keeping any exponent */
function trimTrailingZeros(text: string): string {
  const [mantissa, exponent] = text.split("e");
  const trimmed = mantissa.includes(".")
    ? mantissa.replace(/\.?0+$/, "")
    : mantissa;
  return exponent === undefined ? trimmed : `${trimmed}e${exponent}`;
}

/**
 * Build a formatter for value-axis ticks spanning `values`
 *
 * Ticks get just enough digits to tell neighbouring ticks apart,
 * using `tickCount` to estimate the tick step d3 will pick.
 * Values between ticks, such as tooltip statistics, get up to two more digits.
 * Exponent notation is only used for magnitudes of at least 1e6 or below 1e-3.
 */
export function createScaledTickFormatter(
  values: number[],
  tickCount = 5,
): (value: number | string) => string {
  if (values.length === 0) return (value: string | number) => String(value);

  const min = Math.min(...values);
  const max = Math.max(...values);
  const magnitude = Math.max(Math.abs(min), Math.abs(max));
  // A zero range has no tick step, so space ticks as if the range were the magnitude
  const step = d3.tickStep(0, max - min || magnitude || 1, tickCount);
  const useExponent = magnitude >= 1e6 || (magnitude > 0 && magnitude < 1e-3);

  return (value: string | number): string => {
    let numValue = Number(value);
    if (!Number.isFinite(numValue)) return String(value);
    // Snap rounding noise around zero, which would otherwise print as "-0.0" or "1e-17"
    if (Math.abs(numValue) < step * 1e-6) numValue = 0;

    const onTick =
      Math.abs(numValue / step - Math.round(numValue / step)) < 1e-6;
    const resolution = onTick ? step : step / 100;

    if (useExponent) {
      if (numValue === 0) return "0";
      const text = numValue.toExponential(
        d3.precisionRound(resolution, magnitude) - 1,
      );
      return onTick ? text : trimTrailingZeros(text);
    }
    const text = numValue.toFixed(d3.precisionFixed(resolution));
    return onTick ? text : trimTrailingZeros(text);
  };
}

/**
 * Replace template placeholders with dimension values
 * @param series - The series value object containing dimensions
 * @param template - Template string with {dimension_name} placeholders
 * @returns Formatted label string
 */
/**
 * The dimensions a series is labelled from.
 *
 * A reference series carries the dimensions of the model run that stored it,
 * so it takes its observational source as `source_id` and drops that run's experiment.
 */
function labelSource(series: SeriesValue): Record<string, string> {
  const referenceSource = series.dimensions.reference_source_id;
  if (series.kind !== "reference" || !referenceSource) return series.dimensions;
  const { experiment_id: _experiment, ...dimensions } = series.dimensions;
  return { ...dimensions, source_id: referenceSource };
}

function applyLabelTemplate(series: SeriesValue, template?: string): string {
  const dimensions = labelSource(series);
  if (!template) {
    // Fallback to key dimensions
    const keyDims = [
      "source_id",
      "experiment_id",
      "variable_id",
      "metric",
      "region",
    ];
    const parts: string[] = [];
    keyDims.forEach((dim) => {
      if (dimensions[dim]) {
        parts.push(dimensions[dim]);
      }
    });
    return parts.join(" | ") || "Series";
  }

  let result = template;
  const placeholderRegex = /\{([^}]+)\}/g;
  result = result.replace(placeholderRegex, (_, dimensionName) => {
    return dimensions[dimensionName] || "";
  });
  return result;
}

// 20-color perceptually distinct palette
const COLORS = [
  "#4e79a7",
  "#f28e2b",
  "#e15759",
  "#76b7b2",
  "#59a14f",
  "#edc948",
  "#b07aa1",
  "#ff9da7",
  "#9c755f",
  "#bab0ac",
  "#af7aa1",
  "#d37295",
  "#1b9e77",
  "#d95f02",
  "#7570b3",
  "#e7298a",
  "#66a61e",
  "#e6ab02",
  "#a6761d",
  "#666666",
];

/**
 * Get consistent color for a label using hash-based assignment
 */
function getLabelColor(label: string, palette = COLORS): string {
  const hash = label.split("").reduce((acc, char) => {
    const newAcc = (acc << 5) - acc + char.charCodeAt(0);
    return newAcc | 0;
  }, 0);
  return palette[Math.abs(hash) % palette.length];
}

// Other dimension values must not borrow an experiment's colour.
const UNRESERVED_COLORS = unreservedPalette(COLORS);

/**
 * Colour a series by one dimension when asked, otherwise by its label.
 * Experiments keep their reserved colours so they match across charts.
 */
function getSeriesColor(
  series: SeriesValue,
  label: string,
  colorDimension?: string,
): string {
  const dimensionValue = colorDimension
    ? series.dimensions[colorDimension]
    : undefined;
  if (!dimensionValue) return getLabelColor(label);
  return (
    getFixedDimensionColor(colorDimension, dimensionValue) ??
    getLabelColor(dimensionValue, UNRESERVED_COLORS)
  );
}

/**
 * Create chart data structure with all series
 */
export function createChartData(
  seriesValues: SeriesValue[],
  referenceSeriesValues: SeriesValue[],
  labelTemplate?: string,
  colorDimension?: string,
): {
  chartData: ChartDataPoint[];
  seriesMetadata: SeriesMetadata[];
  indexName: string;
  isTimeAxis: boolean;
  valueUnits?: string;
  indexUnits?: string;
  calendar?: string;
} {
  // Deduplicate reference series (same observational data repeated across executions).
  // Prefer the reference_id content hash; fall back to label-based dedup only when
  // reference_id is absent.
  const seenRefIds = new Set<string>();
  const seenRefLabels = new Set<string>();
  const dedupedReferenceSeries = referenceSeriesValues.filter((series) => {
    if (series.reference_id) {
      if (seenRefIds.has(series.reference_id)) return false;
      seenRefIds.add(series.reference_id);
      return true;
    }
    const label = applyLabelTemplate(series, labelTemplate);
    if (seenRefLabels.has(label)) return false;
    seenRefLabels.add(label);
    return true;
  });

  // Combine regular and deduplicated reference series
  const allSeries = [...seriesValues, ...dedupedReferenceSeries];

  if (allSeries.length === 0) {
    return {
      chartData: [],
      seriesMetadata: [],
      indexName: "index",
      isTimeAxis: false,
    };
  }

  // Use the first series' index name
  const indexName = allSeries[0]?.index_name || "index";

  // Detect if the index contains datetime strings. All series are checked
  // (not just the first) since alignment now happens by index value rather
  // than by array position, and any series' index values can drive detection.
  const isTimeAxis = allSeries.some((series) =>
    detectTimeAxis(series.index ?? []),
  );

  // Prefer the per-series value_units for the Y-axis unit label (first series
  // that has one); callers fall back to their own `units` prop when this is
  // undefined, since ILAMB series never carry value_units.
  const valueUnits =
    allSeries.find((series) => series.value_units)?.value_units ?? undefined;
  // Same fallback pattern for the X-axis unit label.
  const indexUnits =
    allSeries.find((series) => series.index_units)?.index_units ?? undefined;
  // Calendar metadata (e.g. "standard", "360_day", "noleap"). ILAMB never
  // sets this; ESMValTool does. Surfaced for callers/tooltips — see the
  // code comment below on why non-standard calendars aren't fully honored.
  const calendar =
    allSeries.find((series) => series.calendar)?.calendar ?? undefined;

  // Build the union of index values across all series, preserving first-seen
  // order, so each series contributes its value to the row matching its own
  // index value rather than being smeared across positions.
  const indexValueOrder: (string | number)[] = [];
  const seenIndexValues = new Set<string | number>();
  for (const series of allSeries) {
    for (const rawIndex of series.index ?? []) {
      if (!seenIndexValues.has(rawIndex)) {
        seenIndexValues.add(rawIndex);
        indexValueOrder.push(rawIndex);
      }
    }
  }

  // Order rows by index value so the line is drawn left-to-right regardless of
  // the order the series were provided in (a first-seen union can interleave
  // when series carry disjoint indices). Numeric indices sort numerically;
  // string indices sort lexically, which is chronological for ISO-8601 dates.
  indexValueOrder.sort((a, b) => {
    if (typeof a === "number" && typeof b === "number") return a - b;
    const [as, bs] = [String(a), String(b)];
    return as < bs ? -1 : as > bs ? 1 : 0;
  });

  // Fallback when no series carries an index array at all: key rows by
  // position (0, 1, 2, …) as the earlier implementation did, so index-less
  // series still render instead of collapsing to an empty chart.
  const hasAnyIndex = indexValueOrder.length > 0;
  if (!hasAnyIndex) {
    const maxLength = Math.max(
      0,
      ...allSeries.map((s) => s.values?.length ?? 0),
    );
    for (let i = 0; i < maxLength; i++) {
      indexValueOrder.push(i);
    }
  }

  // Create series metadata
  const seriesMetadata: SeriesMetadata[] = allSeries.map((series, idx) => {
    const label = applyLabelTemplate(series, labelTemplate);
    const isReference = series.kind === "reference";
    const color = isReference
      ? "#000000"
      : getSeriesColor(series, label, colorDimension);
    return {
      seriesIndex: idx,
      label,
      color,
      isReference,
      dimensions: series.dimensions,
    };
  });

  // Precompute a value-to-position lookup per series so alignment below is a
  // map lookup rather than a linear scan of the series' index. Ties keep the
  // first occurrence, matching indexOf's semantics.
  const positionByIndexValue = allSeries.map((series) => {
    const map = new Map<string | number, number>();
    series.index?.forEach((v, i) => {
      if (!map.has(v)) map.set(v, i);
    });
    return map;
  });

  // Build chart data: one row per index value, in ascending order.
  const chartData: ChartDataPoint[] = indexValueOrder.map(
    (rawIndex, rowIdx) => {
      let indexValue: number | string | null;
      if (isTimeAxis && typeof rawIndex === "string") {
        indexValue = parseDatetimeToTimestamp(rawIndex);
      } else {
        indexValue = rawIndex;
      }
      const dataPoint: ChartDataPoint = {
        [indexName]: indexValue,
      };

      allSeries.forEach((series, seriesIdx) => {
        if (!series.values) return;
        // Series with an index align by value; index-less series fall back to
        // positional lookup keyed off the row ordinal, so they still render even
        // when other series in the chart carry an index.
        const dataIdx =
          series.index && series.index.length > 0
            ? (positionByIndexValue[seriesIdx].get(rawIndex) ?? -1)
            : rowIdx;
        if (dataIdx !== -1 && dataIdx < series.values.length) {
          dataPoint[`series_${seriesIdx}`] = series.values[dataIdx];
        }
      });

      return dataPoint;
    },
  );

  return {
    chartData,
    seriesMetadata,
    indexName,
    isTimeAxis,
    valueUnits,
    indexUnits,
    calendar,
  };
}

/**
 * Collect all unique dimension keys from series metadata
 */
export function getDimensionKeys(seriesMetadata: SeriesMetadata[]): string[] {
  const keys = new Set<string>();
  for (const meta of seriesMetadata) {
    for (const key of Object.keys(meta.dimensions)) {
      keys.add(key);
    }
  }
  return Array.from(keys).sort();
}

/** A label in the legend, standing for every series that shares it */
export interface LegendItem {
  label: string;
  color: string;
  count: number;
  isReference: boolean;
}

/**
 * One legend item per label, references first and the rest by label
 *
 * A label takes its colour from the first series with that label.
 */
export function legendItems(seriesMetadata: SeriesMetadata[]): LegendItem[] {
  const items = new Map<string, LegendItem>();
  for (const meta of seriesMetadata) {
    const existing = items.get(meta.label);
    if (existing) {
      existing.count += 1;
    } else {
      items.set(meta.label, {
        label: meta.label,
        color: meta.color,
        count: 1,
        isReference: meta.isReference,
      });
    }
  }
  return Array.from(items.values()).sort(
    (a, b) =>
      Number(b.isReference) - Number(a.isReference) ||
      a.label.localeCompare(b.label),
  );
}

/** Each label's dimensions, taken from the first series with that label */
export function labelDimensions(
  seriesMetadata: SeriesMetadata[],
): Map<string, Record<string, string>> {
  const map = new Map<string, Record<string, string>>();
  for (const meta of seriesMetadata) {
    if (!map.has(meta.label)) {
      map.set(meta.label, meta.dimensions);
    }
  }
  return map;
}

/**
 * Group legend items by their label's value of `dimension`, ordered by that value
 *
 * Items whose label has no value for the dimension are grouped under "Unknown".
 */
export function groupLegendItems(
  items: LegendItem[],
  dimension: string,
  labelDimensionMap: Map<string, Record<string, string>>,
): [string, LegendItem[]][] {
  const groups = new Map<string, LegendItem[]>();
  for (const item of items) {
    const groupKey =
      labelDimensionMap.get(item.label)?.[dimension] ?? "Unknown";
    const group = groups.get(groupKey);
    if (group) {
      group.push(item);
    } else {
      groups.set(groupKey, [item]);
    }
  }
  return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
}

/** The labels hidden from the chart: all but the soloed label and references while soloing, otherwise `hiddenLabels` */
export function hiddenLabelsWithSolo(
  hiddenLabels: Set<string>,
  soloedLabel: string | null,
  items: LegendItem[],
): Set<string> {
  if (!soloedLabel) return hiddenLabels;
  return new Set(
    items
      .filter((item) => item.label !== soloedLabel && !item.isReference)
      .map((item) => item.label),
  );
}

/** A copy of `set` with `value` removed when it is in the set, and added otherwise */
export function toggleInSet<T>(set: ReadonlySet<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) {
    next.delete(value);
  } else {
    next.add(value);
  }
  return next;
}

/** A copy of `hiddenLabels` with every one of `labels` hidden, or shown when `hidden` is false */
export function withLabelsHidden(
  hiddenLabels: ReadonlySet<string>,
  labels: Iterable<string>,
  hidden: boolean,
): Set<string> {
  const next = new Set(hiddenLabels);
  for (const label of labels) {
    if (hidden) {
      next.add(label);
    } else {
      next.delete(label);
    }
  }
  return next;
}
