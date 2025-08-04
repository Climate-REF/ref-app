import * as d3 from "d3-array";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MetricValue } from "@/client/types.gen";
import { BoxWhiskerShape } from "@/components/execution/values/boxWhiskerShape.tsx";

interface EnsembleChartProps {
  data: MetricValue[];
  metricName: string;
  metricUnits: string;
  xAxis?: string;
  valueFormatter?: (v: number) => string;
  clipMin?: number;
  clipMax?: number;
}

export const EmptyEnsembleChart = () => {
  return (
    <div className="text-center text-sm text-muted-foreground">
      No data available for this chart.
    </div>
  );
};

export const EnsembleChart = ({
  data,
  metricName,
  metricUnits,
  xAxis = "metric",
  valueFormatter,
  clipMin,
  clipMax,
}: EnsembleChartProps) => {
  // Group data by the specified xAxis dimension
  const groupedData = Object.groupBy(
    data,
    (d: MetricValue) => d.dimensions[xAxis] ?? metricName,
  );

  const chartData = Object.entries(groupedData).map(
    ([groupName, values]: [string, MetricValue[] | undefined]) => {
      const allValues: number[] =
        values
          ?.map((d: MetricValue) => Number(d.value))
          ?.filter((v: number) => Number.isFinite(v)) ?? [];

      const filteredValues: number[] = allValues
        .filter(
          (v: number) =>
            (clipMin === undefined || v >= clipMin) &&
            (clipMax === undefined || v <= clipMax),
        )
        .sort((a: number, b: number) => a - b);

      if (filteredValues.length === 0) {
        return {
          name: groupName,
          groups: { ensemble: null },
          __outliers: { ensemble: 0 },
        };
      }

      const min = d3.min(filteredValues)!;
      const max = d3.max(filteredValues)!;
      const q1 = d3.quantile(filteredValues, 0.25)!;
      const median = d3.median(filteredValues)!;
      const q3 = d3.quantile(filteredValues, 0.75)!;

      return {
        name: groupName,
        groups: {
          ensemble: {
            min,
            lowerQuartile: q1,
            median,
            upperQuartile: q3,
            max,
            values: filteredValues,
          },
        },
        __outliers: {
          ensemble: allValues.length - filteredValues.length,
        },
      };
    },
  );

  const yDomainData: [number, number] = (() => {
    const allFiniteValues = chartData
      .flatMap((d) =>
        d.groups.ensemble ? [d.groups.ensemble.min, d.groups.ensemble.max] : [],
      )
      .filter((v) => Number.isFinite(v)) as number[];
    if (allFiniteValues.length === 0) return [0, 1];
    const minVal = Math.min(...allFiniteValues);
    const maxVal = Math.max(...allFiniteValues);
    if (minVal === maxVal) {
      const pad = Math.max(1, Math.abs(minVal) * 0.1);
      return [minVal - pad, maxVal + pad];
    }
    return [minVal, maxVal];
  })();

  const fmt =
    valueFormatter ??
    ((v: number) => (Number.isFinite(v) ? v.toFixed(1) : String(v)));

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
            tickFormatter={(v: number) => fmt(Number(v))}
            tickLine={false}
            axisLine={{ stroke: "#E5E7EB" }}
            label={{
              value: metricUnits,
              angle: -90,
              position: "insideLeft",
              offset: 8,
              className: "fill-muted-foreground",
            }}
            domain={[
              (dataMin: number) => (dataMin ?? yDomainData[0]) * 0.9,
              (dataMax: number) => (dataMax ?? yDomainData[1]) * 1.1,
            ]}
          />
          <Tooltip
            cursor={{ stroke: "#94A3B8", strokeDasharray: "4 4" }}
            content={({ active, payload, label }) => {
              if (!active || !payload || payload.length === 0) return null;
              const datum: any = (payload[0] as any).payload ?? {};
              const box = datum?.groups?.ensemble;
              const outliers = datum?.__outliers;

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
                  <div>
                    <div className="mb-1 font-semibold">Ensemble</div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      {renderKV("Min", box ? fmt(Number(box.min)) : "—")}
                      {renderKV(
                        "Q1",
                        box ? fmt(Number(box.lowerQuartile)) : "—",
                      )}
                      {renderKV("Median", box ? fmt(Number(box.median)) : "—")}
                      {renderKV(
                        "Q3",
                        box ? fmt(Number(box.upperQuartile)) : "—",
                      )}
                      {renderKV("Max", box ? fmt(Number(box.max)) : "—")}
                      {renderKV(
                        "Count",
                        String(
                          (box?.values?.length ?? 0) +
                            (outliers?.ensemble ?? 0),
                        ),
                      )}
                      {outliers?.ensemble ? (
                        <div className="col-span-2 mt-1 text-muted-foreground">
                          ({outliers.ensemble} outliers clipped)
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            }}
          />
          <Bar
            dataKey={(d: any) => d.groups.ensemble?.median}
            fill="#93C5FD"
            stroke="#3B82F6"
            isAnimationActive={false}
            shape={<BoxWhiskerShape prefix="ensemble" yDomain={yDomainData} />}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
