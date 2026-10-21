import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { CatalogDiagnostic } from "@/lib/diagnosticCatalog";
import {
  type DiagnosticFilterState,
  NO_DIAGNOSTIC_FILTERS,
} from "@/lib/diagnosticFilters";
import { DiagnosticsFilter } from "./diagnosticsFilter";

const diagnostics = [
  { name: "enso", provider: { slug: "pmp", name: "PMP" }, aft_link: null },
  { name: "gpp", provider: { slug: "ilamb", name: "ILAMB" }, aft_link: null },
] as unknown as CatalogDiagnostic[];

function renderFilter(changes: Partial<DiagnosticFilterState>) {
  const onChange = vi.fn();
  const value = { ...NO_DIAGNOSTIC_FILTERS, ...changes };
  render(
    <DiagnosticsFilter
      diagnostics={diagnostics}
      value={value}
      onChange={onChange}
    />,
  );
  return { onChange, value };
}

describe("DiagnosticsFilter", () => {
  it("adds a checked provider to the filters", () => {
    const { onChange, value } = renderFilter({ providers: ["pmp"] });
    fireEvent.click(screen.getByRole("button", { name: /Providers/ }));
    fireEvent.click(screen.getByLabelText("ilamb"));
    expect(onChange).toHaveBeenCalledWith({
      ...value,
      providers: ["pmp", "ilamb"],
    });
  });

  it("checks one metric values option at a time", () => {
    const { onChange, value } = renderFilter({ metricValues: true });
    fireEvent.click(screen.getByRole("button", { name: /Metric Values/ }));
    fireEvent.click(screen.getByLabelText("No metric values"));
    expect(onChange).toHaveBeenLastCalledWith({
      ...value,
      metricValues: false,
    });
    fireEvent.click(screen.getByLabelText("Has metric values"));
    expect(onChange).toHaveBeenLastCalledWith({ ...value, metricValues: null });
  });

  it("clears every filter", () => {
    const { onChange } = renderFilter({ search: "enso", themes: ["Ocean"] });
    fireEvent.click(screen.getByRole("button", { name: "Clear Filters" }));
    expect(onChange).toHaveBeenCalledWith(NO_DIAGNOSTIC_FILTERS);
  });
});
