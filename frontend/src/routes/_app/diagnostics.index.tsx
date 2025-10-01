import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { diagnosticsListOptions } from "@/client/@tanstack/react-query.gen";
import type { DiagnosticSummary } from "@/client/types.gen";
import DiagnosticSummaryTable from "@/components/datasets/diagnosticSummaryTable.tsx";
import { DiagnosticCard } from "@/components/diagnostics/diagnosticCard";
import { DiagnosticsFilter } from "@/components/diagnostics/diagnosticsFilter";
import { ViewToggle } from "@/components/diagnostics/viewToggle";
import { Card, CardContent } from "@/components/ui/card";

const diagnosticNotes = [
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
            <h1 className="text-3xl font-bold">Diagnostics Catalog</h1>
            <p className="text-muted-foreground">
              A set of standardised diagnostics for evaluating climate model
              performance against observations and benchmarks.
            </p>
          </div>
          <ViewToggle view={view} onViewChange={setView} />
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <h3 className="font-semibold text-foreground mb-2">
              About Diagnostics
            </h3>
            <p className="mb-3">
              This catalog provides detailed information about the diagnostic
              tools used to evaluate climate model performance against
              observational data and established benchmarks. Each diagnostic
              implements specific methodologies for assessing model fidelity
              across different Earth system components.
            </p>
          </div>

          <div className="text-sm text-muted-foreground">
            <h3 className="font-semibold text-foreground mb-2">
              Diagnostic Providers
            </h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>PMP (PCMDI Metrics Package):</strong>
              </li>
              <li>
                <strong>ESMValTool:</strong>
              </li>
              <li>
                <strong>ILAMB/IOMB:</strong>
              </li>
            </ul>
          </div>

          <div className="text-sm text-muted-foreground">
            <h3 className="font-semibold text-foreground mb-2">
              What You'll Find
            </h3>
            <p className="mb-2">
              Each diagnostic provides information about the methodology,
              reference datasets used, and the data requirements. The REF
              performs multiple executions for each diagnostic across different
              models and datasets, with each execution producing useful outputs:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Metric Values:</strong> Scalar statistics or time series
                quantifying model performance
              </li>
              <li>
                <strong>Figures:</strong> Pre-generated visualizations (spatial
                plots, time series, comparisons)
              </li>
              <li>
                <strong>Data Files:</strong> Downloadable data for custom
                analysis and offline visualization
              </li>
            </ul>
          </div>

          <div className="text-sm text-muted-foreground pt-4">
            <p>
              Use the filters below to explore diagnostics by provider,
              variable, realm, or search for specific analyses. Click on any
              diagnostic to view detailed results and documentation.
            </p>
          </div>

          <div className="text-sm text-muted-foreground border-t pt-4">
            <p>
              Found an error, issue with a diagnostic or have an idea?{" "}
              <a
                href="https://github.com/Climate-REF/ref-app/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline font-medium"
              >
                Report it on GitHub →
              </a>
            </p>
          </div>
        </CardContent>
      </Card>

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
