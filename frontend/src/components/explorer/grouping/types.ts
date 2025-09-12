/**
 * Unified grouping configuration for both series and scalar charts
 */
export interface ChartGroupingConfig {
  /** Dimension to group data by (affects chart structure/categories) */
  groupBy?: string;
  /** Dimension to use for color coding */
  hue?: string;
  /** Dimension to use for line/bar styling (dash patterns, etc.) */
  style?: string;
}

/**
 * Props for components that support grouping functionality
 */
export interface GroupingProps {
  /** Initial grouping configuration */
  initialGrouping?: ChartGroupingConfig;
  /** Callback when grouping configuration changes */
  onGroupingChange?: (config: ChartGroupingConfig) => void;
  /** Whether to hide the grouping controls */
  hideControls?: boolean;
}

/**
 * Available dimensions for grouping, extracted from data
 */
export interface AvailableDimensions {
  dimensions: string[];
  /** Suggested default for groupBy */
  defaultGroupBy?: string;
  /** Suggested default for hue */
  defaultHue?: string;
  /** Suggested default for style */
  defaultStyle?: string;
}

/**
 * Generic data item with dimensions (works for both MetricValue and SeriesValue)
 */
export interface DimensionedData {
  dimensions: Record<string, string>;
}
