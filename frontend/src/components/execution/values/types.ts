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
