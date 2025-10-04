import type { MetricValue, SeriesValue } from "../../../client/types.gen";

// Re-export types from the generated API client
export type {
  Facet,
  MetricValue,
  MetricValueCollection,
  SeriesValue,
} from "../../../client/types.gen";

// Type guard functions
export function isSeriesValue(
  value: MetricValue | SeriesValue,
): value is SeriesValue {
  return "values" in value && "index" in value && "index_name" in value;
}

export function isScalarValue(
  value: MetricValue | SeriesValue,
): value is MetricValue {
  return "value" in value && !("values" in value);
}

export type BoxPlot = {
  min: number;
  lowerQuartile: number;
  median: number;
  upperQuartile: number;
  max: number;
  values: number[];
};

export type GroupedRawDataEntry = {
  name: string;
  groups: { label: string; values: number[] }[];
};

export type ProcessedGroupedDataEntry = {
  name: string;
  groups: { [key: string]: BoxPlot };
};

export interface SeriesMetadata {
  seriesIndex: number;
  label: string;
  color: string;
  isReference: boolean; // NEW - track reference series
}
