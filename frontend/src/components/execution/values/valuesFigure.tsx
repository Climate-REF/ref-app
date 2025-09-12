import { Axis3D, Download, Group } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type {
  Facet,
  GroupedRawDataEntry,
  MetricValue,
} from "@/components/execution/values/types";
import { Button } from "@/components/ui/button.tsx";
import { FacetSelect } from "./facetSelect";
import { GroupedBoxWhiskerChart } from "./groupedBoxWhiskerChart";

interface ValuesFigureProps {
  values: MetricValue[];
  facets: Facet[];
  defaultGroupby: string;
  defaultXAxis: string;
  loading?: boolean; // Add loading as an optional prop
}

const getValidDefault = (
  facets: Facet[],
  preferredDefault: string,
  fallbacks: string[] = [],
) => {
  // Check if preferred default exists in facets
  if (facets.some((f) => f.key === preferredDefault)) {
    return preferredDefault;
  }
  // Try each fallback in order
  for (const fallback of fallbacks) {
    if (facets.some((f) => f.key === fallback)) {
      return fallback;
    }
  }
  // Return first available facet or empty string if no facets
  return facets.length > 0 ? facets[0].key : "";
};

export function ValuesFigure({
  values,
  facets,
  defaultGroupby,
  defaultXAxis,
  loading, // Destructure loading
}: ValuesFigureProps) {
  // Use dynamic defaults based on available facets

  const [groupby, setGroupby] = useState(() =>
    getValidDefault(facets, defaultGroupby, [
      "source_id",
      "model",
      "experiment",
    ]),
  );
  const [xaxis, setXAxis] = useState(() =>
    getValidDefault(facets, defaultXAxis, [
      "statistic",
      "metric",
      "variable",
      "region",
    ]),
  );

  // Update state when facets change and current selection becomes invalid
  useEffect(() => {
    const currentGroupbyValid = facets.some((f) => f.key === groupby);
    const currentXAxisValid = facets.some((f) => f.key === xaxis);

    if (!currentGroupbyValid) {
      const newGroupby = getValidDefault(facets, defaultGroupby, [
        "source_id",
        "model",
        "experiment",
      ]);
      setGroupby(newGroupby);
    }

    if (!currentXAxisValid) {
      const newXAxis = getValidDefault(facets, defaultXAxis, [
        "statistic",
        "variable",
        "region",
      ]);
      setXAxis(newXAxis);
    }
  }, [facets, groupby, xaxis, defaultGroupby, defaultXAxis]);

  const chartData = useMemo(() => {
    const xFacet = facets.find((f) => f.key === xaxis);
    const groupbyFacet = facets.find((f) => f.key === groupby);

    if (xFacet === undefined || groupbyFacet === undefined) {
      return [];
    }

    const chartData: GroupedRawDataEntry[] = xFacet.values.map((x) => {
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
        name: x,
        groups,
      };
    });

    return chartData;
  }, [groupby, xaxis, values, facets]);

  if (loading) {
    return <div className="text-center p-4">Loading chart data...</div>;
  }

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
