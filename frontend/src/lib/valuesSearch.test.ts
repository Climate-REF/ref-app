import { describe, expect, it } from "vitest";
import type { MetricFilter } from "@/components/explorer/types";
import { filtersToSearch, searchToFilters } from "./valuesSearch";

describe("searchToFilters", () => {
  it("turns each facet param into a facet filter", () => {
    expect(
      searchToFilters({
        source_id: "CESM2, GFDL",
        experiment_id: "historical",
      }),
    ).toEqual([
      {
        type: "facet",
        id: expect.any(String),
        facetKey: "source_id",
        values: ["CESM2", "GFDL"],
      },
      {
        type: "facet",
        id: expect.any(String),
        facetKey: "experiment_id",
        values: ["historical"],
      },
    ]);
  });

  it("leaves out view, outlier, era, pagination and unset params", () => {
    expect(
      searchToFilters({
        tab: "series",
        groupBy: "source_id",
        hue: "experiment_id",
        style: "member_id",
        detect_outliers: "iqr",
        include_unverified: false,
        mip_era: "CMIP6",
        offset: 50,
        limit: 25,
        execution_id: "7",
        region: undefined,
      }),
    ).toEqual([]);
  });

  it("turns id params into isolate and exclude filters", () => {
    expect(searchToFilters({ isolate_ids: "1,2", exclude_ids: "3" })).toEqual([
      { type: "isolate", id: expect.any(String), ids: new Set(["1", "2"]) },
      { type: "exclude", id: expect.any(String), ids: new Set(["3"]) },
    ]);
  });

  it("skips id params without ids", () => {
    expect(searchToFilters({ isolate_ids: " , ", exclude_ids: "" })).toEqual(
      [],
    );
  });
});

describe("filtersToSearch", () => {
  const filters: MetricFilter[] = [
    {
      type: "facet",
      id: "a",
      facetKey: "source_id",
      values: ["CESM2", "GFDL"],
    },
    { type: "isolate", id: "b", ids: new Set(["1", "2"]) },
    { type: "exclude", id: "c", ids: new Set(["3"]) },
  ];

  it("writes facet values and ids as comma separated params", () => {
    expect(filtersToSearch(filters, {})).toEqual({
      source_id: "CESM2,GFDL",
      isolate_ids: "1,2",
      exclude_ids: "3",
      offset: 0,
    });
  });

  it("keeps the view, outlier, era and page size params", () => {
    const search = {
      tab: "series",
      groupBy: "source_id",
      hue: "experiment_id",
      style: "member_id",
      detect_outliers: "off",
      include_unverified: true,
      mip_era: "CMIP7",
      limit: 100,
    };
    expect(filtersToSearch([], search)).toEqual({ ...search, offset: 0 });
  });

  it("drops the old filters, ids and offset", () => {
    expect(
      filtersToSearch([], {
        source_id: "CESM2",
        isolate_ids: "1",
        exclude_ids: "2",
        offset: 50,
      }),
    ).toEqual({ offset: 0 });
  });

  it("round trips through searchToFilters", () => {
    const search = filtersToSearch(filters, { detect_outliers: "iqr" });
    expect(searchToFilters(search)).toEqual(
      filters.map((filter) => ({ ...filter, id: expect.any(String) })),
    );
  });
});
