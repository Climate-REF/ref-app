import * as d3 from "d3";
import { describe, expect, it } from "vitest";
import type { SeriesMetadata, SeriesValue } from "../types";
import {
  createChartData,
  createScaledTickFormatter,
  formatIndexValue,
  formatTimeTick,
  getDimensionKeys,
  groupLegendItems,
  hiddenLabelsWithSolo,
  type LegendItem,
  labelDimensions,
  legendItems,
  plottablePoint,
  toggleInSet,
  withLabelsHidden,
} from "./utils";

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
  kind: "reference",
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

  /** Format the ticks d3 draws for `[min, max]` */
  function tickLabels(min: number, max: number, count = 5): string[] {
    const formatter = createScaledTickFormatter([min, max], count);
    return d3.ticks(min, max, count).map(formatter);
  }

  it.each([
    [101300, 101350, 8],
    [0.0001, 0.0003, 5],
    [1e6, 3e6, 5],
    [1.0, 1.08, 5],
    [-0.5, 0.5, 5],
    [-273.15, 5000, 8],
    [1234567, 1234568, 5],
  ])("gives every tick of [%d, %d] a distinct label", (min, max, count) => {
    const labels = tickLabels(min, max, count);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("keeps large values with a small range in fixed notation", () => {
    expect(tickLabels(101300, 101350, 8)).toEqual([
      "101300",
      "101305",
      "101310",
      "101315",
      "101320",
      "101325",
      "101330",
      "101335",
      "101340",
      "101345",
      "101350",
    ]);
  });

  it("keeps values below 1e6 in fixed notation", () => {
    const formatter = createScaledTickFormatter([10000, 100000]);
    expect(formatter(20000)).toBe("20000");
    expect(formatter(25000)).toBe("25000");
  });

  it("uses exponent notation for values of at least 1e6", () => {
    expect(tickLabels(1e6, 3e6)).toEqual([
      "1.0e+6",
      "1.5e+6",
      "2.0e+6",
      "2.5e+6",
      "3.0e+6",
    ]);
  });

  it("uses exponent notation for small values", () => {
    expect(tickLabels(0.0001, 0.0003)).toEqual([
      "1.0e-4",
      "1.5e-4",
      "2.0e-4",
      "2.5e-4",
      "3.0e-4",
    ]);
  });

  it("does not use exponent notation for zero", () => {
    const formatter = createScaledTickFormatter([0, 0.0001, 0.0002]);
    expect(formatter(0)).toBe("0");
  });

  it("formats mixed signs with the same precision", () => {
    expect(tickLabels(-0.5, 0.5)).toEqual([
      "-0.4",
      "-0.2",
      "0.0",
      "0.2",
      "0.4",
    ]);
  });

  it("does not print rounding noise around zero as negative", () => {
    const formatter = createScaledTickFormatter([-0.5, 0.5]);
    expect(formatter(-1e-17)).toBe("0.0");
  });

  it("formats a zero range by the magnitude of the value", () => {
    expect(createScaledTickFormatter([101300, 101300])(101300)).toBe("101300");
    expect(createScaledTickFormatter([0.5, 0.5])(0.5)).toBe("0.5");
    expect(createScaledTickFormatter([0, 0])(0)).toBe("0.0");
  });

  it("gives values between ticks up to two more digits", () => {
    expect(createScaledTickFormatter([10, 90])(42.567)).toBe("42.6");
    expect(createScaledTickFormatter([1.0, 1.8])(1.25)).toBe("1.25");
    expect(createScaledTickFormatter([0, 500])(250.789)).toBe("251");
    expect(createScaledTickFormatter([1e6, 3e6])(1234567)).toBe("1.235e+6");
  });
});

