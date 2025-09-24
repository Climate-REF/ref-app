import type { ScaleLinear } from "d3-scale";
import { Cross } from "recharts";
import type { MetricValue } from "@/client/types.gen";
import type { ProcessedGroupedDataEntry } from "./types";

interface BoxWhiskerShapeProps {
  prefix: string;
  scale: ScaleLinear<number, number>;
  highlightedPoint?: MetricValue | null;

  // Standard Recharts props provided to shapes
  x?: number;
  y?: number; // Note: y usually corresponds to the top of the bar in BarChart context
  width?: number;
  height?: number; // Note: height corresponds to the range of the bar value (e.g., median)
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  className?: string;
  payload?: ProcessedGroupedDataEntry; // The calculated box plot data for this item
  background?: { height: number };
}

// Slightly darken a hex color for better contrast
function darkenHex(hex: string, amount = 40) {
  if (!hex || !hex.startsWith("#")) return hex;
  const full =
    hex.length === 4
      ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
      : hex;
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const r = clamp(Number.parseInt(full.slice(1, 3), 16) - amount);
  const g = clamp(Number.parseInt(full.slice(3, 5), 16) - amount);
  const b = clamp(Number.parseInt(full.slice(5, 7), 16) - amount);
  const toHex = (v: number) => v.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function BoxWhiskerShape({
  prefix,
  scale,
  highlightedPoint,
  ...props
}: BoxWhiskerShapeProps) {
  const {
    x = 0,
    width = 0,
    payload,
    fill = "#8884d8", // Default fill
    stroke = "#333", // Default stroke for lines
    strokeWidth = 1,
  } = props;

  // Ensure we have the necessary data and the scale function
  if (
    !payload ||
    payload.groups[prefix] === undefined ||
    payload.groups[prefix] === null
  ) {
    return null; // Don't render if data or scale is missing
  }

  const { min, lowerQuartile, median, upperQuartile, max, values } =
    payload.groups[prefix];

  // Calculate pixel coordinates for each value
  const yMin = scale(min) as number;
  const yQ1 = scale(lowerQuartile) as number;
  const yMedian = scale(median) as number;
  const yQ3 = scale(upperQuartile) as number;
  const yMax = scale(max) as number;

  const whiskerX = x + width / 2; // Center X for vertical lines
  const crossWidth = 10; // Center X for cross lines
  const boxX = x; // Box starts at the calculated x

  function scatterValues(color: string, strokeWidth = 1) {
    const crossColor =
      typeof color === "string" && color.startsWith("#")
        ? darkenHex(color, 30)
        : color;

    // Get the highlighted value if it exists and matches this group
    const highlightedValue = highlightedPoint
      ? Number(highlightedPoint.value)
      : null;

    return values.map((v: number) => {
      const isHighlighted =
        highlightedValue !== null && Math.abs(v - highlightedValue) < 0.0001;
      const crossSize = isHighlighted ? crossWidth * 1.5 : crossWidth;
      const crossStroke = isHighlighted ? "#EF4444" : crossColor;
      const crossStrokeWidth = isHighlighted ? strokeWidth * 2 : strokeWidth;

      const scaleV = scale(v);
      if (scaleV === undefined || !Number.isFinite(scaleV)) return null; // Skip non-finite values

      return (
        <Cross
          key={v + Math.random()}
          strokeWidth={crossStrokeWidth}
          stroke={crossStroke}
          x={whiskerX}
          y={scaleV}
          left={whiskerX - crossSize / 2}
          top={scaleV - crossSize / 2}
          height={crossSize} // Cross height
          width={crossSize} // Cross width
          style={{
            transform: "rotate(45deg)",
            transformOrigin: "center",
            transformBox: "fill-box",
          }}
        />
      );
    });
  }

  if (values.length < 5) {
    return (
      <g className={props.className}>{scatterValues(fill, strokeWidth * 2)}</g>
    );
  }
  return (
    <g className={props.className}>
      {/* Box (Q1 to Q3) */}
      <rect
        x={boxX}
        y={yQ3} // SVG rect y is top edge, Q3 value is smaller (higher on chart)
        width={width}
        height={Math.abs(yQ1 - yQ3)} // Height is the difference in pixels
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
      {/* Median Line */}
      <line
        x1={boxX}
        y1={yMedian}
        x2={boxX + width}
        y2={yMedian}
        stroke={stroke}
        strokeWidth={strokeWidth * 2} // Make median slightly thicker
      />
      {/* Lower Whisker Line */}
      <line
        x1={whiskerX}
        y1={yMin}
        x2={whiskerX}
        y2={yQ1}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
      {/* Upper Whisker Line */}
      <line
        x1={whiskerX}
        y1={yQ3}
        x2={whiskerX}
        y2={yMax}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
      {/* Optional: Min/Max horizontal caps */}
      <line
        x1={boxX + width * 0.2}
        y1={yMin}
        x2={boxX + width * 0.8}
        y2={yMin}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
      <line
        x1={boxX + width * 0.2}
        y1={yMax}
        x2={boxX + width * 0.8}
        y2={yMax}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
      {/*Value markers*/}
      {scatterValues(fill, strokeWidth * 2)}
    </g>
  );
}
