import { describe, expect, it } from "vitest";
import type { SeriesMetadata } from "../types";
import { computeChartScales } from "./useChartScales";
import type { ChartDataPoint } from "./utils";

const meta: SeriesMetadata[] = [
  {
    seriesIndex: 0,
    label: "ModelA",
    color: "#4e79a7",
    isReference: false,
    dimensions: { source_id: "ModelA" },
  },
  {
    seriesIndex: 1,
    label: "ModelB",
    color: "#f28e2b",
    isReference: false,
    dimensions: { source_id: "ModelB" },
  },
];

const chartData: ChartDataPoint[] = [
  { year: 2020, series_0: 1.0, series_1: -2.0 },
  { year: 2021, series_0: 3.0, series_1: -1.0 },
  { year: 2022, series_0: 2.0, series_1: 0.5 },
];

describe("computeChartScales", () => {
  it("computes correct X domain from index values", () => {
    const { xDomain } = computeChartScales(
      chartData,
      meta,
      new Set(),
      "year",
      800,
      600,
      false,
      false,
    );
    expect(xDomain).toEqual([2020, 2022]);
  });

  it("computes Y domain from visible series only", () => {
    const hidden = new Set(["ModelB"]);
    const { yDomain } = computeChartScales(
      chartData,
      meta,
      hidden,
      "year",
      800,
      600,
      false,
      false,
    );
    // Only ModelA values: [1, 3, 2], min=1, max=3, padding = 0.1
    expect(yDomain[0]).toBeCloseTo(0.9, 1);
    expect(yDomain[1]).toBeCloseTo(3.1, 1);
  });

  it("returns fallback Y domain when all series hidden", () => {
    const allHidden = new Set(["ModelA", "ModelB"]);
    const { yDomain } = computeChartScales(
      chartData,
      meta,
      allHidden,
      "year",
      800,
      600,
      false,
      false,
    );
    expect(yDomain).toEqual([0, 1]);
  });

  it("creates symmetrical Y domain when symmetricalAxes is true", () => {
    const { yDomain } = computeChartScales(
      chartData,
      meta,
      new Set(),
      "year",
      800,
      600,
      true,
      false,
    );
    // Max abs value is 3.0, so domain should be [-3, 3]
    expect(yDomain[0]).toBe(-3);
    expect(yDomain[1]).toBe(3);
  });

  it("maps X values to pixel range correctly", () => {
    const margins = { top: 10, right: 30, bottom: 60, left: 70 };
    const { xScale, innerWidth } = computeChartScales(
      chartData,
      meta,
      new Set(),
      "year",
      800,
      600,
      false,
      false,
      margins,
    );
    expect(innerWidth).toBe(700);
    expect(xScale(2020)).toBe(0);
    expect(xScale(2022)).toBe(700);
  });

  it("maps Y values with inverted axis (high value = low pixel)", () => {
    const { yScale } = computeChartScales(
      chartData,
      meta,
      new Set(),
      "year",
      800,
      600,
      false,
      false,
    );
    const yDomain = yScale.domain();
    // Higher values should map to lower pixel values
    expect(yScale(yDomain[1])).toBe(0);
    expect(yScale(yDomain[0])).toBe(540); // 600 - 10 top - 50 bottom (default margins)
  });

  it("handles empty chart data gracefully", () => {
    const { xDomain, yDomain } = computeChartScales(
      [],
      meta,
      new Set(),
      "year",
      800,
      600,
      false,
      false,
    );
    expect(xDomain).toEqual([0, 1]);
    expect(yDomain).toEqual([0, 1]);
  });

  it("clamps the inner size to zero when the margins do not fit", () => {
    const result = computeChartScales(
      chartData,
      meta,
      new Set(),
      "year",
      100,
      50,
      false,
      false,
    );
    expect(result.innerWidth).toBe(0);
    expect(result.innerHeight).toBe(0);
  });
});

describe("computeChartScales with time axis", () => {
  const ts1 = new Date("2020-01-15T00:00:00Z").getTime();
  const ts2 = new Date("2020-06-15T00:00:00Z").getTime();
  const ts3 = new Date("2021-01-15T00:00:00Z").getTime();

  const timeChartData: ChartDataPoint[] = [
    { time: ts1, series_0: 1.0, series_1: -2.0 },
    { time: ts2, series_0: 3.0, series_1: -1.0 },
    { time: ts3, series_0: 2.0, series_1: 0.5 },
  ];

  it("computes X domain from timestamp values", () => {
    const { xDomain } = computeChartScales(
      timeChartData,
      meta,
      new Set(),
      "time",
      800,
      600,
      false,
      true,
    );
    expect(xDomain[0]).toBe(ts1);
    expect(xDomain[1]).toBe(ts3);
  });

  it("creates a time scale that maps timestamps to pixels", () => {
    const margins = { top: 10, right: 30, bottom: 60, left: 70 };
    const { xScale, innerWidth } = computeChartScales(
      timeChartData,
      meta,
      new Set(),
      "time",
      800,
      600,
      false,
      true,
      margins,
    );
    expect(innerWidth).toBe(700);
    // First timestamp maps to 0, last to innerWidth
    expect(xScale(ts1)).toBe(0);
    expect(xScale(ts3)).toBe(700);
  });

  it("produces Date ticks for time scale", () => {
    const { xScale } = computeChartScales(
      timeChartData,
      meta,
      new Set(),
      "time",
      800,
      600,
      false,
      true,
    );
    const ticks = xScale.ticks(5);
    // d3.scaleTime.ticks returns Date objects
    expect(ticks.length).toBeGreaterThan(0);
    expect(ticks[0]).toBeInstanceOf(Date);
  });

  it("maps midpoint timestamp to middle pixel range", () => {
    const margins = { top: 10, right: 30, bottom: 60, left: 70 };
    const { xScale } = computeChartScales(
      timeChartData,
      meta,
      new Set(),
      "time",
      800,
      600,
      false,
      true,
      margins,
    );
    const midTs = (ts1 + ts3) / 2;
    expect(xScale(midTs)).toBe(350);
  });

  it("Y domain is unaffected by time axis mode", () => {
    const linearResult = computeChartScales(
      timeChartData,
      meta,
      new Set(),
      "time",
      800,
      600,
      false,
      false,
    );
    const timeResult = computeChartScales(
      timeChartData,
      meta,
      new Set(),
      "time",
      800,
      600,
      false,
      true,
    );
    expect(timeResult.yDomain).toEqual(linearResult.yDomain);
  });
});
