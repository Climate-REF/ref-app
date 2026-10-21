import { describe, expect, it } from "vitest";
import type { ExecutionGroup } from "@/client";
import { extractSelectorFacets } from "./selectorFilterPanel";

const group = (selectors: ExecutionGroup["selectors"]) =>
  ({ selectors }) as ExecutionGroup;

describe("extractSelectorFacets", () => {
  it("returns no facets without groups or selectors", () => {
    expect(extractSelectorFacets([])).toEqual([]);
    expect(extractSelectorFacets([group({})])).toEqual([]);
  });

  it("collects each key's distinct values across groups and source types", () => {
    const groups = [
      group({
        cmip6: [
          ["source_id", "GFDL"],
          ["experiment_id", "historical"],
        ],
        obs4mips: [["source_id", "CERES"]],
      }),
      group({ cmip6: [["source_id", "GFDL"]] }),
      group({ cmip6: [["source_id", "ACCESS"]] }),
    ];
    expect(extractSelectorFacets(groups)).toEqual([
      { key: "experiment_id", values: ["historical"] },
      { key: "source_id", values: ["ACCESS", "CERES", "GFDL"] },
    ]);
  });
});
