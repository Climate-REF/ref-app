import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";
import { diagnosticsListOptions } from "@/client/@tanstack/react-query.gen";
import type { DiagnosticSummary } from "@/client/types.gen";
import DiagnosticSummaryTable from "@/components/datasets/diagnosticSummaryTable.tsx";
import { DiagnosticCard } from "@/components/diagnostics/diagnosticCard";
import { DiagnosticsFilter } from "@/components/diagnostics/diagnosticsFilter";
import { ViewToggle } from "@/components/diagnostics/viewToggle";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";

const diagnosticNotes = [
  {
    slug: "sea-ice-sensitivity",
    note: "Known issue with an invalid dataset",
    noteUrl: "https://github.com/Climate-REF/climate-ref/issues/425",
  },
  {
    slug: "zero-emission-commitment",
    note: "Waiting on regenerated results",
  },
  {
    slug: "transient-climate-response-emissions",
    note: "Waiting on regenerated results",
  },
];

// Define search params schema for URL filtering
// Arrays are stored as comma-separated strings and parsed in the component
const diagnosticsSearchSchema = z.object({
  search: z.string().optional().catch(undefined),
  providers: z.string().optional().catch(undefined),
  aftIds: z.string().optional().catch(undefined),
  themes: z.string().optional().catch(undefined),
  metricValues: z.enum(["true", "false"]).optional().catch(undefined),
  view: z.enum(["cards", "table"]).default("cards"),
});

const ErrorComponent = ({ message }: { message: string }) => {
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
        </div>
      </div>

      <Alert variant="destructive" className="mb-6">
        <AlertDescription>
          Failed to load diagnostics. Please try again later.
          <br />
          <span className="text-sm">{message}</span>
        </AlertDescription>
      </Alert>
    </div>
  );
};

const Diagnostics = () => {
  const { data, isLoading, error } = useQuery(diagnosticsListOptions());
  const navigate = useNavigate({ from: Route.fullPath });
  const searchParams = Route.useSearch();
  const [filteredDiagnostics, setFilteredDiagnostics] = useState<
    DiagnosticSummary[]
  >([]);

  // Update filtered diagnostics when data arrives
  useEffect(() => {
    if (data?.data) {
      setFilteredDiagnostics(data.data);
    }
  }, [data]);

  const handleViewChange = (newView: "cards" | "table") => {
    navigate({
      search: (prev) => ({ ...prev, view: newView }),
      replace: true,
    });
  };

  // Update URL when filters change
  const handleFilterChange = (
    search: string,
    providers: string[],
    aftIds: string[],
    themes: string[],
    metricValues: boolean | null,
  ) => {
    navigate({
      search: {
        view: searchParams.view,
        search: search || undefined,
        providers: providers.length > 0 ? providers.join(",") : undefined,
        aftIds: aftIds.length > 0 ? aftIds.join(",") : undefined,
        themes: themes.length > 0 ? themes.join(",") : undefined,
        metricValues:
          metricValues === null ? undefined : metricValues ? "true" : "false",
      },
      replace: true,
    });
  };

  // Show error state if query fails
  if (error) {
    return (
      <ErrorComponent
        message={error instanceof Error ? error.message : String(error)}
      />
    );
  }

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
          <ViewToggle
            view={searchParams.view}
            onViewChange={handleViewChange}
          />
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
                <strong>PMP (PCMDI Metrics Package)</strong>
              </li>
              <li>
                <strong>ESMValTool</strong>
              </li>
              <li>
                <strong>ILAMB/IOMB</strong>
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
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span className="text-muted-foreground">
              Loading diagnostics...
            </span>
          </div>
        ) : (
          <DiagnosticsFilter
            diagnostics={data?.data || []}
            onFilterChange={setFilteredDiagnostics}
            onFilterParamsChange={handleFilterChange}
            initialSearch={searchParams.search}
            initialProviders={searchParams.providers?.split(",") ?? []}
            initialAftIds={searchParams.aftIds?.split(",") ?? []}
            initialThemes={searchParams.themes?.split(",") ?? []}
            initialMetricValues={
              searchParams.metricValues === "true"
                ? true
                : searchParams.metricValues === "false"
                  ? false
                  : null
            }
          />
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, index) => (
            <Card
              key={`diagnostic-skeleton-${Date.now()}-${index}`}
              className="animate-pulse"
            >
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded mb-2" />
                <div className="h-3 bg-muted rounded mb-1 w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {searchParams.view === "cards" ? (
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
        </>
      )}
    </div>
  );
};

export const Route = createFileRoute("/_app/diagnostics/")({
  component: Diagnostics,
  staticData: {
    title: "Diagnostics",
  },
  validateSearch: diagnosticsSearchSchema,
});
