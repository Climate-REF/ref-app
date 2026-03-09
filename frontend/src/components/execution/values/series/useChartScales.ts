import * as d3 from "d3";
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

/**
 * Union of d3 continuous scale types used for the X axis.
 * Both accept numeric inputs and return numeric pixel positions.
 */
export type XScaleType =
  | d3.ScaleLinear<number, number>
  | d3.ScaleTime<number, number>;

export interface ChartScales {
  xScale: XScaleType;
  yScale: d3.ScaleLinear<number, number>;
  xDomain: [number, number];
  yDomain: [number, number];
  innerWidth: number;
  innerHeight: number;
  margins: ChartMargins;
  isTimeAxis: boolean;
}

export function useChartScales(
  chartData: ChartDataPoint[],
  seriesMetadata: SeriesMetadata[],
  hiddenLabels: Set<string>,
  indexName: string,
  width: number,
  height: number,
  symmetricalAxes: boolean,
  isTimeAxis: boolean,
  margins: ChartMargins = DEFAULT_MARGINS,
): ChartScales {
  return useMemo(() => {
    const innerWidth = Math.max(0, width - margins.left - margins.right);
    const innerHeight = Math.max(0, height - margins.top - margins.bottom);

    // X domain from index values (already numeric — timestamps for datetime axes)
    const xValues = chartData
      .map((d) => d[indexName])
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v));

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

    const xScale: XScaleType = isTimeAxis
      ? d3
          .scaleTime()
          .domain([new Date(xDomain[0]), new Date(xDomain[1])])
          .range([0, innerWidth])
      : d3.scaleLinear().domain(xDomain).range([0, innerWidth]);

    const yScale = d3.scaleLinear().domain(yDomain).range([innerHeight, 0]);

    return {
      xScale,
      yScale,
      xDomain,
      yDomain,
      innerWidth,
      innerHeight,
      margins,
      isTimeAxis,
    };
  }, [
    chartData,
    seriesMetadata,
    hiddenLabels,
    indexName,
    width,
    height,
    symmetricalAxes,
    isTimeAxis,
    margins,
  ]);
}
