import { DataTableViewOptions } from "@/components/dataTable/columnToggle.tsx";
import { InnerDataTable } from "./innerDataTable";
import { type TDataTable, useDataTable } from "./useDataTable";

interface DataTableProps<TData, TValue> extends TDataTable<TData, TValue> {
  loading?: boolean;
  canHideColumns?: boolean;
  onRowClick?: (row: TData) => void;
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
