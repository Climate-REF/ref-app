import type { Facet, MetricValue } from "@/client";
import type { GroupedRawDataEntry } from "@/components/execution/values/types.ts";
import { Button } from "@/components/ui/button.tsx";
import { Axis3D, Download, Group } from "lucide-react";
import { useMemo, useState } from "react";
import { FacetSelect } from "./facetSelect";
import { GroupedBoxWhiskerChart } from "./groupedBoxWhiskerChart";

interface ValuesFigureProps {
  values: MetricValue[];
  facets: Facet[];
  defaultGroupby: string;
  defaultXAxis: string;
}

export function ValuesFigure({
  values,
  facets,
  defaultGroupby,
  defaultXAxis,
}: ValuesFigureProps) {
  const [groupby, setGroupby] = useState(defaultGroupby);
  const [xaxis, setXAxis] = useState(defaultXAxis);

  const chartData = useMemo(() => {
    const xFacet = facets.find((f) => f.key === xaxis);
    const groupbyFacet = facets.find((f) => f.key === groupby);

    if (xFacet === undefined || groupbyFacet === undefined) {
      return [];
    }

    const chartData: GroupedRawDataEntry[] = xFacet.values.map((x) => {
      /// Find the values for a given x-axis group
      const matches = values
        .filter(
          (value) =>
            value.dimensions[xFacet.key] === x &&
            value.dimensions[groupbyFacet.key] !== undefined,
        )
        .map((value) => ({
          value: value.value as number,
          dimension: value.dimensions[groupbyFacet.key],
        }));

      const groups = Object.entries(
        Object.groupBy(matches, (m) => m.dimension),
      ).map(([key, values]) => ({
        label: key,
        values: values?.map((v) => v.value) ?? [],
      }));

      return {
        category: x,
        groups,
      };
    });

    return chartData;
  }, [groupby, xaxis, values, facets]);

  return (
    <>
      {facets.length ? (
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
      ) : null}
      <GroupedBoxWhiskerChart data={chartData} />
    </>
  );
}
