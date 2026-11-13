import { describe, expect, it } from "vitest";
import {
  type FacetDescriptor,
  type FacetSelections,
  facetOptions,
  matchesFacetSelections,
  withoutFacet,
  withUnavailableSelections,
} from "./facetedFilter";

interface Item {
  id: string;
  colors: string[];
  sizes: string[];
}

const items: Item[] = [
  { id: "a", colors: ["red"], sizes: ["S"] },
  { id: "b", colors: ["red", "blue"], sizes: ["M"] },
  { id: "c", colors: ["blue"], sizes: ["M", "L"] },
  { id: "d", colors: [], sizes: ["L"] },
];

const color: FacetDescriptor<Item> = {
  key: "color",
  valuesOf: (item) => item.colors,
};
const size: FacetDescriptor<Item> = {
  key: "size",
  valuesOf: (item) => item.sizes,
};
const descriptors = [color, size];

const ids = (matches: Item[]) => matches.map((item) => item.id);

describe("matchesFacetSelections", () => {
  it("keeps every item when no facet is selected", () => {
    expect(
      ids(
        items.filter((item) => matchesFacetSelections(item, descriptors, {})),
      ),
    ).toEqual(["a", "b", "c", "d"]);
  });

  it("keeps every item when selections are empty arrays", () => {
    expect(
      ids(
        items.filter((item) =>
          matchesFacetSelections(item, descriptors, { color: [], size: [] }),
        ),
      ),
    ).toEqual(["a", "b", "c", "d"]);
  });

  it("matches any of the values selected within one facet", () => {
    expect(
      ids(
        items.filter((item) =>
          matchesFacetSelections(item, descriptors, {
            color: ["red", "blue"],
          }),
        ),
      ),
    ).toEqual(["a", "b", "c"]);
    expect(
      ids(
        items.filter((item) =>
          matchesFacetSelections(item, descriptors, { color: ["red"] }),
        ),
      ),
    ).toEqual(["a", "b"]);
  });

  it("matches every selected facet", () => {
    expect(
      ids(
        items.filter((item) =>
          matchesFacetSelections(item, descriptors, {
            color: ["blue"],
            size: ["M"],
          }),
        ),
      ),
    ).toEqual(["b", "c"]);
  });

  it("drops items that offer no value for a selected facet", () => {
    expect(
      ids(
        items.filter((item) =>
          matchesFacetSelections(item, descriptors, { color: ["red"] }),
        ),
      ),
    ).not.toContain("d");
  });

  it("uses a descriptor's matches override", () => {
    const anyColor: FacetDescriptor<Item> = {
      key: "color",
      valuesOf: (item) => item.colors,
      matches: (item, selected) =>
        selected.includes("any") ||
        selected.some((v) => item.colors.includes(v)),
    };
    expect(
      ids(
        items.filter((item) =>
          matchesFacetSelections(item, [anyColor], { color: ["any"] }),
        ),
      ),
    ).toEqual(["a", "b", "c", "d"]);
  });
});

describe("withoutFacet", () => {
  const selections: FacetSelections = { color: ["red"], size: ["M"] };

  it("removes only the given key", () => {
    expect(withoutFacet(selections, "color")).toEqual({ size: ["M"] });
  });

  it("does not mutate the original selections", () => {
    withoutFacet(selections, "color");
    expect(selections).toEqual({ color: ["red"], size: ["M"] });
  });

  it("leaves selections untouched for an unknown key", () => {
    expect(withoutFacet(selections, "missing")).toEqual({
      color: ["red"],
      size: ["M"],
    });
  });
});

describe("facetOptions", () => {
  it("counts values against the base filter and every facet", () => {
    expect(facetOptions(items, descriptors, {})).toEqual({
      color: [
        { value: "blue", count: 2 },
        { value: "red", count: 2 },
      ],
      size: [
        { value: "L", count: 2 },
        { value: "M", count: 2 },
        { value: "S", count: 1 },
      ],
    });
  });

  it("does not narrow a facet's own options by its selection", () => {
    expect(facetOptions(items, descriptors, { color: ["red"] }).color).toEqual([
      { value: "blue", count: 2 },
      { value: "red", count: 2 },
    ]);
  });

  it("narrows a facet's options by the other facets", () => {
    expect(facetOptions(items, descriptors, { color: ["red"] }).size).toEqual([
      { value: "M", count: 1 },
      { value: "S", count: 1 },
    ]);
  });

  it("matches any of the values selected in another facet", () => {
    expect(
      facetOptions(items, descriptors, { color: ["red", "blue"] }).size,
    ).toEqual([
      { value: "L", count: 1 },
      { value: "M", count: 2 },
      { value: "S", count: 1 },
    ]);
  });

  it("applies the base filter before counting", () => {
    const options = facetOptions(
      items,
      descriptors,
      {},
      (item) => item.id !== "c",
    );
    expect(options.color).toEqual([
      { value: "blue", count: 1 },
      { value: "red", count: 2 },
    ]);
    expect(options.size).toEqual([
      { value: "L", count: 1 },
      { value: "M", count: 1 },
      { value: "S", count: 1 },
    ]);
  });

  it("sorts and deduplicates values", () => {
    const tags: FacetDescriptor<Item> = {
      key: "tag",
      valuesOf: (item) => (item.id === "a" ? ["z", "a", "z"] : []),
    };
    expect(facetOptions(items, [tags], {}).tag).toEqual([
      { value: "a", count: 1 },
      { value: "z", count: 1 },
    ]);
  });

  it("offers no options for a facet whose items have no values", () => {
    const empty: FacetDescriptor<Item> = { key: "empty", valuesOf: () => [] };
    expect(facetOptions(items, [empty], {}).empty).toEqual([]);
  });

  it("counts by membership even when a descriptor overrides matches", () => {
    const anyColor: FacetDescriptor<Item> = {
      key: "color",
      valuesOf: (item) => item.colors,
      matches: () => true,
    };
    expect(
      facetOptions(items, [anyColor], {}, (i) => i.id === "d").color,
    ).toEqual([]);
    expect(facetOptions(items, [anyColor], {}).color).toEqual([
      { value: "blue", count: 2 },
      { value: "red", count: 2 },
    ]);
  });

  it("always offers an option that keeps at least one item", () => {
    const selections: FacetSelections = { color: ["red"], size: ["M"] };
    const options = facetOptions(items, descriptors, selections);
    for (const descriptor of descriptors) {
      for (const option of options[descriptor.key]) {
        const matching = items.filter((item) =>
          matchesFacetSelections(item, descriptors, {
            ...selections,
            [descriptor.key]: [option.value],
          }),
        );
        expect(matching.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("withUnavailableSelections", () => {
  it("appends retained values with count 0", () => {
    expect(
      withUnavailableSelections(
        [
          { value: "red", count: 3 },
          { value: "blue", count: 1 },
        ],
        ["green", "red"],
      ),
    ).toEqual([
      { value: "red", count: 3 },
      { value: "blue", count: 1 },
      { value: "green", count: 0 },
    ]);
  });

  it("keeps the selection order of the retained values", () => {
    expect(
      withUnavailableSelections([], ["z", "a", "m"]).map((o) => o.value),
    ).toEqual(["z", "a", "m"]);
  });

  it("does not duplicate available or repeated values", () => {
    expect(
      withUnavailableSelections(
        [{ value: "red", count: 2 }],
        ["red", "green", "green"],
      ),
    ).toEqual([
      { value: "red", count: 2 },
      { value: "green", count: 0 },
    ]);
  });
});
