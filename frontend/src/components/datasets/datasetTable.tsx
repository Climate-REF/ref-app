import type { Dataset } from "@/client";
import { DataTable } from "@/components/dataTable/dataTable.tsx";
import { columns } from "./datasetColumns.tsx";

interface DatasetTableProps {
  data: Dataset[];
  loading?: boolean;
}

function DatasetTable({ data, loading }: DatasetTableProps) {
  return <DataTable data={data} columns={columns} loading={loading} />;
}
export default DatasetTable;
