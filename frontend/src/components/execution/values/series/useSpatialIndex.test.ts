import * as d3 from "d3";
import { describe, expect, it } from "vitest";
import type { SeriesMetadata } from "../types";

// Test spatial index logic directly (extracted from the hook)

interface ChartDataPoint {
  [key: string]: number | string | null;
}

interface IndexedPoint {
  seriesIndex: number;
  dataIndex: number;
  x: number;
  y: number;
  pixelX: number;
  pixelY: number;
}

interface NearestResult {
  point: IndexedPoint;
  metadata: SeriesMetadata;
  distance: number;
}

function cellKey(cx: number, cy: number): string {
  return `${cx},${cy}`;
}

function buildSpatialIndex(
  chartData: ChartDataPoint[],
  seriesMetadata: SeriesMetadata[],
  indexName: string,
  xScale: d3.ScaleLinear<number, number>,
  yScale: d3.ScaleLinear<number, number>,
) {
  const cellSize = 30;
  const cells = new Map<string, IndexedPoint[]>();

  for (const meta of seriesMetadata) {
    const key = `series_${meta.seriesIndex}`;
    for (let i = 0; i < chartData.length; i++) {
      const xVal = chartData[i][indexName];
      const yVal = chartData[i][key];
      if (
        typeof xVal !== "number" ||
        typeof yVal !== "number" ||
        !Number.isFinite(yVal)
      ) {
        continue;
      }

      const pixelX = xScale(xVal);
      const pixelY = yScale(yVal);
      const cx = Math.floor(pixelX / cellSize);
      const cy = Math.floor(pixelY / cellSize);
      const k = cellKey(cx, cy);

      const point: IndexedPoint = {
        seriesIndex: meta.seriesIndex,
        dataIndex: i,
        x: xVal,
        y: yVal,
        pixelX,
        pixelY,
      };

      const bucket = cells.get(k);
      if (bucket) {
        bucket.push(point);
      } else {
        cells.set(k, [point]);
      }
    }
  }

  function findNearest(
    pixelX: number,
    pixelY: number,
    hiddenLabels: Set<string>,
    maxDistance = 50,
  ): NearestResult | null {
    const cx = Math.floor(pixelX / cellSize);
    const cy = Math.floor(pixelY / cellSize);
    const searchRadius = Math.ceil(maxDistance / cellSize);

    let best: NearestResult | null = null;
    let bestDist = maxDistance * maxDistance;

    for (let dx = -searchRadius; dx <= searchRadius; dx++) {
      for (let dy = -searchRadius; dy <= searchRadius; dy++) {
        const bucket = cells.get(cellKey(cx + dx, cy + dy));
        if (!bucket) continue;

        for (const pt of bucket) {
          const meta = seriesMetadata[pt.seriesIndex];
          if (!meta || hiddenLabels.has(meta.label)) continue;

          const distSq = (pt.pixelX - pixelX) ** 2 + (pt.pixelY - pixelY) ** 2;
          if (distSq < bestDist) {
            bestDist = distSq;
            best = { point: pt, metadata: meta, distance: Math.sqrt(distSq) };
          }
        }
      }
    }

    return best;
  }

  function findNearestAtX(
    pixelX: number,
    pixelY: number,
    hiddenLabels: Set<string>,
  ): NearestResult[] {
    const xVal = xScale.invert(pixelX);
    let closestDataIdx = 0;
    let closestXDist = Number.POSITIVE_INFINITY;
    for (let i = 0; i < chartData.length; i++) {
      const v = chartData[i][indexName];
      if (typeof v !== "number") continue;
      const dist = Math.abs(v - xVal);
      if (dist < closestXDist) {
        closestXDist = dist;
        closestDataIdx = i;
      }
    }

    const results: NearestResult[] = [];
    for (const meta of seriesMetadata) {
      if (hiddenLabels.has(meta.label)) continue;
      const key = `series_${meta.seriesIndex}`;
      const yVal = chartData[closestDataIdx]?.[key];
      if (typeof yVal !== "number" || !Number.isFinite(yVal)) continue;

      const ptPixelX = xScale(chartData[closestDataIdx][indexName] as number);
      const ptPixelY = yScale(yVal);
      const dist = Math.sqrt(
        (ptPixelX - pixelX) ** 2 + (ptPixelY - pixelY) ** 2,
      );

      results.push({
        point: {
          seriesIndex: meta.seriesIndex,
          dataIndex: closestDataIdx,
          x: chartData[closestDataIdx][indexName] as number,
          y: yVal,
          pixelX: ptPixelX,
          pixelY: ptPixelY,
        },
        metadata: meta,
        distance: dist,
      });
    }

    results.sort((a, b) => a.distance - b.distance);
    return results;
  }

  return { findNearest, findNearestAtX };
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

describe("buildSpatialIndex", () => {
  it("findNearest returns the closest point to cursor", () => {
    const index = buildSpatialIndex(chartData, meta, "year", xScale, yScale);
    // Pixel position near the first data point of ModelA (2020, 1.0)
    // pixelX = 0, pixelY = yScale(1.0) = 333.33
    const result = index.findNearest(0, 333, new Set());
    expect(result).not.toBeNull();
    expect(result!.metadata.label).toBe("ModelA");
    expect(result!.point.x).toBe(2020);
    expect(result!.point.y).toBe(1.0);
  });

  it("findNearest returns null when cursor is too far from any point", () => {
    const index = buildSpatialIndex(chartData, meta, "year", xScale, yScale);
    // Way outside the chart area
    const result = index.findNearest(-500, -500, new Set(), 10);
    expect(result).toBeNull();
  });

  it("findNearest skips hidden series", () => {
    const index = buildSpatialIndex(chartData, meta, "year", xScale, yScale);
    // At x=2022 (pixel 600), all three series have y=3.0 (pixelY = yScale(3.0) = 200)
    // Hide ModelA, cursor right on that shared point
    const hidden = new Set(["ModelA"]);
    const sharedPixelY = yScale(3.0);
    const result = index.findNearest(600, sharedPixelY, hidden);
    expect(result).not.toBeNull();
    expect(result!.metadata.label).not.toBe("ModelA");
  });

  it("findNearest distinguishes between close series by Y proximity", () => {
    const index = buildSpatialIndex(chartData, meta, "year", xScale, yScale);
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
    const index = buildSpatialIndex(chartData, meta, "year", xScale, yScale);
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
    const index = buildSpatialIndex(chartData, meta, "year", xScale, yScale);
    const hidden = new Set(["ModelB"]);
    const results = index.findNearestAtX(300, 200, hidden);
    const labels = results.map((r) => r.metadata.label);
    expect(labels).not.toContain("ModelB");
    expect(results).toHaveLength(2);
  });

  it("findNearestAtX sorts by distance to cursor", () => {
    const index = buildSpatialIndex(chartData, meta, "year", xScale, yScale);
    // Cursor Y near ModelA value at 2021 (y=2.0, pixelY=266.67)
    const cursorY = yScale(2.0);
    const results = index.findNearestAtX(300, cursorY, new Set());
    // ModelA (y=2.0) should be closest, then Reference (y=3.0), then ModelB (y=4.0)
    expect(results[0].metadata.label).toBe("ModelA");
    expect(results[0].point.y).toBe(2.0);
  });

  it("handles empty chart data", () => {
    const index = buildSpatialIndex([], meta, "year", xScale, yScale);
    const result = index.findNearest(100, 100, new Set());
    expect(result).toBeNull();
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
    const index = buildSpatialIndex(dataWithNaN, meta, "year", xScale, yScale);
    // Should still find valid points
    const result = index.findNearest(300, yScale(2.0), new Set());
    expect(result).not.toBeNull();
    // NaN and Infinity points should be excluded
    expect(Number.isFinite(result!.point.y)).toBe(true);
  });
});
