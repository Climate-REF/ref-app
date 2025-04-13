import type { Facet, MetricValue } from "@/client";
import { DataTableColumnHeader } from "@/components/dataTable/columnHeader.tsx";
import { DataTable } from "@/components/dataTable/dataTable.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye, MoreHorizontal } from "lucide-react";
import { useMemo } from "react";

interface DataTableProps {
  values: MetricValue[];
  facets: Facet[];
  isLoading: boolean;
}

function ValuesDataTable({ values, facets, isLoading }: DataTableProps) {
  if (isLoading) {
    return null;
  }
  const columns: ColumnDef<MetricValue>[] = useMemo(() => {
    const indexColumns: ColumnDef<MetricValue>[] = facets.map((facet) => ({
      id: facet.key,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={facet.key} />
      ),
      accessorFn: (cell: MetricValue) => cell.dimensions[facet.key],
    }));

    return [
      ...indexColumns,
      {
        id: "value",
        header: "Value",
        accessorFn: (cell) => cell.value,
      },
      {
        id: "info",
        cell: (cell) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link
                  to="/executions/$groupId"
                  params={{
                    groupId: cell.row.original.execution_group_id.toString(),
                  }}
                  search={{ resultId: cell.row.original.result_id.toString() }}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ];
  }, [facets]);
  return <DataTable data={values} columns={columns} canHideColumns={true} />;
}
export default ValuesDataTable;
