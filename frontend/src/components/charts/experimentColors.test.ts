import { describe, expect, it } from "vitest";
import {
  compareDimensionValues,
  getFixedDimensionColor,
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
