import { useQuery } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ExecutionStats as Stats } from "@/client";
import { ExecutionStats } from "./executionStats";

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual("@tanstack/react-query");
  return { ...actual, useQuery: vi.fn() };
});

const mockedUseQuery = vi.mocked(useQuery);

const groupCounts = (
  total: number,
  successful: number,
  failed: number,
  running: number,
  not_started: number,
) => ({
  total,
  successful,
  failed,
  running,
  not_started,
  dirty: 0,
});

const STATS = {
  groups: groupCounts(1200, 1000, 150, 30, 20),
  success_rate_percentage: 83.3,
  groups_by_mip_era: {
    CMIP6: groupCounts(900, 800, 70, 20, 10),
    CMIP7: groupCounts(300, 200, 80, 10, 10),
  },
  scalar_value_count: 5000,
  series_value_count: 250,
  total_datasets: 42,
  total_files: 4321,
  resource_usage: null,
} satisfies Stats;

const mockQuery = (result: {
  data?: Stats;
  isLoading?: boolean;
  error?: Error;
}) =>
  mockedUseQuery.mockReturnValue({
    data: undefined,
    isLoading: false,
    error: null,
    ...result,
  } as ReturnType<typeof useQuery>);

describe("ExecutionStats", () => {
  beforeEach(() => {
    mockedUseQuery.mockReset();
  });

  it("shows the statistics with counts formatted", () => {
    mockQuery({ data: STATS });
    render(<ExecutionStats />);

    expect(screen.getByText("1,200")).toBeInTheDocument();
    expect(
      screen.getByText("900 ran against CMIP6, 300 against CMIP7"),
    ).toBeInTheDocument();
    expect(screen.getByText("83.3%")).toBeInTheDocument();
    expect(
      screen.getByText("1,000 successful, 150 failed"),
    ).toBeInTheDocument();
    expect(screen.getByText("5,250")).toBeInTheDocument();
    expect(screen.getByText("5,000 scalars, 250 series")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("4,321 files tracked")).toBeInTheDocument();
  });

  it("shows placeholders while loading", () => {
    mockQuery({ isLoading: true });
    render(<ExecutionStats />);

    expect(screen.getByText("Total Execution Groups")).toBeInTheDocument();
    expect(screen.getAllByText("...")).toHaveLength(7);
    expect(screen.getByText("... files tracked")).toBeInTheDocument();
  });

  it("says when the statistics failed to load", () => {
    mockQuery({ error: new Error("boom") });
    render(<ExecutionStats />);

    expect(
      screen.getByText("Failed to load execution statistics"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Success Rate")).not.toBeInTheDocument();
  });
});
