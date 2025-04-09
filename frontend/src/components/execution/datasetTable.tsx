import type { Dataset } from "@/client";
import { DataTable } from "@/components/dataTable/dataTable.tsx";
import { useQuery } from "@tanstack/react-query";
import { type ColumnDef, createColumnHelper } from "@tanstack/react-table";

import { executionsGetExecutionResultDatasetsOptions } from "@/client/@tanstack/react-query.gen.ts";
import { SquareArrowOutUpRight } from "lucide-react";

const columnHelper = createColumnHelper<Dataset>();

export const columns: ColumnDef<Dataset>[] = [
  columnHelper.accessor("slug", { header: "Slug" }) as ColumnDef<Dataset>,
  columnHelper.accessor("dataset_type", {
    header: "Dataset Type",
  }) as ColumnDef<Dataset>,
  columnHelper.display({
    id: "esgf_link",
    cell: () => (
      <a
        href="https://esgf-node.llnl.gov/"
        target="_blank"
        rel="noopener noreferrer"
      >
        <SquareArrowOutUpRight className="hover:text-blue-300 text-blue-500" />
      </a>
    ),
  }),
];

interface DatasetTableProps {
  groupId: number;
  resultId?: number;
}

function DatasetTable({ groupId, resultId }: DatasetTableProps) {
  if (!resultId) {
    return null;
  }
  const { data } = useQuery(
    executionsGetExecutionResultDatasetsOptions({
      path: { group_id: groupId, result_id: resultId },
    }),
  );
  return <DataTable data={data?.data ?? []} columns={columns} />;
}
export default DatasetTable;
