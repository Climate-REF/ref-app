import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { diagnosticsListMetricValuesOptions } from "@/client/@tanstack/react-query.gen";
import type { MetricValueCollection } from "@/client/types.gen";
import {
  EmptyEnsembleChart,
  EnsembleChart,
} from "@/components/diagnostics/ensembleChart";
import type { MetricValue } from "@/components/execution/values/types";
import { Button } from "@/components/ui/button";

import type { ExplorerCardContent } from "../types";

interface EnsembleChartContentProps {
  contentItem: Extract<ExplorerCardContent, { type: "box-whisker-chart" }>;
}

export function EnsembleChartContent({
  contentItem,
}: EnsembleChartContentProps) {
  const [includeUnverified, setIncludeUnverified] = useState(false);

  const { data } = useSuspenseQuery(
    diagnosticsListMetricValuesOptions({
      path: {
        provider_slug: contentItem.provider,
        diagnostic_slug: contentItem.diagnostic,
      },
      query: {
        ...contentItem.otherFilters,
        type: "scalar",
        detect_outliers: "iqr",
        include_unverified: includeUnverified,
      },
    }),
  );

  const collection = data as MetricValueCollection;
  const values = (collection?.data as MetricValue[]) ?? [];

  if (values.length === 0) {
    return <EmptyEnsembleChart />;
  }

  const hasOutliers = collection?.had_outliers ?? false;
  const outlierCount = collection?.outlier_count ?? 0;

  return (
    <div className="space-y-4">
      {/* Outlier indicator and controls */}
      {(hasOutliers || includeUnverified) && (
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md border">
          <div className="text-sm">
            {hasOutliers && !includeUnverified && (
              <span className="text-amber-600 dark:text-amber-400">
                Outliers detected ({outlierCount} filtered values)
              </span>
            )}
            {hasOutliers && includeUnverified && (
              <span className="text-blue-600 dark:text-blue-400">
                Showing unverified values ({outlierCount} outliers)
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIncludeUnverified(!includeUnverified)}
            >
              {includeUnverified ? "Hide unverified" : "Show unverified"}
            </Button>
          </div>
        </div>
      )}

      <EnsembleChart
        data={values}
        metricName={contentItem.title}
        metricUnits={contentItem.metricUnits ?? "unitless"}
        clipMin={contentItem.clipMin}
        clipMax={contentItem.clipMax}
        groupingConfig={contentItem.groupingConfig}
        showZeroLine={contentItem.showZeroLine ?? true}
        symmetricalAxes={contentItem.symmetricalAxes ?? false}
      />
    </div>
  );
}
