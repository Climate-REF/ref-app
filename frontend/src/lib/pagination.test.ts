import { describe, expect, it } from "vitest";
import { nextOffset } from "./pagination";

const page = (length: number, total_count?: number | null) => ({
  data: Array.from({ length }, (_, i) => i),
  total_count,
});

describe("nextOffset", () => {
  it("returns the number of items loaded while more remain", () => {
    expect(nextOffset([page(50, 120)])).toBe(50);
    expect(nextOffset([page(50, 120), page(50, 120)])).toBe(100);
  });

  it("stops after a partial last page", () => {
    expect(nextOffset([page(50, 70), page(20, 70)])).toBeUndefined();
  });

  it("stops when exactly the total has been loaded", () => {
    expect(nextOffset([page(50, 100), page(50, 100)])).toBeUndefined();
  });

  it("stops when the total is unknown", () => {
    expect(nextOffset([page(50, null)])).toBeUndefined();
    expect(nextOffset([page(50)])).toBeUndefined();
  });

  it("stops on an empty page, even if the total says more remain", () => {
    expect(nextOffset([page(0, 0)])).toBeUndefined();
    expect(nextOffset([page(50, 120), page(0, 120)])).toBeUndefined();
  });

  it("returns undefined for no pages", () => {
    expect(nextOffset([])).toBeUndefined();
  });

  it("uses the latest page's total", () => {
    expect(nextOffset([page(50, 200), page(50, 100)])).toBeUndefined();
  });
});
