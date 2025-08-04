import { Suspense } from "react";
import {
  DiagnosticFigureGalleryCard,
  DiagnosticFigureGalleryCardSkeleton,
} from "@/components/diagnostics/diagnosticFigureGalleryCard.tsx";
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

export type ExplorerCardContent =
  | {
      type: "ensemble-chart";
      provider: string;
      diagnostic: string;
      title: string;
      metricUnits?: string;
      otherFilters?: Record<string, string>;
      xAxis?: string;
      clipMin?: number;
      clipMax?: number;
      span?: 1 | 2;
    }
  | {
      type: "figure-gallery";
      provider: string;
      diagnostic: string;
      title: string;
      description?: string;
      span?: 1 | 2;
    };

export type ExplorerCard = {
  title: string;
  description?: string;
  content: ExplorerCardContent[];
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
              {card.content.map((contentItem) => {
                const spanClass =
                  contentItem.span === 2 ? "lg:col-span-2" : "lg:col-span-1";
                if (contentItem.type === "ensemble-chart") {
                  return (
                    <div
                      key={`${card.title}:${contentItem.diagnostic}`}
                      className={spanClass}
                    >
                      <Suspense fallback={<EnsembleChartCardSkeleton />}>
                        <EnsembleChartCard
                          providerSlug={contentItem.provider}
                          diagnosticSlug={contentItem.diagnostic}
                          metricName={contentItem.title}
                          metricUnits={contentItem.metricUnits ?? "unitless"}
                          title={contentItem.title}
                          xAxis={contentItem.xAxis}
                          otherFilters={contentItem.otherFilters}
                          clipMin={contentItem.clipMin}
                          clipMax={contentItem.clipMax}
                        />
                      </Suspense>
                    </div>
                  );
                }
                if (contentItem.type === "figure-gallery") {
                  return (
                    <div
                      key={`${card.title}:${contentItem.diagnostic}`}
                      className={spanClass}
                    >
                      <Suspense
                        fallback={<DiagnosticFigureGalleryCardSkeleton />}
                      >
                        <DiagnosticFigureGalleryCard
                          providerSlug={contentItem.provider}
                          diagnosticSlug={contentItem.diagnostic}
                          title={contentItem.title}
                          description={contentItem.description}
                        />
                      </Suspense>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
