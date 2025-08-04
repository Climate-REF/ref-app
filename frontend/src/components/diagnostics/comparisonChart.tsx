import * as d3 from "d3-array";
import {
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
  Bar,
} from "recharts";
import type { MetricValueComparison } from "@/client/types.gen";
import { BoxWhiskerShape } from "@/components/execution/values/boxWhiskerShape.tsx";

interface ComparisonChartProps {
  data: MetricValueComparison;
  metricName: string;
  metricUnits: string;
  valueFormatter?: (v: number) => string;
}


export const EmptyComparisonChart = ()  => {
    return (<div className="">No data available for comparison.</div>)
}

export const ComparisonChart = ({
  data,
  metricName,
  metricUnits,
  valueFormatter,
}: ComparisonChartProps) => {
  // Guard against missing arrays
  const ensembleArray = Array.isArray(data.ensemble?.data)
    ? (data.ensemble.data as Array<{ value: number }>)
    : [];
  const sourceArray = Array.isArray(data.source?.data)
    ? (data.source.data as Array<{ value: number }>)
    : [];

  if (!ensembleArray.length || !sourceArray.length) {
    return <EmptyComparisonChart /> ;
  }

  // Ensure numeric values only and sort for quantiles
  const ensembleValues = ensembleArray
    .map((d) => Number(d.value))
    .filter((v) => Number.isFinite(v))
    .sort((a, b) => a - b);

  // If still no valid values, show an informative message
  if (!ensembleValues.length) {
    return <div>No numeric ensemble values available for comparison.</div>;
  }

  // Compute robust stats (non-null assertions are safe after the guards above)
  const min = d3.min(ensembleValues)!;
  const max = d3.max(ensembleValues)!;
  const q1 = d3.quantile(ensembleValues, 0.25)!;
  const median = d3.median(ensembleValues)!;
  const q3 = d3.quantile(ensembleValues, 0.75)!;

  const sourceValue = Number(sourceArray[0]?.value);

  // Adapt data structure to reuse existing BoxWhiskerShape via <Bar shape=.../>
  // We create a single category with one "group" keyed as "ensemble"
  // Prepare source stats (support multiple values): median with min–max
  const sourceValues = sourceArray
    .map((d) => Number(d.value))
    .filter((v) => Number.isFinite(v))
    .sort((a, b) => a - b);

  const sourceMin = sourceValues.length ? sourceValues[0] : undefined;
  const sourceMax = sourceValues.length ? sourceValues[sourceValues.length - 1] : undefined;
  const sourceMedian = sourceValues.length
    ? (sourceValues.length % 2 === 0
        ? (sourceValues[sourceValues.length - 1 - sourceValues.length / 2 + 1] +
           sourceValues[sourceValues.length / 2 - 1]) / 2
        : sourceValues[Math.floor(sourceValues.length / 2)])
    : undefined;

  // Build data in a shape compatible with BoxWhiskerShape (via GroupedBoxWhiskerChart convention)
  const chartData = [
    {
      name: metricName,
      groups: {
        ensemble: {
          min,
          lowerQuartile: q1,
          median,
          upperQuartile: q3,
          max,
          values: ensembleValues,
        },
      },
      sourceValue, // still used for the scatter point
      __sourceStats: {
        id:
          // Try a few likely label fields; fall back to a generic label
          // MetricValueCollection doesn't expose an 'id' field
          (data as any)?.sourceLabel ??
          (data as any)?.sourceName ??
          (data as any)?.sourceId ??
          "Source",
        values: sourceValues,
        min: sourceMin,
        max: sourceMax,
        median: sourceMedian,
      },
    },
  ] as Array<{
    name: string;
    groups: {
      ensemble: {
        min: number;
        lowerQuartile: number;
        median: number;
        upperQuartile: number;
        max: number;
        values: number[];
      };
    };
    sourceValue: number;
    __sourceStats: {
      id: string;
      values: number[];
      min?: number;
      max?: number;
      median?: number;
    };
  }>;

  // Provide a default formatter (1 decimal place) if none is supplied
  const fmt = valueFormatter ?? ((v: number) => (Number.isFinite(v) ? v.toFixed(1) : String(v)));

  // Reusable Y domain in data units for both YAxis and BoxWhiskerShape
  const yDomainData: [number, number] = (() => {
    const finite = [min, q1, median, q3, max, sourceValue].filter(
      (v) => Number.isFinite(v),
    ) as number[];
    if (!finite.length) return [0, 1];
    const dMin = Math.min(...finite);
    const dMax = Math.max(...finite);
    if (dMin === dMax) {
      const pad = Math.max(1, Math.abs(dMin) * 0.1);
      return [dMin - pad, dMax + pad];
    }
    return [dMin, dMax];
  })();

  return (
    <div className="w-full h-full">

      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart
          data={chartData}
          margin={{ top: 24, right: 24, left: 12, bottom: 16 }}
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
            tickFormatter={(v: number) => {
              const n = Number(v);
              return Number.isFinite(n) ? fmt(n) : String(v);
            }}
            tickLine={false}
            axisLine={{ stroke: "#E5E7EB" }}
            label={{
              value: metricUnits,
              angle: -90,
              position: "insideLeft",
              offset: 8,
              className: "fill-muted-foreground",
            }}
            // Domain resilient to identical values and inclusive of source point
            domain={[
              (dataMin: number) => (dataMin ?? yDomainData[0]) * 0.9,
              (dataMax: number) => (dataMax ?? yDomainData[1]) * 1.1,
            ]}
          />
          <Tooltip
            cursor={{ stroke: "#94A3B8", strokeDasharray: "4 4" }}
            formatter={(value: any, name: any) => {
              const n = Number(value);
              const formatted = Number.isFinite(n) ? fmt(n) : String(value);
              if (name === "sourceValue") return [formatted, "Source"];
              return [formatted, name];
            }}
            // Sectioned tooltip: Source (min/max/median/count) and Ensemble (full stats)
            content={({ active, payload, label }) => {
              if (!active || !payload || payload.length === 0) return null;
              const datum: any = (payload[0] as any).payload ?? {};
              const box = datum?.groups?.ensemble as
                | { min: number; lowerQuartile: number; median: number; upperQuartile: number; max: number; values: number[] }
                | undefined;
              const sourceStats = datum?.__sourceStats as
                | { id: string; min?: number; max?: number; median?: number; values?: number[] }
                | undefined;

              const renderKV = (k: string, v: string) => (
                <div key={k} className="contents">
                  <div className="text-muted-foreground">{k}</div>
                  <div className="text-right">{v}</div>
                </div>
              );

              return (
                <div
                  className="rounded-md border bg-white p-2 text-xs shadow-md"
                  style={{ borderColor: "hsl(var(--border))" }}
                >
                  <div className="mb-2 font-medium">{label}</div>

                  {/* Source Section */}
                  <div className="mb-2">
                    <div className="mb-1 font-semibold">
                      {(sourceStats?.id ?? "Source") as string}
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      {renderKV(
                        "Min",
                        Number.isFinite(sourceStats?.min ?? NaN) ? fmt(Number(sourceStats!.min)) : "—",
                      )}
                                      {renderKV(
                        "Median",
                        Number.isFinite(sourceStats?.median ?? NaN) ? fmt(Number(sourceStats!.median)) : "—",
                      )}
                      {renderKV(
                        "Max",
                        Number.isFinite(sourceStats?.max ?? NaN) ? fmt(Number(sourceStats!.max)) : "—",
                      )}
      
                      {renderKV(
                        "Count",
                        String(Array.isArray(sourceStats?.values) ? sourceStats!.values!.length : 0),
                      )}
                    </div>
                  </div>

                  <hr className="my-2 border-t" />

                  {/* Ensemble Section */}
                  <div>
                    <div className="mb-1 font-semibold">Ensemble</div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      {renderKV("Min", box ? fmt(Number(box.min)) : "—")}
                      {renderKV("Q1", box ? fmt(Number(box.lowerQuartile)) : "—")}
                      {renderKV("Median", box ? fmt(Number(box.median)) : "—")}
                      {renderKV("Q3", box ? fmt(Number(box.upperQuartile)) : "—")}
                      {renderKV("Max", box ? fmt(Number(box.max)) : "—")}
                      {renderKV("Count", box ? String(Array.isArray(box.values) ? box.values.length : 0) : "0")}
                    </div>
                  </div>
                </div>
              );
            }}
          />

          {/* Render ensemble distribution using the shared BoxWhiskerShape */}
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {/* @ts-ignore - Recharts dataKey as function is acceptable */}
          <Bar
            dataKey={(d: any) => d.groups.ensemble.median}
            fill="#93C5FD"
            stroke="#3B82F6"
            isAnimationActive={false}
            shape={<BoxWhiskerShape prefix="ensemble" yDomain={yDomainData} />}
          />
          <Scatter
            name="Source Value"
            dataKey="sourceValue"
            fill="#EF4444"
            shape="circle"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
