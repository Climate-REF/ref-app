import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { ExecutionGroup } from "@/client";
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
  errorComponent: ({ error }) => {
    return <div>Error: {error.message}</div>;
  },
});

function DatasetPage() {
  const { slug } = Route.useParams();
  const { data: datasetData } = useSuspenseQuery(
    datasetsGetOptions({ path: { slug: slug } }),
  );
  const ds = datasetData;

  const { data: executionsData } = useSuspenseQuery(
    datasetsExecutionsOptions({
      path: { dataset_id: ds.id },
    }),
  );

  const exs = (executionsData?.data as unknown as ExecutionGroup[]) ?? [];

  return (
    <div className="container mx-auto p-4">
      <DetailsPanel
        title={ds.slug}
        description={ds.dataset_type}
        action={
          ds.more_info_url && (
            <Button asChild>
              <a
                href={ds.more_info_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                More Info
              </a>
            </Button>
          )
        }
        items={[
          { label: "Slug", value: ds.slug },
          ...(ds.metadata
            ? Object.entries(ds.metadata).map(([key, value]) => ({
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
          <ExecutionGroupTable executionGroups={exs} />
        </CardContent>
      </Card>
    </div>
  );
}

export default DatasetPage;
