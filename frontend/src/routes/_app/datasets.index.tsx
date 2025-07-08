import { useInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  datasetsListInfiniteOptions,
  datasetsListOptions,
} from "@/client/@tanstack/react-query.gen";
import DatasetTable from "@/components/datasets/datasetTable";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const Route = createFileRoute("/_app/datasets/")({
  component: SourcesIndexPage,
  loader: async ({ context: { queryClient } }) => {
    return queryClient.ensureQueryData(datasetsListOptions());
  },
});

function SourcesIndexPage() {
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
      query: { limit: 50 },
    }),
    getNextPageParam: (lastPage, allPages) => {
      // lastPage.count: number of items in this page
      // lastPage.total_count: total items available (may be null)
      // allPages: array of all loaded pages
      const loaded = allPages.reduce((acc, page) => acc + (page.count || 0), 0);
      if (lastPage.total_count != null && loaded < lastPage.total_count) {
        return loaded; // use as offset for next page
      }
      return undefined;
    },
  });

  const datasets = data?.pages.flatMap((page) => page.data) || [];

  return (
    <div className="container mx-auto p-4 space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Ingested Datasets</CardTitle>
          <CardDescription>
            Browse the list of datasets that have been imported into the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && <div>Loading datasets...</div>}
          {status === "error" && (
            <div>Error loading datasets: {String(error)}</div>
          )}
          {datasets.length === 0 && status === "success" && (
            <div>No datasets found.</div>
          )}
          <DatasetTable
            data={datasets}
            loading={isLoading || isFetchingNextPage}
          />
          {hasNextPage && (
            <Button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? "Loading more..." : "Load More"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default SourcesIndexPage;
