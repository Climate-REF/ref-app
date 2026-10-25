import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { ExecutionGroup } from "@/client";
import {
  diagnosticsCatalogOptions,
  modelsListOptions,
} from "@/client/@tanstack/react-query.gen";
import { executionsListRecentExecutionGroups } from "@/client/sdk.gen";
import type { MipEra } from "@/lib/mipEras";

const PAGE_SIZE = 1000;

/**
 * Every execution group of one MIP era whose latest execution failed, is running, or has not started,
 * newest first
 */
async function fetchUnsuccessfulGroups(
  mipEra: MipEra,
): Promise<ExecutionGroup[]> {
  const page = async (offset: number) => {
    const { data } = await executionsListRecentExecutionGroups({
      query: { successful: false, mip_era: mipEra, limit: PAGE_SIZE, offset },
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

/**
 * The diagnostic catalog and the unsuccessful execution groups of one MIP era, for the failures page
 *
 * The catalog counts only the groups of `model` when one is given, so each diagnostic's totals
 * match a page filtered to that model. The unsuccessful groups cover every model,
 * so the page can count the failures of each.
 */
export function useFailures(mipEra: MipEra, model?: string) {
  const catalog = useQuery({
    ...diagnosticsCatalogOptions({
      query: { mip_era: mipEra, source_id: model },
    }),
    // Keep showing the previous counts while another model's load
    placeholderData: keepPreviousData,
  });
  const unsuccessful = useQuery({
    queryKey: ["executions", "unsuccessful", mipEra],
    queryFn: () => fetchUnsuccessfulGroups(mipEra),
  });
  // Only lists the models without failures in the model picker, so it never holds up the page
  const models = useQuery({
    ...modelsListOptions({ query: { mip_era: mipEra } }),
    staleTime: 5 * 60 * 1000,
  });

  // A failed query that is being retried counts as loading again
  const failedQuery = (query: { isError: boolean; isFetching: boolean }) =>
    query.isError && !query.isFetching;
  const failed = [catalog, unsuccessful, models].filter(failedQuery);
  const error = failed.length > 0 ? failed[0].error : null;
  const loaded = catalog.data !== undefined && unsuccessful.data !== undefined;
  // The models only fill in the model picker, so their failure is reported without hiding the page
  const pageFailed = [catalog, unsuccessful].some(failedQuery);

  return {
    catalog: catalog.data?.data,
    unsuccessful: unsuccessful.data,
    models: models.data?.data.map(({ source_id }) => source_id),
    isLoading: !loaded && !pageFailed,
    error,
    retry: () => {
      for (const query of failed) {
        query.refetch();
      }
    },
  };
}
