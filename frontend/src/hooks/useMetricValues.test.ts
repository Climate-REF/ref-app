import { describe, expect, it } from "vitest";
import { DEFAULT_PAGE_SIZE } from "./useMetricValues";

describe("useMetricValues constants", () => {
  it("exports DEFAULT_PAGE_SIZE as 50", () => {
    expect(DEFAULT_PAGE_SIZE).toBe(50);
  });

  it("DEFAULT_PAGE_SIZE is a positive integer", () => {
    expect(Number.isInteger(DEFAULT_PAGE_SIZE)).toBe(true);
    expect(DEFAULT_PAGE_SIZE).toBeGreaterThan(0);
  });
});
