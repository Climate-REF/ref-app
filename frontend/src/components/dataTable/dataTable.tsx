import { DataTableViewOptions } from "@/components/dataTable/columnToggle.tsx";
import {
  type ColumnDef,
  type SortingState,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useState } from "react";
import { InnerDataTable } from "./innerDataTable";

interface TDataTable<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

interface DataTableProps<TData, TValue> extends TDataTable<TData, TValue> {
  loading?: boolean;
  canHideColumns?: boolean;
  onRowClick?: (row: TData) => void;
}

export function useDataTable<TData, TValue>({
  data,
  columns,
}: TDataTable<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
    },
  });

  return {
    table,
  };
}

export function DataTable<TData, TValue>({
  columns,
  data,
  loading = false,
  canHideColumns = false,
  onRowClick,
}: DataTableProps<TData, TValue>) {
  const { table } = useDataTable({ data, columns });

  return (
    <div className="flex flex-col gap-y-4">
      {canHideColumns && <DataTableViewOptions table={table} />}
      <div className="rounded-md border">
        <InnerDataTable
          table={table}
          loading={loading}
          onRowClick={onRowClick}
        />
      </div>
    </div>
  );
}
