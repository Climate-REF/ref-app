import { describe, expect, it } from "vitest";
import type { Execution, ExecutionGroup, ExecutionOutput } from "@/client";
import {
  collectLatestPlotFigures,
  type FigureWithGroup,
  filterFigures,
} from "./figureGalleryData";

let nextId = 1;
const output = (
  filename: string,
  { description = "", type = "plot" } = {},
): ExecutionOutput =>
  ({
    id: nextId++,
    filename,
    description,
    output_type: type,
  }) as ExecutionOutput;

/** A group whose executions, oldest first, produced these outputs */
const group = (
  executions: ExecutionOutput[][],
  selectors: ExecutionGroup["selectors"] = {},
): ExecutionGroup =>
  ({
    id: nextId++,
    selectors,
    executions: executions.map((outputs) => ({ outputs }) as Execution),
  }) as ExecutionGroup;

const filenames = (figures: FigureWithGroup[]) =>
  figures.map(({ figure }) => figure.filename);

describe("collectLatestPlotFigures", () => {
  it("takes the plots of each group's latest execution only", () => {
    const first = group([[output("old.png")], [output("new.png")]]);
    const second = group([[output("other.png")]]);
    const figures = collectLatestPlotFigures([first, second]);
    expect(filenames(figures)).toEqual(["new.png", "other.png"]);
    expect(figures.map((f) => f.executionGroup)).toEqual([first, second]);
  });

  it("leaves out outputs that are not plots", () => {
    const figures = collectLatestPlotFigures([
      group([
        [
          output("map.png"),
          output("data.nc", { type: "data" }),
          output("index.html", { type: "html" }),
        ],
      ]),
    ]);
    expect(filenames(figures)).toEqual(["map.png"]);
  });

  it("skips groups without executions", () => {
    expect(collectLatestPlotFigures([group([])])).toEqual([]);
  });
});

describe("filterFigures", () => {
  const cmip6 = (source_id: string): ExecutionGroup["selectors"] => ({
    cmip6: [["source_id", source_id]],
  });
  const figures = collectLatestPlotFigures([
    group(
      [[output("tas_bias.png", { description: "Near-surface temperature" })]],
      cmip6("ACCESS-CM2"),
    ),
    group(
      [[output("pr_bias.png", { description: "Precipitation" })]],
      cmip6("MIROC6"),
    ),
  ]);

  it("keeps everything without filters", () => {
    expect(filterFigures(figures, "", {})).toEqual(figures);
  });

  it("matches the description or the filename as a regular expression ignoring case", () => {
    expect(filenames(filterFigures(figures, "TEMPERATURE", {}))).toEqual([
      "tas_bias.png",
    ]);
    expect(filenames(filterFigures(figures, "^pr_", {}))).toEqual([
      "pr_bias.png",
    ]);
  });

  it("does not filter on text that is not a valid regular expression", () => {
    expect(filterFigures(figures, "tas_(", {})).toEqual(figures);
  });

  it("keeps the figures whose group matches the selector filters", () => {
    expect(
      filenames(filterFigures(figures, "", { source_id: ["MIROC6"] })),
    ).toEqual(["pr_bias.png"]);
    expect(filterFigures(figures, "tas", { source_id: ["MIROC6"] })).toEqual(
      [],
    );
  });
});
