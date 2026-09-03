import { Link } from "@tanstack/react-router";
import { type ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { SquareArrowOutUpRight } from "lucide-react";
import type { Dataset } from "@/client";
import { Badge } from "@/components/ui/badge";

const columnHelper = createColumnHelper<Dataset>();

/** Facets every CMIP dataset carries, shown as their own columns rather than hidden in the slug. */
const METADATA_COLUMNS = [
  { key: "experiment_id", header: "Experiment" },
  { key: "source_id", header: "Source ID" },
  { key: "variable_id", header: "Variable" },
] as const;

export const columns: ColumnDef<Dataset>[] = [
  columnHelper.accessor("slug", {
    header: "Slug",
    cell: (cellContext) => {
      return (
        <Link
          to="/datasets/$slug"
          params={{ slug: cellContext.row.original.slug }}
          className="text-blue-500 hover:text-blue-300"
        >
          {cellContext.getValue()}
        </Link>
      );
    },
  }) as ColumnDef<Dataset>,
  columnHelper.accessor("dataset_type", {
    header: "Dataset Type",
    cell: (cellContext) => (
      <Badge variant="outline" className="uppercase">
        {cellContext.getValue()}
      </Badge>
    ),
  }) as ColumnDef<Dataset>,
  ...METADATA_COLUMNS.map(
    ({ key, header }) =>
      columnHelper.display({
        id: key,
        header,
        cell: (cellContext) => cellContext.row.original.metadata?.[key] ?? "",
      }) as ColumnDef<Dataset>,
  ),
  columnHelper.display({
    id: "esgf_link",
    cell: (cellContext) => {
      if (cellContext.row.original.more_info_url) {
        return (
          <a
            href={cellContext.row.original.more_info_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <SquareArrowOutUpRight className="hover:text-blue-300 text-blue-500" />
          </a>
        );
      }
    },
    header: "More Info",
  }),
];
