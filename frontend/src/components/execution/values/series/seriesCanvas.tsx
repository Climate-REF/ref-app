import type * as d3 from "d3";
import { memo, useCallback, useEffect, useRef } from "react";
import type { SeriesMetadata } from "../types";
import type { ChartMargins } from "./useChartScales";
import { type ChartDataPoint, isIntegerAxis } from "./utils";

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
  xScale: d3.ScaleLinear<number, number>;
  yScale: d3.ScaleLinear<number, number>;
  margins: ChartMargins;
  width: number;
  height: number;
  innerWidth: number;
  innerHeight: number;
  isDark: boolean;
  metricName?: string;
  units?: string;
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
  metricName,
  units,
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

    // Draw lines: hidden first, then visible, hovered last
    const hoveredLabel = hoveredLabelRef.current;
    const sortedMeta = [...seriesMetadata].sort((a, b) => {
      const aHidden = hiddenLabels.has(a.label);
      const bHidden = hiddenLabels.has(b.label);
      if (aHidden && !bHidden) return -1;
      if (!aHidden && bHidden) return 1;
      const aHovered = a.label === hoveredLabel;
      const bHovered = b.label === hoveredLabel;
      if (aHovered && !bHovered) return 1;
      if (!aHovered && bHovered) return -1;
      // Reference series on top of regular
      if (a.isReference && !b.isReference) return 1;
      if (!a.isReference && b.isReference) return -1;
      return 0;
    });

    for (const meta of sortedMeta) {
      const isHidden = hiddenLabels.has(meta.label);
      const isHovered = meta.label === hoveredLabel;
      const key = `series_${meta.seriesIndex}`;

      const refColor = isDark ? "#FFFFFF" : "#000000";
      if (isHidden) {
        ctx.strokeStyle = isDark ? "#4B5563" : "#D1D5DB";
        ctx.lineWidth = 0.5;
        ctx.globalAlpha = 0.15;
      } else if (isHovered) {
        ctx.strokeStyle = meta.isReference ? refColor : meta.color;
        ctx.lineWidth = meta.isReference ? 5 : 3.5;
        ctx.globalAlpha = 1;
      } else {
        ctx.strokeStyle = meta.isReference ? refColor : meta.color;
        ctx.lineWidth = meta.isReference ? 3 : 1.5;
        ctx.globalAlpha = meta.isReference ? 1 : 0.8;
      }

      ctx.beginPath();
      let started = false;
      for (let i = 0; i < chartData.length; i++) {
        const xVal = chartData[i][indexName];
        const yVal = chartData[i][key];
        if (
          typeof xVal !== "number" ||
          typeof yVal !== "number" ||
          !Number.isFinite(yVal)
        ) {
          started = false;
          continue;
        }
        const px = xScale(xVal);
        const py = yScale(yVal);
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
      metricName,
      units,
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
    metricName,
    units,
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
  xScale: d3.ScaleLinear<number, number>,
  yScale: d3.ScaleLinear<number, number>,
  innerWidth: number,
  innerHeight: number,
  isDark: boolean,
) {
  ctx.strokeStyle = isDark ? "#374151" : "#E5E7EB";
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);

  // Horizontal grid lines
  const yTicks = yScale.ticks(8);
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
    const x = xScale(tick);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, innerHeight);
    ctx.stroke();
  }

  ctx.setLineDash([]);
}

function formatTickValue(value: number, range: number): string {
  if (Math.abs(value) >= 1e6 || (range > 0 && Math.abs(value) >= 1e4)) {
    return value.toExponential(1);
  }
  if (Math.abs(value) < 1e-3 && value !== 0) {
    return value.toExponential(1);
  }
  if (range < 0.1) return value.toFixed(3);
  if (range < 1) return value.toFixed(2);
  if (range < 10) return value.toFixed(2);
  if (range < 100) return value.toFixed(1);
  return value.toFixed(0);
}

function formatXTickValue(value: number, indexName: string): string {
  if (isIntegerAxis(indexName) && Number.isInteger(value)) {
    return value.toString();
  }
  if (Number.isInteger(value)) {
    return value.toString();
  }
  // For non-integer values on an integer axis, still show as integer if close
  if (isIntegerAxis(indexName) && Math.abs(value - Math.round(value)) < 1e-9) {
    return Math.round(value).toString();
  }
  return value.toPrecision(6);
}

function drawAxes(
  ctx: CanvasRenderingContext2D,
  xScale: d3.ScaleLinear<number, number>,
  yScale: d3.ScaleLinear<number, number>,
  margins: ChartMargins,
  innerWidth: number,
  innerHeight: number,
  indexName: string,
  isDark: boolean,
  metricName?: string,
  units?: string,
) {
  ctx.save();

  const yDomain = yScale.domain();
  const yRange = yDomain[1] - yDomain[0];

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

  const yTicks = yScale.ticks(8);
  for (const tick of yTicks) {
    const y = margins.top + yScale(tick);
    ctx.fillText(formatTickValue(tick, yRange), margins.left - 8, y);
  }

  // Y axis label
  ctx.save();
  ctx.translate(14, margins.top + innerHeight / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = "center";
  ctx.font = "14px system-ui, sans-serif";
  const baseName = metricName || "Value";
  const yLabel =
    units && units !== "unitless" ? `${baseName} (${units})` : baseName;
  ctx.fillText(yLabel, 0, 0);
  ctx.restore();

  // X axis
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.font = "13px ui-monospace, monospace";

  ctx.beginPath();
  ctx.moveTo(margins.left, margins.top + innerHeight);
  ctx.lineTo(margins.left + innerWidth, margins.top + innerHeight);
  ctx.stroke();

  const xTicksRaw = xScale.ticks(10);
  const xTicks = isIntegerAxis(indexName)
    ? xTicksRaw.filter((t) => Number.isInteger(t))
    : xTicksRaw;
  for (const tick of xTicks) {
    const x = margins.left + xScale(tick);
    ctx.fillText(
      formatXTickValue(tick, indexName),
      x,
      margins.top + innerHeight + 8,
    );
  }

  // X axis label
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.font = "14px system-ui, sans-serif";
  ctx.fillText(
    indexName,
    margins.left + innerWidth / 2,
    margins.top + innerHeight + 30,
  );

  ctx.restore();
}
