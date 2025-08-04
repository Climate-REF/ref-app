import { useSuspenseQuery } from "@tanstack/react-query";
import { ErrorComponent } from "@tanstack/react-router";
import * as React from "react";
import { Suspense } from "react";
import { diagnosticsComparison } from "@/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const ComparisonChart = React.lazy(() =>
  import("./comparisonChart.tsx").then((module) => ({
    default: module.ComparisonChart,
  })),
);

export const ComparisonChartCard = ({
  providerSlug,
  diagnosticSlug,
  className,
  title,
  metricName,
  metricUnits,
  sourceFilters,
  otherFilters,
}: {
  providerSlug: string;
  diagnosticSlug: string;
  className?: string;
  title: string;
  metricName: string;
  metricUnits: string;
  sourceFilters: Record<string, string>;
  otherFilters?: Record<string, string>;
}) => {
  const {
    data: { data },
    error,
  } = useSuspenseQuery({
    queryKey: [
      "comparison",
      providerSlug,
      diagnosticSlug,
      sourceFilters,
      otherFilters,
    ],
    queryFn: () =>
      diagnosticsComparison({
        path: {
          provider_slug: providerSlug,
          diagnostic_slug: diagnosticSlug,
        },
        query: {
          source_filters: JSON.stringify(sourceFilters),
          ...otherFilters,
        },
      }),
  });

  if (error) {
    return <ErrorComponent error={error} />;
  }
  if (!data) {
    return <div>No data</div>;
  }
  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data ? (
          <Suspense fallback={<ComparisonChartCardSkeleton />}>
            <ComparisonChart
              data={data}
              metricName={metricName}
              metricUnits={metricUnits}
            />
          </Suspense>
        ) : (
          <div className="h-48">
            <span className="mx-auto">No comparison data available.</span></div>
        )}
      </CardContent>
    </Card>
  );
};

export const ComparisonChartCardSkeleton = ({
  className,
}: {
  className?: string;
}) => {
  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle>Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-48 w-full" />
      </CardContent>
    </Card>
  );
};
