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
import { Download, Eye, MoreHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { DataTableColumnHeader } from "@/components/dataTable/columnHeader.tsx";
import { InnerDataTable } from "@/components/dataTable/innerDataTable.tsx";
import type { Facet, MetricValue } from "@/components/execution/values/types";
import { Button } from "@/components/ui/button.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";

// Update to use ProcessedMetricValue which includes rowId
type ProcessedMetricValue = MetricValue & { rowId: string };

interface DataTableProps {
  values: ProcessedMetricValue[];
  facets: Facet[];
  loading: boolean;
  rowSelection: RowSelectionState;
  setRowSelection: OnChangeFn<RowSelectionState>;
  onDownload?: () => void;
}

function ValuesDataTable({
  values,
  facets,
  loading,
  rowSelection,
  setRowSelection,
  onDownload,
}: DataTableProps) {
  const columns: ColumnDef<ProcessedMetricValue>[] = useMemo(() => {
    const indexColumns: ColumnDef<ProcessedMetricValue>[] = facets.map(
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
        header: "Value",
        accessorFn: (cell) => (cell.value as number).toPrecision(3),
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

  return (
    <div className="space-y-4">
      {onDownload && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={onDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download CSV
          </Button>
        </div>
      )}
      <InnerDataTable table={table} loading={loading} />
    </div>
  );
}
export default ValuesDataTable;
