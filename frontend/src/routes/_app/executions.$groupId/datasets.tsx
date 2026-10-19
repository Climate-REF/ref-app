import { createFileRoute } from "@tanstack/react-router";
import { ExecutionDatasetTable } from "@/components/execution/executionDatasetTable";
import { ExecutionNotRun } from "@/components/execution/executionNotRun";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLatestExecution } from "@/hooks/useLatestExecution";

const DatasetsTab = () => {
  const { groupId } = Route.useParams();
  const hasRun = useLatestExecution(groupId) !== undefined;

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
        {hasRun ? (
          <ExecutionDatasetTable groupId={groupId} />
        ) : (
          <ExecutionNotRun what="datasets" />
        )}
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
