import type { SeriesMetadata, SeriesValue } from "../types";

interface ChartData {
  [key: string]: number | string | null;
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

/**
 * Get consistent color for a label using hash-based assignment
 * @param label - The label string
 * @returns Hex color code
 */
function getLabelColor(label: string): string {
  const hash = label.split("").reduce((acc, char) => {
    const newAcc = (acc << 5) - acc + char.charCodeAt(0);
    return newAcc & newAcc;
  }, 0);
  return COLORS[Math.abs(hash) % COLORS.length];
}

/**
 * Create chart data structure with all series
 * @param seriesValues - Array of regular series values
 * @param referenceSeriesValues - Array of reference series values
 * @param labelTemplate - Optional template for generating labels
 * @returns Chart data and series metadata
 */
export function createChartData(
  seriesValues: SeriesValue[],
  referenceSeriesValues: SeriesValue[],
  labelTemplate?: string,
): {
  chartData: ChartData[];
  seriesMetadata: SeriesMetadata[];
  indexName: string;
} {
  // Combine regular and reference series
  const allSeries = [...seriesValues, ...referenceSeriesValues];

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
    const isReference = idx >= seriesValues.length; // Reference series come after regular series
    const color = isReference ? "#000000" : getLabelColor(label);
    return {
      seriesIndex: idx,
      label,
      color,
      isReference,
    };
  });

  // Build chart data
  const chartData: ChartData[] = [];
  for (let i = 0; i < maxLength; i++) {
    const dataPoint: ChartData = {
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