describe("formatIndexValue", () => {
  it("shows integers whole on any axis", () => {
    expect(formatIndexValue(2021, "year")).toBe("2021");
    expect(formatIndexValue(850, "pressure")).toBe("850");
  });

  it("rounds rounding noise on an integer axis", () => {
    expect(formatIndexValue(2021 + 1e-12, "year")).toBe("2021");
  });

  it("keeps six significant digits otherwise", () => {
    expect(formatIndexValue(0.1 + 0.2, "latitude")).toBe("0.300000");
    expect(formatIndexValue(2021.5, "year")).toBe("2021.50");
  });
});

describe("formatTimeTick", () => {
  // Built in local time, which the ticks are formatted in
  it("shows the year on new year", () => {
    expect(formatTimeTick(new Date(2020, 0, 1))).toBe("2020");
  });

  it("shows the month and year on other month starts", () => {
    expect(formatTimeTick(new Date(2020, 5, 1))).toBe("Jun 2020");
  });

  it("shows the month and day on other midnights", () => {
    expect(formatTimeTick(new Date(2020, 0, 15))).toBe("Jan 15");
    expect(formatTimeTick(new Date(2020, 5, 5))).toBe("Jun 05");
  });

  it("shows the time of day when not at midnight", () => {
    expect(formatTimeTick(new Date(2020, 0, 1, 6))).toBe("Jan 01 06:00");
    expect(formatTimeTick(new Date(2020, 0, 1, 0, 30))).toBe("Jan 01 00:30");
  });
});

describe("plottablePoint", () => {
  it("returns the index and value of the series", () => {
    const row = { year: 2020, series_0: 1.5, series_1: 2 };
    expect(plottablePoint(row, "year", 1)).toEqual({ x: 2020, y: 2 });
  });

  it.each([
    ["a missing value", { year: 2020 }],
    ["a null value", { year: 2020, series_0: null }],
    ["a non-finite value", { year: 2020, series_0: Number.NaN }],
    ["a missing index", { series_0: 1 }],
    ["a string index", { year: "2020", series_0: 1 }],
  ])("returns null for %s", (_, row) => {
    expect(plottablePoint(row, "year", 0)).toBeNull();
  });
});

