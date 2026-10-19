import { describe, expect, it } from "vitest";
import type { FacetFilter, MetricFilter } from "@/components/explorer/types";
import {
  applyFacetFilters,
  mergeIdFilter,
  parseCommaList,
} from "./metricFilters";

describe("parseCommaList", () => {
  it("splits on commas and trims each entry", () => {
    expect(parseCommaList("1, 2 ,3")).toEqual(["1", "2", "3"]);
  });

  it("drops empty entries", () => {
    expect(parseCommaList(",1,, ,2,")).toEqual(["1", "2"]);
  });

  it("keeps spaces inside an entry", () => {
    expect(parseCommaList("ACCESS ESM, CESM2")).toEqual([
      "ACCESS ESM",
      "CESM2",
    ]);
  });

  it("returns no entries for blank text", () => {
    expect(parseCommaList("")).toEqual([]);
    expect(parseCommaList("  ")).toEqual([]);
  });
});

describe("applyFacetFilters", () => {
  const value = (id: number, dimensions: Record<string, unknown>) => ({
    id,
    dimensions,
  });
  const values = [
    value(1, { source_id: "CESM2", experiment_id: "historical" }),
    value(2, { source_id: "GFDL", experiment_id: "historical" }),
    value(3, { source_id: "CESM2", experiment_id: "ssp585" }),
    value(4, { experiment_id: "historical" }),
  ];
  const facet = (facetKey: string, ...facetValues: string[]): FacetFilter => ({
    type: "facet",
    id: facetKey,
    facetKey,
    values: facetValues,
  });
  const idsOf = (filtered: { id: number }[]) => filtered.map((v) => v.id);

  it("returns the values unchanged without facet filters", () => {
    expect(applyFacetFilters(values, [])).toBe(values);
    expect(
      applyFacetFilters(values, [
        { type: "isolate", id: "i", ids: new Set(["1"]) },
        { type: "exclude", id: "e", ids: new Set(["2"]) },
      ]),
    ).toBe(values);
  });

  it("keeps values whose dimension is any of a filter's values", () => {
    expect(
      idsOf(applyFacetFilters(values, [facet("source_id", "CESM2", "GFDL")])),
    ).toEqual([1, 2, 3]);
  });

  it("keeps only values matching every filter", () => {
    expect(
      idsOf(
        applyFacetFilters(values, [
          facet("source_id", "CESM2"),
          facet("experiment_id", "historical"),
        ]),
      ),
    ).toEqual([1]);
  });

  it("drops values without the filtered dimension", () => {
    expect(
      idsOf(applyFacetFilters(values, [facet("source_id", "CESM2", "GFDL")])),
    ).not.toContain(4);
    expect(
      applyFacetFilters([value(5, { source_id: null })], [facet("source_id")]),
    ).toEqual([]);
  });

  it("ignores whitespace around values and compares as strings", () => {
    expect(
      idsOf(
        applyFacetFilters(
          [value(6, { source_id: " CESM2 " }), value(7, { member: 1 })],
          [facet("source_id", "CESM2 ")],
        ),
      ),
    ).toEqual([6]);
    expect(
      idsOf(
        applyFacetFilters([value(7, { member: 1 })], [facet("member", "1")]),
      ),
    ).toEqual([7]);
  });
});

describe("mergeIdFilter", () => {
  const facet: FacetFilter = {
    type: "facet",
    id: "f",
    facetKey: "source_id",
    values: ["A"],
  };

  it("appends a new filter when there is none of that mode", () => {
    expect(mergeIdFilter([facet], "isolate", ["1", "2"])).toEqual([
      facet,
      { type: "isolate", id: expect.any(String), ids: new Set(["1", "2"]) },
    ]);
  });

  it("adds the ids to the first filter of that mode", () => {
    const filters: MetricFilter[] = [
      { type: "exclude", id: "e", ids: new Set(["9"]) },
      { type: "isolate", id: "i", ids: new Set(["1"]) },
      facet,
    ];
    expect(mergeIdFilter(filters, "isolate", ["1", "2"])).toEqual([
      filters[0],
      { type: "isolate", id: "i", ids: new Set(["1", "2"]) },
      facet,
    ]);
  });

  it("leaves the other mode alone", () => {
    const isolate: MetricFilter = {
      type: "isolate",
      id: "i",
      ids: new Set(["1"]),
    };
    const merged = mergeIdFilter([isolate], "exclude", ["1"]);
    expect(merged[0]).toBe(isolate);
    expect(merged[1]).toMatchObject({ type: "exclude", ids: new Set(["1"]) });
  });

  it("does not change the input", () => {
    const ids = new Set(["1"]);
    const filters: MetricFilter[] = [{ type: "isolate", id: "i", ids }];
    mergeIdFilter(filters, "isolate", ["2"]);
    expect(filters).toEqual([
      { type: "isolate", id: "i", ids: new Set(["1"]) },
    ]);
  });
});
