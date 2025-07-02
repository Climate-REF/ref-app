import { useNavigate } from "@tanstack/react-router";
import { type ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { format } from "date-fns";
import { SquareArrowOutUpRight } from "lucide-react";
import type { Execution } from "@/client";
import { DataTable } from "@/components/dataTable/dataTable.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Route } from "@/routes/_app/executions.$groupId.tsx";

const columnHelper = createColumnHelper<Execution>();

export const columns: ColumnDef<Execution>[] = [
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
      const rowIndex = cell.row.index;
      const { executionId } = Route.useSearch();
      if (executionId && cell.row.original.id.toString() === executionId) {
        return <Badge variant="default">Selected</Badge>;
      }
      if (rowIndex === 0) {
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
    cell: (context) => {
      const navigate = useNavigate({ from: Route.fullPath });
      return (
        <SquareArrowOutUpRight
          className="hover:text-blue-300 text-blue-500"
          onClick={() => {
            return navigate({
              search: (prev) => ({
                ...prev,
                resultId: context.row.original.id.toString(),
              }),
            });
          }}
        />
      );
    },
  }),
];

interface ResultListTableProps {
  results: Execution[];
}

function ExecutionsTable({ results }: ResultListTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>History of recent diagnostic executions</CardTitle>
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
export default ExecutionsTable;
