import { useSuspenseQuery } from "@tanstack/react-query";
import { ErrorComponent, useNavigate } from "@tanstack/react-router";
import { MoreHorizontal } from "lucide-react";
import * as React from "react";
import { Suspense } from "react";
import { diagnosticsComparison } from "@/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { isScalarValue } from "../execution/values/types.ts";

const EnsembleChart = React.lazy(() =>
  import("./ensembleChart.tsx").then((module) => ({
    default: module.EnsembleChart,
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
  clipMin,
  clipMax,
}: {
  providerSlug: string;
  diagnosticSlug: string;
  className?: string;
  title: string;
  metricName: string;
  metricUnits: string;
  sourceFilters: Record<string, string>;
  otherFilters?: Record<string, string>;
  clipMin?: number;
  clipMax?: number;
}) => {
  const navigate = useNavigate();
  const [symmetricalAxes, setSymmetricalAxes] = React.useState(false);
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

  const navigateToFiltered = () => {
    const allFilters = { ...sourceFilters, ...otherFilters };
    navigate({
      to: "/diagnostics/$providerSlug/$diagnosticSlug/values",
      params: { providerSlug, diagnosticSlug },
      search: allFilters,
    });
  };

  const navigateToUnfiltered = () => {
    navigate({
      to: "/diagnostics/$providerSlug/$diagnosticSlug/values",
      params: { providerSlug, diagnosticSlug },
      search: otherFilters,
    });
  };

  const ensembleData = data.ensemble.data.filter((d) => isScalarValue(d));

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="flex flex-row items-start justify-between">
        <CardTitle>{title}</CardTitle>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={navigateToFiltered}>
              View data for {Object.values(sourceFilters)[0]}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={navigateToUnfiltered}>
              View all data for diagnostic
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2 mb-4">
          <Checkbox
            id="symmetrical-axes"
            checked={symmetricalAxes}
            onCheckedChange={(checked) => setSymmetricalAxes(checked === true)}
          />
          <label htmlFor="symmetrical-axes" className="text-sm">
            Symmetrical Axes
          </label>
        </div>
        {data ? (
          <Suspense fallback={<ComparisonChartCardSkeleton />}>
            <EnsembleChart
              data={ensembleData}
              // TODO: Add source
              metricName={metricName}
              metricUnits={metricUnits}
              clipMin={clipMin}
              clipMax={clipMax}
              symmetricalAxes={symmetricalAxes}
            />
          </Suspense>
        ) : (
          <div className="h-48">
            <span className="mx-auto">No comparison data available.</span>
          </div>
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
