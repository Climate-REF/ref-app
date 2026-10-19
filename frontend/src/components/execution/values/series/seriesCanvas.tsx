import type * as d3 from "d3";
import { memo, useCallback, useEffect, useRef } from "react";
import type { SeriesMetadata } from "../types";
import type { ChartMargins, XScaleType } from "./useChartScales";
import {
  type ChartDataPoint,
  createScaledTickFormatter,
  formatIndexValue,
  formatTimeTick,
  isIntegerAxis,
  plottablePoint,
} from "./utils";

const Y_TICK_COUNT = 8;

/** The colour a series' line is drawn in, with reference lines contrasting the background */
export function seriesLineColor(meta: SeriesMetadata, isDark: boolean): string {
  if (!meta.isReference) return meta.color;
  return isDark ? "#FFFFFF" : "#000000";
}

/**
 * The series in the order their lines are drawn, so later lines sit on top
 *
 * Hidden series go first and the hovered series last,
 * with reference series above regular ones within each group.
 */
export function orderSeriesForDraw(
  seriesMetadata: SeriesMetadata[],
  hiddenLabels: ReadonlySet<string>,
  hoveredLabel: string | null,
): SeriesMetadata[] {
  const layer = (meta: SeriesMetadata) =>
    (hiddenLabels.has(meta.label) ? 0 : 4) +
    (meta.label === hoveredLabel ? 2 : 0) +
    (meta.isReference ? 1 : 0);
  return [...seriesMetadata].sort((a, b) => layer(a) - layer(b));
}

/** How a series' line is stroked: faint grey when hidden, thicker when hovered, references bolder */
export function seriesStroke(
  meta: SeriesMetadata,
  state: { hidden: boolean; hovered: boolean },
  isDark: boolean,
): { color: string; width: number; alpha: number } {
  if (state.hidden) {
    return { color: isDark ? "#4B5563" : "#D1D5DB", width: 0.5, alpha: 0.15 };
  }
  const color = seriesLineColor(meta, isDark);
  if (state.hovered) {
    return { color, width: meta.isReference ? 5 : 3.5, alpha: 1 };
  }
  return {
    color,
    width: meta.isReference ? 3 : 1.5,
    alpha: meta.isReference ? 1 : 0.8,
  };
}

export interface CrosshairPosition {
  dataPixelX: number;
  nearestPixelX: number;
  nearestPixelY: number;
  nearestColor: string;
}

interface SeriesCanvasProps {
  chartData: ChartDataPoint[];
  seriesMetadata: SeriesMetadata[];
  indexName: string;
  hiddenLabels: Set<string>;
  hoveredLabelRef: React.MutableRefObject<string | null>;
  crosshairRef: React.MutableRefObject<CrosshairPosition | null>;
  xScale: XScaleType;
  yScale: d3.ScaleLinear<number, number>;
  margins: ChartMargins;
  width: number;
  height: number;
  innerWidth: number;
  innerHeight: number;
  isDark: boolean;
  isTimeAxis: boolean;
  metricName?: string;
  units?: string;
  indexUnits?: string;
  onMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseLeave: () => void;
  onClick: (e: React.MouseEvent<HTMLCanvasElement>) => void;
}

export const SeriesCanvas = memo(function SeriesCanvas({
  chartData,
  seriesMetadata,
  indexName,
  hiddenLabels,
  hoveredLabelRef,
  crosshairRef,
  xScale,
  yScale,
  margins,
  width,
  height,
  innerWidth,
  innerHeight,
  isDark,
  isTimeAxis,
  metricName,
  units,
  indexUnits,
  onMouseMove,
  onMouseLeave,
  onClick,
}: SeriesCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const targetW = width * dpr;
    const targetH = height * dpr;
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(margins.left, margins.top);

    // Clip to chart area
    ctx.beginPath();
    ctx.rect(0, 0, innerWidth, innerHeight);
    ctx.clip();

    // Draw grid
    drawGrid(ctx, xScale, yScale, innerWidth, innerHeight, isDark);

    const hoveredLabel = hoveredLabelRef.current;
    for (const meta of orderSeriesForDraw(
      seriesMetadata,
      hiddenLabels,
      hoveredLabel,
    )) {
      const stroke = seriesStroke(
        meta,
        {
          hidden: hiddenLabels.has(meta.label),
          hovered: meta.label === hoveredLabel,
        },
        isDark,
      );
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.globalAlpha = stroke.alpha;

      ctx.beginPath();
      let started = false;
      for (const row of chartData) {
        const value = plottablePoint(row, indexName, meta.seriesIndex);
        if (!value) {
          started = false;
          continue;
        }
        const px = xScale(value.x);
        const py = yScale(value.y);
        if (!started) {
          ctx.moveTo(px, py);
          started = true;
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.stroke();
    }

    ctx.globalAlpha = 1;

    // Draw crosshair
    const crosshair = crosshairRef.current;
    if (crosshair) {
      // Vertical line at snapped X position
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = "#94A3B8";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(crosshair.dataPixelX, 0);
      ctx.lineTo(crosshair.dataPixelX, innerHeight);
      ctx.stroke();
      ctx.setLineDash([]);

      // Dot on nearest point
      ctx.beginPath();
      ctx.arc(
        crosshair.nearestPixelX,
        crosshair.nearestPixelY,
        5,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = crosshair.nearestColor;
      ctx.fill();
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.restore();

    // Draw axes outside clip region
    drawAxes(
      ctx,
      xScale,
      yScale,
      margins,
      innerWidth,
      innerHeight,
      indexName,
      isDark,
      isTimeAxis,
      metricName,
      units,
      indexUnits,
    );
  }, [
    chartData,
    seriesMetadata,
    indexName,
    hiddenLabels,
    hoveredLabelRef,
    crosshairRef,
    xScale,
    yScale,
    margins,
    width,
    height,
    innerWidth,
    innerHeight,
    isDark,
    isTimeAxis,
    metricName,
    units,
    indexUnits,
  ]);

  // Redraw on data/scale changes
  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  // Expose redraw for hover updates (called from parent via ref)
  useEffect(() => {
    const el = canvasRef.current;
    if (el) {
      (el as HTMLCanvasElement & { redraw: () => void }).redraw = () => {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(draw);
      };
    }
  }, [draw]);

  return (
    <div className="relative" style={{ width, height }}>
      <canvas
        ref={canvasRef}
        style={{ width, height, cursor: "crosshair" }}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        onClick={onClick}
      />
    </div>
  );
});

function drawGrid(
  ctx: CanvasRenderingContext2D,
  xScale: XScaleType,
  yScale: d3.ScaleLinear<number, number>,
  innerWidth: number,
  innerHeight: number,
  isDark: boolean,
) {
  ctx.strokeStyle = isDark ? "#374151" : "#E5E7EB";
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);

  // Horizontal grid lines
  const yTicks = yScale.ticks(Y_TICK_COUNT);
  for (const tick of yTicks) {
    const y = yScale(tick);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(innerWidth, y);
    ctx.stroke();
  }

  // Vertical grid lines
  const xTicks = xScale.ticks(10);
  for (const tick of xTicks) {
    const x = xScale(+tick);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, innerHeight);
    ctx.stroke();
  }

  ctx.setLineDash([]);
}

