import type { Dataset } from "@/client";
import { DataTable } from "@/components/dataTable/dataTable.tsx";
import { useQuery } from "@tanstack/react-query";
import { type ColumnDef, createColumnHelper } from "@tanstack/react-table";

import { executionsResultDatasetsOptions } from "@/client/@tanstack/react-query.gen.ts";
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
  groupId: string;
  resultId?: string;
}

function DatasetTable({ groupId, resultId }: DatasetTableProps) {
  const { data } = useQuery(
    executionsResultDatasetsOptions({
      path: { group_id: groupId },
      query: { result_id: resultId },
    }),
  );
  return <DataTable data={data?.data ?? []} columns={columns} />;
}
export default DatasetTable;
