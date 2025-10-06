import { createFileRoute } from "@tanstack/react-router";
import { ExecutionDatasetTable } from "@/components/execution/executionDatasetTable";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const DatasetsTab = () => {
  const { groupId } = Route.useParams();
  // const { executionId } = Route.useSearch();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Datasets</CardTitle>
        <CardDescription>
          All datasets used in this execution. Click a dataset to view metadata
          and provenance.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ExecutionDatasetTable groupId={groupId} executionId={undefined} />
      </CardContent>
    </Card>
  );
};

export const Route = createFileRoute("/_app/executions/$groupId/datasets")({
  component: DatasetsTab,
  staticData: {
    title: "Datasets",
  },
});
