import type { MetricExecutionResult } from "@/client";
import { DataTable } from "@/components/dataTable/dataTable.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { type ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { format } from "date-fns";

import { Link } from "@tanstack/react-router";
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
    id: "latest",
    cell: (cell) => {
      const latestResult = cell.row.index === 0;
      if (latestResult) {
        return <Badge variant="outline">Latest</Badge>;
      }
    },
  },
  {
    id: "updated_at",
    header: "Updated At",
    accessorFn: (row) => format(new Date(row.updated_at), "yyyy-MM-dd HH:mm"),
  },
  columnHelper.display({
    id: "open",
    cell: (cell) => (
      <Link to={`/execution/something/${cell.row.original.id}`}>
        <SquareArrowOutUpRight className="hover:text-blue-300 text-blue-500" />
      </Link>
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
        <CardTitle>History of recent metric executions</CardTitle>
        <CardDescription>
          Only the latest results are used in the data explorer
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable data={results} columns={columns} />
      </CardContent>
    </Card>
  );
}
export default ResultListTable;
