import {
  type ColumnDef,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { useState } from "react";

export interface TDataTable<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
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
