import type { ColumnDef } from "@tanstack/react-table";
import { AlertTriangle } from "lucide-react";
import { DataTableColumnHeader } from "@/components/dataTable/columnHeader.tsx";
import type { ProcessedScalarValue } from "@/hooks/useValuesProcessor";
import { ValuesDataTable, type ValuesTableProps } from "./valuesDataTable.tsx";

const valueColumns: ColumnDef<ProcessedScalarValue>[] = [
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
];

// "metric" and "statistic" go last, closest to the value column
const trailingFacetKeys = ["metric", "statistic"];

function ScalarDataTable(props: ValuesTableProps<ProcessedScalarValue>) {
  return (
    <ValuesDataTable
      {...props}
      valueColumns={valueColumns}
      trailingFacetKeys={trailingFacetKeys}
    />
  );
}

export default ScalarDataTable;
