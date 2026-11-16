import { fireEvent, render, screen } from "@testing-library/react";
import type { SetStateAction } from "react";
import { describe, expect, it, vi } from "vitest";
import type { Facet } from "@/components/execution/values/types";
import type { MetricFilter } from "@/components/explorer/types";
import { FilterControls } from "./filterControls";

const filters: MetricFilter[] = [
  { type: "facet", id: "f", facetKey: "source_id", values: ["A", "B"] },
  { type: "isolate", id: "i", ids: new Set(["1", "2"]) },
  { type: "exclude", id: "e", ids: new Set(["3"]) },
];

const facets: Facet[] = [{ key: "source_id", values: ["A", "B"] }];

/** Render the controls, returning the filters each setFilters call would leave. */
function renderControls(
  rowSelection: Record<string, boolean> = {},
  availableFacets: Facet[] = facets,
) {
  const results: MetricFilter[][] = [];
  const setFilters = vi.fn((next: SetStateAction<MetricFilter[]>) => {
    results.push(typeof next === "function" ? next(filters) : next);
  });
  render(
    <FilterControls
      facets={availableFacets}
      filters={filters}
      setFilters={setFilters}
      rowSelection={rowSelection}
    />,
  );
  return results;
}

describe("FilterControls", () => {
  it("shows a badge per filter", () => {
    renderControls();
    expect(screen.getByText("source_id: A, B")).toBeInTheDocument();
    expect(screen.getByText("Isolating 2 rows")).toBeInTheDocument();
    expect(screen.getByText("Excluding 1 rows")).toBeInTheDocument();
  });

  it("removes a filter from its badge", () => {
    const results = renderControls();
    fireEvent.click(screen.getByLabelText("Remove isolate filter"));
    expect(results).toEqual([[filters[0], filters[2]]]);
  });

  it("adds the selected rows to the exclude filter", () => {
    const results = renderControls({ "4": true });
    fireEvent.click(screen.getByText("Exclude Selected"));
    expect(results).toEqual([
      [filters[0], filters[1], { ...filters[2], ids: new Set(["3", "4"]) }],
    ]);
  });

  it("does not offer facets that already have a filter", () => {
    renderControls();
    expect(screen.getByRole("button", { name: /add filter/i })).toBeDisabled();
  });

  it("offers facets that do not have a filter", () => {
    renderControls({}, [
      ...facets,
      { key: "experiment_id", values: ["historical"] },
    ]);
    expect(screen.getByRole("button", { name: /add filter/i })).toBeEnabled();
  });
});
