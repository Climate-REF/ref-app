/**
 * @deprecated This component has been replaced by the unified EnsembleChart.
 * This file now re-exports EnsembleChart for backward compatibility.
 * Please use EnsembleChart directly from @/components/diagnostics/ensembleChart
 */

import {
  EmptyEnsembleChart,
  EnsembleChart,
} from "@/components/diagnostics/ensembleChart";
import type { MetricValue } from "@/components/execution/values/types";
import type { ChartGroupingConfig } from "@/components/explorer/grouping";

// Legacy interface for backward compatibility
interface GroupedRawDataEntry {
  name: string;
  groups: Array<{
    label: string;
    values: number[];
  }>;
}

interface CustomGroupedBoxPlotChartProps {
  data: GroupedRawDataEntry[];
  width?: number | string;
  height?: number | string;
  className?: string;
  groupColors?: { [groupName: string]: string };
}

/**
 * @deprecated Use EnsembleChart directly instead
 * Legacy wrapper component that converts old data format to new EnsembleChart format
 */
export const GroupedBoxWhiskerChart = ({
  data,
  width = "100%",
  height = 400,
  className,
}: CustomGroupedBoxPlotChartProps) => {
  // Convert legacy data format to MetricValue format expected by EnsembleChart
  const convertedData: MetricValue[] = [];

  data.forEach((entry, entryIndex) => {
    entry.groups.forEach((group, groupIndex) => {
      group.values.forEach((value, valueIndex) => {
        convertedData.push({
          value: value,
          dimensions: {
            category: entry.name,
            group: group.label,
          },
          execution_group_id: entryIndex * 1000 + groupIndex,
          execution_id: entryIndex * 1000000 + groupIndex * 1000 + valueIndex,
        });
      });
    });
  });

  if (convertedData.length === 0) {
    return <EmptyEnsembleChart />;
  }

  // Use category as groupBy dimension to match legacy behavior
  const groupingConfig: ChartGroupingConfig = {
    groupBy: "category",
    hue: "group",
    style: "none",
  };

  return (
    <div style={{ width, height }} className={className}>
      <EnsembleChart
        data={convertedData}
        metricName="Values"
        metricUnits="unitless"
        groupingConfig={groupingConfig}
      />
    </div>
  );
};

// Re-export the new components for direct use
export { EnsembleChart, EmptyEnsembleChart };
