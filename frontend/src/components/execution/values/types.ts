export type BoxPlot = {
  min: number;
  lowerQuartile: number;
  median: number;
  upperQuartile: number;
  max: number;
  average: number;
  values: number[];
};

export interface GroupData {
  label: string;
  values: number[];
}

// Represents the raw input for a single category on the X-axis
export interface GroupedRawDataEntry {
  category: string; // The label for the X-axis tick
  groups: GroupData[];
}

export interface ProcessedGroupedDataEntry {
  category: string; // The label for the X-axis tick
  groups: Record<string, BoxPlot>;
}
