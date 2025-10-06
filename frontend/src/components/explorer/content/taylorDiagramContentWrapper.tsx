import { useSuspenseQuery } from "@tanstack/react-query";
import { diagnosticsListMetricValuesOptions } from "@/client/@tanstack/react-query.gen";
import type { MetricValueCollection } from "@/client/types.gen";
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
    { correlation?: number; stddev?: number }
  >();

  for (const value of values) {
    // Check if this is a Spatial Distribution metric
    if (value.dimensions.metric !== "Spatial Distribution") continue;

    // Create unique identifier for each model/dataset combination
    const modelId =
      value.dimensions.source_id ||
      value.dimensions.reference_dataset_slug ||
      "unknown";

    if (!modelGroups.has(modelId)) {
      modelGroups.set(modelId, {});
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
      });
    }
  }

  return models;
}

export function TaylorDiagramContentWrapper({
  contentItem,
  height = 500,
  width = 500,
}: TaylorDiagramContentWrapperProps) {
  const { data } = useSuspenseQuery(
    diagnosticsListMetricValuesOptions({
      path: {
        provider_slug: contentItem.provider,
        diagnostic_slug: contentItem.diagnostic,
      },
      query: {
        value_type: "scalar",
        ...contentItem.otherFilters,
      },
    }),
  );

  const collection = data as MetricValueCollection;
  const values = (collection?.data as ScalarValue[]) ?? [];

  // Transform scalar values to Taylor diagram format
  const models = transformToTaylorModels(values);

  if (models.length === 0) {
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
    <TaylorDiagramContent
      models={models}
      width={width}
      height={height}
      referenceStddev={contentItem.referenceStddev}
    />
  );
}
