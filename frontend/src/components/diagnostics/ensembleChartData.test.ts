import { describe, expect, it } from "vitest";
import type { ScalarValue } from "@/client/types.gen";
import {
  buildEnsembleChartData,
  categoryAxisLayout,
  computeYDomain,
  ENSEMBLE_GROUP,
  type EnsembleChartOptions,
  formatCategoryLabel,
  hueGroupNames,
  KNOWN_CATEGORY_ORDERS,
  sortCategories,
} from "./ensembleChartData";

type NamedItem = { name: string };

function items(...names: string[]): NamedItem[] {
  return names.map((name) => ({ name }));
}

function names(sorted: NamedItem[]): string[] {
  return sorted.map((item) => item.name);
}

describe("KNOWN_CATEGORY_ORDERS", () => {
  it("includes Annual variants before seasons", () => {
    const season = KNOWN_CATEGORY_ORDERS.season;
    expect(season.indexOf("Annual")).toBeLessThan(season.indexOf("DJF"));
    expect(season.indexOf("DJF")).toBeLessThan(season.indexOf("MAM"));
    expect(season.indexOf("MAM")).toBeLessThan(season.indexOf("JJA"));
    expect(season.indexOf("JJA")).toBeLessThan(season.indexOf("SON"));
  });
});

describe("sortCategories", () => {
  it("sorts seasons chronologically via auto-detection", () => {
    const input = items("SON", "DJF", "JJA", "MAM");
    const result = names(sortCategories(input));
    expect(result).toEqual(["DJF", "MAM", "JJA", "SON"]);
  });

  it("sorts Annual before seasons via auto-detection", () => {
    const input = items("SON", "Annual", "DJF", "JJA", "MAM");
    const result = names(sortCategories(input));
    expect(result).toEqual(["Annual", "DJF", "MAM", "JJA", "SON"]);
  });

  it("handles lowercase annual variant", () => {
    const input = items("SON", "annual", "DJF", "MAM", "JJA");
    const result = names(sortCategories(input));
    expect(result).toEqual(["annual", "DJF", "MAM", "JJA", "SON"]);
  });

  it("handles ANN variant", () => {
    const input = items("SON", "ANN", "DJF", "MAM", "JJA");
    const result = names(sortCategories(input));
    expect(result).toEqual(["ANN", "DJF", "MAM", "JJA", "SON"]);
  });

  it("handles lowercase PMP season values", () => {
    const input = items("ann", "djf", "jja", "mam", "son");
    const result = names(sortCategories(input));
    expect(result).toEqual(["ann", "djf", "mam", "jja", "son"]);
  });

  it("preserves original order for non-season data", () => {
    const input = items("region_c", "region_a", "region_b");
    const result = names(sortCategories(input));
    expect(result).toEqual(["region_c", "region_a", "region_b"]);
  });

  it("uses explicit category order when provided", () => {
    const input = items("c", "a", "b");
    const result = names(sortCategories(input, ["a", "b", "c"]));
    expect(result).toEqual(["a", "b", "c"]);
  });

  it("puts items not in explicit order at the end", () => {
    const input = items("c", "unknown", "a", "b");
    const result = names(sortCategories(input, ["a", "b", "c"]));
    expect(result).toEqual(["a", "b", "c", "unknown"]);
  });

  it("returns empty array for empty input", () => {
    expect(sortCategories([])).toEqual([]);
  });

  it("does not auto-detect when categories don't fully match a known order", () => {
    // "Temperature" is not in any known order, so no sorting applied
    const input = items("Temperature", "DJF", "MAM");
    const result = names(sortCategories(input));
    expect(result).toEqual(["Temperature", "DJF", "MAM"]);
  });
});

describe("formatCategoryLabel", () => {
  it("expands ann to annual", () => {
    expect(formatCategoryLabel("ann")).toBe("annual");
    expect(formatCategoryLabel("ANN")).toBe("annual");
  });

  it("leaves other values unchanged", () => {
    expect(formatCategoryLabel("djf")).toBe("djf");
    expect(formatCategoryLabel("historical")).toBe("historical");
  });
});

let nextId = 0;
const value = (value: number, dimensions: Record<string, string> = {}) =>
  ({
    id: nextId++,
    execution_group_id: 1,
    execution_id: 1,
    value,
    dimensions,
  }) as ScalarValue;

const build = (data: ScalarValue[], options: Partial<EnsembleChartOptions>) =>
  buildEnsembleChartData(data, { fallbackCategory: "tas", ...options });

