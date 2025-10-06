import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { executionsExecutionOptions } from "@/client/@tanstack/react-query.gen";
import { ExecutionFilesContainer } from "@/components/execution/executionFiles";

export const FilesTab = () => {
  const { groupId } = Route.useParams();
  // const { executionId } = Route.useSearch();

  const { data: execution } = useSuspenseQuery(
    executionsExecutionOptions({
      path: { group_id: groupId },
      // query: { execution_id: executionId },
    }),
  );

  return <ExecutionFilesContainer outputs={execution.outputs} />;
};

export const Route = createFileRoute("/_app/executions/$groupId/files")({
  component: FilesTab,
  staticData: {
    title: "Files",
  },
});
