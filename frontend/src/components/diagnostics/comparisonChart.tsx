import * as d3 from "d3-array";
import {
  CartesianGrid,
  ComposedChart,
  Customized,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MetricValueComparison } from "@/client/types.gen";

interface ComparisonChartProps {
  data: MetricValueComparison;
  title: string;
  metricName: string;
  metricUnits: string;
}

export const ComparisonChart = ({
  data,
  title,
  metricName,
  metricUnits,
}: ComparisonChartProps) => {
  if (!data.ensemble.data.length || !data.source.data.length) {
    return <div>No data available for comparison.</div>;
  }

  const ensembleValues = data.ensemble.data.map((d) => d.value as number);
  const min = d3.min(ensembleValues);
  const max = d3.max(ensembleValues);
  const q1 = d3.quantile(ensembleValues, 0.25);
  const median = d3.median(ensembleValues);
  const q3 = d3.quantile(ensembleValues, 0.75);

  const chartData = [
    {
      name: metricName,
      box: [min, q1, median, q3, max],
      sourceValue: data.source.data[0].value,
    },
  ];

  return (
    <div className="w-full h-full">
      <h3 className="text-lg font-semibold text-center">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis
            label={{ value: metricUnits, angle: -90, position: "insideLeft" }}
            domain={[
              (dataMin: number) => (dataMin ?? 0) * 0.9,
              (dataMax: number) => (dataMax ?? 0) * 1.1,
            ]}
          />
          <Tooltip />
          <Customized
            // @ts-expect-error - Rechards types are tricky here
            component={({ xAxis, yAxis, data }) => {
              if (!xAxis || !yAxis || !data || data.length === 0) return null;
              const x = xAxis.scale(data[0].name);
              const bandWidth = xAxis.scale.bandwidth();

              const [minVal, q1Val, medianVal, q3Val, maxVal] = data[0].box;

              if (
                [minVal, q1Val, medianVal, q3Val, maxVal].some(
                  (v) => v === undefined || v === null,
                )
              ) {
                return null;
              }

              const yMin = yAxis.scale(minVal!);
              const yQ1 = yAxis.scale(q1Val!);
              const yMedian = yAxis.scale(medianVal!);
              const yQ3 = yAxis.scale(q3Val!);
              const yMax = yAxis.scale(maxVal!);

              const boxWidth = bandWidth * 0.4;
              const xCoord = x + bandWidth / 2 - boxWidth / 2;

              return (
                <g>
                  {/* Whiskers */}
                  <line
                    x1={xCoord + boxWidth / 2}
                    y1={yMin}
                    x2={xCoord + boxWidth / 2}
                    y2={yQ1}
                    stroke="black"
                  />
                  <line
                    x1={xCoord - boxWidth * 0.1}
                    y1={yMin}
                    x2={xCoord + boxWidth * 1.1}
                    y2={yMin}
                    stroke="black"
                  />
                  <line
                    x1={xCoord + boxWidth / 2}
                    y1={yQ3}
                    x2={xCoord + boxWidth / 2}
                    y2={yMax}
                    stroke="black"
                  />
                  <line
                    x1={xCoord - boxWidth * 0.1}
                    y1={yMax}
                    x2={xCoord + boxWidth * 1.1}
                    y2={yMax}
                    stroke="black"
                  />
                  {/* Box */}
                  <rect
                    x={xCoord}
                    y={yQ3}
                    width={boxWidth}
                    height={yQ1 - yQ3}
                    stroke="black"
                    fill="#8884d8"
                    fillOpacity={0.8}
                  />
                  {/* Median */}
                  <line
                    x1={xCoord}
                    y1={yMedian}
                    x2={xCoord + boxWidth}
                    y2={yMedian}
                    stroke="black"
                    strokeWidth={2}
                  />
                </g>
              );
            }}
          />
          <Scatter name="Source Value" dataKey="sourceValue" fill="red" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
