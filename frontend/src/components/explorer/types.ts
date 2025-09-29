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
      symmetricalAxes?: boolean;
      /** Unified grouping configuration */
      groupingConfig?: ChartGroupingConfig;
      placeholder?: boolean;
    }
  | {
      type: "figure-gallery";
      provider: string;
      diagnostic: string;
      title: string;
      description?: string;
      span?: 1 | 2;
      placeholder?: boolean;
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
      symmetricalAxes?: boolean;
      /** Unified grouping configuration */
      groupingConfig?: ChartGroupingConfig;
      placeholder?: boolean;
    };

export type ExplorerCard = {
  title: string;
  description?: string;
  placeholder?: boolean;
  content: ExplorerCardContent[];
};
