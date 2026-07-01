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
export function detectTimeAxis(indexValues: ReadonlyArray<unknown>): boolean {
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
export function parseDatetimeToTimestamp(value: string): number | null {
  const ts = new Date(value).getTime();
  return Number.isFinite(ts) ? ts : null;
}

export function createScaledTickFormatter(
  values: number[],
): (value: number | string) => string {
  if (values.length === 0) return (value: string | number) => String(value);

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;

  // Determine appropriate formatting based on range and magnitude
  return (value: string | number): string => {
    const numValue = Number(value);

    // Handle very large numbers (scientific notation)
    if (Math.abs(numValue) >= 1e6 || (range > 0 && Math.abs(numValue) >= 1e4)) {
      return numValue.toExponential(1);
    }

    // Handle very small numbers (scientific notation)
    if (Math.abs(numValue) < 1e-3 && numValue !== 0) {
      return numValue.toExponential(1);
    }

    // Handle decimal precision based on range
    if (range < 0.1) {
      return numValue.toFixed(3);
    }
    if (range < 1) {
      return numValue.toFixed(2);
    }
    if (range < 10) {
      return numValue.toFixed(2);
    }
    if (range < 100) {
      return numValue.toFixed(1);
    }
    return numValue.toFixed(0);
  };
}

/**
 * Replace template placeholders with dimension values
 * @param series - The series value object containing dimensions
 * @param template - Template string with {dimension_name} placeholders
 * @returns Formatted label string
 */
function applyLabelTemplate(series: SeriesValue, template?: string): string {
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
      if (series.dimensions[dim]) {
        parts.push(series.dimensions[dim]);
      }
    });
    return parts.join(" | ") || "Series";
  }

  let result = template;
  const placeholderRegex = /\{([^}]+)\}/g;
  result = result.replace(placeholderRegex, (_, dimensionName) => {
    return series.dimensions[dimensionName] || "";
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
function getLabelColor(label: string): string {
  const hash = label.split("").reduce((acc, char) => {
    const newAcc = (acc << 5) - acc + char.charCodeAt(0);
    return newAcc | 0;
  }, 0);
  return COLORS[Math.abs(hash) % COLORS.length];
}

/**
 * Create chart data structure with all series
 */
export function createChartData(
  seriesValues: SeriesValue[],
  referenceSeriesValues: SeriesValue[],
  labelTemplate?: string,
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
  const valueUnits = allSeries.find(
    (series) => series.value_units,
  )?.value_units;
  // Same fallback pattern for the X-axis unit label.
  const indexUnits = allSeries.find(
    (series) => series.index_units,
  )?.index_units;
  // Calendar metadata (e.g. "standard", "360_day", "noleap"). ILAMB never
  // sets this; ESMValTool does. Surfaced for callers/tooltips — see the
  // code comment below on why non-standard calendars aren't fully honored.
  const calendar = allSeries.find((series) => series.calendar)?.calendar;

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

  // Create series metadata
  const seriesMetadata: SeriesMetadata[] = allSeries.map((series, idx) => {
    const label = applyLabelTemplate(series, labelTemplate);
    const isReference = series.kind === "reference";
    const color = isReference ? "#000000" : getLabelColor(label);
    return {
      seriesIndex: idx,
      label,
      color,
      isReference,
      dimensions: series.dimensions,
    };
  });

  // Build chart data: one row per unique index value, in first-seen order.
  const chartData: ChartDataPoint[] = indexValueOrder.map((rawIndex) => {
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
      if (!series.index || !series.values) return;
      const dataIdx = series.index.indexOf(rawIndex);
      if (dataIdx !== -1 && dataIdx < series.values.length) {
        dataPoint[`series_${seriesIdx}`] = series.values[dataIdx];
      }
    });

    return dataPoint;
  });

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
