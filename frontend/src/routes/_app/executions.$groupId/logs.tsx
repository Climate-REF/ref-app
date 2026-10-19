import { createFileRoute } from "@tanstack/react-router";
import { ExecutionLogContainer } from "@/components/execution/executionLogs";
import { ExecutionNotRun } from "@/components/execution/executionNotRun";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLatestExecution } from "@/hooks/useLatestExecution";

const LogsTab = () => {
  const { groupId } = Route.useParams();
  const hasRun = useLatestExecution(groupId) !== undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Logs</CardTitle>
        <CardDescription>
          Runtime logs from the selected execution. Use your browser search
          (Ctrl/Cmd+F) to find warnings or errors.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hasRun ? (
          <ExecutionLogContainer groupId={groupId} />
        ) : (
          <ExecutionNotRun what="logs" />
        )}
      </CardContent>
    </Card>
  );
};

export const Route = createFileRoute("/_app/executions/$groupId/logs")({
  component: LogsTab,
  staticData: {
    title: "Logs",
  },
});
