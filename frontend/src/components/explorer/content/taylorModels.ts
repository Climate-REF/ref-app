import { getFixedDimensionColor } from "@/components/charts/experimentColors";
import type { ScalarValue } from "@/components/execution/values/types";
import type { TaylorDiagramModel } from "./taylorDiagramContent";

/**
 * The models of a Taylor diagram, from ILAMB's scalar values
 *
 * Only the "Spatial Distribution" values are read, and a model is left out unless it has
 * both its "Correlation" and its "Normalized Standard Deviation" statistic.
 * Models are named by source id, or else reference dataset, and experiment,
 * and coloured by experiment.
 */
export function transformToTaylorModels(
  values: ScalarValue[],
): TaylorDiagramModel[] {
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

    let group = modelGroups.get(modelId);
    if (!group) {
      group = { color: getFixedDimensionColor("experiment_id", experimentId) };
      modelGroups.set(modelId, group);
    }

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
