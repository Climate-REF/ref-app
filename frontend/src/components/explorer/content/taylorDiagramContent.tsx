import { flip, offset, shift, useFloating } from "@floating-ui/react";
import * as d3 from "d3";
import { useEffect, useRef, useState } from "react";

/**
 * Represents a model's performance metrics for the Taylor diagram
 */
interface TaylorDiagramModel {
  name: string;
  stddev: number; // normalized standard deviation
  correlation: number; // Pearson correlation coefficient
}

interface TaylorDiagramProps {
  models: TaylorDiagramModel[];
  width?: number;
  height?: number;
  referenceStddev?: number; // defaults to 1.0
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
}: TaylorDiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null);
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

    // Clear previous content to prevent duplicate elements
    d3.select(svgRef.current).selectAll("*").remove();

    // Track mouse position for tooltip
    const handleMouseMove = (event: MouseEvent) => {
      setMousePosition({
        x: event.clientX,
        y: event.clientY,
      });
    };

    svgRef.current.addEventListener("mousemove", handleMouseMove);
    const currentSvg = svgRef.current;

    const svg = d3.select(svgRef.current);
    const margin = 50;
    const radius = Math.min(width, height) - margin * 2;
    const center = { x: margin, y: height - margin }; // bottom-left origin

    // Define the maximum standard deviation for the diagram
    const stddevMax = 1.6;

    // Scale for converting standard deviation values to pixel radius
    const r = d3.scaleLinear().domain([0, stddevMax]).range([0, radius]);

    /**
     * Convert correlation coefficient to angle in radians
     * Correlation of 1.0 maps to 0° (horizontal), 0.0 maps to 90° (vertical)
     */
    const corrToAngle = (c: number) => Math.acos(c);

    // Arc generator for standard deviation circles (quarter circles)
    const arc = d3
      .arc<number>()
      .innerRadius((d: number) => r(d))
      .outerRadius((d: number) => r(d))
      .startAngle(0)
      .endAngle(Math.PI / 2);

    // Draw standard deviation arcs at fixed intervals
    [0.4, 0.8, 1.0, 1.2, 1.6].forEach((sd) => {
      svg
        .append("path")
        .attr("d", arc(sd))
        .attr("transform", `translate(${center.x},${center.y})`)
        .attr("fill", "none")
        .attr("stroke", "#aaa");
    });

    // Draw reference point (black square) at the reference standard deviation
    svg
      .append("rect")
      .attr("x", center.x + r(referenceStddev) - 5)
      .attr("y", center.y - 5)
      .attr("width", 10)
      .attr("height", 10)
      .attr("fill", "black");

    // Draw dashed circle at reference standard deviation
    svg
      .append("path")
      .attr("d", arc(referenceStddev))
      .attr("transform", `translate(${center.x},${center.y})`)
      .attr("fill", "none")
      .attr("stroke", "#888")
      .attr("stroke-dasharray", "10,10")
      .attr("stroke-width", 2);

    // Plot model points based on correlation (angle) and standard deviation (radius)
    models.forEach((model) => {
      const angle = corrToAngle(model.correlation);
      const x = center.x + r(model.stddev) * Math.cos(angle);
      const y = center.y - r(model.stddev) * Math.sin(angle);

      svg
        .append("circle")
        .attr("cx", x)
        .attr("cy", y)
        .attr("r", 6)
        .attr("fill", "orange")
        .style("cursor", "pointer")
        .style("transition", "r 0.2s ease, fill 0.2s ease")
        .on("mouseenter", function () {
          d3.select(this).attr("r", 9).attr("fill", "#d97706");
          setHoveredModel(model);
        })
        .on("mouseleave", function () {
          d3.select(this).attr("r", 6).attr("fill", "orange");
          setHoveredModel(null);
        });
    });

    // Draw x-axis (horizontal standard deviation axis)
    svg
      .append("line")
      .attr("x1", center.x)
      .attr("y1", center.y)
      .attr("x2", center.x + r(stddevMax))
      .attr("y2", center.y)
      .attr("stroke", "black");

    // Draw y-axis (vertical standard deviation axis)
    svg
      .append("line")
      .attr("x1", center.x)
      .attr("y1", center.y)
      .attr("x2", center.x)
      .attr("y2", center.y - r(stddevMax))
      .attr("stroke", "black");

    // X-axis ticks and labels
    [0.2, 0.4, 0.6, 0.8, 1.0, 1.2, 1.4, 1.6].forEach((sd) => {
      const x = center.x + r(sd);
      svg
        .append("line")
        .attr("x1", x)
        .attr("y1", center.y - 5)
        .attr("x2", x)
        .attr("y2", center.y + 5)
        .attr("stroke", "black");

      svg
        .append("text")
        .attr("x", x)
        .attr("y", center.y + 18)
        .attr("text-anchor", "middle")
        .attr("font-size", "12px")
        .text(sd);
    });

    // Y-axis ticks and labels
    [0.2, 0.4, 0.6, 0.8, 1.0, 1.2, 1.4, 1.6].forEach((sd) => {
      const y = center.y - r(sd);
      svg
        .append("line")
        .attr("x1", center.x - 5)
        .attr("y1", y)
        .attr("x2", center.x + 5)
        .attr("y2", y)
        .attr("stroke", "black");

      svg
        .append("text")
        .attr("x", center.x - 18)
        .attr("y", y + 4)
        .attr("text-anchor", "end")
        .attr("font-size", "12px")
        .text(sd);
    });

    // X-axis label
    svg
      .append("text")
      .attr("x", center.x + r(stddevMax) / 2)
      .attr("y", center.y + 40)
      .attr("text-anchor", "middle")
      .attr("font-size", "14px")
      .text("Standard deviation (Normalized)");

    // Create unique clip path ID to avoid conflicts with multiple diagrams
    const clipId = `taylor-clip-${Date.now()}`;

    // Create clip path for Taylor diagram region - use a filled quarter circle
    // Path creates a filled region: center -> top of Y-axis -> arc to right of X-axis -> close
    svg
      .append("defs")
      .append("clipPath")
      .attr("id", clipId)
      .append("path")
      .attr(
        "d",
        `M ${center.x},${center.y} L ${center.x},${center.y - r(stddevMax)} A ${r(stddevMax)},${r(stddevMax)} 0 0 1 ${center.x + r(stddevMax)},${center.y} Z`,
      );

    // RMSE contour arcs centered at the reference point
    const refX = center.x + r(referenceStddev);
    const refY = center.y;

    // Create a group for RMSE arcs with clipping applied
    const rmseGroup = svg.append("g").attr("clip-path", `url(#${clipId})`);

    // Draw RMSE arcs as circles (simpler and more reliable than d3.arc for full circles)
    [0.4, 0.8, 1.2, 1.6].forEach((rmse) => {
      const radiusVal = r(rmse);
      const labelOffset = 10;

      // Draw the circle
      rmseGroup
        .append("circle")
        .attr("cx", refX)
        .attr("cy", refY)
        .attr("r", radiusVal)
        .attr("fill", "none")
        .attr("stroke", "#ddd")
        .attr("stroke-width", 1.5)
        .attr("stroke-dasharray", "10,5");

      // Add label at 45 degrees if it's within the diagram bounds
      const labelAngle = Math.PI * 0.62;
      const labelX = refX + (radiusVal + labelOffset) * Math.cos(labelAngle);
      const labelY = refY - (radiusVal + labelOffset) * Math.sin(labelAngle);

      // Check if label is within the valid diagram region
      const dx = labelX - center.x;
      const dy = labelY - center.y;
      const labelDist = Math.sqrt(dx * dx + dy * dy);

      svg
        .append("text")
        .attr("x", labelX)
        .attr("y", labelY)
        .attr("font-size", "12px")
        .attr("fill", "#aaa")
        .text(rmse);

      if (
        labelDist <= r(stddevMax) &&
        labelAngle >= 0 &&
        labelAngle <= Math.PI / 2
      ) {
      }
    });

    // Correlation tick marks and labels on the outer arc
    [0.99, 0.95, 0.9, 0.8, 0.7, 0.6, 0.4].forEach((corr) => {
      const angle = corrToAngle(corr);
      const rOuter = r(stddevMax);
      const rTick = rOuter + 8; // length of tick
      const x1 = center.x + rOuter * Math.cos(angle);
      const y1 = center.y - rOuter * Math.sin(angle);
      const x2 = center.x + rTick * Math.cos(angle);
      const y2 = center.y - rTick * Math.sin(angle);

      svg
        .append("line")
        .attr("x1", x1)
        .attr("y1", y1)
        .attr("x2", x2)
        .attr("y2", y2)
        .attr("stroke", "#888")
        .attr("stroke-width", 2);

      svg
        .append("text")
        .attr("x", center.x + (rTick + 16) * Math.cos(angle))
        .attr("y", center.y - (rTick + 8) * Math.sin(angle))
        .attr("text-anchor", "middle")
        .attr("font-size", "13px")
        .text(corr);
    });

    // Add "Correlation" label along the outer arc
    const labelAngle = Math.PI / 4; // 45 degrees
    const labelRadius = r(stddevMax) + 40; // Further out than tick labels
    svg
      .append("text")
      .attr("x", center.x + labelRadius * Math.cos(labelAngle))
      .attr("y", center.y - labelRadius * Math.sin(labelAngle))
      .attr("text-anchor", "middle")
      .attr("font-size", "14px")
      .attr("font-weight", "600")
      .attr("fill", "#555")
      .attr(
        "transform",
        `rotate(${labelAngle * (180 / Math.PI)}, ${center.x + labelRadius * Math.cos(labelAngle)}, ${center.y - labelRadius * Math.sin(labelAngle)})`,
      )
      .text("Correlation");

    // Cleanup mouse event listener
    return () => {
      if (currentSvg) {
        currentSvg.removeEventListener("mousemove", handleMouseMove);
      }
    };
  }, [models, width, height, referenceStddev]);

  // Handle empty state
  if (models.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-gray-100 rounded">
        <div className="text-center text-sm text-gray-500">
          <p>No model data available</p>
          <p className="text-xs mt-1">
            This diagram requires models with correlation and standard deviation
            values
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
      />
      {hoveredModel && (
        <div
          ref={refs.setFloating}
          style={{
            ...floatingStyles,
            pointerEvents: "none",
            zIndex: 50,
          }}
          className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 min-w-[200px]"
        >
          <div className="space-y-2">
            <div className="text-sm font-semibold text-gray-900 border-b border-gray-200 pb-2">
              {hoveredModel.name}
            </div>
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600">Correlation:</span>
                <span className="font-medium text-gray-900">
                  {hoveredModel.correlation.toFixed(3)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Std Dev:</span>
                <span className="font-medium text-gray-900">
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
