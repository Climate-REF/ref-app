import type { ReactNode } from "react";
import type { ChartGroupingConfig } from "./grouping";

// Base properties shared across all card types
export type BaseCardContent = {
  provider: string;
  diagnostic: string;
  title: string;
  description?: string | ReactNode;
  interpretation?: string;
  span?: 1 | 2;
  placeholder?: boolean;
};

// Card-specific content types
export type BoxWhiskerChartContent = BaseCardContent & {
  type: "box-whisker-chart";
  interpretation?: string;
  metricUnits?: string;
  otherFilters?: Record<string, string>;
  clipMin?: number;
  clipMax?: number;
  showZeroLine?: boolean;
  symmetricalAxes?: boolean;
  groupingConfig?: ChartGroupingConfig;
  yMin?: number;
  /* Override the y-axis minimum value */
  yMax?: number;
  /* Override the y-axis maximum value */
};

export type FigureGalleryContent = BaseCardContent & {
  type: "figure-gallery";
};

export type SeriesChartContent = BaseCardContent & {
  type: "series-chart";
  metricUnits?: string;
  otherFilters?: Record<string, string>;
  symmetricalAxes?: boolean;
  groupingConfig?: ChartGroupingConfig;
};

export type TaylorDiagramContent = BaseCardContent & {
  type: "taylor-diagram";
  otherFilters?: Record<string, string>;
  referenceStddev?: number;
  /* Reference standard deviation value for the diagram, defaults to 1.0 */
};

export type ExplorerCardContent =
  | BoxWhiskerChartContent
  | FigureGalleryContent
  | SeriesChartContent
  | TaylorDiagramContent;

export type ExplorerCard = {
  title: string;
  description?: string | ReactNode;
  placeholder?: boolean;
  content: ExplorerCardContent[];
};
