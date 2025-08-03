import { Link } from "@tanstack/react-router";
import { type ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { SquareArrowOutUpRight } from "lucide-react";
import type { DiagnosticSummary } from "@/client";
import { DataTable } from "@/components/dataTable/dataTable.tsx";

const columnHelper = createColumnHelper<DiagnosticSummary>();

export const columns: ColumnDef<DiagnosticSummary>[] = [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "provider.name",
    header: "Provider",
  },
  {
    accessorKey: "description",
    header: "Description",
  },
  columnHelper.display({
    id: "link",
    cell: (cell) => (
      <Link
        to="/diagnostics/$providerSlug/$diagnosticSlug"
        params={{
          providerSlug: cell.row.original.provider.slug,
          diagnosticSlug: cell.row.original.slug,
        }}
      >
        <SquareArrowOutUpRight className="hover:text-blue-300 text-blue-500" />
      </Link>
    ),
  }),
];

interface DiagnosticSummaryTableProps {
  summaries: DiagnosticSummary[];
}

function DiagnosticSummaryTable({ summaries }: DiagnosticSummaryTableProps) {
  return <DataTable data={summaries} columns={columns} />;
}
export default DiagnosticSummaryTable;
