import * as d3 from "d3";
import { describe, expect, it } from "vitest";
import type { SeriesMetadata } from "../types";

// Test the scale computation logic directly (extracted from the hook)
// since hooks require a React test environment

interface ChartDataPoint {
  [key: string]: number | string | null;
}

function computeScales(
  chartData: ChartDataPoint[],
  seriesMetadata: SeriesMetadata[],
  hiddenLabels: Set<string>,
  indexName: string,
  width: number,
  height: number,
  symmetricalAxes: boolean,
  margins = { top: 10, right: 30, bottom: 60, left: 70 },
) {
  const innerWidth = Math.max(0, width - margins.left - margins.right);
  const innerHeight = Math.max(0, height - margins.top - margins.bottom);

  const xValues = chartData
    .map((d) => d[indexName])
    .filter((v): v is number => typeof v === "number");

  const xDomain: [number, number] =
    xValues.length > 0
      ? [d3.min(xValues) as number, d3.max(xValues) as number]
      : [0, 1];

  const visibleKeys = new Set<string>();
  for (const meta of seriesMetadata) {
    if (!hiddenLabels.has(meta.label)) {
      visibleKeys.add(`series_${meta.seriesIndex}`);
    }
  }

  const yValues: number[] = [];
  for (const d of chartData) {
    for (const key of visibleKeys) {
      const v = d[key];
      if (typeof v === "number" && Number.isFinite(v)) {
        yValues.push(v);
      }
    }
  }

  let yDomain: [number, number];
  if (yValues.length === 0) {
    yDomain = [0, 1];
  } else if (symmetricalAxes) {
    const maxAbs = d3.max(yValues.map(Math.abs)) as number;
    yDomain = [-maxAbs, maxAbs];
  } else {
    const yMin = d3.min(yValues) as number;
    const yMax = d3.max(yValues) as number;
    const padding = (yMax - yMin) * 0.05 || 0.1;
    yDomain = [yMin - padding, yMax + padding];
  }

  const xScale = d3.scaleLinear().domain(xDomain).range([0, innerWidth]);
  const yScale = d3.scaleLinear().domain(yDomain).range([innerHeight, 0]);

  return { xScale, yScale, xDomain, yDomain, innerWidth, innerHeight, margins };
}

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

describe("computeScales", () => {
  it("computes correct X domain from index values", () => {
    const { xDomain } = computeScales(
      chartData,
      meta,
      new Set(),
      "year",
      800,
      600,
      false,
    );
    expect(xDomain).toEqual([2020, 2022]);
  });

  it("computes Y domain from visible series only", () => {
    const hidden = new Set(["ModelB"]);
    const { yDomain } = computeScales(
      chartData,
      meta,
      hidden,
      "year",
      800,
      600,
      false,
    );
    // Only ModelA values: [1, 3, 2], min=1, max=3, padding = 0.1
    expect(yDomain[0]).toBeCloseTo(0.9, 1);
    expect(yDomain[1]).toBeCloseTo(3.1, 1);
  });

  it("returns fallback Y domain when all series hidden", () => {
    const allHidden = new Set(["ModelA", "ModelB"]);
    const { yDomain } = computeScales(
      chartData,
      meta,
      allHidden,
      "year",
      800,
      600,
      false,
    );
    expect(yDomain).toEqual([0, 1]);
  });

  it("creates symmetrical Y domain when symmetricalAxes is true", () => {
    const { yDomain } = computeScales(
      chartData,
      meta,
      new Set(),
      "year",
      800,
      600,
      true,
    );
    // Max abs value is 3.0, so domain should be [-3, 3]
    expect(yDomain[0]).toBe(-3);
    expect(yDomain[1]).toBe(3);
  });

  it("maps X values to pixel range correctly", () => {
    const margins = { top: 10, right: 30, bottom: 60, left: 70 };
    const { xScale, innerWidth } = computeScales(
      chartData,
      meta,
      new Set(),
      "year",
      800,
      600,
      false,
      margins,
    );
    expect(innerWidth).toBe(700);
    expect(xScale(2020)).toBe(0);
    expect(xScale(2022)).toBe(700);
  });

  it("maps Y values with inverted axis (high value = low pixel)", () => {
    const { yScale } = computeScales(
      chartData,
      meta,
      new Set(),
      "year",
      800,
      600,
      false,
    );
    const yDomain = yScale.domain();
    // Higher values should map to lower pixel values
    expect(yScale(yDomain[1])).toBe(0);
    expect(yScale(yDomain[0])).toBe(530); // 600 - 10 - 60
  });

  it("handles empty chart data gracefully", () => {
    const { xDomain, yDomain } = computeScales(
      [],
      meta,
      new Set(),
      "year",
      800,
      600,
      false,
    );
    expect(xDomain).toEqual([0, 1]);
    expect(yDomain).toEqual([0, 1]);
  });

  it("handles zero-size dimensions without crashing", () => {
    const result = computeScales(
      chartData,
      meta,
      new Set(),
      "year",
      70,
      70,
      false,
    );
    expect(result.innerWidth).toBe(0);
    expect(result.innerHeight).toBe(0);
  });
});
