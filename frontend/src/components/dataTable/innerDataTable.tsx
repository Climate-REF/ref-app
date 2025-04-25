import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import { type Table as TTable, flexRender } from "@tanstack/react-table";

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

interface InnerDataTableProps<TData> {
  table: TTable<TData>;
  loading?: boolean;
}

export function InnerDataTable<TData>({
  table,
  loading,
}: InnerDataTableProps<TData>) {
  return (
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
  );
}
