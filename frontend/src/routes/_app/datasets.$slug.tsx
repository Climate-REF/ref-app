import { createFileRoute } from "@tanstack/react-router";
import {
  datasetsExecutionsOptions,
  datasetsGetOptions,
} from "@/client/@tanstack/react-query.gen";
import ExecutionGroupTable from "@/components/execution/executionGroupTable.tsx";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { DetailsPanel } from "@/components/ui/detailsPanel.tsx";

export const Route = createFileRoute("/_app/datasets/$slug")({
  loader: async ({ params, context: { queryClient } }) => {
    const slug = params.slug;
    const dataset = await queryClient.ensureQueryData(
      datasetsGetOptions({ path: { slug: slug } }),
    );
    await queryClient.invalidateQueries({
      queryKey: datasetsExecutionsOptions({
        path: { dataset_id: dataset.id },
      }).queryKey,
    });
    const executions = await queryClient.ensureQueryData(
      datasetsExecutionsOptions({ path: { dataset_id: dataset.id } }),
    );
    return { dataset, executions };
  },
  component: DatasetPage,
  staticData: {
    title: "Dataset Details",
  },
  errorComponent: ({ error }) => {
    const message = error instanceof Error ? error.message : String(error);
    return <div>Error: {message}</div>;
  },
});

function DatasetPage() {
  const { dataset, executions } = Route.useLoaderData();

  return (
    <div className="container mx-auto p-4">
      <title>{`${dataset.slug} - Climate-REF`}</title>
      <DetailsPanel
        title={dataset.slug}
        description={dataset.dataset_type}
        action={
          dataset.more_info_url && (
            <Button asChild>
              <a
                href={dataset.more_info_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                More Info
              </a>
            </Button>
          )
        }
        items={[
          { label: "Slug", value: dataset.slug },
          ...(dataset.metadata
            ? Object.entries(dataset.metadata).map(([key, value]) => ({
                label: key,
                value: value,
              }))
            : []),
        ]}
      />

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Executions</CardTitle>
        </CardHeader>
        <CardContent>
          <ExecutionGroupTable executionGroups={executions.data} />
        </CardContent>
      </Card>
    </div>
  );
}
