import { useSuspenseQuery } from "@tanstack/react-query";
import { diagnosticsListMetricValuesOptions } from "@/client/@tanstack/react-query.gen";
import type { MetricValue } from "@/client/types.gen.ts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { EmptyEnsembleChart, EnsembleChart } from "./ensembleChart.tsx";

interface EnsembleChartCardProps {
  providerSlug: string;
  diagnosticSlug: string;
  metricName: string;
  metricUnits: string;
  title: string;
  description?: string;
  xAxis?: string;
  otherFilters?: Record<string, string>;
  clipMin?: number;
  clipMax?: number;
}

export const EnsembleChartCardSkeleton = () => {
  return (
    <Card>
      <CardHeader>
        <div className="h-6 w-3/4 bg-gray-200 dark:bg-muted animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="h-64 bg-gray-200 dark:bg-muted animate-pulse" />
      </CardContent>
    </Card>
  );
};

export function EnsembleChartCard(props: EnsembleChartCardProps) {
  const {
    providerSlug,
    diagnosticSlug,
    metricName,
    metricUnits,
    title,
    description,
    xAxis,
    otherFilters,
    clipMin,
    clipMax,
  } = props;

  const { data } = useSuspenseQuery(
    diagnosticsListMetricValuesOptions({
      path: { provider_slug: providerSlug, diagnostic_slug: diagnosticSlug },
      query: { ...otherFilters },
    })
  );

  // @ts-expect-error TODO: Fix the type error
  const values = (data?.data as MetricValue[]) ?? [];

  if (values.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className="h-full">
          <EmptyEnsembleChart />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="overflow-visible">
        <EnsembleChart
          data={values}
          metricName={metricName}
          metricUnits={metricUnits}
          xAxis={xAxis}
          clipMin={clipMin}
          clipMax={clipMax}
        />
      </CardContent>
    </Card>
  );
}
