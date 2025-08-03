export type MetricValue = {
  dimensions: { [key: string]: string };
  value: number;
  attributes?: { [key: string]: string | number | null };
  execution_group_id: number;
  execution_id: number;
};

export type Facet = {
  key: string;
  values: string[];
};

export type MetricValueCollection = {
  data: MetricValue[];
  count: number;
  facets: Facet[];
};

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
