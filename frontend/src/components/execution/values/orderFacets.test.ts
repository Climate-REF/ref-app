import { describe, expect, it } from "vitest";
import { orderFacets } from "./orderFacets";
import type { Facet } from "./types";

const facets = (...keys: string[]): Facet[] =>
  keys.map((key) => ({ key, values: [] }));

const keysOf = (ordered: Facet[]) => ordered.map((facet) => facet.key);

describe("orderFacets", () => {
  it("keeps the order when no keys go last", () => {
    expect(
      keysOf(orderFacets(facets("statistic", "source_id", "metric"))),
    ).toEqual(["statistic", "source_id", "metric"]);
  });

  it("moves the named keys last, keeping their relative order", () => {
    const ordered = orderFacets(
      facets("statistic", "source_id", "metric", "region"),
      ["metric", "statistic"],
    );
    expect(keysOf(ordered)).toEqual([
      "source_id",
      "region",
      "statistic",
      "metric",
    ]);
  });

  it("ignores named keys that are not facets", () => {
    expect(keysOf(orderFacets(facets("source_id"), ["metric"]))).toEqual([
      "source_id",
    ]);
  });

  it("does not change the input", () => {
    const input = facets("metric", "source_id");
    orderFacets(input, ["metric"]);
    expect(keysOf(input)).toEqual(["metric", "source_id"]);
  });
});
