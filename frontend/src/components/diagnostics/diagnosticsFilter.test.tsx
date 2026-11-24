import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  type DiagnosticFilterOptions,
  type DiagnosticFilterState,
  NO_DIAGNOSTIC_FILTERS,
} from "@/lib/diagnosticFilters";
import { DiagnosticsFilter } from "./diagnosticsFilter";

const baseOptions: DiagnosticFilterOptions = {
  providers: [
    { value: "ilamb", count: 1 },
    { value: "pmp", count: 2 },
  ],
  aftLinks: [{ id: "AFT-1", name: "Sea Ice", count: 1 }],
  themes: [{ value: "Ocean", count: 1 }],
  metricValues: [
    { value: "true", count: 1 },
    { value: "false", count: 1 },
  ],
};

function renderFilter(
  changes: Partial<DiagnosticFilterState>,
  options: Partial<DiagnosticFilterOptions> = {},
) {
  const onChange = vi.fn();
  const value = { ...NO_DIAGNOSTIC_FILTERS, ...changes };
  render(
    <DiagnosticsFilter
      options={{ ...baseOptions, ...options }}
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
    fireEvent.click(screen.getByLabelText(/ilamb/));
    expect(onChange).toHaveBeenCalledWith({
      ...value,
      providers: ["pmp", "ilamb"],
    });
  });

  it("checks one metric values option at a time", () => {
    const { onChange, value } = renderFilter({ metricValues: true });
    fireEvent.click(screen.getByRole("button", { name: /Metric Values/ }));
    fireEvent.click(screen.getByLabelText(/No metric values/));
    expect(onChange).toHaveBeenLastCalledWith({
      ...value,
      metricValues: false,
    });
    fireEvent.click(screen.getByLabelText(/Has metric values/));
    expect(onChange).toHaveBeenLastCalledWith({ ...value, metricValues: null });
  });

  it("clears every filter", () => {
    const { onChange } = renderFilter({ search: "enso", themes: ["Ocean"] });
    fireEvent.click(screen.getByRole("button", { name: "Clear Filters" }));
    expect(onChange).toHaveBeenCalledWith(NO_DIAGNOSTIC_FILTERS);
  });

  it("keeps a selected value that no diagnostic offers so it can be removed", () => {
    const { onChange, value } = renderFilter(
      { themes: ["Land"] },
      { themes: [] },
    );
    fireEvent.click(screen.getByRole("button", { name: /Themes/ }));
    fireEvent.click(screen.getByLabelText(/Land/));
    expect(onChange).toHaveBeenCalledWith({ ...value, themes: [] });
  });

  it("hides unselected options that no diagnostic offers", () => {
    renderFilter({}, { providers: [{ value: "pmp", count: 1 }] });
    fireEvent.click(screen.getByRole("button", { name: /Providers/ }));
    expect(screen.getByLabelText(/pmp/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/ilamb/)).not.toBeInTheDocument();
  });
});
