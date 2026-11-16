import { describe, expect, it } from "vitest";
import type { Facet } from "@/client/types.gen";
import type { FilterControl } from "../types";
import {
  cardSearchNamespace,
  optionsFor,
  resolveControlValue,
  resolveFilterCascade,
  slugify,
  uniqueSearchNamespaces,
} from "./filterControls";

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

/** The value `resolveControlValue` picks for each control from the shared facets. */
const resolveFilterValues = (
  controls: FilterControl[],
  chosen: Record<string, string>,
  facetMap: ReadonlyMap<string, readonly string[]>,
) => {
  const values: Record<string, string> = {};
  for (const control of controls) {
    const value = resolveControlValue(
      control,
      chosen,
      optionsFor(control, facetMap),
    );
    if (value !== undefined) values[control.filterKey] = value;
  }
  return values;
};

describe("resolveControlValue", () => {
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

  it("falls back to the first option when neither choice is an option", () => {
    const controls = [{ filterKey: "region", defaultValue: "XYZ" }];
    expect(resolveFilterValues(controls, { region: "ABC" }, facets)).toEqual({
      region: "GIC",
    });
  });

  it("leaves out a control with no options", () => {
    const controls = [
      { filterKey: "experiment_id", defaultValue: "historical" },
    ];
    expect(resolveFilterValues(controls, {}, facets)).toEqual({});
  });
});

describe("resolveFilterCascade", () => {
  type Row = Record<string, string>;

  /** Facets as the API reads them: each key's values among the rows matching the filters. */
  const facetsOf =
    (rows: Row[], calls: Record<string, string>[] = []) =>
    async (filters: Record<string, string>): Promise<Facet[]> => {
      calls.push(filters);
      const matching = rows.filter((row) =>
        Object.entries(filters).every(([key, value]) => row[key] === value),
      );
      const keys = [...new Set(matching.flatMap((row) => Object.keys(row)))];
      return keys.map((key) => ({
        key,
        values: [...new Set(matching.map((row) => row[key]))],
      }));
    };

  const controls: FilterControl[] = [{ filterKey: "A" }, { filterKey: "B" }];
  // Only these two pairs exist, so A=a2 with B=b2 matches nothing
  const rows: Row[] = [
    { A: "a1", B: "b2" },
    { A: "a2", B: "b1" },
  ];

  it("resolves values that exist together", async () => {
    const { values } = await resolveFilterCascade(
      controls,
      {},
      undefined,
      facetsOf(rows),
    );
    expect(values).toEqual({ A: "a1", B: "b2" });
  });

  it("re-resolves a later control when an earlier choice rules its value out", async () => {
    const { values, options } = await resolveFilterCascade(
      controls,
      { A: "a2", B: "b2" },
      undefined,
      facetsOf(rows),
    );
    expect(values).toEqual({ A: "a2", B: "b1" });
    expect(options.map((o) => o.map(({ value }) => value))).toEqual([
      ["a1", "a2"],
      ["b1"],
    ]);
  });

  it("only offers options that keep at least one row", async () => {
    const choices: Record<string, string>[] = [
      {},
      { A: "a2" },
      { A: "a1", B: "b1" },
    ];
    for (const chosen of choices) {
      const { options } = await resolveFilterCascade(
        controls,
        chosen,
        undefined,
        facetsOf(rows),
      );
      for (const [index, control] of controls.entries()) {
        for (const option of options[index]) {
          const { values } = await resolveFilterCascade(
            controls,
            { ...chosen, [control.filterKey]: option.value },
            undefined,
            facetsOf(rows),
          );
          expect(
            rows.some((row) =>
              Object.entries(values).every(([key, v]) => row[key] === v),
            ),
          ).toBe(true);
        }
      }
    }
  });

  it("reads each control's facets with the card's filters and the values before it", async () => {
    const calls: Record<string, string>[] = [];
    await resolveFilterCascade(
      controls,
      {},
      { A: "ignored", variable_id: "tas" },
      facetsOf(
        rows.map((row) => ({ ...row, variable_id: "tas" })),
        calls,
      ),
    );
    expect(calls).toEqual([
      { variable_id: "tas" },
      { variable_id: "tas", A: "a1" },
    ]);
  });

  it("reads the facets once for a single control", async () => {
    const calls: Record<string, string>[] = [];
    await resolveFilterCascade(
      [{ filterKey: "A" }],
      {},
      undefined,
      facetsOf(rows, calls),
    );
    expect(calls).toHaveLength(1);
  });
});

describe("slugify", () => {
  it("lowercases and replaces every run of other characters with one dash", () => {
    expect(slugify("Ocean & Sea Ice / Extent")).toBe("ocean-sea-ice-extent");
  });

  it("trims leading and trailing dashes", () => {
    expect(slugify("--Sea Ice--")).toBe("sea-ice");
  });
});

describe("cardSearchNamespace", () => {
  it("builds a card namespace from labels and a content index", () => {
    expect(cardSearchNamespace("ocean-sea-ice", "Sea Ice Area", 0)).toBe(
      "card-ocean-sea-ice-sea-ice-area-0",
    );
  });

  it("skips labels that slugify to nothing", () => {
    expect(cardSearchNamespace("***", "Card", 1)).toBe("card-card-1");
  });

  it("is unique when two labels slugify the same", () => {
    expect(
      uniqueSearchNamespaces([
        cardSearchNamespace("a:b", "Card", 0),
        cardSearchNamespace("a-b", "Card", 0),
      ]),
    ).toEqual(["card-a-b-card-0", "card-a-b-card-0-2"]);
  });

  it("does not collide with a namespace that already ends in a suffix", () => {
    expect(uniqueSearchNamespaces(["card-a", "card-a", "card-a-2"])).toEqual([
      "card-a",
      "card-a-2",
      "card-a-2-2",
    ]);
  });
});
