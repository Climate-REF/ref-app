import type * as d3 from "d3";
import { useMemo } from "react";
import type { SeriesMetadata } from "../types";
import type { ChartDataPoint } from "./utils";

export interface IndexedPoint {
  seriesIndex: number;
  dataIndex: number;
  x: number;
  y: number;
  pixelX: number;
  pixelY: number;
}

interface SpatialGrid {
  cells: Map<string, IndexedPoint[]>;
  cellSize: number;
}

function cellKey(cx: number, cy: number): string {
  return `${cx},${cy}`;
}

function buildGrid(
  chartData: ChartDataPoint[],
  seriesMetadata: SeriesMetadata[],
  indexName: string,
  xScale: d3.ScaleLinear<number, number>,
  yScale: d3.ScaleLinear<number, number>,
  cellSize: number,
): SpatialGrid {
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

  return { cells, cellSize };
}

export interface NearestResult {
  point: IndexedPoint;
  metadata: SeriesMetadata;
  distance: number;
}

export interface SpatialIndex {
  findNearest: (
    pixelX: number,
    pixelY: number,
    hiddenLabels: Set<string>,
    maxDistance?: number,
  ) => NearestResult | null;
  findNearestAtX: (
    pixelX: number,
    pixelY: number,
    hiddenLabels: Set<string>,
  ) => NearestResult[];
}

export function useSpatialIndex(
  chartData: ChartDataPoint[],
  seriesMetadata: SeriesMetadata[],
  indexName: string,
  xScale: d3.ScaleLinear<number, number>,
  yScale: d3.ScaleLinear<number, number>,
): SpatialIndex {
  return useMemo(() => {
    const cellSize = 30;
    const grid = buildGrid(
      chartData,
      seriesMetadata,
      indexName,
      xScale,
      yScale,
      cellSize,
    );

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
          const bucket = grid.cells.get(cellKey(cx + dx, cy + dy));
          if (!bucket) continue;

          for (const pt of bucket) {
            const meta = seriesMetadata[pt.seriesIndex];
            if (!meta || hiddenLabels.has(meta.label)) continue;

            const distSq =
              (pt.pixelX - pixelX) ** 2 + (pt.pixelY - pixelY) ** 2;
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
      // Find the closest data index by X pixel position
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

      // Collect all visible series values at this data index
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

      // Sort by distance to cursor Y
      results.sort((a, b) => a.distance - b.distance);
      return results;
    }

    return { findNearest, findNearestAtX };
  }, [chartData, seriesMetadata, indexName, xScale, yScale]);
}
