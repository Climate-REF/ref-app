import { renderHook } from "@testing-library/react";
import * as d3 from "d3";
import { describe, expect, it } from "vitest";
import type { SeriesMetadata } from "../types";
import {
  createSpatialIndex,
  findTooltipPoints,
  useSpatialIndex,
} from "./useSpatialIndex";
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
  {
    seriesIndex: 2,
    label: "Reference",
    color: "#000000",
    isReference: true,
    dimensions: { source_id: "Reference" },
  },
];

const chartData: ChartDataPoint[] = [
  { year: 2020, series_0: 1.0, series_1: 5.0, series_2: 3.0 },
  { year: 2021, series_0: 2.0, series_1: 4.0, series_2: 3.0 },
  { year: 2022, series_0: 3.0, series_1: 3.0, series_2: 3.0 },
];

const xScale = d3.scaleLinear().domain([2020, 2022]).range([0, 600]);
const yScale = d3.scaleLinear().domain([0, 6]).range([400, 0]);

describe("createSpatialIndex", () => {
  it("findNearest returns the closest point to cursor", () => {
    const index = createSpatialIndex(chartData, meta, "year", xScale, yScale);
    // Pixel position near the first data point of ModelA (2020, 1.0)
    // pixelX = 0, pixelY = yScale(1.0) = 333.33
    const result = index.findNearest(0, 333, new Set());
    expect(result).not.toBeNull();
    expect(result!.metadata.label).toBe("ModelA");
    expect(result!.point.x).toBe(2020);
    expect(result!.point.y).toBe(1.0);
  });

  it("findNearest returns null when cursor is too far from any point", () => {
    const index = createSpatialIndex(chartData, meta, "year", xScale, yScale);
    // Way outside the chart area
    const result = index.findNearest(-500, -500, new Set(), 10);
    expect(result).toBeNull();
  });

  it("findNearest skips hidden series", () => {
    const index = createSpatialIndex(chartData, meta, "year", xScale, yScale);
    // At x=2022 (pixel 600), all three series have y=3.0 (pixelY = yScale(3.0) = 200)
    // Hide ModelA, cursor right on that shared point
    const hidden = new Set(["ModelA"]);
    const sharedPixelY = yScale(3.0);
    const result = index.findNearest(600, sharedPixelY, hidden);
    expect(result).not.toBeNull();
    expect(result!.metadata.label).not.toBe("ModelA");
  });

  it("findNearest distinguishes between close series by Y proximity", () => {
    const index = createSpatialIndex(chartData, meta, "year", xScale, yScale);
    // At x=2022 (pixel 600), ModelA=3.0 and ModelB=3.0 and Ref=3.0
    // They share the same y, so all are at same distance
    // At x=2021 (pixel 300), ModelA=2.0 (pixelY=266.67), ModelB=4.0 (pixelY=133.33)
    // Cursor near ModelB at 2021
    const modelBPixelY = yScale(4.0); // ~133.33
    const result = index.findNearest(300, modelBPixelY, new Set());
    expect(result).not.toBeNull();
    expect(result!.metadata.label).toBe("ModelB");
    expect(result!.point.y).toBe(4.0);
  });

  it("findNearestAtX returns all visible series at closest X index", () => {
    const index = createSpatialIndex(chartData, meta, "year", xScale, yScale);
    // Near x=2021 (pixel ~300)
    const results = index.findNearestAtX(300, 200, new Set());
    expect(results).toHaveLength(3); // ModelA, ModelB, Reference
    // Should be sorted by distance to cursor Y
    const labels = results.map((r) => r.metadata.label);
    expect(labels).toContain("ModelA");
    expect(labels).toContain("ModelB");
    expect(labels).toContain("Reference");
  });

  it("findNearestAtX excludes hidden series", () => {
    const index = createSpatialIndex(chartData, meta, "year", xScale, yScale);
    const hidden = new Set(["ModelB"]);
    const results = index.findNearestAtX(300, 200, hidden);
    const labels = results.map((r) => r.metadata.label);
    expect(labels).not.toContain("ModelB");
    expect(results).toHaveLength(2);
  });

  it("findNearestAtX sorts by distance to cursor", () => {
    const index = createSpatialIndex(chartData, meta, "year", xScale, yScale);
    // Cursor Y near ModelA value at 2021 (y=2.0, pixelY=266.67)
    const cursorY = yScale(2.0);
    const results = index.findNearestAtX(300, cursorY, new Set());
    // ModelA (y=2.0) should be closest, then Reference (y=3.0), then ModelB (y=4.0)
    expect(results[0].metadata.label).toBe("ModelA");
    expect(results[0].point.y).toBe(2.0);
  });

  it("handles empty chart data", () => {
    const index = createSpatialIndex([], meta, "year", xScale, yScale);
    const result = index.findNearest(100, 100, new Set());
    expect(result).toBeNull();
    expect(index.findNearestAtX(100, 100, new Set())).toEqual([]);
  });

  it("handles non-finite values in series data", () => {
    const dataWithNaN: ChartDataPoint[] = [
      { year: 2020, series_0: Number.NaN, series_1: 5.0, series_2: 3.0 },
      {
        year: 2021,
        series_0: 2.0,
        series_1: Number.POSITIVE_INFINITY,
        series_2: 3.0,
      },
    ];
    const index = createSpatialIndex(dataWithNaN, meta, "year", xScale, yScale);
    // Should still find valid points
    const result = index.findNearest(300, yScale(2.0), new Set());
    expect(result).not.toBeNull();
    // NaN and Infinity points should be excluded
    expect(Number.isFinite(result!.point.y)).toBe(true);
  });
});

describe("findTooltipPoints", () => {
  // Two close x positions, so the cursor can be nearer one x while the
  // nearest point sits at the other
  const closeData: ChartDataPoint[] = [
    { year: 2020, series_0: 7.5, series_1: 2.5 },
    { year: 2021, series_0: 2.5, series_1: 2.5 },
  ];
  const closeXScale = d3.scaleLinear().domain([2020, 2021]).range([0, 40]);
  const closeYScale = d3.scaleLinear().domain([0, 10]).range([400, 0]);

  function renderIndex() {
    return renderHook(() =>
      useSpatialIndex(
        closeData,
        meta.slice(0, 2),
        "year",
        closeXScale,
        closeYScale,
      ),
    ).result.current;
  }

  it("collects the other series at the nearest point's x, not the cursor's", () => {
    // The cursor is nearer 2021 in x, but ModelA at 2020 is the nearest point
    const found = findTooltipPoints(renderIndex(), 25, 100, new Set());
    expect(found).not.toBeNull();
    expect(found!.nearest.metadata.label).toBe("ModelA");
    expect(found!.nearest.point.x).toBe(2020);
    expect(found!.allAtX.map((r) => r.point.x)).toEqual([2020, 2020]);
    expect(found!.allAtX[0].metadata.label).toBe("ModelA");
  });

  it("returns null when no point is near the cursor", () => {
    expect(findTooltipPoints(renderIndex(), 500, 0, new Set())).toBeNull();
  });
});
