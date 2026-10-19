import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import type { Execution, ExecutionGroup } from "@/client";
import { executionsGetOptions } from "@/client/@tanstack/react-query.gen";
import { useLatestExecution } from "./useLatestExecution";

const execution = (id: number) => ({ id, successful: true }) as Execution;

/** Render the hook with the group already in the cache, so it does not suspend. */
function renderWithGroup(executions: Execution[]) {
  const queryClient = new QueryClient();
  queryClient.setQueryData(
    executionsGetOptions({ path: { group_id: "1" } }).queryKey,
    { id: 1, executions } as ExecutionGroup,
  );
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
  return renderHook(() => useLatestExecution("1"), { wrapper });
}

describe("useLatestExecution", () => {
  it("is the last of the group's executions, which are oldest first", () => {
    const { result } = renderWithGroup([execution(3), execution(7)]);
    expect(result.current?.id).toBe(7);
  });

  it("is undefined for a group that has never run", () => {
    const { result } = renderWithGroup([]);
    expect(result.current).toBeUndefined();
  });
});
