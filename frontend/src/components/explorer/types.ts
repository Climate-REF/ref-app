import type { ChartGroupingConfig } from "./grouping";

export type ExplorerCardContent =
  | {
      type: "box-whisker-chart";
      provider: string;
      diagnostic: string;
      title: string;
      description?: string;
      metricUnits?: string;
      otherFilters?: Record<string, string>;
      clipMin?: number;
      clipMax?: number;
      span?: 1 | 2;
      showZeroLine?: boolean;
      /** Unified grouping configuration */
      groupingConfig?: ChartGroupingConfig;
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
      span?: 1 | 2;
      /** Unified grouping configuration */
      groupingConfig?: ChartGroupingConfig;
    };

export type ExplorerCard = {
  title: string;
  description?: string;
  content: ExplorerCardContent[];
};
