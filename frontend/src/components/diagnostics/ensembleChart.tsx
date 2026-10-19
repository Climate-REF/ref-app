import { scaleLinear } from "d3-scale";
import { useMemo, useRef, useState } from "react";
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
import type { ScalarValue } from "@/client/types.gen";
import { BoxWhiskerShape } from "@/components/execution/values/boxWhiskerShape.tsx";
import type { ChartGroupingConfig } from "@/components/explorer/grouping";
import {
  extractAvailableDimensions,
  initializeGroupingConfig,
} from "@/components/explorer/grouping";
import { createScaledTickFormatter } from "../execution/values/series/utils";
import {
  buildEnsembleChartData,
  categoryAxisLayout,
  computeYDomain,
  ENSEMBLE_GROUP,
  type EnsembleCategory,
  formatCategoryLabel,
  groupColor,
  hueGroupNames,
} from "./ensembleChartData";

interface EnsembleChartProps {
  data: ScalarValue[];
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
  /** Explicit category ordering for the x-axis (e.g., ["DJF", "MAM", "JJA", "SON"]) */
  categoryOrder?: string[];
}

/** The data point nearest the pointer, and the box it belongs to */
interface HighlightedPoint {
  categoryName: string;
  groupName: string;
  point: ScalarValue;
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

const chartHeight = 500;
const marginTop = 24;
const marginBottom = 10;

/**
 * The data point whose marker is nearest to a position in chart coordinates
 *
 * Markers are compared by the chart coordinates they carry rather than by measuring them,
 * because their client rects were offset in Firefox.
 */
function findNearestPoint(
  container: HTMLElement,
  x: number,
  y: number,
  categoriesByName: Map<string, EnsembleCategory>,
): HighlightedPoint | null {
  let nearest: HighlightedPoint | null = null;
  let distance = Number.POSITIVE_INFINITY;
  for (const marker of container.querySelectorAll<SVGGElement>(
    "[data-box-point]",
  )) {
    const dx = x - Number(marker.dataset.x);
    const dy = y - Number(marker.dataset.y);
    const nextDistance = dx * dx + dy * dy;
    if (nextDistance >= distance) continue;
    const categoryName = marker.dataset.category!;
    const groupName = marker.dataset.group!;
    const point =
      categoriesByName.get(categoryName)?.groups[groupName]?.points[
        Number(marker.dataset.boxPoint)
      ];
    if (!point) continue;
    distance = nextDistance;
    nearest = { categoryName, groupName, point };
  }
  return nearest;
}

interface EnsembleTooltipProps {
  active?: boolean;
  coordinate?: { x?: number };
  chartWidth?: number;
  highlightedPoint: HighlightedPoint | null;
  /** The category of the highlighted point */
  category: EnsembleCategory | undefined;
  /** Whether the chart has several boxes per category, so the box's group is named */
  hasHueGroups: boolean;
  format: (v: number) => string;
  metricUnits: string;
}

/** The statistics of the highlighted point's box, and the point itself */
function EnsembleTooltip({
  active,
  coordinate,
  chartWidth = 0,
  highlightedPoint,
  category,
  hasHueGroups,
  format,
  metricUnits,
}: EnsembleTooltipProps) {
  if (!active || !highlightedPoint || coordinate === undefined) return null;
  const { categoryName, groupName, point } = highlightedPoint;
  const stats = category?.groups[groupName];
  // The highlighted point may be from data the chart no longer shows
  if (!stats?.points.includes(point)) return null;
  const clipped = category?.__outliers[groupName] ?? 0;
  // If cursor is on the right half of the chart, show tooltip on the left
  const onLeft =
    coordinate.x !== undefined &&
    chartWidth > 0 &&
    coordinate.x > chartWidth / 2;

  return (
    <div
      className="rounded-md border bg-white dark:bg-muted p-2 text-xs shadow-lg min-w-[300px]"
      style={{
        borderColor: "hsl(var(--border))",
        transform: onLeft ? "translate(-370px, -20%)" : "translate(20px, -20%)",
      }}
    >
      <div className="mb-2 font-medium">
        {formatCategoryLabel(categoryName)}
        {groupName !== ENSEMBLE_GROUP && hasHueGroups && (
          <span className="ml-2 text-muted-foreground">({groupName})</span>
        )}
      </div>

      <div className="mb-3">
        <div className="mb-1 font-semibold">Statistics</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {renderKV("Min", format(stats.min))}
          {renderKV("Q1", format(stats.lowerQuartile))}
          {renderKV("Median", format(stats.median))}
          {renderKV("Q3", format(stats.upperQuartile))}
          {renderKV("Max", format(stats.max))}
          {renderKV("Count", String(stats.values.length + clipped))}
          {clipped > 0 && (
            <div className="col-span-2 mt-1 text-muted-foreground">
              ({clipped} outliers clipped)
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="mb-1 font-semibold">Closest Data Point</div>
        <div className="space-y-1">
          <div className="grid grid-cols-2 gap-x-4">
            {renderKV("Value", format(Number(point.value)))}
            {renderKV("Units", metricUnits)}
          </div>
          <div className="mt-2">
            <div className="font-semibold mb-1">Dimensions:</div>
            <div className="grid grid-cols-1 gap-y-1 text-xs">
              {Object.entries(point.dimensions).map(([key, value]) => (
                <div key={key} className="grid grid-cols-2 gap-x-2">
                  <span className="text-muted-foreground truncate">{key}:</span>
                  <span className="truncate max-w-[150px]" title={value}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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
  categoryOrder,
}: EnsembleChartProps) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [highlightedPoint, setHighlightedPoint] =
    useState<HighlightedPoint | null>(null);

  // Extract available dimensions and initialize grouping config
  const availableDimensions = useMemo(
    () => extractAvailableDimensions(data),
    [data],
  );

  const { groupBy, hue } = useMemo(() => {
    return initializeGroupingConfig(availableDimensions, groupingConfig);
  }, [availableDimensions, groupingConfig]);

  const chartData = useMemo(
    () =>
      buildEnsembleChartData(data, {
        groupBy,
        hue,
        fallbackCategory: metricName,
        clipMin,
        clipMax,
        categoryOrder,
      }),
    [data, groupBy, hue, metricName, clipMin, clipMax, categoryOrder],
  );

  const categoriesByName = useMemo(
    () => new Map(chartData.map((datum) => [datum.name, datum])),
    [chartData],
  );

  const allGroupNames = useMemo(
    () => hueGroupNames(chartData, hue),
    [chartData, hue],
  );

  const yDomain = useMemo(
    () => computeYDomain(chartData, { symmetricalAxes, yMin, yMax }),
    [chartData, symmetricalAxes, yMin, yMax],
  );
  const scale = useMemo(() => scaleLinear().domain(yDomain), [yDomain]);

  const fmt = valueFormatter ?? createScaledTickFormatter(yDomain);

  const { barCategoryGap, ...xAxisLayout } = categoryAxisLayout(
    chartData.length,
  );

  return (
    <div ref={chartRef} className="w-full h-full">
      <ResponsiveContainer width="100%" height={chartHeight}>
        <ComposedChart
          data={chartData}
          margin={{ top: marginTop, right: 24, left: 12, bottom: marginBottom }}
          barCategoryGap={barCategoryGap}
          onMouseLeave={() => setHighlightedPoint(null)}
          onMouseMove={({ isTooltipActive, chartX, chartY }) => {
            const nearest =
              isTooltipActive &&
              chartX !== undefined &&
              chartY !== undefined &&
              chartRef.current
                ? findNearestPoint(
                    chartRef.current,
                    chartX,
                    chartY,
                    categoriesByName,
                  )
                : null;
            setHighlightedPoint((previous) =>
              previous?.point === nearest?.point &&
              previous?.categoryName === nearest?.categoryName &&
              previous?.groupName === nearest?.groupName
                ? previous
                : nearest,
            );
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            dataKey="name"
            tickFormatter={formatCategoryLabel}
            tickLine={false}
            axisLine={{ stroke: "#E5E7EB" }}
            tickMargin={10}
            {...xAxisLayout}
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
            content={({ active, coordinate, viewBox }) => (
              <EnsembleTooltip
                active={active}
                coordinate={coordinate}
                chartWidth={viewBox?.width}
                highlightedPoint={highlightedPoint}
                category={
                  highlightedPoint
                    ? categoriesByName.get(highlightedPoint.categoryName)
                    : undefined
                }
                hasHueGroups={allGroupNames.length > 1}
                format={fmt}
                metricUnits={metricUnits}
              />
            )}
          />
          {/* Show legend if there are multiple groups */}
          {allGroupNames.length > 1 && <Legend />}

          {/* Render a Bar component for each group */}
          {allGroupNames.map((groupName, index) => (
            <Bar
              key={groupName}
              dataKey={(d) => d?.groups?.[groupName]?.median}
              name={formatCategoryLabel(groupName)}
              fill={groupColor(hue, groupName, index)}
              isAnimationActive={false}
              shape={
                <BoxWhiskerShape
                  prefix={groupName}
                  scale={scale}
                  highlightedPoint={highlightedPoint}
                />
              }
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
