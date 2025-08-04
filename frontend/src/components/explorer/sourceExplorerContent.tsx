import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { executionsListRecentExecutionGroupsOptions } from "@/client/@tanstack/react-query.gen.ts";
import {
  ComparisonChartCard,
  ComparisonChartCardSkeleton,
} from "@/components/diagnostics/comparisonChartCard.tsx";
import ExecutionGroupTable from "@/components/execution/executionGroupTable";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";

type ExplorerChart = {
  provider: string;
  diagnostic: string;
  title: string;
  metricUnits?: string;
  /**
   * Additional query params merged into diagnosticsComparison request.
   * Examples: { project: "CMIP6", experiment_id: "historical", variable: "tas" }
   */
  otherFilters?: Record<string, string>;
  /**
   * Optional per-chart source filter override (defaults to { source_id } of the component)
   */
  sourceFiltersOverride?: Record<string, string>;
  clipMin?: number;
  clipMax?: number;
};

type ExplorerCard = {
  title: string;
  description?: string;
  charts: ExplorerChart[];
};

const cards: ExplorerCard[] = [
  {
    title: "Climate Sensitivity",
    description:
      "Ensemble distributions for ECS and TCR for quick side-by-side inspection.",
    charts: [
      {
        provider: "esmvaltool",
        diagnostic: "equilibrium-climate-sensitivity",
        title: "ECS (K)",
        metricUnits: "K",
        clipMin: -3,
        clipMax: 10,
        otherFilters: { metric: "ecs" },
      },
      {
        provider: "esmvaltool",
        diagnostic: "transient-climate-response",
        title: "TCR (K)",
        metricUnits: "K",
      },
    ],
  },

  {
    title: "Modes of Variability",
    description:
      "Ensemble distributions for ECS and TCR for quick side-by-side inspection.",
    charts: [
      {
        provider: "pmp",
        diagnostic: "extratropical-modes-of-variability-nam",
        title: "NAM Bias (K)",
        // metricUnits: "K",
        otherFilters: { method: "cbf", statistic: "bias" },
      },

      {
        provider: "pmp",
        diagnostic: "extratropical-modes-of-variability-sam",
        title: "SAM  Bias (K)",
        // metricUnits: "K",
        otherFilters: { method: "cbf", statistic: "bias" },
      },
    ],
  },
];

const SourceExecutionsCard = ({ sourceId }: { sourceId: string }) => {
  const { data } = useSuspenseQuery(
    executionsListRecentExecutionGroupsOptions({
      query: {
        source_id: sourceId,
        limit: 1000,
      },
    }),
  );

  const sourceGroups = data?.data ?? [];

  const executionCount = sourceGroups.length;
  // Failing metrics = groups where latest_execution.successful === false
  const failingCount = sourceGroups.reduce((acc, g) => {
    const ok = g.latest_execution?.successful;
    return acc + (ok === false ? 1 : 0);
  }, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Executions including "{sourceId}"</CardTitle>
        <CardDescription>
          Recent execution groups whose selectors include this source.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-rows gap-4">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="flex flex-col rounded-md border p-4">
              <span className="text-xs text-muted-foreground">Executions</span>
              <span className="text-2xl font-semibold">{executionCount}</span>
            </div>
            <div className="flex flex-col rounded-md border p-4">
              <span className="text-xs text-muted-foreground">Failing</span>
              <span className="text-2xl font-semibold">{failingCount}</span>
            </div>
            <div className="flex flex-col rounded-md border p-4">
              <span className="text-xs text-muted-foreground">Passing</span>
              <span className="text-2xl font-semibold">
                {Math.max(executionCount - failingCount, 0)}
              </span>
            </div>
            <div className="flex flex-col rounded-md border p-4">
              <span className="text-xs text-muted-foreground">
                Failure Rate
              </span>
              <span className="text-2xl font-semibold">
                {executionCount > 0
                  ? Math.round((failingCount / executionCount) * 100)
                  : 0}
                %
              </span>
            </div>
          </div>
          <ExecutionGroupTable executionGroups={sourceGroups} />
        </div>
      </CardContent>
    </Card>
  );
};

export const SourceExplorerContent = ({ sourceId }: { sourceId: string }) => {
  // Compute simple source metrics using execution groups API with source filter

  return (
    <div className="grid grid-cols-1 gap-4">
      <Suspense fallback={<ComparisonChartCardSkeleton />}>
        <SourceExecutionsCard sourceId={sourceId} />
      </Suspense>

      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader>
            <CardTitle>{card.title}</CardTitle>
            {card.description ? (
              <CardDescription>{card.description}</CardDescription>
            ) : null}
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {card.charts.map((chart) => (
                <Suspense
                  key={`${card.title}:${chart.diagnostic}`}
                  fallback={<ComparisonChartCardSkeleton />}
                >
                  <ComparisonChartCard
                    providerSlug={chart.provider}
                    diagnosticSlug={chart.diagnostic}
                    metricName={chart.title}
                    metricUnits={chart.metricUnits ?? "unitless"}
                    title={chart.title}
                    sourceFilters={
                      chart.sourceFiltersOverride ?? { source_id: sourceId }
                    }
                    otherFilters={chart.otherFilters}
                    clipMin={chart.clipMin}
                    clipMax={chart.clipMax}
                  />
                </Suspense>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
