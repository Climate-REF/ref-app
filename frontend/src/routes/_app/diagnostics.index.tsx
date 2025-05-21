import type { DiagnosticSummary } from "@/client";
import { diagnosticsListOptions } from "@/client/@tanstack/react-query.gen";
import { DataTable } from "@/components/dataTable/dataTable";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";

const Diagnostics = () => {
  const { data } = useSuspenseQuery(diagnosticsListOptions());
  const navigate = useNavigate();
  const [globalFilter, setGlobalFilter] = useState("");

  const diagnostics = data.data;

  const columns: ColumnDef<DiagnosticSummary>[] = [
    {
      accessorKey: "name",
      header: "Name",
    },
    {
      accessorKey: "slug",
      header: "Slug",
    },
    {
      accessorKey: "provider.name",
      header: "Provider",
    },
  ];

  const filteredDiagnostics = useMemo(() => {
    if (!globalFilter) {
      return diagnostics;
    }
    return diagnostics.filter(
      (diagnostic) =>
        diagnostic.name.toLowerCase().includes(globalFilter.toLowerCase()) ||
        diagnostic.slug.toLowerCase().includes(globalFilter.toLowerCase()) ||
        diagnostic.provider.name
          .toLowerCase()
          .includes(globalFilter.toLowerCase()),
    );
  }, [diagnostics, globalFilter]);

  const handleRowClick = (row: DiagnosticSummary) => {
    navigate({
      to: "/diagnostics/$providerSlug/$diagnosticSlug",
      params: { providerSlug: row.provider.slug, diagnosticSlug: row.slug },
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Diagnostic List</CardTitle>
          <CardDescription>
            Search and view available diagnostics. Click on a row for more
            details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Search diagnostics..."
              value={globalFilter}
              onChange={(event) => setGlobalFilter(event.target.value)}
              className="max-w-sm"
            />
          </div>
          <DataTable
            columns={columns}
            data={filteredDiagnostics}
            onRowClick={handleRowClick}
          />
        </CardContent>
      </Card>
    </>
  );
};

export const Route = createFileRoute("/_app/diagnostics/")({
  component: Diagnostics,
  staticData: {
    title: "Diagnostics",
  },
  loader: ({ context: { queryClient } }) => {
    return queryClient.ensureQueryData(diagnosticsListOptions());
  },
});
