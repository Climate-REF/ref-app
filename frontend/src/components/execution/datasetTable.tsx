import type { Dataset } from "@/client";
import { DataTable } from "@/components/dataTable/dataTable.tsx";
import { useQuery } from "@tanstack/react-query";
import { type ColumnDef, createColumnHelper } from "@tanstack/react-table";

import { executionsExecutionDatasetsOptions } from "@/client/@tanstack/react-query.gen.ts";
import { SquareArrowOutUpRight } from "lucide-react";

const columnHelper = createColumnHelper<Dataset>();

export const columns: ColumnDef<Dataset>[] = [
  columnHelper.accessor("slug", { header: "Slug" }) as ColumnDef<Dataset>,
  columnHelper.accessor("dataset_type", {
    header: "Dataset Type",
  }) as ColumnDef<Dataset>,
  columnHelper.display({
    id: "esgf_link",
    cell: (cellContext) => {
      if (cellContext.row.original.more_info_url) {
        return (
          <a
            href={cellContext.row.original.more_info_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <SquareArrowOutUpRight className="hover:text-blue-300 text-blue-500" />
          </a>
        );
      }
    },
  }),
];

interface DatasetTableProps {
  groupId: string;
  executionId?: string;
}

function DatasetTable({ groupId, executionId }: DatasetTableProps) {
  const { data } = useQuery(
    executionsExecutionDatasetsOptions({
      path: { group_id: groupId },
      query: { execution_id: executionId },
    }),
  );
  return <DataTable data={data?.data ?? []} columns={columns} />;
}
export default DatasetTable;
