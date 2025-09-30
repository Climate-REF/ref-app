interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
}

export function Sparkline({
  values,
  width = 100,
  height = 30,
  color = "#8884d8",
}: SparklineProps) {
  if (values.length < 2) {
    return null;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1; // Avoid division by zero

  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  });

  const pathData = `M ${points.join(" L ")}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <title>Sparkline</title>
      <path d={pathData} fill="none" stroke={color} strokeWidth={1} />
    </svg>
  );
}
