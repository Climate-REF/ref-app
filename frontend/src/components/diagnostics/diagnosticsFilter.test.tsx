import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DiagnosticSummary } from "@/client";
import { DiagnosticsFilter } from "./diagnosticsFilter";

function diagnostic(
  name: string,
  hasValues: boolean | null,
): DiagnosticSummary {
  return {
    id: name.length,
    name,
    slug: name,
    description: "",
    provider: { slug: "pmp", name: "PMP" },
    execution_groups: [],
    has_metric_values: hasValues,
    has_scalar_values: hasValues,
    has_series_values: hasValues === null ? null : false,
    execution_count: 1,
    successful_execution_count: 1,
    execution_group_count: 1,
    successful_execution_group_count: 1,
    promoted_version: 1,
    group_by: [],
    aft_link: null,
  };
}

const names = (call: DiagnosticSummary[]) => call.map((d) => d.name);

describe("DiagnosticsFilter", () => {
  it("keeps the search applied when the value flags arrive", () => {
    const onFilterChange = vi.fn();
    const pending = [diagnostic("alpha", null), diagnostic("beta", null)];
    const { rerender } = render(
      <DiagnosticsFilter
        diagnostics={pending}
        onFilterChange={onFilterChange}
        initialSearch="alpha"
      />,
    );
    expect(names(onFilterChange.mock.lastCall![0])).toEqual(["alpha"]);

    const loaded = [diagnostic("alpha", true), diagnostic("beta", false)];
    rerender(
      <DiagnosticsFilter
        diagnostics={loaded}
        onFilterChange={onFilterChange}
        initialSearch="alpha"
      />,
    );
    expect(onFilterChange.mock.lastCall![0]).toEqual([loaded[0]]);
  });

  it("keeps diagnostics with unknown flags until the flags load", () => {
    const onFilterChange = vi.fn();
    const pending = [diagnostic("alpha", null), diagnostic("beta", null)];
    const { rerender } = render(
      <DiagnosticsFilter
        diagnostics={pending}
        onFilterChange={onFilterChange}
        initialMetricValues={true}
      />,
    );
    expect(names(onFilterChange.mock.lastCall![0])).toEqual(["alpha", "beta"]);

    rerender(
      <DiagnosticsFilter
        diagnostics={[diagnostic("alpha", true), diagnostic("beta", false)]}
        onFilterChange={onFilterChange}
        initialMetricValues={true}
      />,
    );
    expect(names(onFilterChange.mock.lastCall![0])).toEqual(["alpha"]);
  });
});
