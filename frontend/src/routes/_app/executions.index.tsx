import { createFileRoute } from "@tanstack/react-router";
import { executionsListRecentExecutionGroupsOptions } from "@/client/@tanstack/react-query.gen";
import { useSuspenseQuery } from "@tanstack/react-query";
import ExecutionGroupTable from "@/components/execution/executionGroupTable";

const ExecutionsList = () => {
  const { data } = useSuspenseQuery(
    executionsListRecentExecutionGroupsOptions({ query: { limit: 100 } }),
  );
  return <ExecutionGroupTable executionGroups={data.data} />;
};

export const Route = createFileRoute("/_app/executions/")({
  component: ExecutionsList,
  staticData: {
    title: "Executions",
  },
  loader: ({ context: { queryClient } }) => {
    return queryClient.ensureQueryData(
      executionsListRecentExecutionGroupsOptions({ query: { limit: 100 } }),
    );
  },
});
