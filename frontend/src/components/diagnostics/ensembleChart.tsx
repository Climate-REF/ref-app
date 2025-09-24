import * as d3 from "d3-array";
import { scaleLinear } from "d3-scale";
import { useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MetricValue } from "@/client/types.gen";
import { BoxWhiskerShape } from "@/components/execution/values/boxWhiskerShape.tsx";
import type { ChartGroupingConfig } from "@/components/explorer/grouping";
import {
  extractAvailableDimensions,
  initializeGroupingConfig,
} from "@/components/explorer/grouping";
import { createScaledTickFormatter } from "../execution/values/series/utils";

// Color palette for different groups
const COLORS = [
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#ff7300",
  "#00ff00",
  "#0088fe",
  "#00c49f",
  "#ffbb28",
  "#ff8042",
  "#8dd1e1",
];

interface EnsembleChartProps {
  data: MetricValue[];
  metricName: string;
  metricUnits: string;
  valueFormatter?: (v: number) => string;
  clipMin?: number;
  clipMax?: number;
  /** Unified grouping configuration */
  groupingConfig?: ChartGroupingConfig;
  /** When true, draw a red reference line at y=0 */
  showZeroLine?: boolean;
}

interface MetricValueGroup {
  min: number;
  lowerQuartile: number;
  median: number;
  upperQuartile: number;
  max: number;
  values: number[];
}

