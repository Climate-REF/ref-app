import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { executionValuesSearchSchema } from "@/lib/valuesSearch";
import { ExecutionValuesPanel } from "./valuesPanel";

vi.mock("@tanstack/react-query", async () => ({
  ...(await vi.importActual("@tanstack/react-query")),
  useQuery: () => ({
    data: {
      data: [],
      count: 0,
      total_count: 0,
      facets: [{ key: "source_id", values: ["A", "B"] }],
      types: ["scalar"],
    },
    isLoading: false,
  }),
}));

describe("ExecutionValuesPanel", () => {
  it("keeps its filters in the URL", () => {
    const navigate = vi.fn();
    render(
      <ExecutionValuesPanel
        groupId="1"
        search={executionValuesSearchSchema.parse({
          source_id: "A",
          isolate_ids: "7",
        })}
        navigate={navigate}
        valueType="scalar"
      />,
    );

    expect(screen.getByText("source_id: A")).toBeInTheDocument();
    expect(screen.getByText("Isolating 1 rows")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Remove filter"));
    expect(navigate).toHaveBeenCalledWith({
      search: {
        detect_outliers: "iqr",
        limit: 50,
        isolate_ids: "7",
        offset: 0,
      },
      replace: true,
    });
  });
});
