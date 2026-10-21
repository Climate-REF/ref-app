import { flip, offset, shift, useFloating } from "@floating-ui/react";
import * as d3 from "d3";
import { useEffect, useId, useRef, useState } from "react";
import { ChartEmptyState } from "./chartEmptyState";
import {
  CORRELATION_TICKS,
  RMSE_CONTOURS,
  STDDEV_ARCS,
  STDDEV_MAX,
  STDDEV_TICKS,
  type TaylorGeometry,
  taylorGeometry,
} from "./taylorGeometry";

/**
 * Represents a model's performance metrics for the Taylor diagram
 */
interface TaylorDiagramModel {
  name: string;
  stddev: number; // normalized standard deviation
  correlation: number; // Pearson correlation coefficient
  color?: string;
}

interface TaylorDiagramProps {
  models: TaylorDiagramModel[];
  width?: number;
  height?: number;
  referenceStddev?: number; // defaults to 1.0
  marginTop?: number; // defaults to 50
  marginBottom?: number; // defaults to 50
  marginLeft?: number; // defaults to 50
  marginRight?: number; // defaults to 50
}

type Svg = d3.Selection<SVGSVGElement, unknown, null, undefined>;

/** A quarter circle around the origin at a standard deviation */
const quarterArc = (geometry: TaylorGeometry, stddev: number) =>
  d3
    .arc<number>()
    .innerRadius(geometry.radius)
    .outerRadius(geometry.radius)
    .startAngle(0)
    .endAngle(Math.PI / 2)(stddev);

/** The standard deviation arcs, and the reference with its dashed arc */
function drawStddevGrid(
  svg: Svg,
  geometry: TaylorGeometry,
  referenceStddev: number,
) {
  const { center } = geometry;
  const transform = `translate(${center.x},${center.y})`;
  for (const sd of STDDEV_ARCS) {
    svg
      .append("path")
      .attr("d", quarterArc(geometry, sd))
      .attr("transform", transform)
      .attr("fill", "none")
      .attr("stroke", "#aaa");
  }

  svg
    .append("rect")
    .attr("x", center.x + geometry.radius(referenceStddev) - 5)
    .attr("y", center.y - 5)
    .attr("width", 10)
    .attr("height", 10)
    .attr("fill", "currentColor");

  svg
    .append("path")
    .attr("d", quarterArc(geometry, referenceStddev))
    .attr("transform", transform)
    .attr("fill", "none")
    .attr("stroke", "#888")
    .attr("stroke-dasharray", "10,10")
    .attr("stroke-width", 2);
}

/** The two standard deviation axes with their ticks and title */
function drawAxes(svg: Svg, geometry: TaylorGeometry) {
  const { center, radius } = geometry;
  const end = radius(STDDEV_MAX);
  const line = (x1: number, y1: number, x2: number, y2: number) =>
    svg
      .append("line")
      .attr("x1", x1)
      .attr("y1", y1)
      .attr("x2", x2)
      .attr("y2", y2)
      .attr("stroke", "currentColor");

  line(center.x, center.y, center.x + end, center.y);
  line(center.x, center.y, center.x, center.y - end);

  for (const sd of STDDEV_TICKS) {
    const x = center.x + radius(sd);
    line(x, center.y - 5, x, center.y + 5);
    svg
      .append("text")
      .attr("x", x)
      .attr("y", center.y + 18)
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .text(sd);

    const y = center.y - radius(sd);
    line(center.x - 5, y, center.x + 5, y);
    svg
      .append("text")
      .attr("x", center.x - 18)
      .attr("y", y + 4)
      .attr("text-anchor", "end")
      .attr("font-size", "12px")
      .text(sd);
  }

  svg
    .append("text")
    .attr("x", center.x + end / 2)
    .attr("y", center.y + 40)
    .attr("text-anchor", "middle")
    .attr("font-size", "14px")
    .text("Standard deviation (Normalized)");
}

/** The RMSE circles around the reference point, clipped to the diagram */
function drawRmseContours(
  svg: Svg,
  geometry: TaylorGeometry,
  referenceStddev: number,
  clipId: string,
) {
  const { center, radius } = geometry;
  const end = radius(STDDEV_MAX);
  // A filled quarter circle: centre, top of the y axis, arc to the end of the x axis
  svg
    .append("defs")
    .append("clipPath")
    .attr("id", clipId)
    .append("path")
    .attr(
      "d",
      `M ${center.x},${center.y} L ${center.x},${center.y - end} A ${end},${end} 0 0 1 ${center.x + end},${center.y} Z`,
    );

  const ref = { x: center.x + radius(referenceStddev), y: center.y };
  const contours = svg.append("g").attr("clip-path", `url(#${clipId})`);
  // Labels sit just outside each circle, a little past the top of it
  const labelAngle = Math.PI * 0.62;
  for (const rmse of RMSE_CONTOURS) {
    contours
      .append("circle")
      .attr("cx", ref.x)
      .attr("cy", ref.y)
      .attr("r", radius(rmse))
      .attr("fill", "none")
      .attr("stroke", "#ddd")
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "10,5");

    const labelRadius = radius(rmse) + 10;
    svg
      .append("text")
      .attr("x", ref.x + labelRadius * Math.cos(labelAngle))
      .attr("y", ref.y - labelRadius * Math.sin(labelAngle))
      .attr("font-size", "12px")
      .attr("fill", "#aaa")
      .text(rmse);
  }
}

