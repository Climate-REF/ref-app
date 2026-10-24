import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { executionValuesSearchSchema } from "@/lib/valuesSearch";
import { ExecutionValuesPanel } from "./valuesPanel";

/** The executions of the group the panel shows, which the group query returns */
let groupExecutions: { id: number; successful: boolean | null }[] = [];
const valuesQuery = vi.fn();

vi.mock("@tanstack/react-query", async () => ({
  ...(await vi.importActual("@tanstack/react-query")),
  useSuspenseQuery: () => ({ data: { executions: groupExecutions } }),
  useQuery: ({ queryKey }: { queryKey: [{ _id: string }] }) =>
    queryKey[0]._id.endsWith("Facets")
      ? { data: [{ key: "source_id", values: ["A", "B"] }] }
      : {
          data: {
            data: [],
            count: 0,
            total_count: 0,
            facets: [],
            types: ["scalar"],
          },
          isLoading: false,
          ...valuesQuery(),
        },
}));

describe("ExecutionValuesPanel", () => {
  it("keeps its filters in the URL", () => {
    groupExecutions = [{ id: 3, successful: true }];
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

  it("says a group that has never run has no values, without querying them", () => {
    groupExecutions = [];
    valuesQuery.mockClear();
    render(
      <ExecutionValuesPanel
        groupId="1"
        search={executionValuesSearchSchema.parse({})}
        navigate={vi.fn()}
        valueType="series"
      />,
    );

    expect(
      screen.getByText(
        "This execution group has not run yet, so there are no series values to show.",
      ),
    ).toBeInTheDocument();
    expect(valuesQuery).not.toHaveBeenCalled();
  });
});
