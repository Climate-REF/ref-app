import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { type ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { SquareArrowOutUpRight } from "lucide-react";
import type { Dataset } from "@/client";

import { executionsExecutionDatasetsOptions } from "@/client/@tanstack/react-query.gen.ts";
import { DataTable } from "@/components/dataTable/dataTable.tsx";

const columnHelper = createColumnHelper<Dataset>();

export const columns: ColumnDef<Dataset>[] = [
  columnHelper.accessor("slug", {
    header: "Slug",
    cell: (cellContext) => {
      return (
        <Link
          to="/datasets/$slug"
          params={{ slug: cellContext.row.original.slug }}
          className="text-blue-500 hover:text-blue-300"
        >
          {cellContext.getValue()}
        </Link>
      );
    },
  }) as ColumnDef<Dataset>,
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
