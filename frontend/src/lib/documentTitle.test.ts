import { describe, expect, it } from "vitest";
import { titleFromMatches } from "./documentTitle";

const match = (title?: string) => ({ staticData: { title } });

describe("titleFromMatches", () => {
  it("uses the most specific route's title", () => {
    expect(
      titleFromMatches([match(), match("Execution Details"), match("Logs")]),
    ).toBe("Logs - Climate-REF");
  });

  it("falls back to a layout's title when the route has none", () => {
    expect(
      titleFromMatches([match(), match("Diagnostic Details"), match()]),
    ).toBe("Diagnostic Details - Climate-REF");
  });

  it("skips an empty title", () => {
    expect(titleFromMatches([match("Datasets"), match("")])).toBe(
      "Datasets - Climate-REF",
    );
  });

  it("is the site name without any title", () => {
    expect(titleFromMatches([])).toBe("Climate-REF");
    expect(titleFromMatches([{}, match()])).toBe("Climate-REF");
  });
});
