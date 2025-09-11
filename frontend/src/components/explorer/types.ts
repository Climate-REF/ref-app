export type ExplorerCardContent =
  | {
      type: "ensemble-chart";
      provider: string;
      diagnostic: string;
      title: string;
      description?: string;
      metricUnits?: string;
      otherFilters?: Record<string, string>;
      xAxis?: string;
      clipMin?: number;
      clipMax?: number;
      span?: 1 | 2;
    }
  | {
      type: "figure-gallery";
      provider: string;
      diagnostic: string;
      title: string;
      description?: string;
      span?: 1 | 2;
    }
  | {
      type: "series-chart";
      provider: string;
      diagnostic: string;
      title: string;
      description?: string;
      metricUnits?: string;
      otherFilters?: Record<string, string>;
      seriesConfig?: {
        groupBy?: string;
        hue?: string;
        style?: string;
      };
      span?: 1 | 2;
    };

export type ExplorerCard = {
  title: string;
  description?: string;
  content: ExplorerCardContent[];
};
