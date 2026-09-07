"use client";

import { DropdownMenuTrigger } from "@radix-ui/react-dropdown-menu";
import type { Column, RowData, Table } from "@tanstack/react-table";
import { Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData extends RowData, TValue> {
    /** What the column toggle calls this column, where its header is not plain text. */
    label?: string;
  }
}

interface DataTableViewOptionsProps<TData> {
  table: Table<TData>;
}

/**
 * Name a column for the toggle menu.
 *
 * A header is often markup carrying a tooltip, so `meta.label` names those columns and the
 * raw id is only a last resort.
 */
function columnLabel<TData>(column: Column<TData>): string {
  const { meta, header } = column.columnDef;
  if (meta?.label) return meta.label;
  if (typeof header === "string") return header;
  return column.id.replace(/_/g, " ");
}

export function DataTableViewOptions<TData>({
  table,
}: DataTableViewOptionsProps<TData>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto hidden h-8 lg:flex"
        >
          <Settings2 />
          View
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto min-w-[180px]">
        <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {table
          .getAllColumns()
          .filter(
            (column) =>
              typeof column.accessorFn !== "undefined" && column.getCanHide(),
          )
          .map((column) => {
            return (
              <DropdownMenuCheckboxItem
                key={column.id}
                className="capitalize whitespace-nowrap"
                checked={column.getIsVisible()}
                onCheckedChange={(value) => column.toggleVisibility(!!value)}
              >
                {columnLabel(column)}
              </DropdownMenuCheckboxItem>
            );
          })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
