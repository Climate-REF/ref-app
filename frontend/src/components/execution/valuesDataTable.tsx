import type { Facet, MetricValue } from "@/client";
import { DataTable } from "@/components/dataTable/dataTable.tsx";
import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";

interface DataTableProps {
  values: MetricValue[];
  facets: Facet[];
  isLoading: boolean;
}

function ValuesDataTable({ values, facets, isLoading }: DataTableProps) {
  if (isLoading) {
    return null;
  }
  const columns: ColumnDef<MetricValue>[] = useMemo(() => {
    return [
      ...facets.map((facet) => ({
        id: facet.key,
        header: facet.key,
        accessorFn: (cell: MetricValue) => cell.dimensions[facet.key],
      })),
      {
        id: "value",
        header: "Value",
        accessorFn: (cell) => cell.value,
      },
    ];
  }, [facets]);
  return <DataTable data={values} columns={columns} />;
}
export default ValuesDataTable;
