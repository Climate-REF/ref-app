import { useSuspenseQuery } from "@tanstack/react-query";
import { diagnosticsListMetricValuesOptions } from "@/client/@tanstack/react-query.gen";
import {
  EmptyEnsembleChart,
  EnsembleChart,
} from "@/components/diagnostics/ensembleChart";
import type { MetricValue } from "@/components/execution/values/types";
import type { ExplorerCardContent } from "../types";

interface EnsembleChartContentProps {
  contentItem: Extract<ExplorerCardContent, { type: "ensemble-chart" }>;
}

export function EnsembleChartContent({
  contentItem,
}: EnsembleChartContentProps) {
  const { data } = useSuspenseQuery(
    diagnosticsListMetricValuesOptions({
      path: {
        provider_slug: contentItem.provider,
        diagnostic_slug: contentItem.diagnostic,
      },
      query: { ...contentItem.otherFilters, type: "scalar" },
    }),
  );

  // @ts-ignore TODO: Fix the diagnosticsListMetricValuesOptions type
  const values = (data?.data as MetricValue[]) ?? [];

  if (values.length === 0) {
    return <EmptyEnsembleChart />;
  }

  return (
    <EnsembleChart
      data={values}
      metricName={contentItem.title}
      metricUnits={contentItem.metricUnits ?? "unitless"}
      xAxis={contentItem.xAxis}
      clipMin={contentItem.clipMin}
      clipMax={contentItem.clipMax}
    />
  );
}
