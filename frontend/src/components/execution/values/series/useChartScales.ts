import * as d3 from "d3";
import { parseJSON } from "date-fns/parseJSON";
import { useMemo } from "react";
import type { SeriesMetadata } from "../types";
import type { ChartDataPoint } from "./utils";

export interface ChartMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export const DEFAULT_MARGINS: ChartMargins = {
  top: 10,
  right: 30,
  bottom: 50,
  left: 80,
};

export interface ChartScales {
  xScale: d3.ScaleLinear<number, number>;
  yScale: d3.ScaleLinear<number, number>;
  xDomain: [number, number];
  yDomain: [number, number];
  innerWidth: number;
  innerHeight: number;
  margins: ChartMargins;
}

export function useChartScales(
  chartData: ChartDataPoint[],
  seriesMetadata: SeriesMetadata[],
  hiddenLabels: Set<string>,
  indexName: string,
  width: number,
  height: number,
  symmetricalAxes: boolean,
  margins: ChartMargins = DEFAULT_MARGINS,
): ChartScales {
  return useMemo(() => {
    const innerWidth = Math.max(0, width - margins.left - margins.right);
    const innerHeight = Math.max(0, height - margins.top - margins.bottom);

    // X domain from index values
    const xValues = chartData
      .map((d) => d[indexName])
      .map((v) => {
        if (typeof v === "number" && Number.isFinite(v)) {
          return v;
        }
        if (typeof v === "string") {
          const parsed = parseJSON(v);
          const ts = parsed.getTime();
          return Number.isFinite(ts) ? ts : null;
        }
        return null;
      })
      .filter((v): v is number => typeof v === "number");

    const xDomain: [number, number] =
      xValues.length > 0
        ? [d3.min(xValues) as number, d3.max(xValues) as number]
        : [0, 1];

    // Y domain from visible series only
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

    return {
      xScale,
      yScale,
      xDomain,
      yDomain,
      innerWidth,
      innerHeight,
      margins,
    };
  }, [
    chartData,
    seriesMetadata,
    hiddenLabels,
    indexName,
    width,
    height,
    symmetricalAxes,
    margins,
  ]);
}
