import type {
  AvailableDimensions,
  ChartGroupingConfig,
  DimensionedData,
} from "./types";

/**
 * Extract available dimensions from data items
 */
export function extractAvailableDimensions<T extends DimensionedData>(
  data: T[],
): AvailableDimensions {
  const dimensions = new Set<string>();

  data.forEach((item) => {
    Object.keys(item.dimensions).forEach((dim) => dimensions.add(dim));
  });

  const sortedDimensions = Array.from(dimensions).sort();

  // Suggest defaults based on common dimension names
  const defaultGroupBy = sortedDimensions.includes("source_id")
    ? "source_id"
    : sortedDimensions[0] || "none";

  const defaultHue = sortedDimensions.includes("source_id")
    ? "source_id"
    : "none";

  const defaultStyle = "none";

  return {
    dimensions: sortedDimensions,
    defaultGroupBy,
    defaultHue,
    defaultStyle,
  };
}

/**
 * Initialize grouping configuration with defaults
 */
export function initializeGroupingConfig(
  availableDimensions: AvailableDimensions,
  initialConfig?: ChartGroupingConfig,
): ChartGroupingConfig {
  return {
    groupBy:
      initialConfig?.groupBy &&
      (initialConfig.groupBy === "none" ||
        availableDimensions.dimensions.includes(initialConfig.groupBy))
        ? initialConfig.groupBy
        : availableDimensions.defaultGroupBy || "none",
    hue:
      initialConfig?.hue &&
      (initialConfig.hue === "none" ||
        availableDimensions.dimensions.includes(initialConfig.hue))
        ? initialConfig.hue
        : availableDimensions.defaultHue || "none",
    style:
      initialConfig?.style &&
      (initialConfig.style === "none" ||
        availableDimensions.dimensions.includes(initialConfig.style))
        ? initialConfig.style
        : availableDimensions.defaultStyle || "none",
  };
}

/**
 * Create a unique key for a data item based on grouping configuration
 */
export function createGroupingKey<T extends DimensionedData>(
  item: T,
  config: ChartGroupingConfig,
): string {
  const parts: string[] = [];

  if (
    config.groupBy &&
    config.groupBy !== "none" &&
    item.dimensions[config.groupBy]
  ) {
    parts.push(`${config.groupBy}:${item.dimensions[config.groupBy]}`);
  }
  if (config.hue && config.hue !== "none" && item.dimensions[config.hue]) {
    parts.push(`${config.hue}:${item.dimensions[config.hue]}`);
  }
  if (
    config.style &&
    config.style !== "none" &&
    item.dimensions[config.style]
  ) {
    parts.push(`${config.style}:${item.dimensions[config.style]}`);
  }

  // If no dimensions selected, use a combination of key dimensions
  if (parts.length === 0) {
    const keyDims = [
      "source_id",
      "experiment_id",
      "variable_id",
      "metric",
      "region",
    ];
    keyDims.forEach((dim) => {
      if (item.dimensions[dim]) {
        parts.push(`${item.dimensions[dim]}`);
      }
    });
  }

  return parts.join(" | ") || "Item";
}

/**
 * Create a display label based on a specific dimension
 */
export function createDimensionLabel<T extends DimensionedData>(
  item: T,
  dimension: string,
): string {
  if (dimension && dimension !== "none" && item.dimensions[dimension]) {
    return item.dimensions[dimension];
  }

  // Fallback to a combination of key dimensions
  const keyDims = ["experiment_id", "variable_id", "metric", "region"];
  const parts: string[] = [];
  keyDims.forEach((dim) => {
    if (item.dimensions[dim]) {
      parts.push(item.dimensions[dim]);
    }
  });

  return parts.join(" | ") || "Item";
}

/**
 * Categorize an item based on the groupBy dimension
 */
export function categorizeByGrouping<T extends DimensionedData>(
  item: T,
  config: ChartGroupingConfig,
): string {
  // Use the groupBy dimension for categorization
  if (
    config.groupBy &&
    config.groupBy !== "none" &&
    item.dimensions[config.groupBy]
  ) {
    return item.dimensions[config.groupBy];
  }

  // Fallback to source_id if no groupBy dimension is selected
  if (item.dimensions.source_id) {
    return item.dimensions.source_id;
  }

  return "Other";
}

/**
 * Check if an item is a reference item (based on source_id)
 */
export function isReferenceItem<T extends DimensionedData>(item: T): boolean {
  return item.dimensions.source_id === "Reference";
}

/**
 * Validate grouping configuration against available dimensions
 */
export function validateGroupingConfig(
  config: ChartGroupingConfig,
  availableDimensions: AvailableDimensions,
): ChartGroupingConfig {
  const validated: ChartGroupingConfig = {};

  // Validate groupBy
  if (
    config.groupBy === "none" ||
    (config.groupBy && availableDimensions.dimensions.includes(config.groupBy))
  ) {
    validated.groupBy = config.groupBy;
  } else {
    validated.groupBy = availableDimensions.defaultGroupBy || "none";
  }

  // Validate hue
  if (
    config.hue === "none" ||
    (config.hue && availableDimensions.dimensions.includes(config.hue))
  ) {
    validated.hue = config.hue;
  } else {
    validated.hue = availableDimensions.defaultHue || "none";
  }

  // Validate style
  if (
    config.style === "none" ||
    (config.style && availableDimensions.dimensions.includes(config.style))
  ) {
    validated.style = config.style;
  } else {
    validated.style = availableDimensions.defaultStyle || "none";
  }

  return validated;
}
