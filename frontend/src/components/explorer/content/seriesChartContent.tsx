import { useMemo } from "react";
import { MipEraSections } from "@/components/charts/mipEraSections";
import { SeriesVisualization } from "@/components/execution/values/series";
import type { SeriesValue } from "@/components/execution/values/types";
import { isSeriesValue } from "@/components/execution/values/types";
import { ExplorerCardDropdown } from "../explorerCardDropdown";
import { ExplorerCardFrame } from "../explorerCardFrame";
import type { SeriesChartContent as SeriesChartContentType } from "../types";
import { ChartEmptyState } from "./chartEmptyState";
import { useExplorerMetricValues } from "./useExplorerMetricValues";

interface SeriesChartContentProps {
  contentItem: SeriesChartContentType;
}

export function SeriesChartContent({ contentItem }: SeriesChartContentProps) {
  const { filterBar, collection, query } = useExplorerMetricValues(
    contentItem,
    "series",
  );

  // Missing or "model" kind is a model series, only "reference" is a reference series.
  // Memoised because the charts below key their own memos on these array identities.
  const { allSeriesValues, regularSeries, referenceSeries } = useMemo(() => {
    const all = (collection?.data ?? []).filter(isSeriesValue) as SeriesValue[];
    return {
      allSeriesValues: all,
      regularSeries: all.filter((series) => series.kind !== "reference"),
      referenceSeries: all.filter((series) => series.kind === "reference"),
    };
  }, [collection?.data]);
  const menu = <ExplorerCardDropdown contentItem={contentItem} query={query} />;

  if (allSeriesValues.length === 0) {
    return (
      <ExplorerCardFrame contentItem={contentItem} menu={menu}>
        <div className="space-y-3">
          {filterBar}
          <ChartEmptyState title="No series data available">
            This diagnostic may not have series data or filters may be too
            restrictive
          </ChartEmptyState>
        </div>
      </ExplorerCardFrame>
    );
  }

  const renderSeries = (seriesValues: SeriesValue[]) => (
    <SeriesVisualization
      seriesValues={seriesValues}
      referenceSeriesValues={referenceSeries}
      maxSeriesLimit={500} // Limit for performance in preview
      symmetricalAxes={contentItem.symmetricalAxes ?? false}
      labelTemplate={contentItem.labelTemplate}
      colorDimension={contentItem.groupingConfig?.hue}
      metricName={contentItem.title}
      units={contentItem.metricUnits}
    />
  );

  return (
    <ExplorerCardFrame contentItem={contentItem} menu={menu}>
      <div className="space-y-3">
        {filterBar}
        {regularSeries.length === 0 ? (
          // Nothing to split on, so show the references rather than an empty panel.
          renderSeries(regularSeries)
        ) : (
          <MipEraSections values={regularSeries}>{renderSeries}</MipEraSections>
        )}
      </div>
    </ExplorerCardFrame>
  );
}
