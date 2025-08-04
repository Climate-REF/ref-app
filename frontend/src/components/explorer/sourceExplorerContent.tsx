import { Suspense } from "react";
import {
  ComparisonChartCard,
  ComparisonChartCardSkeleton,
} from "@/components/diagnostics/comparisonChartCard.tsx";
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

export const SourceExplorerContent = ({ sourceId }: { sourceId: string }) => {
  return (
    <div className="grid grid-cols-1 gap-4">
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
