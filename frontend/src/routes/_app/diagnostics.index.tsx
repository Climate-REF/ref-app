import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { diagnosticsListOptions } from "@/client/@tanstack/react-query.gen";
import type { DiagnosticSummary } from "@/client/types.gen";
import DiagnosticSummaryTable from "@/components/datasets/diagnosticSummaryTable.tsx";
import { DiagnosticCard } from "@/components/diagnostics/diagnosticCard";
import { DiagnosticsFilter } from "@/components/diagnostics/diagnosticsFilter";
import { ViewToggle } from "@/components/diagnostics/viewToggle";

const diagnosticNotes = [
  {
    slug: "ohc-noaa",
    note: "Known issue",
    noteUrl: "https://github.com/Climate-REF/climate-ref/issues/430",
  },
  {
    slug: "sea-ice-sensitivity",
    note: "Known issue with an invalid dataset",
    noteUrl: "https://github.com/Climate-REF/climate-ref/issues/425",
  },
];

const Diagnostics = () => {
  const { data } = useSuspenseQuery(diagnosticsListOptions());
  const [view, setView] = useState<"cards" | "table">("cards");
  const [filteredDiagnostics, setFilteredDiagnostics] = useState<
    DiagnosticSummary[]
  >(data.data);

  return (
    <div className="container mx-auto py-10">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Diagnostics</h1>
            <p className="text-muted-foreground">
              Browse available diagnostic tools and analyses
            </p>
          </div>
          <ViewToggle view={view} onViewChange={setView} />
        </div>
      </div>

      <div className="mb-6">
        <DiagnosticsFilter
          diagnostics={data.data}
          onFilterChange={setFilteredDiagnostics}
        />
      </div>

      {view === "cards" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredDiagnostics.map((diagnostic) => {
            const note = diagnosticNotes.find(
              (n) => n.slug === diagnostic.slug,
            );
            return (
              <DiagnosticCard
                key={`${diagnostic.provider.slug}-${diagnostic.slug}`}
                diagnostic={diagnostic}
                note={note?.note}
                noteURL={note?.noteUrl}
              />
            );
          })}
        </div>
      ) : (
        <DiagnosticSummaryTable summaries={filteredDiagnostics} />
      )}

      {filteredDiagnostics.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No diagnostics found matching your filters.
          </p>
        </div>
      )}
    </div>
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
