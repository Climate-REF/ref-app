import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { diagnosticsListOptions } from "@/client/@tanstack/react-query.gen";
import DiagnosticSummaryTable from "@/components/datasets/diagnosticSummaryTable.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const Diagnostics = () => {
  const { data } = useSuspenseQuery(diagnosticsListOptions());
  const [globalFilter, setGlobalFilter] = useState("");

  const diagnostics = data.data;

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

  return (
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
        <DiagnosticSummaryTable summaries={filteredDiagnostics} />
      </CardContent>
    </Card>
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
