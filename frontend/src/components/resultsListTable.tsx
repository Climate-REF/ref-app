import type { MetricExecutionResult } from "@/client";
import { DataTable } from "@/components/dataTable/dataTable.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { type ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { format } from "date-fns";

import { SquareArrowOutUpRight } from "lucide-react";

const columnHelper = createColumnHelper<MetricExecutionResult>();

export const columns: ColumnDef<MetricExecutionResult>[] = [
  {
    accessorKey: "dataset_hash",
    header: "Dataset Hash",
  },
  {
    accessorKey: "successful",
  },
  {
    id: "updated_at",
    accessorFn: (row) => format(new Date(row.updated_at), "yyyy-MM-dd HH:mm"),
  },
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

interface ResultListTableProps {
  results: MetricExecutionResult[];
}

function ResultListTable({ results }: ResultListTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>List of recent metric executions</CardTitle>
      </CardHeader>
      <CardContent>
        <DataTable data={results} columns={columns} />
      </CardContent>
    </Card>
  );
}
export default ResultListTable;
