import { createFileRoute } from "@tanstack/react-router";
import { ExecutionDatasetTable } from "@/components/execution/executionDatasetTable";
import { ExecutionTabCard } from "@/components/execution/executionTabCard";

const DatasetsTab = () => {
  const { groupId } = Route.useParams();
  return (
    <ExecutionTabCard
      groupId={groupId}
      title="Datasets"
      description="All datasets used in this execution. Click a dataset to view metadata and provenance."
      what="datasets"
    >
      <ExecutionDatasetTable groupId={groupId} />
    </ExecutionTabCard>
  );
};

export const Route = createFileRoute("/_app/executions/$groupId/datasets")({
  component: DatasetsTab,
  staticData: {
    title: "Datasets",
  },
});
