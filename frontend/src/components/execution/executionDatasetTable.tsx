import { useQuery } from "@tanstack/react-query";
import { executionsExecutionDatasetsOptions } from "@/client/@tanstack/react-query.gen.ts";
import DatasetTable from "@/components/datasets/datasetTable.tsx";

interface ExecutionDatasetTableProps {
  groupId: string;
  executionId?: string;
}

export function ExecutionDatasetTable({
  groupId,
  executionId,
}: ExecutionDatasetTableProps) {
  const { data, isLoading } = useQuery(
    executionsExecutionDatasetsOptions({
      path: { group_id: groupId },
      query: { execution_id: executionId },
    }),
  );
  // Without a source type, as an execution can use datasets of several
  return <DatasetTable data={data?.data ?? []} loading={isLoading} />;
}
