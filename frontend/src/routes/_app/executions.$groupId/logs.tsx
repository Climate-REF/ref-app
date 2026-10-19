import { createFileRoute } from "@tanstack/react-router";
import { ExecutionLogContainer } from "@/components/execution/executionLogs";
import { ExecutionTabCard } from "@/components/execution/executionTabCard";

const LogsTab = () => {
  const { groupId } = Route.useParams();
  return (
    <ExecutionTabCard
      groupId={groupId}
      title="Logs"
      description="Runtime logs from the selected execution. Use your browser search (Ctrl/Cmd+F) to find warnings or errors."
      what="logs"
    >
      <ExecutionLogContainer groupId={groupId} />
    </ExecutionTabCard>
  );
};

export const Route = createFileRoute("/_app/executions/$groupId/logs")({
  component: LogsTab,
  staticData: {
    title: "Logs",
  },
});
