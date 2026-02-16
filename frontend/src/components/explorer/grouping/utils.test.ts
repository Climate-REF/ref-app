import { describe, expect, it } from "vitest";
import type { ChartGroupingConfig, DimensionedData } from "./types";
import {
  categorizeByGrouping,
  createDimensionLabel,
  createGroupingKey,
  extractAvailableDimensions,
  initializeGroupingConfig,
  isReferenceItem,
  validateGroupingConfig,
} from "./utils";

const mockData: DimensionedData[] = [
  {
    dimensions: { source_id: "ModelA", experiment_id: "exp1", metric: "rmse" },
  },
  {
    dimensions: { source_id: "ModelB", experiment_id: "exp2", metric: "bias" },
  },
  {
    dimensions: {
      source_id: "Reference",
      experiment_id: "exp1",
      metric: "rmse",
    },
  },
];

describe("extractAvailableDimensions", () => {
  it("extracts unique dimension names sorted alphabetically", () => {
    const result = extractAvailableDimensions(mockData);
    expect(result.dimensions).toEqual(["experiment_id", "metric", "source_id"]);
  });

  it("sets source_id as default groupBy when present", () => {
    const result = extractAvailableDimensions(mockData);
    expect(result.defaultGroupBy).toBe("source_id");
  });

  it("sets source_id as default hue when present", () => {
    const result = extractAvailableDimensions(mockData);
    expect(result.defaultHue).toBe("source_id");
  });

  it("sets none as default style", () => {
    const result = extractAvailableDimensions(mockData);
    expect(result.defaultStyle).toBe("none");
  });

  it("returns empty dimensions array for empty data", () => {
    const result = extractAvailableDimensions([]);
    expect(result.dimensions).toEqual([]);
    expect(result.defaultGroupBy).toBe("none");
    expect(result.defaultHue).toBe("none");
  });

  it("uses first dimension as default groupBy when source_id not present", () => {
    const dataWithoutSourceId: DimensionedData[] = [
      { dimensions: { experiment_id: "exp1", metric: "rmse" } },
    ];
    const result = extractAvailableDimensions(dataWithoutSourceId);
    expect(result.defaultGroupBy).toBe("experiment_id");
    expect(result.defaultHue).toBe("none");
  });
});

describe("initializeGroupingConfig", () => {
  const availableDimensions = {
    dimensions: ["experiment_id", "metric", "source_id"],
    defaultGroupBy: "source_id",
    defaultHue: "source_id",
    defaultStyle: "none",
  };

  it("respects initial config when dimensions are valid", () => {
    const initialConfig: ChartGroupingConfig = {
      groupBy: "metric",
      hue: "experiment_id",
      style: "none",
    };
    const result = initializeGroupingConfig(availableDimensions, initialConfig);
    expect(result).toEqual(initialConfig);
  });

  it("falls back to defaults when initial config has invalid dimension names", () => {
    const initialConfig: ChartGroupingConfig = {
      groupBy: "invalid_dimension",
      hue: "another_invalid",
      style: "still_invalid",
    };
    const result = initializeGroupingConfig(availableDimensions, initialConfig);
    expect(result.groupBy).toBe("source_id");
    expect(result.hue).toBe("source_id");
    expect(result.style).toBe("none");
  });

  it("accepts none as valid value for all dimensions", () => {
    const initialConfig: ChartGroupingConfig = {
      groupBy: "none",
      hue: "none",
      style: "none",
    };
    const result = initializeGroupingConfig(availableDimensions, initialConfig);
    expect(result).toEqual(initialConfig);
  });

  it("uses defaults when no initial config provided", () => {
    const result = initializeGroupingConfig(availableDimensions);
    expect(result.groupBy).toBe("source_id");
    expect(result.hue).toBe("source_id");
    expect(result.style).toBe("none");
  });

  it("partially validates config with mix of valid and invalid dimensions", () => {
    const initialConfig: ChartGroupingConfig = {
      groupBy: "metric",
      hue: "invalid_hue",
      style: "none",
    };
    const result = initializeGroupingConfig(availableDimensions, initialConfig);
    expect(result.groupBy).toBe("metric");
    expect(result.hue).toBe("source_id");
    expect(result.style).toBe("none");
  });
});

