import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { diagnosticsListMetricValuesOptions } from "@/client/@tanstack/react-query.gen";
import type { MetricValueCollection } from "@/client/types.gen";
import {
  experimentLegend,
  getFixedDimensionColor,
} from "@/components/charts/experimentColors";
import { useSelectedMipEra } from "@/components/charts/mipEraContext";
import { MipEraSections } from "@/components/charts/mipEraSections";
import type { ScalarValue } from "@/components/execution/values/types";
import type { ExplorerCardContent } from "../types";
import {
  TaylorDiagramContent,
  type TaylorDiagramModel,
} from "./taylorDiagramContent";

interface TaylorDiagramContentWrapperProps {
  contentItem: Extract<ExplorerCardContent, { type: "taylor-diagram" }>;
  height?: number;
  width?: number;
}

/**
 * Transforms ILAMB scalar metric values into TaylorDiagramModel format.
 * Expects metrics with metric="Spatial Distribution" containing
 * "Correlation" and "Normalized Standard Deviation" statistics.
 */
function transformToTaylorModels(values: ScalarValue[]): TaylorDiagramModel[] {
  // Group values by model/dataset identifier
  const modelGroups = new Map<
    string,
    { correlation?: number; stddev?: number; color?: string }
  >();

  for (const value of values) {
    // Check if this is a Spatial Distribution metric
    if (value.dimensions.metric !== "Spatial Distribution") continue;

    // A model can run both historical and esm-hist, so key on both.
    const sourceId =
      value.dimensions.source_id ||
      value.dimensions.reference_dataset_slug ||
      "unknown";
    const experimentId = value.dimensions.experiment_id;
    const modelId = experimentId ? `${sourceId} (${experimentId})` : sourceId;

    if (!modelGroups.has(modelId)) {
      modelGroups.set(modelId, {
        color: getFixedDimensionColor("experiment_id", experimentId),
      });
    }

    const group = modelGroups.get(modelId)!;

    // Extract the relevant statistics
    if (value.dimensions.statistic === "Correlation") {
      group.correlation = value.value;
    } else if (value.dimensions.statistic === "Normalized Standard Deviation") {
      group.stddev = value.value;
    }
  }

  // Convert to TaylorDiagramModel array, filtering out incomplete data
  const models: TaylorDiagramModel[] = [];
  for (const [name, data] of modelGroups) {
    if (data.correlation !== undefined && data.stddev !== undefined) {
      models.push({
        name,
        correlation: data.correlation,
        stddev: data.stddev,
        color: data.color,
      });
    }
  }

  return models;
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
  const selectedMipEra = useSelectedMipEra();
  const { data } = useSuspenseQuery(
    diagnosticsListMetricValuesOptions({
      path: {
        provider_slug: contentItem.provider,
        diagnostic_slug: contentItem.diagnostic,
      },
      query: {
        value_type: "scalar",
        limit: 500,
        ...contentItem.otherFilters,
        mip_era: selectedMipEra ?? undefined,
      },
    }),
  );

  const collection = data as MetricValueCollection;
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
