import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { FacetFilter, MetricFilter } from "@/components/explorer/types";
import { useValuesProcessor } from "./useValuesProcessor";

const facetFilter = (id: string): FacetFilter => ({
  type: "facet",
  id,
  facetKey: "source_id",
  values: ["A"],
});

describe("useValuesProcessor setFilters", () => {
  it("runs an updater once and hands the parent the same filters", () => {
    const onFiltersChange = vi.fn();
    const { result } = renderHook(() =>
      useValuesProcessor({
        initialValues: [],
        onFiltersChange,
      }),
    );

    const updater = vi.fn((existing: MetricFilter[]) => [
      ...existing,
      facetFilter(crypto.randomUUID()),
    ]);
    act(() => result.current.setFilters(updater));

    expect(updater).toHaveBeenCalledTimes(1);
    expect(onFiltersChange).toHaveBeenCalledTimes(1);
    expect(onFiltersChange).toHaveBeenCalledWith(result.current.filters);
  });

  it("builds updaters in the same tick on each other", () => {
    const onFiltersChange = vi.fn();
    const { result } = renderHook(() =>
      useValuesProcessor({
        initialValues: [],
        onFiltersChange,
      }),
    );

    act(() => {
      result.current.setFilters((existing) => [...existing, facetFilter("a")]);
      result.current.setFilters((existing) => [...existing, facetFilter("b")]);
    });

    expect(result.current.filters.map((f) => f.id)).toEqual(["a", "b"]);
    expect(onFiltersChange).toHaveBeenLastCalledWith(result.current.filters);
  });

  it("passes plain filter arrays through", () => {
    const onFiltersChange = vi.fn();
    const { result } = renderHook(() =>
      useValuesProcessor({
        initialValues: [],
        initialFilters: [facetFilter("a")],
        onFiltersChange,
      }),
    );

    act(() => result.current.setFilters([]));

    expect(result.current.filters).toEqual([]);
    expect(onFiltersChange).toHaveBeenCalledWith([]);
  });
});

describe("useValuesProcessor displayedValues", () => {
  it("applies the facet filters and keys rows by their id", () => {
    const initialValues = [
      { id: 1, dimensions: { source_id: "A" } },
      { id: 2, dimensions: { source_id: "B" } },
    ];
    const { result } = renderHook(() =>
      useValuesProcessor({
        initialValues,
        initialFilters: [facetFilter("a")],
      }),
    );

    expect(result.current.displayedValues).toEqual([
      { ...initialValues[0], rowId: "1" },
    ]);
  });
});