describe("createGroupingKey", () => {
  it("combines dimension values with separator when groupBy, hue, and style are set", () => {
    const config: ChartGroupingConfig = {
      groupBy: "source_id",
      hue: "experiment_id",
      style: "metric",
    };
    const result = createGroupingKey(mockData[0], config);
    expect(result).toBe("source_id:ModelA | experiment_id:exp1 | metric:rmse");
  });

  it("handles single dimension groupBy only", () => {
    const config: ChartGroupingConfig = {
      groupBy: "source_id",
      hue: "none",
      style: "none",
    };
    const result = createGroupingKey(mockData[0], config);
    expect(result).toBe("source_id:ModelA");
  });

  it("falls back to key dimensions when all grouping dimensions are none", () => {
    const config: ChartGroupingConfig = {
      groupBy: "none",
      hue: "none",
      style: "none",
    };
    const result = createGroupingKey(mockData[0], config);
    expect(result).toBe("ModelA | exp1 | rmse");
  });

  it("returns Item when item has no matching dimensions", () => {
    const config: ChartGroupingConfig = {
      groupBy: "none",
      hue: "none",
      style: "none",
    };
    const emptyItem: DimensionedData = { dimensions: {} };
    const result = createGroupingKey(emptyItem, config);
    expect(result).toBe("Item");
  });

  it("includes only available key dimensions in fallback", () => {
    const config: ChartGroupingConfig = {
      groupBy: "none",
      hue: "none",
      style: "none",
    };
    const partialItem: DimensionedData = {
      dimensions: { source_id: "ModelA", region: "global" },
    };
    const result = createGroupingKey(partialItem, config);
    expect(result).toBe("ModelA | global");
  });
});

describe("createDimensionLabel", () => {
  it("returns dimension value for valid dimension name", () => {
    const result = createDimensionLabel(mockData[0], "source_id");
    expect(result).toBe("ModelA");
  });

  it("falls back to key dimensions joined by separator when dimension is none", () => {
    const result = createDimensionLabel(mockData[0], "none");
    expect(result).toBe("exp1 | rmse");
  });

  it("falls back to key dimensions when dimension name is invalid", () => {
    const result = createDimensionLabel(mockData[0], "invalid_dimension");
    expect(result).toBe("exp1 | rmse");
  });

  it("returns Item when no key dimensions are available", () => {
    const emptyItem: DimensionedData = { dimensions: {} };
    const result = createDimensionLabel(emptyItem, "none");
    expect(result).toBe("Item");
  });

  it("includes only available key dimensions in fallback label", () => {
    const partialItem: DimensionedData = {
      dimensions: { experiment_id: "exp1", region: "global" },
    };
    const result = createDimensionLabel(partialItem, "none");
    expect(result).toBe("exp1 | global");
  });
});

describe("categorizeByGrouping", () => {
  it("uses groupBy dimension value when set", () => {
    const config: ChartGroupingConfig = { groupBy: "metric" };
    const result = categorizeByGrouping(mockData[0], config);
    expect(result).toBe("rmse");
  });

  it("falls back to source_id when groupBy is none", () => {
    const config: ChartGroupingConfig = { groupBy: "none" };
    const result = categorizeByGrouping(mockData[0], config);
    expect(result).toBe("ModelA");
  });

  it("falls back to source_id when groupBy dimension not found", () => {
    const config: ChartGroupingConfig = { groupBy: "invalid_dimension" };
    const result = categorizeByGrouping(mockData[0], config);
    expect(result).toBe("ModelA");
  });

  it("returns Other when no matching dimensions found", () => {
    const config: ChartGroupingConfig = { groupBy: "none" };
    const emptyItem: DimensionedData = { dimensions: {} };
    const result = categorizeByGrouping(emptyItem, config);
    expect(result).toBe("Other");
  });
});

describe("isReferenceItem", () => {
  it("returns true when source_id is Reference", () => {
    const result = isReferenceItem(mockData[2]);
    expect(result).toBe(true);
  });

  it("returns false when source_id is not Reference", () => {
    const result = isReferenceItem(mockData[0]);
    expect(result).toBe(false);
  });

  it("returns false when source_id is missing", () => {
    const emptyItem: DimensionedData = { dimensions: {} };
    const result = isReferenceItem(emptyItem);
    expect(result).toBe(false);
  });
});

describe("validateGroupingConfig", () => {
  const availableDimensions = {
    dimensions: ["experiment_id", "metric", "source_id"],
    defaultGroupBy: "source_id",
    defaultHue: "source_id",
    defaultStyle: "none",
  };

  it("passes through valid dimension names", () => {
    const config: ChartGroupingConfig = {
      groupBy: "metric",
      hue: "experiment_id",
      style: "source_id",
    };
    const result = validateGroupingConfig(config, availableDimensions);
    expect(result).toEqual(config);
  });

  it("resets invalid dimensions to defaults", () => {
    const config: ChartGroupingConfig = {
      groupBy: "invalid_groupby",
      hue: "invalid_hue",
      style: "invalid_style",
    };
    const result = validateGroupingConfig(config, availableDimensions);
    expect(result.groupBy).toBe("source_id");
    expect(result.hue).toBe("source_id");
    expect(result.style).toBe("none");
  });

  it("accepts none as valid value", () => {
    const config: ChartGroupingConfig = {
      groupBy: "none",
      hue: "none",
      style: "none",
    };
    const result = validateGroupingConfig(config, availableDimensions);
    expect(result).toEqual(config);
  });

  it("handles partial validation with mix of valid and invalid", () => {
    const config: ChartGroupingConfig = {
      groupBy: "metric",
      hue: "invalid_hue",
      style: "none",
    };
    const result = validateGroupingConfig(config, availableDimensions);
    expect(result.groupBy).toBe("metric");
    expect(result.hue).toBe("source_id");
    expect(result.style).toBe("none");
  });
});
