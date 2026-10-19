import { useMemo } from "react";
import { experimentLegend } from "@/components/charts/experimentColors";
import { MipEraSections } from "@/components/charts/mipEraSections";
import type { ScalarValue } from "@/components/execution/values/types";
import type { ExplorerCardContent } from "../types";
import { TaylorDiagramContent } from "./taylorDiagramContent";
import { transformToTaylorModels } from "./taylorModels";
import { useExplorerMetricValues } from "./useExplorerMetricValues";

interface TaylorDiagramContentWrapperProps {
  contentItem: Extract<ExplorerCardContent, { type: "taylor-diagram" }>;
  height?: number;
  width?: number;
}

interface TaylorDiagramSectionProps {
  values: ScalarValue[];
  width: number;
  height: number;
  referenceStddev?: number;
}

function TaylorDiagramSection({
  values,
  width,
  height,
  referenceStddev,
}: TaylorDiagramSectionProps) {
  const models = useMemo(() => transformToTaylorModels(values), [values]);
  const legend = useMemo(
    () => experimentLegend(values.map((v) => v.dimensions.experiment_id)),
    [values],
  );

  return (
    <div>
      <TaylorDiagramContent
        models={models}
        width={width}
        height={height}
        referenceStddev={referenceStddev}
        marginTop={0}
      />
      {legend.length > 1 && (
        <div className="flex justify-center gap-4 text-sm">
          {legend.map((entry) => (
            <span key={entry.label} className="flex items-center gap-1.5">
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              {entry.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function TaylorDiagramContentWrapper({
  contentItem,
  height = 460,
  width = 500,
}: TaylorDiagramContentWrapperProps) {
  const { collection } = useExplorerMetricValues(contentItem, "scalar");
  const values = (collection?.data as ScalarValue[]) ?? [];

  const allModels = useMemo(() => transformToTaylorModels(values), [values]);

  if (allModels.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-gray-100 rounded">
        <div className="text-center text-sm text-gray-500">
          <p>No Taylor diagram data available</p>
          <p className="text-xs mt-1">
            This diagnostic requires Spatial Distribution metrics with
            <i> Correlation </i> and <i> Normalized Standard Deviation </i>{" "}
            statistics
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto">
      <MipEraSections values={values}>
        {(mipEraValues) => (
          <TaylorDiagramSection
            values={mipEraValues}
            width={width}
            height={height}
            referenceStddev={contentItem.referenceStddev}
          />
        )}
      </MipEraSections>
    </div>
  );
}
