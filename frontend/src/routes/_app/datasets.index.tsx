import { infiniteQueryOptions, useInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { datasetsListInfiniteOptions } from "@/client/@tanstack/react-query.gen";
import { PageHeader } from "@/components/app/pageHeader";
import DatasetTable from "@/components/datasets/datasetTable";
import { FilterPanel } from "@/components/datasets/filterPanel";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card";
import { collectFacets } from "@/lib/datasetFacets";
import { nextOffset } from "@/lib/pagination";

/** Facet filters by name, also read from the JSON string older links carry. Anything malformed means no facet filters. */
const facetsSearch = z
  .preprocess((value) => {
    if (typeof value !== "string") {
      return value;
    }
    try {
      return JSON.parse(value);
    } catch {
      return undefined;
    }
  }, z.record(z.string(), z.string()).optional())
  .catch(undefined);

const DatasetsSearchSchema = z.object({
  dataset_type: z.string().default("cmip6"),
  name_contains: z.string().optional(),
  facets: facetsSearch,
});

type DatasetsSearch = z.infer<typeof DatasetsSearchSchema>;

/** The infinite query for the datasets matching the page's filters, shared by the loader and the page. */
const datasetsQueryOptions = ({ facets, ...search }: DatasetsSearch) =>
  infiniteQueryOptions({
    ...datasetsListInfiniteOptions({
      query: {
        ...search,
        facets:
          facets && Object.keys(facets).length > 0
            ? JSON.stringify(facets)
            : undefined,
        limit: 50,
      },
    }),
    initialPageParam: 0,
    getNextPageParam: (_lastPage, allPages) => nextOffset(allPages),
  });

export const Route = createFileRoute("/_app/datasets/")({
  component: SourcesIndexPage,
  validateSearch: DatasetsSearchSchema,
  staticData: {
    title: "Datasets",
  },
  loaderDeps: ({ search }) => search,
  loader: ({ context: { queryClient }, deps }) =>
    queryClient.prefetchInfiniteQuery(datasetsQueryOptions(deps)),
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
  } = useInfiniteQuery(datasetsQueryOptions(search));

  const datasets = data?.pages.flatMap((page) => page.data) || [];
  const facetsForFilter = collectFacets(datasets);

  const handleFilterChange = (newFilters: Partial<DatasetsSearch>) => {
    const next = { ...search, ...newFilters };
    if (!next.name_contains) {
      delete next.name_contains;
    }
    if (next.facets && Object.keys(next.facets).length === 0) {
      delete next.facets;
    }
    navigate({ search: next });
  };

  const handleClearFilters = () => {
    navigate({ search: {} });
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <PageHeader
        title="Ingested Datasets"
        description="Browse the datasets that have been imported into the system. Use the filter panel to narrow the list down by dataset type, name, or metadata facets."
      />

      <Card>
        <CardContent>
          <div className="flex flex-col gap-4">
            <FilterPanel
              facets={facetsForFilter}
              filters={search}
              onFilterChange={handleFilterChange}
              onClear={handleClearFilters}
            />
            {status === "error" && (
              <div>Error loading datasets: {String(error)}</div>
            )}
            <DatasetTable
              data={datasets}
              sourceType={search.dataset_type}
              loading={isLoading}
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
