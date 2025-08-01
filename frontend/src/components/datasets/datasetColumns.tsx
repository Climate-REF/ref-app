import { Link } from "@tanstack/react-router";
import { type ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { SquareArrowOutUpRight } from "lucide-react";
import type { Dataset } from "@/client";

const columnHelper = createColumnHelper<Dataset>();

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
  }) as ColumnDef<Dataset>,
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
