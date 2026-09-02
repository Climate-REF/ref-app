import { useInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { executionsListRecentExecutionGroupsQueryKey } from "@/client/@tanstack/react-query.gen";
import { executionsListRecentExecutionGroups } from "@/client/sdk.gen";
import { MipEraBar, SwitchMipEraButton } from "@/components/charts/mipEraBar";
import { MipEraProvider } from "@/components/charts/mipEraContext";
import ExecutionGroupTable from "@/components/execution/executionGroupTable";
import { FilterPanel as ExecutionsFilterPanel } from "@/components/execution/filterPanel";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useMipEra } from "@/hooks/useMipEra";
import { mipEraSearchFields } from "@/lib/mipEras";

const ExecutionsSearchSchema = z.object({
  diagnostic_name_contains: z.string().optional(),
  provider_name_contains: z.string().optional(),
  dirty: z.enum(["true", "false"]).optional(),
  successful: z.enum(["true", "false"]).optional(),
  ...mipEraSearchFields,
});

export const Route = createFileRoute("/_app/executions/")({
  component: ExecutionsListPage,
  validateSearch: zodValidator(ExecutionsSearchSchema),
  staticData: {
    title: "Executions",
  },
});

function ExecutionsListPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { mipEra, setMipEra } = useMipEra(search.mip_era);

  // Coerce string flags to booleans for API compatibility
  const toBool = (v?: string) => (v === undefined ? undefined : v === "true");

  const queryOptions = {
    query: {
      limit: 50,
      diagnostic_name_contains: search.diagnostic_name_contains ?? undefined,
      provider_name_contains: search.provider_name_contains ?? undefined,
      dirty: toBool(search.dirty),
      successful: toBool(search.successful),
      mip_era: mipEra,
    },
  };

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
    isLoading,
    error,
  } = useInfiniteQuery({
    queryKey: executionsListRecentExecutionGroupsQueryKey(queryOptions),
    queryFn: async ({ pageParam = 0 }) => {
      const { data } = await executionsListRecentExecutionGroups({
        ...queryOptions,
        query: {
          ...queryOptions.query,
          offset: pageParam,
        },
      });
      return data;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = (allPages ?? []).reduce(
        (acc, page) => acc + (page?.data?.length ?? 0),
        0,
      );
      if (lastPage?.total_count && loaded < lastPage.total_count) {
        return loaded;
      }
      return undefined;
    },
  });

  const executionGroups = data?.pages.flatMap((page) => page?.data ?? []) || [];

  const updateSearch = (patch: Partial<typeof search>) => {
    // Remove empty values to keep URL clean and keep types aligned with Route.validateSearch
    const next: Partial<typeof search> = { ...search, ...patch };
    (Object.keys(next) as (keyof typeof next)[]).forEach((k) => {
      const v = next[k];
      if (v === undefined || v === "") {
        delete next[k];
      }
    });
    navigate({ search: next as typeof search });
  };

  const handleFilterChange = (newFilters: Record<string, any>) => {
    updateSearch(newFilters);
  };

  const handleClearFilters = () => {
    navigate({ search: {} });
  };

  return (
    <div className="container mx-auto p-4 space-y-8">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <CardTitle>Execution Groups</CardTitle>
            <Button variant="outline" asChild>
              <Link to="/executions/resources">Resource usage</Link>
            </Button>
          </div>
          <CardDescription>
            <p className="max-w-1/2">
              We group all executions for different versions of datasets
              together into an execution group. Each execution group has a
              unique identifier consisting of the unique keys used to group the
              datasets together. For example if a diagnostic's data requirements
              grouped CMIP6 datasets by <code>source_id</code> and{" "}
              <code>experiment_id</code>, then an example execution group would
              be <code>cmip6_historical_ACCESS-ESM1-5</code>.
            </p>
            <p className="mt-2">
              Browse the list of execution groups. Use the filters to narrow
              down your search.
            </p>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <MipEraBar mipEra={mipEra} onChange={setMipEra} />
          {/* Advanced filter panel (kept for parity with other pages) */}
          <ExecutionsFilterPanel
            filters={search}
            onFilterChange={handleFilterChange}
            onClear={handleClearFilters}
          />

          {isLoading && !data && <div>Loading executions...</div>}
          {status === "error" && (
            <div className="text-destructive">
              Error loading executions: {String(error)}
            </div>
          )}
          {!isLoading && executionGroups.length === 0 && (
            <MipEraProvider mipEra={mipEra} setMipEra={setMipEra}>
              <div className="flex flex-col items-start gap-3 text-sm text-muted-foreground">
                No {mipEra} execution groups match your filters.
                <SwitchMipEraButton />
              </div>
            </MipEraProvider>
          )}
          <ExecutionGroupTable executionGroups={executionGroups} />
          {hasNextPage && (
            <div className="flex justify-center">
              <Button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="w-[200px]"
              >
                {isFetchingNextPage ? "Loading more..." : "Load More"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
