import { Link } from "@tanstack/react-router";
import { type ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { SquareArrowOutUpRight } from "lucide-react";
import type { Dataset } from "@/client";
import { SourceTypeBadge } from "@/components/ui/badge";
import { isCmipSourceType } from "@/lib/sourceTypes";

const columnHelper = createColumnHelper<Dataset>();

const LEADING_COLUMNS: ColumnDef<Dataset>[] = [
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
      <SourceTypeBadge sourceType={cellContext.row.original.dataset_type}>
        {cellContext.getValue()}
      </SourceTypeBadge>
    ),
  }) as ColumnDef<Dataset>,
];

/** Facets only the CMIP sources carry, shown as their own columns rather than hidden in the slug. */
const METADATA_COLUMNS: ColumnDef<Dataset>[] = (
  [
    { key: "experiment_id", header: "Experiment" },
    { key: "source_id", header: "Source ID" },
    { key: "variable_id", header: "Variable" },
  ] as const
).map(
  ({ key, header }) =>
    columnHelper.accessor((row) => row.metadata?.[key] ?? "", {
      id: key,
      header,
    }) as ColumnDef<Dataset>,
);

const TRAILING_COLUMNS: ColumnDef<Dataset>[] = [
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

const cmipColumns = [
  ...LEADING_COLUMNS,
  ...METADATA_COLUMNS,
  ...TRAILING_COLUMNS,
];
const otherColumns = [...LEADING_COLUMNS, ...TRAILING_COLUMNS];

/** The columns for a table of `sourceType` datasets, as a reference stable across renders. */
export function datasetColumns(sourceType: string): ColumnDef<Dataset>[] {
  return isCmipSourceType(sourceType) ? cmipColumns : otherColumns;
}
