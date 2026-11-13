import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  type FacetedFilterState,
  facetedFilterParam,
  NO_FACETED_FILTER,
  parseFacetedFilter,
  writeFacetedFilter,
} from "./facetedFilterSearch";

describe("parseFacetedFilter", () => {
  it("reads the text filter and the facet params of its namespace", () => {
    expect(
      parseFacetedFilter(
        {
          "filter.q": "surface temperature",
          "filter.model": "CESM2, GFDL",
          "filter.region": "land",
        },
        "filter",
      ),
    ).toEqual({
      text: "surface temperature",
      selections: { model: ["CESM2", "GFDL"], region: ["land"] },
    });
  });

  it("ignores other namespaces and unrelated params", () => {
    expect(
      parseFacetedFilter(
        {
          "filter.q": "ocean",
          "filter.model": "CESM2",
          "card-a.q": "land",
          "card-a.model": "GFDL",
          mip_era: "CMIP7",
          theme: "land",
          "theme.detail": "x",
        },
        "card-a",
      ),
    ).toEqual({ text: "land", selections: { model: ["GFDL"] } });
  });

  it("reads an absent namespace as an empty filter", () => {
    expect(parseFacetedFilter({ theme: "land" }, "filter")).toEqual(
      NO_FACETED_FILTER,
    );
  });

  it("splits and trims values, dropping empty ones", () => {
    expect(
      parseFacetedFilter({ "filter.model": " a , b ,, c " }, "filter"),
    ).toEqual({ text: "", selections: { model: ["a", "b", "c"] } });
  });

  it("keeps values that are not unique, as they were selected", () => {
    expect(
      parseFacetedFilter({ "filter.model": "a,a" }, "filter").selections.model,
    ).toEqual(["a", "a"]);
  });

  it("turns numbers and booleans into strings", () => {
    expect(
      parseFacetedFilter(
        { "filter.member": 1, "filter.flag": true, "filter.off": false },
        "filter",
      ),
    ).toEqual({
      text: "",
      selections: { member: ["1"], flag: ["true"], off: ["false"] },
    });
  });

  it("reads the default text when the namespace has no text param", () => {
    expect(parseFacetedFilter({}, "filter", "tas").text).toBe("tas");
    expect(parseFacetedFilter({ "filter.q": "pr" }, "filter", "tas").text).toBe(
      "pr",
    );
  });

  it("ignores values that are not a single value", () => {
    expect(
      parseFacetedFilter(
        { "filter.q": null, "filter.model": ["a"], "filter.region": null },
        "filter",
      ),
    ).toEqual(NO_FACETED_FILTER);
  });

  it("does not trim the text filter", () => {
    expect(
      parseFacetedFilter({ "filter.q": "  spaced  " }, "filter").text,
    ).toBe("  spaced  ");
  });
});

describe("writeFacetedFilter", () => {
  const search = {
    "filter.q": "old",
    "filter.region": "land",
    "card-a.kind": "scalar",
    mip_era: "CMIP7",
    theme: "land",
  };

  it("replaces only its own namespace", () => {
    expect(
      writeFacetedFilter(search, "filter", {
        text: "new",
        selections: { model: ["CESM2", "GFDL"] },
      }),
    ).toEqual({
      "filter.q": "new",
      "filter.model": "CESM2,GFDL",
      "card-a.kind": "scalar",
      mip_era: "CMIP7",
      theme: "land",
    });
  });

  it("removes stale params of the namespace", () => {
    expect(
      writeFacetedFilter(search, "filter", {
        text: "",
        selections: {},
      }),
    ).toEqual({
      "card-a.kind": "scalar",
      mip_era: "CMIP7",
      theme: "land",
    });
  });

  it("omits empty text and empty selections", () => {
    expect(
      writeFacetedFilter({}, "filter", {
        text: "",
        selections: { model: [], region: [] },
      }),
    ).toEqual({});
  });

  it("keeps text made only of spaces", () => {
    expect(
      writeFacetedFilter({}, "filter", { text: " ", selections: {} }),
    ).toEqual({ "filter.q": " " });
  });

  it("omits the default text and keeps a cleared default as an empty param", () => {
    expect(
      writeFacetedFilter(
        { "filter.q": "x" },
        "filter",
        { text: "tas", selections: {} },
        "tas",
      ),
    ).toEqual({});
    const cleared = writeFacetedFilter(
      {},
      "filter",
      { text: "", selections: {} },
      "tas",
    );
    expect(cleared).toEqual({ "filter.q": "" });
    expect(parseFacetedFilter(cleared, "filter", "tas").text).toBe("");
  });

  it("escapes a comma inside a value", () => {
    const filter: FacetedFilterState = {
      text: "",
      selections: { statistic: ["Bias (mean, std)", "rmse"] },
    };
    const written = writeFacetedFilter({}, "filter", filter);
    expect(written).toEqual({ "filter.statistic": "Bias (mean\\, std),rmse" });
    expect(parseFacetedFilter(written, "filter")).toEqual(filter);
  });

  it("leaves namespaces that share a prefix alone", () => {
    expect(
      writeFacetedFilter(
        { "filter.q": "x", "filterExtra.model": "y" },
        "filter",
        { text: "", selections: {} },
      ),
    ).toEqual({ "filterExtra.model": "y" });
  });

  it("does not mutate the given search params", () => {
    writeFacetedFilter(search, "filter", { text: "", selections: {} });
    expect(search).toEqual({
      "filter.q": "old",
      "filter.region": "land",
      "card-a.kind": "scalar",
      mip_era: "CMIP7",
      theme: "land",
    });
  });

  it("round trips through parse", () => {
    const filter: FacetedFilterState = {
      text: "surface temperature",
      selections: { model: ["CESM2", "GFDL"], region: ["land", "ocean"] },
    };
    const written = writeFacetedFilter(
      { "filter.region": "stale", mip_era: "CMIP7" },
      "filter",
      filter,
    );
    expect(parseFacetedFilter(written, "filter")).toEqual(filter);
  });
});

describe("facetedFilterParam", () => {
  const schema = z.object({}).catchall(facetedFilterParam);

  it("keeps strings and turns numbers and booleans into strings", () => {
    expect(schema.parse({ model: "CESM2", member: 1, flag: true })).toEqual({
      model: "CESM2",
      member: "1",
      flag: "true",
    });
  });

  it("accepts search params without facet values", () => {
    expect(schema.parse({})).toEqual({});
  });

  it("drops values that are not a single value instead of failing", () => {
    expect(schema.parse({ foo: null, bar: [1], baz: { a: 1 } })).toEqual({
      foo: undefined,
      bar: undefined,
      baz: undefined,
    });
  });
});
