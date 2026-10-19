import { createFileRoute } from "@tanstack/react-router";
import { ExecutionFilesContainer } from "@/components/execution/executionFiles";
import { ExecutionNotRun } from "@/components/execution/executionNotRun";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLatestExecution } from "@/hooks/useLatestExecution";

const FilesTab = () => {
  const { groupId } = Route.useParams();
  const execution = useLatestExecution(groupId);

  if (!execution) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Files</CardTitle>
        </CardHeader>
        <CardContent>
          <ExecutionNotRun what="files" />
        </CardContent>
      </Card>
    );
  }
  return <ExecutionFilesContainer outputs={execution.outputs ?? []} />;
};

export const Route = createFileRoute("/_app/executions/$groupId/files")({
  component: FilesTab,
  staticData: {
    title: "Files",
  },
});
