"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { Dataset } from "@/client/types.gen";

export const columns: ColumnDef<Dataset>[] = [
  {
    accessorKey: "source_id",
    header: "Source ID",
  },
  {
    accessorKey: "institution_id",
    header: "Institution ID",
  },
  {
    accessorKey: "activity_id",
    header: "Activity ID",
  },
];
