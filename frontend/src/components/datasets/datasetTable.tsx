import type { Dataset } from "@/client";
import { DataTable } from "@/components/dataTable/dataTable.tsx";
import { datasetColumns } from "./datasetColumns.tsx";

interface DatasetTableProps {
  data: Dataset[];
  sourceType: string;
  loading?: boolean;
}

function DatasetTable({ data, sourceType, loading }: DatasetTableProps) {
  return (
    <DataTable
      data={data}
      columns={datasetColumns(sourceType)}
      loading={loading}
    />
  );
}
export default DatasetTable;
