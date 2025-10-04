import { useCallback, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import type { SeriesValue } from "../types";
import { SeriesLegend } from "./seriesLegend";
import { SeriesTooltip } from "./seriesToolip";
import { createChartData, createScaledTickFormatter } from "./utils";

interface SimpleSeriesVisualizationProps {
  seriesValues: SeriesValue[];
  referenceSeriesValues?: SeriesValue[];
  labelTemplate?: string; // e.g., "{variable_id} - {source_id}"
  maxSeriesLimit?: number;
  symmetricalAxes?: boolean;
}

export function SeriesVisualization({
  seriesValues,
  referenceSeriesValues = [],
  labelTemplate,
  maxSeriesLimit = 500,
  symmetricalAxes = false,
}: SimpleSeriesVisualizationProps) {
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);

  // Create chart data and metadata
  const { chartData, seriesMetadata, indexName } = useMemo(
    () => createChartData(seriesValues, referenceSeriesValues, labelTemplate),
    [seriesValues, referenceSeriesValues, labelTemplate],
  );

  // State for hidden labels - initialize with all non-reference series hidden
  const [hiddenLabels, setHiddenLabels] = useState<Set<string>>(() => {
    const hidden = new Set<string>();
    seriesMetadata.forEach((meta) => {
      if (!meta.isReference) {
        hidden.add(meta.label);
      }
    });
    return hidden;
  });

  // Get unique labels with their colors and counts, sorted alphabetically with Reference at top
  const uniqueLabels = useMemo(() => {
    const labelMap = new Map<
      string,
      { color: string; count: number; isReference: boolean }
    >();
    seriesMetadata.forEach((meta) => {
      const existing = labelMap.get(meta.label);
      if (existing) {
        existing.count += 1;
      } else {
        labelMap.set(meta.label, {
          color: meta.color,
          count: 1,
          isReference: meta.isReference,
        });
      }
    });
    return Array.from(labelMap.entries())
      .map(([label, { color, count, isReference }]) => ({
        label,
        color,
        count,
        isReference,
      }))
      .sort((a, b) => {
        // Reference series always at the top
        if (a.isReference && !b.isReference) return -1;
        if (!a.isReference && b.isReference) return 1;
        // Otherwise alphabetical
        return a.label.localeCompare(b.label);
      });
  }, [seriesMetadata]);

  // Toggle label visibility
  const toggleLabel = useCallback((label: string) => {
    setHiddenLabels((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(label)) {
        newSet.delete(label);
      } else {
        newSet.add(label);
      }
      return newSet;
    });
  }, []);

  // Handle label hover
  const handleLabelHover = useCallback((label: string | null) => {
    setHoveredLabel(label);
  }, []);

  // Calculate Y domain from all data values for intelligent tick formatting
  const yDomain = useMemo(() => {
    const allValues = chartData.flatMap((d) =>
      Object.values(d).filter((v) => typeof v === "number"),
    ) as number[];

    if (allValues.length === 0) return [0, 1];

    if (symmetricalAxes) {
      const maxAbs = Math.max(...allValues.map(Math.abs));
      return [-maxAbs, maxAbs];
    }

    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    return [min, max];
  }, [chartData, symmetricalAxes]);

  // Create intelligent tick formatter based on data range
  const tickFormatter = useMemo(
    () => createScaledTickFormatter(yDomain),
    [yDomain],
  );

  // Performance safeguard
  const totalSeries = seriesValues.length + referenceSeriesValues.length;
  if (totalSeries > maxSeriesLimit) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="space-y-4">
            <div className="text-lg font-medium text-amber-600">
              Too Many Series to Display
            </div>
            <div className="text-sm text-gray-600">
              Found {totalSeries} series values, but only up to {maxSeriesLimit}{" "}
              can be displayed for performance reasons.
            </div>
            <div className="text-sm text-gray-500">
              Please use the filtering options above to reduce the number of
              series, or download the data as CSV for analysis.
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (totalSeries === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        No series data available
      </div>
    );
  }

  return (
    <div className="flex gap-4">
      {/* Chart */}
      <div className="flex-1">
        <ResponsiveContainer width="100%" height={700}>
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey={indexName}
              label={{
                value: indexName,
                position: "insideBottom",
                offset: -5,
              }}
              type="number"
              scale="linear"
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              domain={
                symmetricalAxes
                  ? (data) => {
                      const values = data.flatMap((d) =>
                        Object.values(d).filter((v) => typeof v === "number"),
                      ) as number[];
                      if (values.length === 0) return [0, 1];
                      const maxAbs = Math.max(...values.map(Math.abs));
                      return [-maxAbs, maxAbs];
                    }
                  : ["dataMin - 0.1", "dataMax + 0.1"]
              }
              label={{
                value: "Value",
                angle: -90,
                position: "insideLeft",
              }}
              tickFormatter={tickFormatter}
            />
            <Tooltip
              content={
                <SeriesTooltip
                  hiddenLabels={hiddenLabels}
                  hoveredLabel={hoveredLabel}
                  seriesMetadata={seriesMetadata}
                />
              }
              cursor={{ stroke: "#94A3B8", strokeDasharray: "4 4" }}
            />
            {/* Render all series with proper visual hierarchy */}
            {seriesMetadata
              .sort((a, b) => {
                // Visual hierarchy: hidden lines (bottom), visible regular lines (middle), reference lines (top)
                const aHidden = hiddenLabels.has(a.label);
                const bHidden = hiddenLabels.has(b.label);

                // Reference series always on top
                if (a.isReference && !b.isReference) return 1;
                if (!a.isReference && b.isReference) return -1;

                // Hidden series go to bottom
                if (aHidden && !bHidden) return -1;
                if (!aHidden && bHidden) return 1;

                return 0;
              })
              .map((meta) => {
                const isLabelHidden = hiddenLabels.has(meta.label);
                const isOtherLabelHovered =
                  hoveredLabel !== null && hoveredLabel !== meta.label;

                // Determine opacity: 0.4 for hidden, 1.0 for visible (or 0.3 when other label hovered)
                let opacity = 1;
                if (isLabelHidden) {
                  opacity = 0.4;
                } else if (isOtherLabelHovered) {
                  opacity = 0.3;
                }

                // Determine stroke color and width
                const strokeColor = isLabelHidden
                  ? "#9CA3AF"
                  : meta.isReference
                    ? "#000000"
                    : meta.color;
                const strokeWidth = isLabelHidden
                  ? 1
                  : meta.isReference
                    ? 4
                    : 2;

                return (
                  <Line
                    key={meta.seriesIndex}
                    type="monotone"
                    dataKey={`series_${meta.seriesIndex}`}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeOpacity={opacity}
                    dot={false}
                    activeDot={{ r: 4 }}
                    name={meta.label}
                    onClick={() => toggleLabel(meta.label)}
                    onMouseEnter={() => handleLabelHover(meta.label)}
                    onMouseLeave={() => handleLabelHover(null)}
                    style={{ cursor: "pointer" }}
                    isAnimationActive={false}
                  />
                );
              })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend Sidebar */}
      <SeriesLegend
        uniqueLabels={uniqueLabels}
        hiddenLabels={hiddenLabels}
        hoveredLabel={hoveredLabel}
        onToggleLabel={toggleLabel}
        onHoverLabel={handleLabelHover}
      />
    </div>
  );
}
