import { describe, expect, it } from "vitest";
import type { Execution, ExecutionGroup, ExecutionOutput } from "@/client";
import {
  collectLatestPlotFigures,
  figureFacetOptions,
} from "./figureGalleryData";

let nextId = 1;
const plot = (): ExecutionOutput =>
  ({
    id: nextId++,
    filename: "map.png",
    output_type: "plot",
  }) as ExecutionOutput;

const group = (selectors: ExecutionGroup["selectors"]): ExecutionGroup =>
  ({
    id: nextId++,
    selectors,
    executions: [{ outputs: [plot()] } as Execution],
  }) as ExecutionGroup;

describe("figureFacetOptions for selector facets", () => {
  it("returns no options without figures or selectors", () => {
    expect(figureFacetOptions(collectLatestPlotFigures([]), "", {})).toEqual(
      {},
    );
    expect(
      figureFacetOptions(collectLatestPlotFigures([group({})]), "", {}),
    ).toEqual({});
  });

  it("collects each key's distinct values across groups and source types", () => {
    const figures = collectLatestPlotFigures([
      group({
        cmip6: [
          ["source_id", "GFDL"],
          ["experiment_id", "historical"],
        ],
        obs4mips: [["source_id", "CERES"]],
      }),
      group({ cmip6: [["source_id", "GFDL"]] }),
      group({ cmip6: [["source_id", "ACCESS"]] }),
    ]);

    expect(
      Object.entries(figureFacetOptions(figures, "", {}))
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, options]) => [key, options.map(({ value }) => value)]),
    ).toEqual([
      ["experiment_id", ["historical"]],
      ["source_id", ["ACCESS", "CERES", "GFDL"]],
    ]);
  });
});
