import { describe, expect, it } from "vitest";
import { getFixedDimensionColor } from "@/components/charts/experimentColors";
import type { ScalarValue } from "@/components/execution/values/types";
import { transformToTaylorModels } from "./taylorModels";

let nextId = 1;

function makeValue(
  dimensions: Record<string, string>,
  value: number,
): ScalarValue {
  const id = nextId++;
  return {
    id,
    execution_group_id: 1,
    execution_id: id,
    value,
    dimensions: { metric: "Spatial Distribution", ...dimensions },
  };
}

/** A correlation and a normalised standard deviation for the same model. */
function makePair(
  dimensions: Record<string, string>,
  correlation: number,
  stddev: number,
): ScalarValue[] {
  return [
    makeValue({ ...dimensions, statistic: "Correlation" }, correlation),
    makeValue(
      { ...dimensions, statistic: "Normalized Standard Deviation" },
      stddev,
    ),
  ];
}

describe("transformToTaylorModels", () => {
  it("keys models on source id and experiment", () => {
    const models = transformToTaylorModels([
      ...makePair(
        { source_id: "ACCESS", experiment_id: "historical" },
        0.9,
        1.1,
      ),
      ...makePair({ source_id: "ACCESS", experiment_id: "esm-hist" }, 0.8, 1.2),
    ]);

    expect(models).toEqual([
      expect.objectContaining({
        name: "ACCESS (historical)",
        correlation: 0.9,
        stddev: 1.1,
      }),
      expect.objectContaining({
        name: "ACCESS (esm-hist)",
        correlation: 0.8,
        stddev: 1.2,
      }),
    ]);
  });

  it("names a model without an experiment by its source id alone", () => {
    const models = transformToTaylorModels(
      makePair({ source_id: "ACCESS" }, 0.9, 1.1),
    );

    expect(models.map((m) => m.name)).toEqual(["ACCESS"]);
  });

  it("falls back to the reference dataset slug, then to unknown", () => {
    const models = transformToTaylorModels([
      ...makePair({ reference_dataset_slug: "obs4mips.HadISST" }, 0.9, 1.1),
      ...makePair({}, 0.5, 0.7),
    ]);

    expect(models.map((m) => m.name)).toEqual(["obs4mips.HadISST", "unknown"]);
  });

  it("skips values of other metrics", () => {
    const models = transformToTaylorModels([
      ...makePair({ source_id: "ACCESS" }, 0.9, 1.1),
      makeValue(
        { source_id: "ACCESS", metric: "Bias", statistic: "Correlation" },
        0.1,
      ),
      ...makePair({ source_id: "CESM", metric: "Bias" }, 0.2, 0.3),
    ]);

    expect(models).toEqual([
      expect.objectContaining({ name: "ACCESS", correlation: 0.9 }),
    ]);
  });

  it("drops models missing either statistic", () => {
    const models = transformToTaylorModels([
      makeValue({ source_id: "ACCESS", statistic: "Correlation" }, 0.9),
      makeValue(
        { source_id: "CESM", statistic: "Normalized Standard Deviation" },
        1.1,
      ),
      makeValue({ source_id: "CESM", statistic: "Bias" }, 0.1),
    ]);

    expect(models).toEqual([]);
  });

  it("colours models by experiment", () => {
    const models = transformToTaylorModels([
      ...makePair(
        { source_id: "ACCESS", experiment_id: "historical" },
        0.9,
        1.1,
      ),
      ...makePair({ source_id: "ACCESS", experiment_id: "esm-hist" }, 0.8, 1.2),
      ...makePair({ source_id: "ACCESS", experiment_id: "ssp585" }, 0.7, 1.3),
    ]);

    expect(models.map((m) => m.color)).toEqual([
      getFixedDimensionColor("experiment_id", "historical"),
      getFixedDimensionColor("experiment_id", "esm-hist"),
      undefined,
    ]);
    expect(models[0].color).not.toEqual(models[1].color);
  });
});
