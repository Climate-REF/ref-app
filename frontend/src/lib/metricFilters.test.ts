import { describe, expect, it } from "vitest";
import { parseCommaList } from "./metricFilters";

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
