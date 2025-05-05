import type { ProcessedGroupedDataEntry } from "@/components/execution/values/types.ts";
import { scaleLinear } from "d3-scale";
import { Cross } from "recharts";

interface BoxWhiskerShapeProps {
  prefix: string;
  yDomain: [number, number];

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

export function BoxWhiskerShape({
  prefix,
  yDomain,
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
  if (!payload || payload.groups[prefix] === undefined) {
    return null; // Don't render if data or scale is missing
  }

  const { min, lowerQuartile, median, upperQuartile, max, values } =
    payload.groups[prefix];

  // Calculate pixel coordinates for each value
  const scale = scaleLinear(yDomain, [props.background?.height, 0]);
  const yMin = scale(min) as number;
  const yQ1 = scale(lowerQuartile) as number;
  const yMedian = scale(median) as number;
  const yQ3 = scale(upperQuartile) as number;
  const yMax = scale(max) as number;

  const whiskerX = x + width / 2; // Center X for vertical lines
  const crossWidth = 10; // Center X for cross lines
  const boxX = x; // Box starts at the calculated x

  function scatterValues(color: string, strokeWidth = 1) {
    return values.map((v) => (
      <Cross
        key={v}
        strokeWidth={strokeWidth}
        stroke={color}
        x={whiskerX}
        y={scale(v)}
        left={whiskerX - crossWidth / 2}
        // @ts-ignore
        top={scale(v) - crossWidth / 2}
        height={crossWidth} // Cross height
        width={crossWidth} // Cross width
        style={{
          transform: "rotate(45deg)",
          transformOrigin: "center",
          transformBox: "fill-box",
        }}
      />
    ));
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
