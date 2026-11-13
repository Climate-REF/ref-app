import { describe, expect, it } from "vitest";
import type { Execution, ExecutionGroup, ExecutionOutput } from "@/client";
import { withUnavailableSelections } from "@/lib/facetedFilter";
import {
  collectLatestPlotFigures,
  type FigureWithGroup,
  figureFacetOptions,
  filterFigures,
  UNKNOWN_FACET_VALUE,
} from "./figureGalleryData";

let nextId = 1;
const output = (
  filename: string,
  {
    description = "",
    type = "plot",
    dimensions = {} as Record<string, string>,
  } = {},
): ExecutionOutput =>
  ({
    id: nextId++,
    filename,
    description,
    output_type: type,
    dimensions,
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

const optionList = (figures: FigureWithGroup[], key: string) =>
  figureFacetOptions(figures, "", {})[key].map(({ value }) => value);

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

describe("figureFacetOptions keys", () => {
  it("sorts keys and collects a key's values across source types", () => {
    const figures = collectLatestPlotFigures([
      group([[output("map.png")]], {
        cmip6: [
          ["source_id", "GFDL"],
          ["experiment_id", "historical"],
        ],
        obs4mips: [
          ["source_id", "CERES"],
          ["source_id", "GFDL"],
        ],
      }),
      group([[output("other.png")]], {
        cmip6: [
          ["source_id", "ACCESS"],
          ["experiment_id", "ssp585"],
        ],
      }),
    ]);

    const options = figureFacetOptions(figures, "", {});
    expect(Object.keys(options)).toEqual(["experiment_id", "source_id"]);
    expect(options.source_id).toEqual([
      { value: "ACCESS", count: 1 },
      { value: "CERES", count: 1 },
      { value: "GFDL", count: 1 },
    ]);
  });

  it("leaves out a key whose value is the same for every figure, unless it is selected", () => {
    const figures = collectLatestPlotFigures([
      group([[output("a.png")]], {
        cmip6: [
          ["source_id", "GFDL"],
          ["experiment_id", "historical"],
        ],
      }),
      group([[output("b.png")]], {
        cmip6: [
          ["source_id", "ACCESS"],
          ["experiment_id", "historical"],
        ],
      }),
    ]);

    expect(Object.keys(figureFacetOptions(figures, "", {}))).toEqual([
      "source_id",
    ]);
    expect(
      figureFacetOptions(figures, "", { experiment_id: ["historical"] })
        .experiment_id,
    ).toEqual([{ value: "historical", count: 2 }]);
  });

  it("offers no facets when no group has plot outputs", () => {
    const figures = collectLatestPlotFigures([
      group([[output("data.nc", { type: "data" })]], {
        cmip6: [["source_id", "GFDL"]],
      }),
    ]);
    expect(figureFacetOptions(figures, "", {})).toEqual({});
  });
});

describe("figureFacetOptions", () => {
  const cmip6 = (
    source_id: string,
    experiment_id: string,
  ): ExecutionGroup["selectors"] => ({
    cmip6: [
      ["source_id", source_id],
      ["experiment_id", experiment_id],
    ],
  });

  const figures = collectLatestPlotFigures([
    group(
      [[output("tas_bias.png", { description: "Near-surface temperature" })]],
      cmip6("ACCESS-CM2", "historical"),
    ),
    group(
      [[output("pr_bias.png", { description: "Precipitation" })]],
      cmip6("MIROC6", "ssp585"),
    ),
  ]);

  it("does not narrow a facet by its own selection", () => {
    expect(optionList(figures, "source_id")).toEqual(["ACCESS-CM2", "MIROC6"]);
    expect(
      figureFacetOptions(figures, "", { source_id: ["ACCESS-CM2"] }).source_id,
    ).toEqual([
      { value: "ACCESS-CM2", count: 1 },
      { value: "MIROC6", count: 1 },
    ]);
  });

  it("narrows a facet by the other facets", () => {
    expect(
      figureFacetOptions(figures, "", {
        source_id: ["ACCESS-CM2"],
      }).experiment_id,
    ).toEqual([{ value: "historical", count: 1 }]);
    expect(
      figureFacetOptions(figures, "", {
        experiment_id: ["ssp585"],
      }).source_id,
    ).toEqual([{ value: "MIROC6", count: 1 }]);
  });

  it("matches any of the values selected in another facet", () => {
    expect(
      figureFacetOptions(figures, "", {
        source_id: ["ACCESS-CM2", "MIROC6"],
      }).experiment_id,
    ).toEqual([
      { value: "historical", count: 1 },
      { value: "ssp585", count: 1 },
    ]);
  });

  it("narrows options by the text filter", () => {
    expect(optionList(figures, "source_id")).toEqual(["ACCESS-CM2", "MIROC6"]);
    expect(figureFacetOptions(figures, "temperature", {}).source_id).toEqual([
      { value: "ACCESS-CM2", count: 1 },
    ]);
    expect(figureFacetOptions(figures, "^pr_", {}).experiment_id).toEqual([
      { value: "ssp585", count: 1 },
    ]);
  });

  it("does not narrow options by text that is not a valid regular expression", () => {
    expect(
      figureFacetOptions(figures, "tas_(", {}).source_id.map(
        ({ value }) => value,
      ),
    ).toEqual(["ACCESS-CM2", "MIROC6"]);
  });

  it("always offers an option that keeps at least one figure", () => {
    const selections = { source_id: ["ACCESS-CM2"] };
    const options = figureFacetOptions(figures, "", selections);
    for (const [key, facetOptions] of Object.entries(options)) {
      for (const option of facetOptions) {
        expect(
          filterFigures(figures, "", {
            ...selections,
            [key]: [option.value],
          }).length,
        ).toBeGreaterThan(0);
      }
    }
  });

  it("offers nothing from groups whose latest execution has no plots", () => {
    const withEmptyGroup = collectLatestPlotFigures([
      group([[output("tas_bias.png")]], cmip6("ACCESS-CM2", "historical")),
      group([[output("pr_bias.png")]], cmip6("MIROC6", "ssp245")),
      group(
        [[output("data.nc", { type: "data" })]],
        cmip6("NO-PLOT", "ssp585"),
      ),
    ]);
    expect(optionList(withEmptyGroup, "source_id")).toEqual([
      "ACCESS-CM2",
      "MIROC6",
    ]);
    expect(optionList(withEmptyGroup, "experiment_id")).toEqual([
      "historical",
      "ssp245",
    ]);
  });

  it("keeps a selection key no figure offers, with no available options", () => {
    const options = figureFacetOptions(figures, "", { model: ["CESM2"] });
    expect(options.model).toEqual([]);
    expect(withUnavailableSelections(options.model, ["CESM2"])).toEqual([
      { value: "CESM2", count: 0 },
    ]);
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

  it("matches nothing for a selection key no figure offers", () => {
    expect(filterFigures(figures, "", { model: ["CESM2"] })).toEqual([]);
  });

  it("matches any selected value within one facet", () => {
    expect(
      filenames(
        filterFigures(figures, "", {
          source_id: ["MIROC6", "ACCESS-CM2"],
        }),
      ),
    ).toEqual(["tas_bias.png", "pr_bias.png"]);
  });

  it("matches every selected facet", () => {
    const withExperiment = collectLatestPlotFigures([
      group([[output("tas_bias.png")]], {
        cmip6: [
          ["source_id", "ACCESS-CM2"],
          ["experiment_id", "historical"],
        ],
      }),
      group([[output("pr_bias.png")]], {
        cmip6: [
          ["source_id", "ACCESS-CM2"],
          ["experiment_id", "ssp585"],
        ],
      }),
    ]);
    expect(
      filenames(
        filterFigures(withExperiment, "", {
          source_id: ["ACCESS-CM2"],
          experiment_id: ["ssp585"],
        }),
      ),
    ).toEqual(["pr_bias.png"]);
  });
});

describe("figure dimensions", () => {
  /** One group whose latest execution made these plots, each with its dimensions */
  const regionalGroup = (
    plots: [string, Record<string, string>][],
    selectors: ExecutionGroup["selectors"] = {
      cmip6: [
        ["source_id", "ACCESS-CM2"],
        ["variable_id", "tas"],
        ["variable_id", "pr"],
      ],
    },
  ) =>
    group(
      [plots.map(([filename, dimensions]) => output(filename, { dimensions }))],
      selectors,
    );

  const figures = collectLatestPlotFigures([
    regionalGroup([
      ["tas_med.png", { region: "Mediterranean", variable_id: "tas" }],
      ["tas_waf.png", { region: "Western-Africa", variable_id: "tas" }],
      ["pr_med.png", { region: "Mediterranean", variable_id: "pr" }],
      // Made before the diagnostic tagged its outputs
      ["old.png", {}],
    ]),
  ]);

  it("offers the keys the figures are tagged with", () => {
    expect(optionList(figures, "region")).toEqual([
      "Mediterranean",
      "Western-Africa",
      UNKNOWN_FACET_VALUE,
    ]);
  });

  it("prefers a figure's own dimension over its group's selectors", () => {
    expect(
      filenames(filterFigures(figures, "", { variable_id: ["pr"] })),
    ).toEqual(["pr_med.png", "old.png"]);
    expect(figureFacetOptions(figures, "", {}).variable_id).toEqual([
      // old.png has no dimension, so it takes both of its group's variables
      { value: "pr", count: 2 },
      { value: "tas", count: 3 },
    ]);
  });

  it("gives a figure without the key the unknown value, which can be filtered by", () => {
    expect(
      filenames(filterFigures(figures, "", { region: [UNKNOWN_FACET_VALUE] })),
    ).toEqual(["old.png"]);
    expect(
      filenames(
        filterFigures(figures, "", {
          region: ["Western-Africa", UNKNOWN_FACET_VALUE],
        }),
      ),
    ).toEqual(["tas_waf.png", "old.png"]);
  });

  it("counts the unknown value against the other facets, listing it last", () => {
    expect(
      figureFacetOptions(figures, "", { variable_id: ["tas"] }).region,
    ).toEqual([
      { value: "Mediterranean", count: 1 },
      { value: "Western-Africa", count: 1 },
      { value: UNKNOWN_FACET_VALUE, count: 1 },
    ]);
  });

  it("offers no unknown value when every figure is tagged", () => {
    const tagged = collectLatestPlotFigures([
      regionalGroup([
        ["a.png", { region: "Mediterranean" }],
        ["b.png", { region: "Western-Africa" }],
      ]),
    ]);
    expect(optionList(tagged, "region")).toEqual([
      "Mediterranean",
      "Western-Africa",
    ]);
  });
});