describe("buildEnsembleChartData", () => {
  it("makes a category per groupBy value with a box per hue value", () => {
    const chart = build(
      [
        value(1, { season: "JJA", model: "B" }),
        value(2, { season: "DJF", model: "A" }),
        value(3, { season: "DJF", model: "B" }),
      ],
      { groupBy: "season", hue: "model" },
    );
    expect(chart.map((c) => c.name)).toEqual(["DJF", "JJA"]);
    expect(Object.keys(chart[0].groups)).toEqual(["A", "B"]);
    expect(Object.keys(chart[1].groups)).toEqual(["B"]);
    expect(chart[0].__categoryColor).toBeUndefined();
  });

  it("draws one box per category, coloured by category, when the hue is the groupBy dimension", () => {
    const chart = build(
      [
        value(1, { experiment_id: "piControl" }),
        value(2, { experiment_id: "historical" }),
      ],
      { groupBy: "experiment_id", hue: "experiment_id" },
    );
    expect(chart.map((c) => Object.keys(c.groups))).toEqual([
      [ENSEMBLE_GROUP],
      [ENSEMBLE_GROUP],
    ]);
    expect(chart.map((c) => [c.name, c.__categoryColor])).toEqual([
      ["piControl", "#8884d8"],
      // historical has a reserved colour
      ["historical", "#4e79a7"],
    ]);
  });

  it("draws one uncoloured box per category without a hue", () => {
    const chart = build([value(1, { model: "A" }), value(2, { model: "B" })], {
      groupBy: "model",
      hue: "none",
    });
    expect(chart.map((c) => Object.keys(c.groups))).toEqual([
      [ENSEMBLE_GROUP],
      [ENSEMBLE_GROUP],
    ]);
    expect(chart.map((c) => c.__categoryColor)).toEqual([undefined, undefined]);
  });

  it("puts values missing a dimension in the fallback category and an Unknown box", () => {
    const chart = build([value(1, { model: "A" }), value(2)], {
      groupBy: "region",
      hue: "model",
    });
    expect(chart.map((c) => c.name)).toEqual(["tas"]);
    expect(Object.keys(chart[0].groups)).toEqual(["A", "Unknown"]);
  });

  it("drops non-finite values and counts the clipped ones", () => {
    const [category] = build(
      [
        value(-5),
        value(5),
        value(15),
        value(Number.NaN),
        value(Number.POSITIVE_INFINITY),
      ],
      { clipMin: 0, clipMax: 10 },
    );
    expect(category.groups[ENSEMBLE_GROUP]?.values).toEqual([5]);
    expect(category.__outliers[ENSEMBLE_GROUP]).toBe(2);
  });

  it("has no box when every value is clipped", () => {
    const [category] = build([value(15)], { clipMax: 10 });
    expect(category.groups[ENSEMBLE_GROUP]).toBeNull();
    expect(category.__outliers[ENSEMBLE_GROUP]).toBe(1);
  });

  it("computes the quartiles with the points sorted by value", () => {
    const data = [4, 1, 3, 2, 5].map((v) => value(v));
    const box = build(data, {})[0].groups[ENSEMBLE_GROUP];
    expect(box).toMatchObject({
      min: 1,
      lowerQuartile: 2,
      median: 3,
      upperQuartile: 4,
      max: 5,
      values: [1, 2, 3, 4, 5],
    });
    expect(box?.points.map((p) => p.value)).toEqual([1, 2, 3, 4, 5]);
  });

  it("orders categories by the given order", () => {
    const chart = build(
      [value(1, { region: "b" }), value(2, { region: "a" })],
      { groupBy: "region", categoryOrder: ["a", "b"] },
    );
    expect(chart.map((c) => c.name)).toEqual(["a", "b"]);
  });
});

describe("hueGroupNames", () => {
  const chart = build(
    [
      value(1, { model: "m", experiment_id: "piControl" }),
      value(2, { model: "m", experiment_id: "esm-hist" }),
      value(3, { model: "n", experiment_id: "historical" }),
    ],
    { groupBy: "model", hue: "experiment_id" },
  );

  it("lists each box name once in the known order for the hue", () => {
    expect(hueGroupNames(chart, "experiment_id")).toEqual([
      "historical",
      "esm-hist",
      "piControl",
    ]);
  });

  it("sorts names alphabetically without a known order", () => {
    expect(hueGroupNames(chart, "other")).toEqual([
      "esm-hist",
      "historical",
      "piControl",
    ]);
  });
});

describe("computeYDomain", () => {
  const chart = (...values: number[]) =>
    build(
      values.map((v) => value(v)),
      {},
    );

  it("pads the range of the values and rounds it", () => {
    expect(computeYDomain(chart(0, 4, 10))).toEqual([-1, 11]);
  });

  it("covers 0 to 1 without values", () => {
    expect(computeYDomain([])).toEqual([-0.1, 1.1]);
  });

  it("centres symmetrical axes on zero", () => {
    expect(computeYDomain(chart(-2, 8), { symmetricalAxes: true })).toEqual([
      -10, 10,
    ]);
  });

  it("widens the range when all values are equal", () => {
    expect(computeYDomain(chart(5, 5))).toEqual([3.8, 6.2]);
  });

  it("uses the given bounds instead of the data", () => {
    expect(computeYDomain(chart(0, 10), { yMin: 0, yMax: 100 })).toEqual([
      0, 100,
    ]);
    expect(computeYDomain(chart(0, 10), { yMax: 5 })).toEqual([-0.5, 5]);
  });
});

describe("categoryAxisLayout", () => {
  it("keeps the labels of a few categories level and spaces them widely", () => {
    expect(categoryAxisLayout(6)).toEqual({
      angle: 0,
      textAnchor: "middle",
      height: 30,
      interval: 0,
      barCategoryGap: "20%",
    });
  });

  it("rotates the labels of more than 6 categories", () => {
    expect(categoryAxisLayout(7)).toMatchObject({ angle: -45, height: 100 });
    expect(categoryAxisLayout(11).barCategoryGap).toBe("5%");
  });

  it("labels only some of more than 20 categories", () => {
    expect(categoryAxisLayout(45)).toMatchObject({
      interval: 2,
      barCategoryGap: "2%",
    });
  });
});
