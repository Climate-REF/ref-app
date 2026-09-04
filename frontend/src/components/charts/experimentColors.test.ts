import { describe, expect, it } from "vitest";
import {
  EXPERIMENT_ORDER,
  experimentLegend,
  getFixedDimensionColor,
  unreservedPalette,
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

describe("unreservedPalette", () => {
  it("drops the experiment colours and keeps the rest in order", () => {
    const historical = getFixedDimensionColor("experiment_id", "historical")!;
    const palette = ["#111111", historical, "#222222"];
    expect(unreservedPalette(palette)).toEqual(["#111111", "#222222"]);
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
    expect(legend.map((e) => e.color)).toEqual(
      EXPERIMENT_ORDER.map((id) => getFixedDimensionColor("experiment_id", id)),
    );
  });

  it("is empty when no experiment has a reserved colour", () => {
    expect(experimentLegend(["ssp585"])).toEqual([]);
  });
});