/** The correlation ticks on the outer arc and its title */
function drawCorrelationTicks(svg: Svg, geometry: TaylorGeometry) {
  const { center, radius } = geometry;
  const outer = radius(STDDEV_MAX);
  const tickEnd = outer + 8;
  const at = (distance: number, angle: number) => ({
    x: center.x + distance * Math.cos(angle),
    y: center.y - distance * Math.sin(angle),
  });

  for (const corr of CORRELATION_TICKS) {
    const angle = Math.acos(corr);
    const from = at(outer, angle);
    const to = at(tickEnd, angle);
    svg
      .append("line")
      .attr("x1", from.x)
      .attr("y1", from.y)
      .attr("x2", to.x)
      .attr("y2", to.y)
      .attr("stroke", "#888")
      .attr("stroke-width", 2);

    svg
      .append("text")
      .attr("x", center.x + (tickEnd + 16) * Math.cos(angle))
      .attr("y", center.y - (tickEnd + 8) * Math.sin(angle))
      .attr("text-anchor", "middle")
      .attr("font-size", "13px")
      .text(corr);
  }

  const titleAngle = Math.PI / 4;
  const title = at(outer + 40, titleAngle);
  svg
    .append("text")
    .attr("x", title.x)
    .attr("y", title.y)
    .attr("text-anchor", "middle")
    .attr("font-size", "14px")
    .attr("font-weight", "600")
    .style("fill", "var(--muted-foreground)")
    .attr(
      "transform",
      `rotate(${titleAngle * (180 / Math.PI)}, ${title.x}, ${title.y})`,
    )
    .text("Correlation");
}

/** A point per model, growing and darkening while hovered */
function drawModels(
  svg: Svg,
  geometry: TaylorGeometry,
  models: TaylorDiagramModel[],
  onHover: (model: TaylorDiagramModel | null) => void,
) {
  for (const model of models) {
    const { x, y } = geometry.point(model.stddev, model.correlation);
    const fill = model.color ?? "orange";
    const hoverFill = d3.color(fill)?.darker(0.6).formatHex() ?? fill;

    svg
      .append("circle")
      .attr("cx", x)
      .attr("cy", y)
      .attr("r", 6)
      .attr("fill", fill)
      .style("cursor", "pointer")
      .style("transition", "r 0.2s ease, fill 0.2s ease")
      .on("mouseenter", function () {
        d3.select(this).attr("r", 9).attr("fill", hoverFill);
        onHover(model);
      })
      .on("mouseleave", function () {
        d3.select(this).attr("r", 6).attr("fill", fill);
        onHover(null);
      });
  }
}

/**
 * TaylorDiagramContent component renders a Taylor diagram visualization
 * showing model performance in terms of correlation and normalized standard deviation.
 *
 * The Taylor diagram plots models in polar coordinates where:
 * - Angle represents correlation (0° = perfect correlation, 90° = no correlation)
 * - Radius represents normalized standard deviation
 * - RMSE can be read from contour lines centered at the reference point
 */
export function TaylorDiagramContent({
  models,
  width = 500,
  height = 500,
  referenceStddev = 1.0,
  marginTop = 50,
  marginBottom = 50,
  marginLeft = 50,
  marginRight = 50,
}: TaylorDiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  // Unique per diagram, so several diagrams on a page keep their own clip path
  const clipId = `taylor-clip-${useId().replace(/[^\w-]/g, "")}`;
  const [hoveredModel, setHoveredModel] = useState<TaylorDiagramModel | null>(
    null,
  );
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  // Setup Floating UI for tooltip positioning
  const { refs, floatingStyles } = useFloating({
    placement: "right-start",
    middleware: [offset(10), flip(), shift({ padding: 10 })],
  });

  // Update virtual reference when hovering
  useEffect(() => {
    if (hoveredModel && mousePosition.x && mousePosition.y) {
      refs.setReference({
        getBoundingClientRect: () => ({
          x: mousePosition.x,
          y: mousePosition.y,
          width: 0,
          height: 0,
          top: mousePosition.y,
          left: mousePosition.x,
          right: mousePosition.x,
          bottom: mousePosition.y,
        }),
      });
    }
  }, [hoveredModel, mousePosition, refs]);

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    // Clear previous content to prevent duplicate elements
    svg.selectAll("*").remove();

    const geometry = taylorGeometry({
      width,
      height,
      marginTop,
      marginBottom,
      marginLeft,
      marginRight,
    });
    drawStddevGrid(svg, geometry, referenceStddev);
    drawModels(svg, geometry, models, setHoveredModel);
    drawAxes(svg, geometry);
    drawRmseContours(svg, geometry, referenceStddev, clipId);
    drawCorrelationTicks(svg, geometry);
  }, [
    models,
    width,
    height,
    referenceStddev,
    marginTop,
    marginBottom,
    marginLeft,
    marginRight,
    clipId,
  ]);

  // Handle empty state
  if (models.length === 0) {
    return (
      <ChartEmptyState title="No model data available">
        This diagram requires models with correlation and standard deviation
        values
      </ChartEmptyState>
    );
  }

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        // Text and axes take the theme's text colour
        className="text-foreground"
        fill="currentColor"
        onMouseMove={(event) =>
          setMousePosition({ x: event.clientX, y: event.clientY })
        }
      />
      {hoveredModel && (
        <div
          ref={refs.setFloating}
          style={{
            ...floatingStyles,
            pointerEvents: "none",
            zIndex: 50,
          }}
          className="bg-popover text-popover-foreground border rounded-lg shadow-lg p-4 min-w-[200px]"
        >
          <div className="space-y-2">
            <div className="text-sm font-semibold border-b pb-2">
              {hoveredModel.name}
            </div>
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Correlation:</span>
                <span className="font-medium">
                  {hoveredModel.correlation.toFixed(3)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Std Dev:</span>
                <span className="font-medium">
                  {hoveredModel.stddev.toFixed(3)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export type { TaylorDiagramModel, TaylorDiagramProps };
