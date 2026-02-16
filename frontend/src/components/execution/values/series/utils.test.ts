import { describe, expect, it } from "vitest";
import type { SeriesValue } from "../types";
import { createChartData, createScaledTickFormatter } from "./utils";

const mockSeriesValue: SeriesValue = {
  id: 1,
  execution_group_id: 100,
  execution_id: 200,
  dimensions: { source_id: "ModelA", experiment_id: "exp1", metric: "rmse" },
  values: [1.0, 2.0, 3.0, 4.0],
  index: [2020, 2021, 2022, 2023],
  index_name: "year",
};

const mockReferenceSeriesValue: SeriesValue = {
  id: 2,
  execution_group_id: 100,
  execution_id: 201,
  dimensions: { source_id: "Reference", experiment_id: "exp1", metric: "rmse" },
  values: [1.5, 2.5, 3.5],
  index: [2020, 2021, 2022],
  index_name: "year",
};

describe("createScaledTickFormatter", () => {
  it("returns String formatter for empty values array", () => {
    const formatter = createScaledTickFormatter([]);
    expect(formatter(42)).toBe("42");
    expect(formatter("test")).toBe("test");
  });

  it("formats large numbers with scientific notation", () => {
    const formatter = createScaledTickFormatter([1e6, 2e6, 3e6]);
    expect(formatter(1500000)).toBe("1.5e+6");
  });

  it("formats very small numbers with scientific notation", () => {
    const formatter = createScaledTickFormatter([0.0001, 0.0002, 0.0003]);
    expect(formatter(0.00015)).toBe("1.5e-4");
  });

  it("does not use scientific notation for zero", () => {
    const formatter = createScaledTickFormatter([0, 0.0001, 0.0002]);
    expect(formatter(0)).toBe("0.000");
  });

  it("formats range < 0.1 with 3 decimal places", () => {
    const formatter = createScaledTickFormatter([1.0, 1.05, 1.08]);
    expect(formatter(1.025)).toBe("1.025");
  });

  it("formats range < 1 with 2 decimal places", () => {
    const formatter = createScaledTickFormatter([1.0, 1.5, 1.8]);
    expect(formatter(1.25)).toBe("1.25");
  });

  it("formats range < 10 with 2 decimal places", () => {
    const formatter = createScaledTickFormatter([10, 15, 18]);
    expect(formatter(12.5)).toBe("12.50");
  });

  it("formats range < 100 with 1 decimal place", () => {
    const formatter = createScaledTickFormatter([10, 50, 90]);
    expect(formatter(42.567)).toBe("42.6");
  });

  it("formats range >= 100 with 0 decimal places", () => {
    const formatter = createScaledTickFormatter([0, 100, 500]);
    expect(formatter(250.789)).toBe("251");
  });

  it("uses scientific notation for large numbers with large range", () => {
    const formatter = createScaledTickFormatter([10000, 50000, 100000]);
    expect(formatter(25000)).toBe("2.5e+4");
  });
});

