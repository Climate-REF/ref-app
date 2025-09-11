import * as d3 from "d3-array";
import { useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MetricValue } from "@/client/types.gen";
import { BoxWhiskerShape } from "@/components/execution/values/boxWhiskerShape.tsx";
import { createScaledTickFormatter } from "../execution/values/series/utils";

interface EnsembleChartProps {
  data: MetricValue[];
  metricName: string;
  metricUnits: string;
  xAxis?: string;
  valueFormatter?: (v: number) => string;
  clipMin?: number;
  clipMax?: number;
}

export const EmptyEnsembleChart = () => {
  return (
    <div className="flex items-center justify-center h-full text-center text-sm text-muted-foreground">
      No data available for this chart.
    </div>
  );
};

const chartHeight = 320;
const marginTop = 24;
const marginBottom = 10;
const chartInnerHeight = chartHeight - marginTop - marginBottom;

export const EnsembleChart = ({
  data,
  metricName,
  metricUnits,
  xAxis = "metric",
  valueFormatter,
  clipMin,
  clipMax,
}: EnsembleChartProps) => {
  const [highlightedPoint, setHighlightedPoint] = useState<MetricValue | null>(
    null,
  );
  // Group data by the specified xAxis dimension
  const groupedData = Object.groupBy(
    data,
    (d: MetricValue) => d.dimensions[xAxis] ?? metricName,
  );

  const chartData = Object.entries(groupedData).map(
    ([groupName, values]: [string, MetricValue[] | undefined]) => {
      const allValues: number[] =
        values
          ?.map((d: MetricValue) => Number(d.value))
          ?.filter((v: number) => Number.isFinite(v)) ?? [];

      const filteredValues: number[] = allValues
        .filter(
          (v: number) =>
            (clipMin === undefined || v >= clipMin) &&
            (clipMax === undefined || v <= clipMax),
        )
        .sort((a: number, b: number) => a - b);

      if (filteredValues.length === 0) {
        return {
          name: groupName,
          groups: { ensemble: null },
          __outliers: { ensemble: 0 },
          __rawData: values ?? [],
        };
      }

      const min = d3.min(filteredValues)!;
      const max = d3.max(filteredValues)!;
      const q1 = d3.quantile(filteredValues, 0.25)!;
      const median = d3.median(filteredValues)!;
      const q3 = d3.quantile(filteredValues, 0.75)!;

      return {
        name: groupName,
        groups: {
          ensemble: {
            min,
            lowerQuartile: q1,
            median,
            upperQuartile: q3,
            max,
            values: filteredValues,
          },
        },
        __outliers: {
          ensemble: allValues.length - filteredValues.length,
        },
        __rawData: values ?? [],
      };
    },
  );

  const yDomainData: [number, number] = (() => {
    const allFiniteValues = chartData
      .flatMap((d) =>
        d.groups.ensemble ? [d.groups.ensemble.min, d.groups.ensemble.max] : [],
      )
      .filter((v) => Number.isFinite(v)) as number[];
    if (allFiniteValues.length === 0) return [0, 1];
    const minVal = Math.min(...allFiniteValues);
    const maxVal = Math.max(...allFiniteValues);
    if (minVal === maxVal) {
      const pad = Math.max(1, Math.abs(minVal) * 0.1);
      return [minVal - pad, maxVal + pad];
    }
    return [minVal, maxVal];
  })();

  const fmt = valueFormatter ?? createScaledTickFormatter(yDomainData);

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height={chartHeight}>
        <ComposedChart
          data={chartData}
          margin={{ top: marginTop, right: 24, left: 12, bottom: marginBottom }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={{ stroke: "#E5E7EB" }}
            tickMargin={10}
          />
          <YAxis
            width={64}
            tickFormatter={(v: number) => fmt(Number(v))}
            tickLine={false}
            axisLine={{ stroke: "#E5E7EB" }}
            label={{
              value: metricUnits,
              angle: -90,
              position: "insideLeft",
              offset: 0,
              className: "fill-muted-foreground",
            }}
            domain={[
              (dataMin: number) => (dataMin ?? yDomainData[0]) * 0.9,
              (dataMax: number) => (dataMax ?? yDomainData[1]) * 1.1,
            ]}
          />
          <Tooltip
            cursor={{ stroke: "#94A3B8", strokeDasharray: "4 4" }}
            content={({ active, payload, label, coordinate }) => {
              if (!active || !payload || payload.length === 0) {
                // Clear highlight when tooltip is not active
                if (highlightedPoint) {
                  setHighlightedPoint(null);
                }
                return null;
              }
              const datum: any = (payload[0] as any).payload ?? {};
              const box = datum?.groups?.ensemble;
              const outliers = datum?.__outliers;
              const rawData: MetricValue[] = datum?.__rawData ?? [];

              const renderKV = (k: string, v: string) => (
                <div key={k} className="contents">
                  <div className="text-muted-foreground">{k}</div>
                  <div className="text-right">{v}</div>
                </div>
              );

              // Find closest data point to mouse position
              let closestDataPoint: MetricValue | null = null;
              if (coordinate && rawData.length > 0) {
                const mouseY = coordinate.y ?? 0;
                let minDistance = Number.POSITIVE_INFINITY;

                // Use the actual domain that Recharts calculates (with padding)
                const actualYMin = yDomainData[0] ?? 0;
                const actualYMax = yDomainData[1] ?? 1;

                // Chart dimensions accounting for margins

                for (const dataPoint of rawData) {
                  const value = Number(dataPoint.value);
                  if (Number.isFinite(value)) {
                    // Convert value to pixel position using the same scale as Recharts
                    const normalizedValue =
                      (value - actualYMin) / (actualYMax - actualYMin);
                    const valueY = chartInnerHeight * (1 - normalizedValue);

                    const distance = Math.abs(mouseY - valueY);
                    if (distance < minDistance) {
                      minDistance = distance;
                      closestDataPoint = dataPoint;
                    }
                  }
                }
              }

              // Update highlighted point
              if (closestDataPoint !== highlightedPoint) {
                setHighlightedPoint(closestDataPoint);
              }

              // Calculate tooltip position to avoid clipping
              const tooltipHeight = 300; // Approximate tooltip height
              const mouseY = coordinate?.y ?? 0;

              // If tooltip would extend below chart, position it above the mouse
              const shouldPositionAbove =
                mouseY + tooltipHeight > chartHeight - marginBottom;

              return (
                <div
                  className="rounded-md border bg-white dark:bg-muted p-2 text-xs shadow-lg w-[300px] z-[9999]"
                  style={{
                    borderColor: "hsl(var(--border))",
                    transform: shouldPositionAbove
                      ? "translateY(-20%)"
                      : "translateY(10px)",
                    marginTop: "-10px",
                  }}
                >
                  <div className="mb-2 font-medium">{label}</div>

                  {/* Ensemble Statistics */}
                  <div className="mb-3">
                    <div className="mb-1 font-semibold">
                      Ensemble Statistics
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      {renderKV("Min", box ? fmt(Number(box.min)) : "—")}
                      {renderKV(
                        "Q1",
                        box ? fmt(Number(box.lowerQuartile)) : "—",
                      )}
                      {renderKV("Median", box ? fmt(Number(box.median)) : "—")}
                      {renderKV(
                        "Q3",
                        box ? fmt(Number(box.upperQuartile)) : "—",
                      )}
                      {renderKV("Max", box ? fmt(Number(box.max)) : "—")}
                      {renderKV(
                        "Count",
                        String(
                          (box?.values?.length ?? 0) +
                            (outliers?.ensemble ?? 0),
                        ),
                      )}
                      {outliers?.ensemble ? (
                        <div className="col-span-2 mt-1 text-muted-foreground">
                          ({outliers.ensemble} outliers clipped)
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* Closest Data Point */}
                  {closestDataPoint && (
                    <div>
                      <div className="mb-1 font-semibold">
                        Closest Data Point
                      </div>
                      <div className="space-y-1">
                        <div className="grid grid-cols-2 gap-x-4">
                          {renderKV(
                            "Value",
                            fmt(Number(closestDataPoint.value)),
                          )}
                          {renderKV("Units", metricUnits)}
                        </div>
                        <div className="mt-2">
                          <div className="text-muted-foreground text-xs mb-1">
                            Dimensions:
                          </div>
                          <div className="grid grid-cols-1 gap-y-1 text-xs">
                            {Object.entries(closestDataPoint.dimensions).map(
                              ([key, value]) => (
                                <div
                                  key={key}
                                  className="grid grid-cols-2 gap-x-2"
                                >
                                  <span className="text-muted-foreground truncate">
                                    {key}:
                                  </span>
                                  <span className="truncate" title={value}>
                                    {value}
                                  </span>
                                </div>
                              ),
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            }}
          />
          <Bar
            dataKey={(d) => d?.groups?.ensemble?.median}
            fill="#93C5FD"
            stroke="#3B82F6"
            isAnimationActive={false}
            shape={
              <BoxWhiskerShape
                prefix="ensemble"
                yDomain={yDomainData}
                highlightedPoint={highlightedPoint}
              />
            }
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
