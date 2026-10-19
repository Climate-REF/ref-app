import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/dataTable/columnHeader.tsx";
import type { ProcessedSeriesValue } from "@/hooks/useValuesProcessor";
import { Sparkline } from "./sparkline";
import { ValuesDataTable, type ValuesTableProps } from "./valuesDataTable.tsx";

const valueColumns: ColumnDef<ProcessedSeriesValue>[] = [
  {
    id: "sparkline",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={"Series"} />
    ),
    accessorFn: (cell) => cell.values,
    cell: (cell) => {
      const values = cell.row.original.values;
      return (
        <div className="flex items-center gap-2">
          <Sparkline values={values.filter((value) => value !== null)} />
        </div>
      );
    },
    enableSorting: false, // Can't sort by series data easily
  },
];

function SeriesDataTable(props: ValuesTableProps<ProcessedSeriesValue>) {
  return <ValuesDataTable {...props} valueColumns={valueColumns} />;
}

export default SeriesDataTable;
