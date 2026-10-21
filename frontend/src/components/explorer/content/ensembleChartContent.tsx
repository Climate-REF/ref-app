import { useState } from "react";
import { MipEraSections } from "@/components/charts/mipEraSections";
import {
  EmptyEnsembleChart,
  EnsembleChart,
} from "@/components/diagnostics/ensembleChart";
import type { ScalarValue } from "@/components/execution/values/types";
import { Button } from "@/components/ui/button";

import { ExplorerCardDropdown } from "../explorerCardDropdown";
import { ExplorerCardFrame } from "../explorerCardFrame";
import type { ExplorerCardContent } from "../types";
import { useExplorerMetricValues } from "./useExplorerMetricValues";

interface EnsembleChartContentProps {
  contentItem: Extract<ExplorerCardContent, { type: "box-whisker-chart" }>;
}

export function EnsembleChartContent({
  contentItem,
}: EnsembleChartContentProps) {
  const [includeUnverified, setIncludeUnverified] = useState(false);
  const { filterBar, collection, query } = useExplorerMetricValues(
    contentItem,
    "scalar",
    { detect_outliers: "iqr", include_unverified: includeUnverified },
  );
  const values = (collection?.data as ScalarValue[]) ?? [];
  const menu = <ExplorerCardDropdown contentItem={contentItem} query={query} />;

  if (values.length === 0) {
    return (
      <ExplorerCardFrame contentItem={contentItem} menu={menu}>
        <div className="space-y-4">
          {filterBar}
          <EmptyEnsembleChart />
        </div>
      </ExplorerCardFrame>
    );
  }

  const hasOutliers = collection?.had_outliers ?? false;

  return (
    <ExplorerCardFrame contentItem={contentItem} menu={menu}>
      <div className="space-y-4">
        {filterBar}
        {(hasOutliers || includeUnverified) && (
          <OutlierNotice
            hasOutliers={hasOutliers}
            outlierCount={collection?.outlier_count ?? 0}
            includeUnverified={includeUnverified}
            onToggle={() => setIncludeUnverified(!includeUnverified)}
          />
        )}

        <MipEraSections values={values}>
          {(mipEraValues) => (
            <EnsembleChart
              data={mipEraValues}
              metricName={contentItem.title}
              metricUnits={contentItem.metricUnits ?? "unitless"}
              clipMin={contentItem.clipMin}
              clipMax={contentItem.clipMax}
              yMin={contentItem.yMin}
              yMax={contentItem.yMax}
              groupingConfig={contentItem.groupingConfig}
              showZeroLine={contentItem.showZeroLine ?? true}
              symmetricalAxes={contentItem.symmetricalAxes ?? false}
            />
          )}
        </MipEraSections>
      </div>
    </ExplorerCardFrame>
  );
}

interface OutlierNoticeProps {
  hasOutliers: boolean;
  outlierCount: number;
  includeUnverified: boolean;
  onToggle: () => void;
}

/** How many outliers were found, with a button to show or hide the unverified values. */
function OutlierNotice({
  hasOutliers,
  outlierCount,
  includeUnverified,
  onToggle,
}: OutlierNoticeProps) {
  return (
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
        <Button variant="outline" size="sm" onClick={onToggle}>
          {includeUnverified ? "Hide unverified" : "Show unverified"}
        </Button>
      </div>
    </div>
  );
}
