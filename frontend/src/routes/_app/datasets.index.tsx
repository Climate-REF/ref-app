import { useInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import {
  datasetsListInfiniteOptions,
  datasetsListOptions,
} from "@/client/@tanstack/react-query.gen";
import DatasetTable from "@/components/datasets/datasetTable";
import { FilterPanel } from "@/components/datasets/filterPanel";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const DatasetsSearchSchema = z.object({
  dataset_type: z.string().default("cmip6"),
  name_contains: z.string().optional(),
  facets: z.string().optional(),
});

export const Route = createFileRoute("/_app/datasets/")({
  component: SourcesIndexPage,
  validateSearch: zodValidator(DatasetsSearchSchema),
  loader: async ({ context: { queryClient } }) => {
    return queryClient.ensureQueryData(datasetsListOptions());
  },
});

function SourcesIndexPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
    isLoading,
    error,
  } = useInfiniteQuery({
    ...datasetsListInfiniteOptions({
      query: { ...search, limit: 50 },
    }),
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((acc, page) => acc + (page.count || 0), 0);
      if (lastPage.total_count != null && loaded < lastPage.total_count) {
        return loaded;
      }
      return undefined;
    },
  });

  const datasets = data?.pages.flatMap((page) => page.data) || [];
  const allFacets = datasets.reduce(
    (acc, ds) => {
      if (ds.metadata) {
        for (const [key, value] of Object.entries(ds.metadata)) {
          if (!acc[key]) {
            acc[key] = new Set();
          }
          acc[key].add(value);
        }
      }
      return acc;
    },
    {} as Record<string, Set<string>>,
  );

  const facetsForFilter = Object.fromEntries(
    Object.entries(allFacets).map(([key, valueSet]) => [
      key,
      Array.from(valueSet),
    ]),
  );

  const handleFilterChange = (newFilters: Record<string, any>) => {
    const searchParams: Record<string, any> = { ...search, ...newFilters };

    if (Object.keys(newFilters.facets ?? {}).length > 0) {
      searchParams.facets = JSON.stringify(newFilters.facets);
    } else {
      delete searchParams.facets;
    }

    navigate({ search: searchParams });
  };

  const handleClearFilters = () => {
    navigate({ search: {} });
  };

  return (
    <div className="container mx-auto p-4 space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Ingested Datasets</CardTitle>
          <CardDescription>
            Browse the list of datasets that have been imported into the system.
            <p>
              Here you can view available datasets, filter them by various
              facets, and load more results as needed. Use the filter panel to
              narrow down your search by dataset type, name, or specific
              metadata attributes.
            </p>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <FilterPanel
              facets={facetsForFilter}
              filters={{
                ...search,
                facets: JSON.parse(search?.facets ?? "{}"),
              }}
              onFilterChange={handleFilterChange}
              onClear={handleClearFilters}
            />
            {isLoading && !data && <div>Loading datasets...</div>}
            {status === "error" && (
              <div>Error loading datasets: {String(error)}</div>
            )}
            <DatasetTable
              data={datasets}
              loading={isLoading || isFetchingNextPage}
            />
            {hasNextPage && (
              <Button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="w-[200px] mx-auto"
              >
                {isFetchingNextPage ? "Loading more..." : "Load More"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default SourcesIndexPage;
