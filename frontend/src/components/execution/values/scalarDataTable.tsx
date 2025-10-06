import { Link } from "@tanstack/react-router";
import {
  type ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type OnChangeFn,
  type RowSelectionState,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { AlertTriangle, Eye, MoreHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { DataTableColumnHeader } from "@/components/dataTable/columnHeader.tsx";
import { InnerDataTable } from "@/components/dataTable/innerDataTable.tsx";
import type { Facet, ScalarValue } from "@/components/execution/values/types";
import { Button } from "@/components/ui/button.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";

// Update to use ProcessedMetricValue which includes rowId
type ProcessedMetricValue = ScalarValue & { rowId: string };

interface DataTableProps {
  values: ProcessedMetricValue[];
  facets: Facet[];
  loading: boolean;
  rowSelection: RowSelectionState;
  setRowSelection: OnChangeFn<RowSelectionState>;
}

function ScalarDataTable({
  values,
  facets,
  loading,
  rowSelection,
  setRowSelection,
}: DataTableProps) {
  const columns: ColumnDef<ProcessedMetricValue>[] = useMemo(() => {
    // Order so that "metric" and "statistic" are last closest to the value column
    const sortedFacets = [...facets].sort((a, b) => {
      const specialKeys = ["metric", "statistic"];
      const aIsSpecial = specialKeys.includes(a.key);
      const bIsSpecial = specialKeys.includes(b.key);
      if (aIsSpecial && !bIsSpecial) return 1;
      if (!aIsSpecial && bIsSpecial) return -1;

      return 0;
    });
    const indexColumns: ColumnDef<ProcessedMetricValue>[] = sortedFacets.map(
      (facet) => ({
        id: facet.key,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={facet.key} />
        ),
        accessorFn: (cell: ProcessedMetricValue) => cell.dimensions[facet.key],
      }),
    );

    return [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
            aria-label="Select all"
            className="translate-y-[2px]"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
            className="translate-y-[2px]"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      ...indexColumns,
      {
        id: "value",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={"Value"} />
        ),
        accessorFn: (cell) => cell.value,
        cell: (cell) => {
          const value = (cell.row.original.value as number).toPrecision(3);
          const isOutlier = cell.row.original?.is_outlier === true;
          return (
            <div className="flex items-center gap-1">
              {value}
              {isOutlier && (
                <span
                  className="inline-flex items-center"
                  title="Flagged outlier (3.0×IQR)"
                >
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                </span>
              )}
            </div>
          );
        },
        enableSorting: true,
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
                  search={{
                    executionId:
                      cell.row.original.execution_group_id.toString(),
                  }}
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

  const [sorting, setSorting] = useState<SortingState>([]);
  const table = useReactTable({
    data: values,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      rowSelection,
    },
    getRowId: (row) => row.rowId,
  });

  if (loading && values.length === 0) {
    return <div className="text-center p-4">Loading table data...</div>;
  }

  return <InnerDataTable table={table} loading={loading} />;
}
export default ScalarDataTable;
