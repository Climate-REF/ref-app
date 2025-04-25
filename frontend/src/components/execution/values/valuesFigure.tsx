import type { Facet, MetricValue } from "@/client";
import { Button } from "@/components/ui/button.tsx";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart.tsx";
import { Axis3D, Download, Group } from "lucide-react";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { FacetSelect } from "./facetSelect";

interface ValuesFigureProps {
  values: MetricValue[];
  facets: Facet[];
}

export function ValuesFigure({ values, facets }: ValuesFigureProps) {
  const [groupby, setGroupby] = useState(facets[0].key);
  const [xaxis, setXAxis] = useState(facets[1].key);

  const { chartData, chartConfig } = useMemo(() => {
    const xFacet = facets.find((f) => f.key === xaxis);
    const groupbyFacet = facets.find((f) => f.key === groupby);

    if (xFacet === undefined || groupbyFacet === undefined) {
      return { chartData: [], chartConfig: {} };
    }

    const chartConfig = Object.fromEntries(
      groupbyFacet.values.map((facetValue) => [
        facetValue,
        {
          label: facetValue,
          color: "#FFFFFF",
        },
      ]) ?? {},
    ) satisfies ChartConfig;

    const chartData =
      xFacet?.values.map((x) => {
        /// Find the values for a given x axis group
        const matches: [string, number][] = values
          .filter((value) => value.dimensions[xFacet.key] === x)
          .map((value) => [
            value.dimensions[groupbyFacet.key],
            value.value as number,
          ]);

        //
        const groupValues = Object.fromEntries(
          groupbyFacet.values
            .map((facetValue) => {
              const valuesToAgg = matches
                .filter(([key, _]) => key === facetValue)
                .map(([_, value]) => value);

              if (valuesToAgg.length) {
                if (valuesToAgg.length === 1)
                  return [facetValue, valuesToAgg[0]];
                return [
                  facetValue,
                  [Math.min(...valuesToAgg), Math.max(...valuesToAgg)],
                ];
              }
            })
            .filter((res) => res != null) ?? [],
        );

        return {
          x,
          ...groupValues,
        };
      }) ?? [];

    return {
      chartData,
      chartConfig,
    };
  }, [groupby, xaxis, values, facets]);

  return (
    <>
      <div className="flex items-center justify-end space-x-2">
        <FacetSelect
          facetValues={facets.map((facet) => facet.key)}
          value={xaxis}
          onValueChange={setXAxis}
        >
          <Axis3D />X Axis
        </FacetSelect>
        <FacetSelect
          facetValues={facets.map((facet) => facet.key)}
          value={groupby}
          onValueChange={setGroupby}
        >
          <Group />
          Group by
        </FacetSelect>
        <Button variant={"outline"} size="sm">
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
      </div>
      <ChartContainer config={chartConfig} className="h-[200px] w-full">
        <BarChart accessibilityLayer data={chartData}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="x"
            tickLine={false}
            tickMargin={10}
            axisLine={false}
          />
          <YAxis tickLine={false} tickMargin={10} axisLine={false} />
          <ChartTooltip content={<ChartTooltipContent />} />
          {Object.entries(chartConfig).map(([key, _]) => (
            <Bar key={key} dataKey={key} fill="var(--color-red)" radius={4} />
          ))}
        </BarChart>
      </ChartContainer>
    </>
  );
}
