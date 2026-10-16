import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { ExecutionGroup } from "@/client";
import { diagnosticsCatalogOptions } from "@/client/@tanstack/react-query.gen";
import { executionsListRecentExecutionGroups } from "@/client/sdk.gen";
import { summariseFailures } from "@/lib/failures";

const PAGE_SIZE = 1000;

/** Every execution group whose latest execution failed, is running, or has not started, newest first. */
async function fetchUnsuccessfulGroups(): Promise<ExecutionGroup[]> {
  const page = async (offset: number) => {
    const { data } = await executionsListRecentExecutionGroups({
      query: { successful: false, limit: PAGE_SIZE, offset },
      throwOnError: true,
    });
    return data;
  };

  // The first page says how many groups there are, so the rest can load at once
  const first = await page(0);
  const offsets = [];
  for (
    let offset = PAGE_SIZE;
    offset < (first.total_count ?? 0);
    offset += PAGE_SIZE
  ) {
    offsets.push(offset);
  }
  const rest = await Promise.all(offsets.map(page));
  return [first, ...rest].flatMap((p) => p.data);
}

/** How every diagnostic's execution groups turned out, and the groups that failed. */
export function useFailures() {
  const catalog = useQuery(diagnosticsCatalogOptions());
  const unsuccessful = useQuery({
    queryKey: ["executions", "unsuccessful"],
    queryFn: fetchUnsuccessfulGroups,
  });

  const data = useMemo(
    () =>
      catalog.data && unsuccessful.data
        ? summariseFailures(catalog.data.data, unsuccessful.data)
        : undefined,
    [catalog.data, unsuccessful.data],
  );

  // A failed query that is being retried counts as loading again
  const failed = [catalog, unsuccessful].filter(
    (query) => query.isError && !query.isFetching,
  );
  const error = failed.length > 0 ? failed[0].error : null;

  return {
    data,
    isLoading: data === undefined && error === null,
    error,
    retry: () => {
      for (const query of failed) {
        query.refetch();
      }
    },
  };
}