describe("createChartData", () => {
  it("returns empty structure for empty arrays", () => {
    const result = createChartData([], []);
    expect(result.chartData).toEqual([]);
    expect(result.seriesMetadata).toEqual([]);
    expect(result.indexName).toBe("index");
  });

  it("creates chart data structure for regular series only", () => {
    const result = createChartData([mockSeriesValue], []);
    expect(result.chartData).toHaveLength(4);
    expect(result.chartData[0]).toHaveProperty("year", 2020);
    expect(result.chartData[0]).toHaveProperty("series_0", 1.0);
    expect(result.chartData[1]).toHaveProperty("year", 2021);
    expect(result.chartData[1]).toHaveProperty("series_0", 2.0);
  });

  it("creates series metadata with non-black colors for regular series", () => {
    const result = createChartData([mockSeriesValue], []);
    expect(result.seriesMetadata).toHaveLength(1);
    expect(result.seriesMetadata[0].seriesIndex).toBe(0);
    expect(result.seriesMetadata[0].isReference).toBe(false);
    expect(result.seriesMetadata[0].color).not.toBe("#000000");
  });

  it("creates reference series metadata with black color", () => {
    const result = createChartData([], [mockReferenceSeriesValue]);
    expect(result.seriesMetadata).toHaveLength(1);
    expect(result.seriesMetadata[0].seriesIndex).toBe(0);
    expect(result.seriesMetadata[0].isReference).toBe(true);
    expect(result.seriesMetadata[0].color).toBe("#000000");
  });

  it("combines regular and reference series with reference after regular", () => {
    const result = createChartData(
      [mockSeriesValue],
      [mockReferenceSeriesValue],
    );
    expect(result.seriesMetadata).toHaveLength(2);
    expect(result.seriesMetadata[0].isReference).toBe(false);
    expect(result.seriesMetadata[1].isReference).toBe(true);
    expect(result.seriesMetadata[1].color).toBe("#000000");
  });

  it("uses index name from first series", () => {
    const customSeries: SeriesValue = {
      ...mockSeriesValue,
      index_name: "time",
    };
    const result = createChartData([customSeries], []);
    expect(result.indexName).toBe("time");
  });

  it("creates chart data with indexed keys", () => {
    const series2: SeriesValue = {
      id: 3,
      execution_group_id: 100,
      execution_id: 202,
      dimensions: {
        source_id: "ModelB",
        experiment_id: "exp2",
        metric: "bias",
      },
      values: [0.5, 1.5, 2.5, 3.5],
      index: [2020, 2021, 2022, 2023],
      index_name: "year",
    };
    const result = createChartData([mockSeriesValue, series2], []);
    expect(result.chartData[0]).toHaveProperty("series_0", 1.0);
    expect(result.chartData[0]).toHaveProperty("series_1", 0.5);
  });

  it("applies label template with placeholders", () => {
    const template = "{source_id} - {experiment_id}";
    const result = createChartData([mockSeriesValue], [], template);
    expect(result.seriesMetadata[0].label).toBe("ModelA - exp1");
  });

  it("uses fallback label when template not provided", () => {
    const result = createChartData([mockSeriesValue], []);
    expect(result.seriesMetadata[0].label).toBe("ModelA | exp1 | rmse");
  });

  it("handles missing dimension in template", () => {
    const template = "{source_id} - {missing_dimension}";
    const result = createChartData([mockSeriesValue], [], template);
    expect(result.seriesMetadata[0].label).toBe("ModelA - ");
  });

  it("provides deterministic colors for same label", () => {
    const series2: SeriesValue = {
      id: 4,
      execution_group_id: 100,
      execution_id: 203,
      dimensions: {
        source_id: "ModelA",
        experiment_id: "exp1",
        metric: "rmse",
      },
      values: [1.0, 2.0, 3.0, 4.0],
      index: [2020, 2021, 2022, 2023],
      index_name: "year",
    };
    const result1 = createChartData([mockSeriesValue], []);
    const result2 = createChartData([series2], []);
    expect(result1.seriesMetadata[0].color).toBe(
      result2.seriesMetadata[0].color,
    );
  });

  it("handles series with different lengths", () => {
    const shortSeries: SeriesValue = {
      id: 5,
      execution_group_id: 100,
      execution_id: 204,
      dimensions: {
        source_id: "ModelB",
        experiment_id: "exp2",
        metric: "bias",
      },
      values: [0.5, 1.5],
      index: [2020, 2021],
      index_name: "year",
    };
    const result = createChartData([mockSeriesValue, shortSeries], []);
    expect(result.chartData).toHaveLength(4);
    expect(result.chartData[0]).toHaveProperty("series_0", 1.0);
    expect(result.chartData[0]).toHaveProperty("series_1", 0.5);
    expect(result.chartData[2]).toHaveProperty("series_0", 3.0);
    expect(result.chartData[2]).not.toHaveProperty("series_1");
  });

  it("uses maximum length across all series for chart data", () => {
    const longSeries: SeriesValue = {
      id: 6,
      execution_group_id: 100,
      execution_id: 205,
      dimensions: {
        source_id: "ModelC",
        experiment_id: "exp3",
        metric: "correlation",
      },
      values: [1, 2, 3, 4, 5, 6],
      index: [2020, 2021, 2022, 2023, 2024, 2025],
      index_name: "year",
    };
    const result = createChartData([mockSeriesValue, longSeries], []);
    expect(result.chartData).toHaveLength(6);
  });

  it("handles series with empty values array", () => {
    const emptySeries: SeriesValue = {
      id: 7,
      execution_group_id: 100,
      execution_id: 206,
      dimensions: { source_id: "Empty", experiment_id: "exp", metric: "test" },
      values: [],
      index: [],
      index_name: "year",
    };
    const result = createChartData([emptySeries], []);
    expect(result.chartData).toHaveLength(0);
  });

  it("creates metadata for all series including empty ones", () => {
    const emptySeries: SeriesValue = {
      id: 8,
      execution_group_id: 100,
      execution_id: 207,
      dimensions: { source_id: "Empty", experiment_id: "exp", metric: "test" },
      values: [],
      index: [],
      index_name: "year",
    };
    const result = createChartData([mockSeriesValue, emptySeries], []);
    expect(result.seriesMetadata).toHaveLength(2);
  });
});
