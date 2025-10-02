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
import useMousePositionAndWidth from "@/hooks/useMousePosition";
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
  /** When true, use symmetrical axes centered on zero */
  symmetricalAxes?: boolean;
  yMin?: number;
  yMax?: number;
}

interface GroupStatistics {
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

const renderKV = (k: string, v: string) => (
  <div key={k} className="contents">
    <div className="text-muted-foreground">{k}</div>
    <div className="text-left">{v}</div>
  </div>
);

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
  symmetricalAxes,
  yMin,
  yMax,
}: EnsembleChartProps) => {
  const { mousePosition, windowSize } = useMousePositionAndWidth();
  const [highlightedPoint, setHighlightedPoint] = useState<{
    groupName: string;
    point: MetricValue;
  } | null>(null);

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

  // When groupBy and hue are the same, don't create subgroups
  // This prevents odd spacing where only one bar has data at each x-axis position
  const isSelfHued = hueDimension === groupByDimension;

  // First group by the main dimension (x-axis)
  const primaryGroupedData = Object.groupBy(
    data,
    (d: MetricValue) => d.dimensions[groupByDimension] ?? metricName,
  );

  const chartData = Object.entries(primaryGroupedData).map(
    (
      [groupName, values]: [string, MetricValue[] | undefined],
      categoryIndex,
    ) => {
      if (!values || values.length === 0) {
        return {
          name: groupName,
          groups: {},
          __outliers: {},
          __rawData: [],
          __categoryColor: isSelfHued
            ? COLORS[categoryIndex % COLORS.length]
            : undefined,
        };
      }

      // If hue dimension is specified (and different from groupBy), create sub-groups
      let subGroups: { [key: string]: MetricValue[] };
      if (!isSelfHued && hueDimension && hueDimension !== "none") {
        // Normal hue: create sub-groups based on hue dimension
        subGroups = Object.groupBy(
          values,
          (d: MetricValue) => d.dimensions[hueDimension] ?? "Unknown",
        ) as { [key: string]: MetricValue[] };
      } else {
        // Single group if no hue dimension or hue === groupBy
        subGroups = { ensemble: values };
      }

      const groups: { [key: string]: GroupStatistics | null } = {};
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
        __categoryColor: isSelfHued
          ? COLORS[categoryIndex % COLORS.length]
          : undefined,
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
    } else if (symmetricalAxes) {
      // Use symmetrical axes centered on zero
      const maxAbs = Math.max(...allFiniteValues.map(Math.abs));
      minVal = -maxAbs;
      maxVal = maxAbs;
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
      .domain([
        yMin !== undefined ? yMin : minVal - padding,
        yMax !== undefined ? yMax : maxVal + padding,
      ])
      .nice();
  }, [chartData, symmetricalAxes, yMin, yMax]);
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
            allowEscapeViewBox={{ x: true, y: true }}
            wrapperStyle={{ zIndex: 1000 }}
            animationDuration={500}
            offset={20}
            content={({ active, payload, label, coordinate }) => {
              if (!active || !payload || payload.length === 0) {
                // Clear highlight when tooltip is not active
                if (highlightedPoint) {
                  setHighlightedPoint(null);
                }
                return null;
              }
              const datum = payload[0].payload ?? {};

              // Determine which subgroup we're hovering over
              let statsKey: string;

              if (
                allGroupNames.length > 1 &&
                coordinate &&
                payload.length > 0
              ) {
                // find closest by Y position
                let closestBar: string | null = null;
                let minDistance = Number.POSITIVE_INFINITY;

                for (const groupName of allGroupNames) {
                  const groupData = datum?.groups?.[groupName];
                  if (groupData) {
                    const medianY = scale(groupData.median);
                    const distance = Math.abs((coordinate.y ?? 0) - medianY);
                    if (distance < minDistance) {
                      minDistance = distance;
                      closestBar = groupName;
                    }
                  }
                }
                statsKey = closestBar || "ensemble";
              } else {
                // Single bar - use ensemble or first available group
                statsKey = "ensemble";
                const groupKeys = Object.keys(datum?.groups || {});
                if (groupKeys.length > 0 && !datum?.groups?.[statsKey]) {
                  statsKey = groupKeys[0];
                }
              }

              const groupStats = datum?.groups?.[
                statsKey
              ] as GroupStatistics | null;
              const outliers = datum?.__outliers;
              const allRawData: MetricValue[] = datum?.__rawData ?? [];

              // Filter raw data to only include points from the hovered subgroup
              const rawData = allRawData.filter((d) => {
                // For multi-hue charts, filter by the hovered subgroup
                if (
                  !isSelfHued &&
                  hueDimension &&
                  hueDimension !== "none" &&
                  statsKey !== "ensemble"
                ) {
                  return d.dimensions[hueDimension] === statsKey;
                }
                // For self-hued or no-hue charts, include all data
                return true;
              });

              // Find closest data point to mouse position (within the filtered data)
              let closestDataPoint: MetricValue | null = null;
              if (coordinate && rawData.length > 0) {
                const mouseY = coordinate.y ?? 0;
                let minDistance = Number.POSITIVE_INFINITY;

                // Chart dimensions accounting for margins
                for (const dataPoint of rawData) {
                  const value = Number(dataPoint.value);
                  if (Number.isFinite(value)) {
                    // Convert value to pixel position using the same scale as Recharts
                    const valueY = scale(value);

                    const distance = Math.abs(mouseY - valueY);
                    if (distance < minDistance) {
                      minDistance = distance;
                      closestDataPoint = dataPoint;
                    }
                  }
                }
              }

              // Update highlighted point
              if (
                closestDataPoint !== highlightedPoint?.point &&
                closestDataPoint !== null
              ) {
                setHighlightedPoint({
                  groupName: statsKey,
                  point: closestDataPoint,
                });
              }
              if (coordinate === undefined) {
                return null;
              }

              let side = "right";

              if (mousePosition.x > windowSize.width / 2 + 20) {
                // If mouse is on the right half of the screen, show tooltip on the left
                side = "left";
              }

              return (
                <div
                  className="rounded-md border bg-white dark:bg-muted p-2 text-xs shadow-lg min-w-[300px]"
                  style={{
                    borderColor: "hsl(var(--border))",
                    transform:
                      side === "right"
                        ? "translate(20px, -20%)"
                        : "translate(-370px, -20%)",
                  }}
                >
                  <div className="mb-2 font-medium">
                    {label}
                    {statsKey !== "ensemble" && allGroupNames.length > 1 && (
                      <span className="ml-2 text-muted-foreground">
                        ({statsKey})
                      </span>
                    )}
                  </div>

                  {/* Ensemble Statistics */}
                  <div className="mb-3">
                    <div className="mb-1 font-semibold">Statistics</div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      {renderKV(
                        "Min",
                        groupStats ? fmt(Number(groupStats.min)) : "—",
                      )}
                      {renderKV(
                        "Q1",
                        groupStats
                          ? fmt(Number(groupStats.lowerQuartile))
                          : "—",
                      )}
                      {renderKV(
                        "Median",
                        groupStats ? fmt(Number(groupStats.median)) : "—",
                      )}
                      {renderKV(
                        "Q3",
                        groupStats
                          ? fmt(Number(groupStats.upperQuartile))
                          : "—",
                      )}
                      {renderKV(
                        "Max",
                        groupStats ? fmt(Number(groupStats.max)) : "—",
                      )}
                      {renderKV(
                        "Count",
                        String(
                          (groupStats?.values?.length ?? 0) +
                            (outliers?.[statsKey] ?? 0),
                        ),
                      )}
                      {outliers?.[statsKey] ? (
                        <div className="col-span-2 mt-1 text-muted-foreground">
                          ({outliers[statsKey]} outliers clipped)
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
                          <div className="font-semibold mb-1">Dimensions:</div>
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
                                  <span
                                    className="truncate max-w-[150px]"
                                    title={value}
                                  >
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
              isAnimationActive={false}
              shape={
                <BoxWhiskerShape
                  prefix={groupName}
                  scale={scale}
                  highlightedPoint={
                    highlightedPoint?.groupName === groupName
                      ? highlightedPoint?.point
                      : null
                  }
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
