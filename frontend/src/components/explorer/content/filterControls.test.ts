import { describe, expect, it } from "vitest";
import type { FilterControl } from "../types";
import { optionsFor, resolveFilterValues } from "./filterControls";

const facets = new Map<string, string[]>([
  ["region", ["WAF", "MED", "GIC"]],
  ["season", ["JJA", "DJF", "ann"]],
]);

describe("optionsFor", () => {
  it("sorts the options by label", () => {
    expect(optionsFor({ filterKey: "region" }, facets)).toEqual([
      { value: "GIC", label: "Greenland and Iceland" },
      { value: "MED", label: "Mediterranean" },
      { value: "WAF", label: "Western Africa" },
    ]);
  });

  it("leaves out excluded values", () => {
    const control = { filterKey: "season", excludeValues: ["ann"] };
    expect(optionsFor(control, facets).map((o) => o.value)).toEqual([
      "DJF",
      "JJA",
    ]);
  });

  it("returns no options for a key without a facet", () => {
    expect(optionsFor({ filterKey: "experiment_id" }, facets)).toEqual([]);
  });
});

describe("resolveFilterValues", () => {
  it("keeps a default that is one of the options", () => {
    const controls = [{ filterKey: "region", defaultValue: "WAF" }];
    expect(resolveFilterValues(controls, {}, facets)).toEqual({
      region: "WAF",
    });
  });

  it("replaces a default that is not an option with the first option by label", () => {
    const controls = [{ filterKey: "region", defaultValue: "XYZ" }];
    expect(resolveFilterValues(controls, {}, facets)).toEqual({
      region: "GIC",
    });
  });

  it("picks the first option by label when there is no default", () => {
    expect(resolveFilterValues([{ filterKey: "region" }], {}, facets)).toEqual({
      region: "GIC",
    });
  });

  it("does not pick or keep an excluded value", () => {
    const controls: FilterControl[] = [
      {
        filterKey: "season",
        defaultValue: "DJF",
        excludeValues: ["ann", "DJF"],
      },
    ];
    expect(resolveFilterValues(controls, {}, facets)).toEqual({
      season: "JJA",
    });
  });

  it("prefers a chosen value over the default", () => {
    const controls = [{ filterKey: "region", defaultValue: "WAF" }];
    expect(resolveFilterValues(controls, { region: "MED" }, facets)).toEqual({
      region: "MED",
    });
  });

  it("falls back to the default when the chosen value is not an option", () => {
    const controls = [{ filterKey: "region", defaultValue: "WAF" }];
    expect(resolveFilterValues(controls, { region: "XYZ" }, facets)).toEqual({
      region: "WAF",
    });
  });

  it("leaves out a control with no options", () => {
    const controls = [
      { filterKey: "experiment_id", defaultValue: "historical" },
    ];
    expect(resolveFilterValues(controls, {}, facets)).toEqual({});
  });
});
