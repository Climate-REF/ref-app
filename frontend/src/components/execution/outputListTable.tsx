import type { ExecutionOutput } from "@/client";
import { DataTable } from "@/components/dataTable/dataTable.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";

import { SquareArrowOutUpRight } from "lucide-react";

export const columns: ColumnDef<ExecutionOutput>[] = [
  {
    accessorKey: "short_name",
    header: "Short Name",
  },
  {
    accessorKey: "filename",
    header: "Filename",
  },
  {
    id: "updated_at",
    accessorFn: (row) => format(new Date(row.updated_at), "yyyy-MM-dd HH:mm"),
  },
  {
    accessorKey: "url",
    cell: (cell) => (
      <a
        href={cell.row.renderValue("url")}
        target="_blank"
        rel="noopener noreferrer"
      >
        <SquareArrowOutUpRight className="hover:text-blue-300 text-blue-500" />
      </a>
    ),
  },
];

interface OutputListTableProps {
  results: ExecutionOutput[];
}

function OutputListTable({ results }: OutputListTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>List of outputs</CardTitle>
      </CardHeader>
      <CardContent>
        <DataTable data={results} columns={columns} />
      </CardContent>
    </Card>
  );
}
export default OutputListTable;
