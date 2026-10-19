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
import { Eye, MoreHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { DataTableColumnHeader } from "@/components/dataTable/columnHeader.tsx";
import { InnerDataTable } from "@/components/dataTable/innerDataTable.tsx";
import type { Facet } from "@/components/execution/values/types";
import { Button } from "@/components/ui/button.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import type {
  ProcessedScalarValue,
  ProcessedSeriesValue,
} from "@/hooks/useValuesProcessor";
import { orderFacets } from "./orderFacets";

type ProcessedRow = ProcessedScalarValue | ProcessedSeriesValue;

export interface ValuesTableProps<T extends ProcessedRow> {
  values: T[];
  facets: Facet[];
  loading: boolean;
  rowSelection: RowSelectionState;
  setRowSelection: OnChangeFn<RowSelectionState>;
}

interface ValuesDataTableProps<T extends ProcessedRow>
  extends ValuesTableProps<T> {
  /** Columns between the facets and the row menu, showing the values themselves */
  valueColumns: ColumnDef<T>[];
  /** Facets shown last, next to the value columns */
  trailingFacetKeys?: string[];
}

/** A selectable table of metric values with a column per facet and a link to each execution. */
export function ValuesDataTable<T extends ProcessedRow>({
  values,
  facets,
  loading,
  rowSelection,
  setRowSelection,
  valueColumns,
  trailingFacetKeys,
}: ValuesDataTableProps<T>) {
  const columns: ColumnDef<T>[] = useMemo(() => {
    const indexColumns: ColumnDef<T>[] = orderFacets(
      facets,
      trailingFacetKeys,
    ).map((facet) => ({
      id: facet.key,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={facet.key} />
      ),
      accessorFn: (cell: T) => cell.dimensions[facet.key],
    }));

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
      ...valueColumns,
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
                    executionId: cell.row.original.execution_id.toString(),
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
  }, [facets, valueColumns, trailingFacetKeys]);

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
