import { DataTableViewOptions } from "@/components/dataTable/columnToggle.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  type ColumnDef,
  type SortingState,
  type Table as TTable,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState } from "react";

function renderBody<TData>(table: TTable<TData>) {
  return table.getRowModel().rows?.length ? (
    table.getRowModel().rows.map((row) => (
      <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
        {row.getVisibleCells().map((cell) => (
          <TableCell key={cell.id}>
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </TableCell>
        ))}
      </TableRow>
    ))
  ) : (
    <TableRow>
      <TableCell
        colSpan={table.getAllColumns().length}
        className="h-24 text-center"
      >
        No results.
      </TableCell>
    </TableRow>
  );
}

function renderSkeleton<TData>(table: TTable<TData>, numRows = 5) {
  return (
    <>
      {Array.from(new Array(numRows)).map((_, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
        <TableRow key={index}>
          {table.getVisibleLeafColumns().map((column) => (
            <TableCell key={column.id}>
              <Skeleton className="size-4 rounded-md" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  loading?: boolean;
  canHideColumns?: boolean;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  loading = false,
  canHideColumns = false,
}: DataTableProps<TData, TValue>) {
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

  return (
    <div className="flex flex-col  gap-y-4">
      {canHideColumns && <DataTableViewOptions table={table} />}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? renderSkeleton(table) : renderBody(table)}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
