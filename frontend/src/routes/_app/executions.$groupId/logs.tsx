import { createFileRoute } from "@tanstack/react-router";
import { ExecutionLogContainer } from "@/components/execution/executionLogs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const LogsTab = () => {
  const { groupId } = Route.useParams();
  // const { executionId } = Route.useSearch();

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
        <ExecutionLogContainer groupId={groupId} executionId={undefined} />
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