/** The x axis ticks as pixel positions and labels, leaving out fractional ticks on an integer axis */
export function xAxisTicks(
  xScale: XScaleType,
  indexName: string,
  isTimeAxis: boolean,
): { position: number; label: string }[] {
  if (isTimeAxis) {
    return (xScale as d3.ScaleTime<number, number>)
      .ticks(10)
      .map((tick) => ({ position: xScale(tick), label: formatTimeTick(tick) }));
  }
  const ticks = (xScale as d3.ScaleLinear<number, number>).ticks(10);
  return (
    isIntegerAxis(indexName) ? ticks.filter((t) => Number.isInteger(t)) : ticks
  ).map((tick) => ({
    position: xScale(tick),
    label: formatIndexValue(tick, indexName),
  }));
}

/** An axis title, with its units when there are any */
function axisTitle(name: string, units?: string): string {
  return units ? `${name} (${units})` : name;
}

function drawAxes(
  ctx: CanvasRenderingContext2D,
  xScale: XScaleType,
  yScale: d3.ScaleLinear<number, number>,
  margins: ChartMargins,
  innerWidth: number,
  innerHeight: number,
  indexName: string,
  isDark: boolean,
  isTimeAxis: boolean,
  metricName?: string,
  units?: string,
  indexUnits?: string,
) {
  ctx.save();

  const formatYTick = createScaledTickFormatter(yScale.domain(), Y_TICK_COUNT);

  // Y axis
  ctx.strokeStyle = isDark ? "#374151" : "#E5E7EB";
  ctx.fillStyle = isDark ? "#9CA3AF" : "#6B7280";
  ctx.lineWidth = 1;
  ctx.font = "13px ui-monospace, monospace";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";

  ctx.beginPath();
  ctx.moveTo(margins.left, margins.top);
  ctx.lineTo(margins.left, margins.top + innerHeight);
  ctx.stroke();

  const yTicks = yScale.ticks(Y_TICK_COUNT);
  for (const tick of yTicks) {
    const y = margins.top + yScale(tick);
    ctx.fillText(formatYTick(tick), margins.left - 8, y);
  }

  // Y axis label
  ctx.save();
  ctx.translate(14, margins.top + innerHeight / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = "center";
  ctx.font = "14px system-ui, sans-serif";
  ctx.fillText(
    axisTitle(metricName || "Value", units === "unitless" ? undefined : units),
    0,
    0,
  );
  ctx.restore();

  // X axis
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.font = "13px ui-monospace, monospace";

  ctx.beginPath();
  ctx.moveTo(margins.left, margins.top + innerHeight);
  ctx.lineTo(margins.left + innerWidth, margins.top + innerHeight);
  ctx.stroke();

  for (const { position, label } of xAxisTicks(xScale, indexName, isTimeAxis)) {
    ctx.fillText(label, margins.left + position, margins.top + innerHeight + 8);
  }

  // X axis label. Units don't apply to time axes (already rendered as dates).
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.font = "14px system-ui, sans-serif";
  ctx.fillText(
    axisTitle(indexName, isTimeAxis ? undefined : indexUnits),
    margins.left + innerWidth / 2,
    margins.top + innerHeight + 30,
  );

  ctx.restore();
}