export const EmptyEnsembleChart = () => {
  return (
    <div className="flex items-center justify-center h-full text-center text-sm text-muted-foreground min-h-[200px]">
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
  valueFormatter,
  clipMin,
  clipMax,
  groupingConfig,
  showZeroLine,
}: EnsembleChartProps) => {
  const [highlightedPoint, setHighlightedPoint] = useState<MetricValue | null>(
    null,
  );

  // Extract available dimensions and initialize grouping config
  const availableDimensions = useMemo(
    () => extractAvailableDimensions(data),
    [data],
  );

  const finalGroupingConfig = useMemo(() => {
    return initializeGroupingConfig(availableDimensions, groupingConfig);
  }, [availableDimensions, groupingConfig]);

  // Group data by the specified groupBy dimension
  const groupByDimension = finalGroupingConfig.groupBy || "metric";
  const hueDimension = finalGroupingConfig.hue;

  // First group by the main dimension (x-axis)
  const primaryGroupedData = Object.groupBy(
    data,
    (d: MetricValue) => d.dimensions[groupByDimension] ?? metricName,
  );

  console.log(
    "Primary grouped data:",
    primaryGroupedData,
    groupingConfig,
    groupByDimension,
  );

  const chartData = Object.entries(primaryGroupedData).map(
    ([groupName, values]: [string, MetricValue[] | undefined]) => {
      if (!values || values.length === 0) {
        return {
          name: groupName,
          groups: {},
          __outliers: {},
          __rawData: [],
        };
      }

      // If hue dimension is specified, create sub-groups
      let subGroups: { [key: string]: MetricValue[] };
      if (hueDimension && hueDimension !== "none") {
        subGroups = Object.groupBy(
          values,
          (d: MetricValue) => d.dimensions[hueDimension] ?? "Unknown",
        ) as { [key: string]: MetricValue[] };
      } else {
        // Single group if no hue dimension
        subGroups = { ensemble: values };
      }

      const groups: { [key: string]: MetricValueGroup | null } = {};
      const outliers: { [key: string]: number } = {};
      const allRawData: MetricValue[] = [];

      Object.entries(subGroups).forEach(([subGroupName, subGroupValues]) => {
        const allValues: number[] =
          subGroupValues
            ?.map((d: MetricValue) => Number(d.value))
            ?.filter((v: number) => Number.isFinite(v)) ?? [];

        const filteredValues: number[] = allValues
          .filter(
            (v: number) =>
              (clipMin === undefined || v >= clipMin) &&
              (clipMax === undefined || v <= clipMax),
          )
          .sort((a: number, b: number) => a - b);

        allRawData.push(...(subGroupValues || []));

        if (filteredValues.length === 0) {
          groups[subGroupName] = null;
          outliers[subGroupName] = 0;
        } else {
          const min = d3.min(filteredValues)!;
          const max = d3.max(filteredValues)!;
          const q1 = d3.quantile(filteredValues, 0.25)!;
          const median = d3.median(filteredValues)!;
          const q3 = d3.quantile(filteredValues, 0.75)!;

          groups[subGroupName] = {
            min,
            lowerQuartile: q1,
            median,
            upperQuartile: q3,
            max,
            values: filteredValues,
          };
          outliers[subGroupName] = allValues.length - filteredValues.length;
        }
      });

      return {
        name: groupName,
        groups,
        __outliers: outliers,
        __rawData: allRawData,
      };
    },
  );

  // Get all unique group names for rendering multiple bars
  const allGroupNames = useMemo(() => {
    const names = new Set<string>();
    chartData.forEach((d) => {
      Object.keys(d.groups).forEach((groupName) => {
        names.add(groupName);
      });
    });
    return Array.from(names).sort();
  }, [chartData]);

  const scale = useMemo(() => {
    const allFiniteValues = chartData
      .flatMap((d) =>
        Object.values(d.groups)
          .filter((group) => group !== null)
          .flatMap((group) => [group.min, group.max]),
      )
      .filter((v) => Number.isFinite(v)) as number[];

    // Find the global min and max
    let minVal: number;
    let maxVal: number;

    if (allFiniteValues.length === 0) {
      minVal = 0;
      maxVal = 1;
    } else {
      minVal = Math.min(...allFiniteValues);
      maxVal = Math.max(...allFiniteValues);
    }

    // If all values are identical, add some padding to ensure a range
    if (minVal === maxVal) {
      const pad = Math.max(1, Math.abs(minVal) * 0.1);
      minVal -= pad;
      maxVal += pad;
    }
    // Add some padding to the domain
    const range = maxVal - minVal;
    const padding = range * 0.05;

    return scaleLinear()
      .domain([minVal - padding, maxVal + padding])
      .nice();
  }, [chartData]);
  const yDomain = scale.domain() as [number, number];

  // Get color for a group
  const getGroupColor = (_groupName: string, index: number) => {
    return COLORS[index % COLORS.length];
  };

  const fmt = valueFormatter ?? createScaledTickFormatter(yDomain);

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
            scale={scale}
            domain={yDomain}
          />
          {showZeroLine && yDomain[0] <= 0 && yDomain[1] >= 0 && (
            <ReferenceLine y={0} stroke="#ef4444" strokeWidth={1.5} />
          )}
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
              const datum = payload[0].payload ?? {};
              const box = datum?.groups?.ensemble;
              const outliers = datum?.__outliers;
              const rawData: MetricValue[] = datum?.__rawData ?? [];

              const renderKV = (k: string, v: string) => (
                <div key={k} className="contents">
                  <div className="text-muted-foreground">{k}</div>
                  <div className="text-right">{v}</div>
                </div>
              );

              // // Find closest data point to mouse position
              let closestDataPoint: MetricValue | null = null;
              if (coordinate && rawData.length > 0) {
                const mouseY = coordinate.y ?? 0;
                let minDistance = Number.POSITIVE_INFINITY;

                // Use the actual domain that Recharts calculates (with padding)
                const actualYMin = yDomain[0] ?? 0;
                const actualYMax = yDomain[1] ?? 1;

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
          {/* Show legend if there are multiple groups */}
          {allGroupNames.length > 1 && <Legend />}

          {/* Render a Bar component for each group */}
          {allGroupNames.map((groupName, index) => (
            <Bar
              key={groupName}
              dataKey={(d) => d?.groups?.[groupName]?.median}
              name={groupName}
              fill={getGroupColor(groupName, index)}
              stroke={getGroupColor(groupName, index)}
              isAnimationActive={false}
              shape={
                <BoxWhiskerShape
                  prefix={groupName}
                  scale={scale}
                  highlightedPoint={highlightedPoint}
                  background={{ height: chartInnerHeight }}
                />
              }
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
