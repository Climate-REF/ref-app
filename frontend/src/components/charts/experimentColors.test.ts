import { describe, expect, it } from "vitest";
import {
  compareDimensionValues,
  experimentLegend,
  getFixedDimensionColor,
  isReservedColor,
} from "./experimentColors";

describe("getFixedDimensionColor", () => {
  it("gives historical and esm-hist their own colours", () => {
    const historical = getFixedDimensionColor("experiment_id", "historical");
    const esmHist = getFixedDimensionColor("experiment_id", "esm-hist");
    expect(historical).toBeDefined();
    expect(esmHist).toBeDefined();
    expect(historical).not.toEqual(esmHist);
  });

  it("returns undefined for other dimensions and unknown experiments", () => {
    expect(getFixedDimensionColor("source_id", "historical")).toBeUndefined();
    expect(getFixedDimensionColor("experiment_id", "ssp585")).toBeUndefined();
    expect(getFixedDimensionColor(undefined, "historical")).toBeUndefined();
  });
});

describe("compareDimensionValues", () => {
  it("puts historical before esm-hist and both before the rest", () => {
    const sorted = ["ssp585", "esm-hist", "amip", "historical"].sort((a, b) =>
      compareDimensionValues("experiment_id", a, b),
    );
    expect(sorted).toEqual(["historical", "esm-hist", "amip", "ssp585"]);
  });

  it("sorts other dimensions alphabetically", () => {
    const sorted = ["b", "a"].sort((x, y) =>
      compareDimensionValues("season", x, y),
    );
    expect(sorted).toEqual(["a", "b"]);
  });
});

describe("experimentLegend", () => {
  it("lists only the experiments present, historical first", () => {
    const legend = experimentLegend([
      "esm-hist",
      undefined,
      "historical",
      "esm-hist",
    ]);
    expect(legend.map((e) => e.label)).toEqual(["historical", "esm-hist"]);
    expect(legend.every((e) => isReservedColor(e.color))).toBe(true);
  });

  it("is empty when no experiment has a reserved colour", () => {
    expect(experimentLegend(["ssp585"])).toEqual([]);
  });
});