describe("withLabelsHidden", () => {
  it("hides every label", () => {
    const result = withLabelsHidden(new Set(["a"]), ["b", "c"], true);
    expect(result).toEqual(new Set(["a", "b", "c"]));
  });

  it("shows every label", () => {
    const result = withLabelsHidden(
      new Set(["a", "b", "c"]),
      ["a", "b"],
      false,
    );
    expect(result).toEqual(new Set(["c"]));
  });

  it("does not change the given set", () => {
    const hidden = new Set(["a"]);
    withLabelsHidden(hidden, ["b"], true);
    expect(hidden).toEqual(new Set(["a"]));
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

  it("includes dimensions in series metadata", () => {
    const result = createChartData([mockSeriesValue], []);
    expect(result.seriesMetadata[0].dimensions).toEqual({
      source_id: "ModelA",
      experiment_id: "exp1",
      metric: "rmse",
    });
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

  it("deduplicates reference series with the same label when reference_id is absent", () => {
    const refSeries2: SeriesValue = {
      id: 10,
      execution_group_id: 101,
      execution_id: 210,
      kind: "reference",
      dimensions: {
        source_id: "Reference",
        experiment_id: "exp1",
        metric: "rmse",
      },
      values: [1.5, 2.5, 3.5],
      index: [2020, 2021, 2022],
      index_name: "year",
    };
    const result = createChartData(
      [mockSeriesValue],
      [mockReferenceSeriesValue, refSeries2],
    );
    // Should only have 2 series: 1 regular + 1 deduplicated reference
    expect(result.seriesMetadata).toHaveLength(2);
    expect(result.seriesMetadata[0].isReference).toBe(false);
    expect(result.seriesMetadata[1].isReference).toBe(true);
  });

  it("keeps reference series with different labels", () => {
    const refSeriesDifferentMetric: SeriesValue = {
      id: 11,
      execution_group_id: 101,
      execution_id: 211,
      kind: "reference",
      dimensions: {
        source_id: "Reference",
        experiment_id: "exp1",
        metric: "bias",
      },
      values: [0.1, 0.2, 0.3],
      index: [2020, 2021, 2022],
      index_name: "year",
    };
    const result = createChartData(
      [mockSeriesValue],
      [mockReferenceSeriesValue, refSeriesDifferentMetric],
    );
    // Should have 3 series: 1 regular + 2 distinct reference
    expect(result.seriesMetadata).toHaveLength(3);
    expect(result.seriesMetadata[1].isReference).toBe(true);
    expect(result.seriesMetadata[2].isReference).toBe(true);
    expect(result.seriesMetadata[1].label).not.toBe(
      result.seriesMetadata[2].label,
    );
  });

  it("dedups two reference series with the same reference_id to one", () => {
    const refA: SeriesValue = {
      ...mockReferenceSeriesValue,
      id: 20,
      execution_id: 220,
      reference_id: "obs-hash-1",
      dimensions: {
        source_id: "Reference",
        experiment_id: "exp1",
        metric: "a",
      },
    };
    const refB: SeriesValue = {
      ...mockReferenceSeriesValue,
      id: 21,
      execution_id: 221,
      reference_id: "obs-hash-1",
      dimensions: {
        source_id: "Reference",
        experiment_id: "exp2",
        metric: "b",
      },
    };
    const result = createChartData([mockSeriesValue], [refA, refB]);
    // Different labels (different dimensions), but same reference_id -> deduped to one.
    expect(result.seriesMetadata).toHaveLength(2);
    expect(result.seriesMetadata[1].isReference).toBe(true);
  });

  it("keeps two reference series with different reference_id", () => {
    const refA: SeriesValue = {
      ...mockReferenceSeriesValue,
      id: 22,
      execution_id: 222,
      reference_id: "obs-hash-1",
    };
    const refB: SeriesValue = {
      ...mockReferenceSeriesValue,
      id: 23,
      execution_id: 223,
      reference_id: "obs-hash-2",
    };
    const result = createChartData([mockSeriesValue], [refA, refB]);
    expect(result.seriesMetadata).toHaveLength(3);
    expect(result.seriesMetadata[1].isReference).toBe(true);
    expect(result.seriesMetadata[2].isReference).toBe(true);
  });

  it("sets isReference from kind, not array position", () => {
    const result = createChartData(
      [mockSeriesValue],
      [mockReferenceSeriesValue],
    );
    expect(result.seriesMetadata[0].isReference).toBe(false);
    expect(result.seriesMetadata[1].isReference).toBe(true);
  });

  it("treats a series with kind reference but source_id !== Reference as a reference", () => {
    const refWithOtherSourceId: SeriesValue = {
      id: 30,
      execution_group_id: 100,
      execution_id: 230,
      kind: "reference",
      dimensions: {
        source_id: "SomeObsDataset",
        experiment_id: "exp1",
        metric: "rmse",
      },
      values: [1.5, 2.5, 3.5],
      index: [2020, 2021, 2022],
      index_name: "year",
    };
    const result = createChartData([mockSeriesValue], [refWithOtherSourceId]);
    expect(result.seriesMetadata[1].isReference).toBe(true);
  });

  it("treats a series with source_id === Reference but kind model (or absent) as a model, proving the sentinel is gone", () => {
    const modelWithReferenceSourceId: SeriesValue = {
      id: 31,
      execution_group_id: 100,
      execution_id: 231,
      kind: "model",
      dimensions: {
        source_id: "Reference",
        experiment_id: "exp1",
        metric: "rmse",
      },
      values: [1.0, 2.0, 3.0],
      index: [2020, 2021, 2022],
      index_name: "year",
    };
    const modelWithReferenceSourceIdNoKind: SeriesValue = {
      ...modelWithReferenceSourceId,
      id: 32,
      execution_id: 232,
      kind: undefined,
    };
    // Passed in the "regular" bucket, as seriesChartContent.tsx would do based on kind.
    const result = createChartData(
      [modelWithReferenceSourceId, modelWithReferenceSourceIdNoKind],
      [],
    );
    expect(result.seriesMetadata[0].isReference).toBe(false);
    expect(result.seriesMetadata[1].isReference).toBe(false);
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

describe("createChartData index alignment", () => {
  it("aligns two series sharing one identical index the same as before (no regression)", () => {
    const seriesA: SeriesValue = {
      ...mockSeriesValue,
      values: [1.0, 2.0, 3.0, 4.0],
      index: [2020, 2021, 2022, 2023],
    };
    const seriesB: SeriesValue = {
      id: 40,
      execution_group_id: 100,
      execution_id: 240,
      dimensions: {
        source_id: "ModelB",
        experiment_id: "exp1",
        metric: "rmse",
      },
      values: [10.0, 20.0, 30.0, 40.0],
      index: [2020, 2021, 2022, 2023],
      index_name: "year",
    };
    const result = createChartData([seriesA, seriesB], []);
    expect(result.chartData).toHaveLength(4);
    expect(result.chartData[0]).toMatchObject({
      year: 2020,
      series_0: 1.0,
      series_1: 10.0,
    });
    expect(result.chartData[1]).toMatchObject({
      year: 2021,
      series_0: 2.0,
      series_1: 20.0,
    });
    expect(result.chartData[3]).toMatchObject({
      year: 2023,
      series_0: 4.0,
      series_1: 40.0,
    });
  });

  it("aligns two series with different index arrays by index value, not position", () => {
    const seriesA: SeriesValue = {
      id: 41,
      execution_group_id: 100,
      execution_id: 241,
      dimensions: {
        source_id: "ModelA",
        experiment_id: "exp1",
        metric: "rmse",
      },
      values: [1.0, 2.0, 3.0],
      index: [2020, 2021, 2022],
      index_name: "year",
    };
    const seriesB: SeriesValue = {
      id: 42,
      execution_group_id: 100,
      execution_id: 242,
      dimensions: {
        source_id: "ModelB",
        experiment_id: "exp1",
        metric: "rmse",
      },
      values: [200.0, 300.0, 400.0],
      // Overlaps at 2021 and 2022, but starts later and ends later than seriesA.
      index: [2021, 2022, 2023],
      index_name: "year",
    };
    const result = createChartData([seriesA, seriesB], []);
    // Union of index values: 2020, 2021, 2022, 2023
    expect(result.chartData).toHaveLength(4);

    const rowByYear = new Map(
      result.chartData.map((row) => [row.year as number, row]),
    );

    // seriesA only contributes at 2020-2022; seriesB only at 2021-2023.
    expect(rowByYear.get(2020)).toMatchObject({ series_0: 1.0 });
    expect(rowByYear.get(2020)?.series_1 ?? null).toBeNull();

    expect(rowByYear.get(2021)).toMatchObject({
      series_0: 2.0,
      series_1: 200.0,
    });
    expect(rowByYear.get(2022)).toMatchObject({
      series_0: 3.0,
      series_1: 300.0,
    });

    expect(rowByYear.get(2023)?.series_0 ?? null).toBeNull();
    expect(rowByYear.get(2023)).toMatchObject({ series_1: 400.0 });
  });

  it("keeps index-less series visible by keying rows positionally", () => {
    const seriesNoIndex: SeriesValue = {
      id: 43,
      execution_group_id: 100,
      execution_id: 243,
      dimensions: { source_id: "ModelA", metric: "rmse" },
      values: [5.0, 6.0, 7.0],
      index: null,
      index_name: null,
    };
    const result = createChartData([seriesNoIndex], []);
    // Without any index array, rows fall back to positional keys 0, 1, 2
    // rather than collapsing to an empty chart.
    expect(result.chartData).toHaveLength(3);
    expect(result.chartData[0]).toMatchObject({ index: 0, series_0: 5.0 });
    expect(result.chartData[2]).toMatchObject({ index: 2, series_0: 7.0 });
  });

  it("orders rows by ascending index value when series indices interleave", () => {
    const seriesA: SeriesValue = {
      id: 44,
      execution_group_id: 100,
      execution_id: 244,
      dimensions: { source_id: "ModelA", metric: "rmse" },
      values: [1.0, 3.0, 5.0],
      index: [1, 3, 5],
      index_name: "step",
    };
    const seriesB: SeriesValue = {
      id: 45,
      execution_group_id: 100,
      execution_id: 245,
      dimensions: { source_id: "ModelB", metric: "rmse" },
      values: [2.0, 4.0, 6.0],
      index: [2, 4, 6],
      index_name: "step",
    };
    const result = createChartData([seriesA, seriesB], []);
    // Fully interleaved indices must still produce ascending x-values so the
    // line renders left-to-right instead of zigzagging.
    const xs = result.chartData.map((row) => row.step as number);
    expect(xs).toEqual([1, 2, 3, 4, 5, 6]);
    const rowByStep = new Map(
      result.chartData.map((row) => [row.step as number, row]),
    );
    expect(rowByStep.get(1)).toMatchObject({ series_0: 1.0 });
    expect(rowByStep.get(2)).toMatchObject({ series_1: 2.0 });
    expect(rowByStep.get(1)?.series_1 ?? null).toBeNull();
  });

  it("uses the first occurrence when a series' index has duplicate values", () => {
    const seriesWithDuplicateIndex: SeriesValue = {
      id: 48,
      execution_group_id: 100,
      execution_id: 248,
      dimensions: { source_id: "ModelA", metric: "rmse" },
      // Index value 2021 appears twice; alignment must resolve to the first
      // occurrence (value 2.0), matching Array.prototype.indexOf semantics.
      values: [1.0, 2.0, 20.0, 3.0],
      index: [2020, 2021, 2021, 2022],
      index_name: "year",
    };
    const result = createChartData([seriesWithDuplicateIndex], []);
    const rowByYear = new Map(
      result.chartData.map((row) => [row.year as number, row]),
    );
    expect(rowByYear.get(2021)).toMatchObject({ series_0: 2.0 });
  });

  it("still renders an index-less series when mixed with an indexed series", () => {
    const indexed: SeriesValue = {
      id: 46,
      execution_group_id: 100,
      execution_id: 246,
      dimensions: { source_id: "ModelA", metric: "rmse" },
      values: [1.0, 2.0, 3.0],
      index: [2020, 2021, 2022],
      index_name: "year",
    };
    const indexLess: SeriesValue = {
      id: 47,
      execution_group_id: 100,
      execution_id: 247,
      dimensions: { source_id: "ModelB", metric: "rmse" },
      values: [10.0, 20.0, 30.0],
      index: null,
      index_name: null,
    };
    const result = createChartData([indexed, indexLess], []);
    // The indexed series drives the rows; the index-less series falls back to
    // the row ordinal so it still renders instead of disappearing.
    expect(result.chartData).toHaveLength(3);
    expect(result.chartData[0]).toMatchObject({
      series_0: 1.0,
      series_1: 10.0,
    });
    expect(result.chartData[2]).toMatchObject({
      series_0: 3.0,
      series_1: 30.0,
    });
  });
});

describe("createChartData axis units and calendar", () => {
  it("derives the Y-axis unit from a series' value_units when present", () => {
    const seriesWithUnits: SeriesValue = {
      ...mockSeriesValue,
      value_units: "kg m-2 s-1",
    };
    const result = createChartData([seriesWithUnits], []);
    expect(result.valueUnits).toBe("kg m-2 s-1");
  });

  it("falls back to undefined valueUnits when no series carries value_units (caller falls back to the units prop)", () => {
    const result = createChartData([mockSeriesValue], []);
    expect(result.valueUnits).toBeUndefined();
  });

  it("uses the first series with value_units when several series are present", () => {
    const seriesNoUnits: SeriesValue = { ...mockSeriesValue };
    const seriesWithUnits: SeriesValue = {
      ...mockSeriesValue,
      id: 50,
      execution_id: 250,
      value_units: "percent",
    };
    const result = createChartData([seriesNoUnits, seriesWithUnits], []);
    expect(result.valueUnits).toBe("percent");
  });

  it("derives indexUnits from a series' index_units when present", () => {
    const seriesWithIndexUnits: SeriesValue = {
      ...mockSeriesValue,
      index_units: "days since 1850-01-01",
    };
    const result = createChartData([seriesWithIndexUnits], []);
    expect(result.indexUnits).toBe("days since 1850-01-01");
  });

  it("handles a series with calendar present without error (ESMValTool case)", () => {
    const seriesWithCalendar: SeriesValue = {
      ...mockSeriesValue,
      index: [
        "2020-01-15T00:00:00",
        "2020-02-15T00:00:00",
        "2020-03-15T00:00:00",
        "2020-04-15T00:00:00",
      ],
      calendar: "standard",
    };
    expect(() => createChartData([seriesWithCalendar], [])).not.toThrow();
    const result = createChartData([seriesWithCalendar], []);
    expect(result.isTimeAxis).toBe(true);
    expect(result.calendar).toBe("standard");
  });

  it("still detects ISO-string time axis when calendar is absent (ILAMB case)", () => {
    const ilambSeries: SeriesValue = {
      ...mockSeriesValue,
      index: [
        "2020-01-15T00:00:00",
        "2020-02-15T00:00:00",
        "2020-03-15T00:00:00",
        "2020-04-15T00:00:00",
      ],
    };
    const result = createChartData([ilambSeries], []);
    expect(result.isTimeAxis).toBe(true);
    expect(result.calendar).toBeUndefined();
  });

  it("surfaces a non-standard calendar without building a full calendar engine", () => {
    const nonStandardCalendarSeries: SeriesValue = {
      ...mockSeriesValue,
      index: [
        "2020-01-15T00:00:00",
        "2020-02-15T00:00:00",
        "2020-03-15T00:00:00",
        "2020-04-15T00:00:00",
      ],
      calendar: "360_day",
    };
    const result = createChartData([nonStandardCalendarSeries], []);
    expect(result.calendar).toBe("360_day");
    // Still marked as a time axis via ISO-string detection; Date-based parsing
    // remains approximate for 360_day/noleap calendars (see code comment).
    expect(result.isTimeAxis).toBe(true);
  });
});

describe("getDimensionKeys", () => {
  it("returns empty array for empty metadata", () => {
    expect(getDimensionKeys([])).toEqual([]);
  });

  it("collects unique dimension keys sorted alphabetically", () => {
    const metadata: SeriesMetadata[] = [
      {
        seriesIndex: 0,
        label: "A",
        color: "#000",
        isReference: false,
        dimensions: { source_id: "ModelA", experiment_id: "exp1" },
      },
      {
        seriesIndex: 1,
        label: "B",
        color: "#000",
        isReference: false,
        dimensions: { source_id: "ModelB", metric: "rmse" },
      },
    ];
    expect(getDimensionKeys(metadata)).toEqual([
      "experiment_id",
      "metric",
      "source_id",
    ]);
  });

  it("deduplicates keys across series", () => {
    const metadata = [
      {
        seriesIndex: 0,
        label: "A",
        color: "#000",
        isReference: false,
        dimensions: { source_id: "ModelA" },
      },
      {
        seriesIndex: 1,
        label: "B",
        color: "#000",
        isReference: false,
        dimensions: { source_id: "ModelB" },
      },
    ];
    expect(getDimensionKeys(metadata)).toEqual(["source_id"]);
  });
});

/** Series metadata for `label`, with any fields overridden */
function meta(
  seriesIndex: number,
  label: string,
  options: Partial<SeriesMetadata> = {},
): SeriesMetadata {
  return {
    seriesIndex,
    label,
    color: `#00000${seriesIndex}`,
    isReference: false,
    dimensions: {},
    ...options,
  };
}

/** A legend item for `label` */
function item(label: string, isReference = false): LegendItem {
  return { label, color: "#000000", count: 1, isReference };
}

describe("legendItems", () => {
  it("counts the series sharing a label and keeps the first colour", () => {
    const items = legendItems([meta(0, "A"), meta(1, "B"), meta(2, "A")]);
    expect(items).toEqual([
      { label: "A", color: "#000000", count: 2, isReference: false },
      { label: "B", color: "#000001", count: 1, isReference: false },
    ]);
  });

  it("puts references first and orders the rest by label", () => {
    const items = legendItems([
      meta(0, "b"),
      meta(1, "Ref", { isReference: true }),
      meta(2, "a"),
    ]);
    expect(items.map((i) => i.label)).toEqual(["Ref", "a", "b"]);
  });
});

describe("labelDimensions", () => {
  it("maps each label to the dimensions of its first series", () => {
    const map = labelDimensions([
      meta(0, "A", { dimensions: { source_id: "first" } }),
      meta(1, "A", { dimensions: { source_id: "second" } }),
      meta(2, "B", { dimensions: { source_id: "other" } }),
    ]);
    expect(map).toEqual(
      new Map([
        ["A", { source_id: "first" }],
        ["B", { source_id: "other" }],
      ]),
    );
  });
});

describe("groupLegendItems", () => {
  const dims = new Map<string, Record<string, string>>([
    ["A", { experiment_id: "ssp585" }],
    ["B", { experiment_id: "historical" }],
    ["C", { experiment_id: "ssp585" }],
    ["D", {}],
  ]);

  it("groups items by their label's dimension value, ordered by value", () => {
    const groups = groupLegendItems(
      [item("A"), item("B"), item("C")],
      "experiment_id",
      dims,
    );
    expect(
      groups.map(([key, items]) => [key, items.map((i) => i.label)]),
    ).toEqual([
      ["historical", ["B"]],
      ["ssp585", ["A", "C"]],
    ]);
  });

  it("groups items without the dimension under Unknown", () => {
    const groups = groupLegendItems(
      [item("D"), item("E")],
      "experiment_id",
      dims,
    );
    expect(
      groups.map(([key, items]) => [key, items.map((i) => i.label)]),
    ).toEqual([["Unknown", ["D", "E"]]]);
  });
});

describe("hiddenLabelsWithSolo", () => {
  const items = [item("Ref", true), item("A"), item("B"), item("C")];

  it("keeps the hidden labels when not soloing", () => {
    const hidden = new Set(["A"]);
    expect(hiddenLabelsWithSolo(hidden, null, items)).toBe(hidden);
  });

  it("hides all but the soloed label and references while soloing", () => {
    expect(hiddenLabelsWithSolo(new Set(["B"]), "B", items)).toEqual(
      new Set(["A", "C"]),
    );
  });
});

describe("toggleInSet", () => {
  it("adds a missing value and removes a present one", () => {
    expect(toggleInSet(new Set(["a"]), "b")).toEqual(new Set(["a", "b"]));
    expect(toggleInSet(new Set(["a", "b"]), "a")).toEqual(new Set(["b"]));
  });

  it("does not change the given set", () => {
    const set = new Set(["a"]);
    toggleInSet(set, "a");
    expect(set).toEqual(new Set(["a"]));
  });
});
