import { Suspense } from "react";
import {
  EnsembleChartCard,
  EnsembleChartCardSkeleton,
} from "@/components/diagnostics/ensembleChartCard.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";

// Re-using the types from sourceExplorerContent.tsx for consistency
export type ExplorerChart = {
  provider: string;
  diagnostic: string;
  title: string;
  metricUnits?: string;
  otherFilters?: Record<string, string>;
  xAxis?: string;
  clipMin?: number;
  clipMax?: number;
};

export type ExplorerCard = {
  title: string;
  description?: string;
  charts: ExplorerChart[];
};

interface ExplorerThemeLayoutProps {
  cards: ExplorerCard[];
}

export const ExplorerThemeLayout = ({ cards }: ExplorerThemeLayoutProps) => {
  return (
    <div className="flex flex-col gap-4">
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
                  fallback={<EnsembleChartCardSkeleton />}
                >
                  <EnsembleChartCard
                    providerSlug={chart.provider}
                    diagnosticSlug={chart.diagnostic}
                    metricName={chart.title}
                    metricUnits={chart.metricUnits ?? "unitless"}
                    title={chart.title}
                    xAxis={chart.xAxis}
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