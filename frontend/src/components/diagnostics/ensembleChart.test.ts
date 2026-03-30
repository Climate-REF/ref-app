import { describe, expect, it } from "vitest";
import { KNOWN_CATEGORY_ORDERS, sortCategories } from "./ensembleChart";

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
