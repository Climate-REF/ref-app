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
} {
  // Deduplicate reference series by label (same observational data repeated across executions)
  const seenRefLabels = new Set<string>();
  const dedupedReferenceSeries = referenceSeriesValues.filter((series) => {
    const label = applyLabelTemplate(series, labelTemplate);
    if (seenRefLabels.has(label)) return false;
    seenRefLabels.add(label);
    return true;
  });

  // Combine regular and deduplicated reference series
  const allSeries = [...seriesValues, ...dedupedReferenceSeries];

  if (allSeries.length === 0) {
    return { chartData: [], seriesMetadata: [], indexName: "index" };
  }

  // Use the first series' index name
  const indexName = allSeries[0]?.index_name || "index";

  // Find the maximum length across all series
  const maxLength = Math.max(...allSeries.map((s) => s.values?.length || 0));

  // Create series metadata
  const seriesMetadata: SeriesMetadata[] = allSeries.map((series, idx) => {
    const label = applyLabelTemplate(series, labelTemplate);
    const isReference = idx >= seriesValues.length; // Deduplicated reference series come after regular series
    const color = isReference ? "#000000" : getLabelColor(label);
    return {
      seriesIndex: idx,
      label,
      color,
      isReference,
      dimensions: series.dimensions,
    };
  });

  // Build chart data
  const chartData: ChartDataPoint[] = [];
  for (let i = 0; i < maxLength; i++) {
    const dataPoint: ChartDataPoint = {
      [indexName]: allSeries[0]?.index?.[i] ?? i,
    };

    allSeries.forEach((series, seriesIdx) => {
      if (series.values && i < series.values.length) {
        dataPoint[`series_${seriesIdx}`] = series.values[i];
      }
    });

    chartData.push(dataPoint);
  }

  return { chartData, seriesMetadata, indexName };
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
