import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Brush,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CustomSeriesToolTip } from "../customSeriesToolTip";
import type { SeriesValue } from "../types";
import { SeriesLegendSidebar } from "./seriesLegendSidebar";
import { getDimensionHashIndex } from "./utils";

interface SeriesVisualizationProps {
  seriesValues: SeriesValue[];
  maxSeriesLimit?: number;
  maxLegendItems?: number;
  enableZoom?: boolean;
  maxVisibleGroups?: number;
  // URL synchronization props
  initialGroupBy?: string;
  initialHue?: string;
  initialStyle?: string;
  onParamsChange?: (params: {
    groupBy?: string;
    hue?: string;
    style?: string;
  }) => void;
  // Hide the groupBy/hue/style controls for explorer cards
  hideControls?: boolean;
}

interface GroupedSeries {
  indexType: string;
  indexName: string;
  series: SeriesValue[];
}

interface ChartData {
  [key: string]: number | string;
}

// Color palette for different series
const COLORS = [
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#ff7300",
  "#00ff00",
  "#0088fe",
  "#00c49f",
  "#ffbb28",
  "#ff8042",
  "#8dd1e1",
];

// Line styles for differentiation
const LINE_STYLES = [
  { strokeDasharray: "none" },
  { strokeDasharray: "5 5" },
  { strokeDasharray: "10 5" },
  { strokeDasharray: "15 5 5 5" },
  { strokeDasharray: "20 5" },
];

export function SeriesVisualization({
  seriesValues,
  maxSeriesLimit = 500,
  maxLegendItems = 20,
  enableZoom = false,
  maxVisibleGroups = 10,
  initialGroupBy,
  initialHue,
  initialStyle,
  onParamsChange,
  hideControls = false,
}: SeriesVisualizationProps) {
  // Get all available dimensions for grouping
  const availableDimensions = useMemo(() => {
    const dimensions = new Set<string>();
    seriesValues.forEach((series) => {
      Object.keys(series.dimensions).forEach((dim) => dimensions.add(dim));
    });
    return Array.from(dimensions).sort();
  }, [seriesValues]);

  // State for user controls - initialize from URL params if provided
  const [groupByDimension, setGroupByDimension] = useState<string>(() => {
    if (initialGroupBy && availableDimensions.includes(initialGroupBy)) {
      return initialGroupBy;
    }
    return availableDimensions.includes("source_id")
      ? "source_id"
      : availableDimensions[0] || "none";
  });

  const [hueDimension, setHueDimension] = useState<string>(() => {
    if (
      initialHue &&
      (initialHue === "none" || availableDimensions.includes(initialHue))
    ) {
      return initialHue;
    }
    return availableDimensions.includes("source_id") ? "source_id" : "none";
  });

  const [styleDimension, setStyleDimension] = useState<string>(() => {
    if (
      initialStyle &&
      (initialStyle === "none" || availableDimensions.includes(initialStyle))
    ) {
      return initialStyle;
    }
    return "none";
  });

  // State for zoom functionality
  const [zoomDomain, setZoomDomain] = useState<{
    [key: string]: [number, number] | null;
  }>({});

  // State for hidden series (for interactive legend)
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());

  // State for hovered series (for line highlighting)
  const [hoveredSeries, setHoveredSeries] = useState<string | null>(null);

  // Group series by index type and name
  const groupedByIndex = useMemo(() => {
    const groups: { [key: string]: GroupedSeries } = {};

    seriesValues.forEach((series) => {
      const indexKey = `${series.index_name || "index"}`;
      if (!groups[indexKey]) {
        groups[indexKey] = {
          indexType: indexKey,
          indexName: series.index_name || "index",
          series: [],
        };
      }
      groups[indexKey].series.push(series);
    });

    return Object.values(groups);
  }, [seriesValues]);

  // Create a unique key for a series based on selected dimensions
  const createSeriesKey = useCallback(
    (
      series: SeriesValue,
      groupBy: string,
      hue: string,
      style: string
    ): string => {
      const parts: string[] = [];

      if (groupBy && groupBy !== "none" && series.dimensions[groupBy]) {
        parts.push(`${groupBy}:${series.dimensions[groupBy]}`);
      }
      if (hue && hue !== "none" && series.dimensions[hue]) {
        parts.push(`${hue}:${series.dimensions[hue]}`);
      }
      if (style && style !== "none" && series.dimensions[style]) {
        parts.push(`${style}:${series.dimensions[style]}`);
      }

      // If no dimensions selected, use a combination of key dimensions
      if (parts.length === 0) {
        const keyDims = [
          "source_id",
          "experiment_id",
          "variable_id",
          "metric",
          "region",
        ];
        keyDims.forEach((dim) => {
          if (series.dimensions[dim]) {
            parts.push(`${series.dimensions[dim]}`);
          }
        });
      }

      return parts.join(" | ") || "Series";
    },
    []
  );

  // Create main label for legend display (based on hue dimension)
  const createMainLabel = useCallback(
    (series: SeriesValue, hue: string): string => {
      if (hue && hue !== "none" && series.dimensions[hue]) {
        return series.dimensions[hue];
      }

      // Fallback to a combination of key dimensions if no hue selected
      const keyDims = ["experiment_id", "variable_id", "metric", "region"];
      const parts: string[] = [];
      keyDims.forEach((dim) => {
        if (series.dimensions[dim]) {
          parts.push(series.dimensions[dim]);
        }
      });

      return parts.join(" | ") || "Series";
    },
    []
  );

  // Create sublabel for legend display (based on style dimension)
  const createSubLabel = useCallback(
    (series: SeriesValue, style: string): string | null => {
      if (style && style !== "none" && series.dimensions[style]) {
        return series.dimensions[style];
      }
      return null;
    },
    []
  );

  // Detect if a series is a reference line based on source_id
  const isReferenceSeries = useCallback((series: SeriesValue): boolean => {
    return series.dimensions.source_id === "Reference";
  }, []);

  // Helper to check if a series key represents a reference series
  const isReferenceSeriesKey = useCallback(
    (seriesKey: string, group: GroupedSeries): boolean => {
      // Find the series that matches this key
      const matchingSeries = group.series.find((series) => {
        const key = createSeriesKey(
          series,
          groupByDimension,
          hueDimension,
          styleDimension
        );
        return key === seriesKey;
      });
      return matchingSeries ? isReferenceSeries(matchingSeries) : false;
    },
    [
      createSeriesKey,
      isReferenceSeries,
      groupByDimension,
      hueDimension,
      styleDimension,
    ]
  );

  // Categorize series for the legend based on the selected groupBy dimension
  const categorizeSeries = useCallback(
    (seriesKey: string, group: GroupedSeries): string => {
      // Find the series that matches this key
      const matchingSeries = group.series.find((series) => {
        const key = createSeriesKey(
          series,
          groupByDimension,
          hueDimension,
          styleDimension
        );
        return key === seriesKey;
      });

      if (matchingSeries) {
        // Use the groupBy dimension for categorization
        if (
          groupByDimension &&
          groupByDimension !== "none" &&
          matchingSeries.dimensions[groupByDimension]
        ) {
          return matchingSeries.dimensions[groupByDimension];
        }
        // Fallback to source_id if no groupBy dimension is selected
        if (matchingSeries.dimensions.source_id) {
          return matchingSeries.dimensions.source_id;
        }
      }

      return "Other";
    },
    [createSeriesKey, groupByDimension, hueDimension, styleDimension]
  );

  // Initialize hidden series state - hide all non-reference series by default
  useEffect(() => {
    const hiddenSet = new Set<string>();

    // For each group, find non-reference series and hide them initially
    groupedByIndex.forEach((group) => {
      group.series.forEach((series) => {
        if (!isReferenceSeries(series)) {
          const seriesKey = createSeriesKey(
            series,
            groupByDimension,
            hueDimension,
            styleDimension
          );
          hiddenSet.add(seriesKey);
        }
      });
    });

    setHiddenSeries(hiddenSet);
  }, [
    groupedByIndex,
    groupByDimension,
    hueDimension,
    styleDimension,
    createSeriesKey,
    isReferenceSeries,
  ]);

  // Toggle series visibility (memoized)
  const toggleSeries = useCallback((seriesKey: string) => {
    setHiddenSeries((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(seriesKey)) {
        newSet.delete(seriesKey);
      } else {
        newSet.add(seriesKey);
      }
      return newSet;
    });
  }, []);

  // Toggle entire group visibility (memoized)
  const toggleGroup = useCallback(
    (category: string, group: GroupedSeries) => {
      setHiddenSeries((prev) => {
        const newSet = new Set(prev);

        // Find all series keys in this category
        const categorySeriesKeys = group.series
          .map((series) =>
            createSeriesKey(
              series,
              groupByDimension,
              hueDimension,
              styleDimension
            )
          )
          .filter((seriesKey) => {
            const matchingSeries = group.series.find((series) => {
              const key = createSeriesKey(
                series,
                groupByDimension,
                hueDimension,
                styleDimension
              );
              return key === seriesKey;
            });
            return (
              matchingSeries && categorizeSeries(seriesKey, group) === category
            );
          });

        // Check if all series in this category are currently hidden
        const allHidden = categorySeriesKeys.every((key) => newSet.has(key));

        if (allHidden) {
          // Show all series in this category
          categorySeriesKeys.forEach((key) => newSet.delete(key));
        } else {
          // Hide all series in this category
          categorySeriesKeys.forEach((key) => newSet.add(key));
        }

        return newSet;
      });
    },
    [
      createSeriesKey,
      groupByDimension,
      hueDimension,
      styleDimension,
      categorizeSeries,
    ]
  );

  // Handle series hover (memoized)
  const handleSeriesHover = useCallback((seriesKey: string | null) => {
    setHoveredSeries(seriesKey);
  }, []);

  // Sync URL parameters when dimensions change
  useEffect(() => {
    if (onParamsChange) {
      const params: { groupBy?: string; hue?: string; style?: string } = {};

      if (groupByDimension !== "none") {
        params.groupBy = groupByDimension;
      }
      if (hueDimension !== "none") {
        params.hue = hueDimension;
      }
      if (styleDimension !== "none") {
        params.style = styleDimension;
      }

      onParamsChange(params);
    }
  }, [groupByDimension, hueDimension, styleDimension, onParamsChange]);

  // Create chart data for each index group
  const createChartData = useCallback(
    (group: GroupedSeries): ChartData[] => {
      if (group.series.length === 0) return [];

      // Find the maximum length of all series to create a unified index
      const maxLength = Math.max(
        ...group.series.map((s) => s.values?.length || 0)
      );
      const chartData: ChartData[] = [];

      for (let i = 0; i < maxLength; i++) {
        const dataPoint: ChartData = {
          [group.indexName]: group.series[0]?.index?.[i] ?? i,
        };

        group.series.forEach((series) => {
          if (series.values && i < series.values.length) {
            // Create a unique key for this series based on dimensions
            const seriesKey = createSeriesKey(
              series,
              groupByDimension,
              hueDimension,
              styleDimension
            );
            dataPoint[seriesKey] = series.values[i];
          }
        });

        chartData.push(dataPoint);
      }

      return chartData;
    },
    [createSeriesKey, groupByDimension, hueDimension, styleDimension]
  );

  // Get unique series keys for a group to create lines
  const getUniqueSeriesKeys = useCallback(
    (group: GroupedSeries): string[] => {
      const keys = new Set<string>();
      group.series.forEach((series) => {
        const key = createSeriesKey(
          series,
          groupByDimension,
          hueDimension,
          styleDimension
        );
        keys.add(key);
      });
      return Array.from(keys);
    },
    [createSeriesKey, groupByDimension, hueDimension, styleDimension]
  );

  // Memoize expensive color calculations
  const getSeriesColor = useCallback(
    (seriesKey: string, index: number): string => {
      return COLORS[
        getDimensionHashIndex(seriesKey, hueDimension, COLORS.length)
      ];
    },
    [hueDimension]
  );

  // Memoize line style calculations
  const getSeriesStyle = useCallback(
    (seriesKey: string) => {
      return LINE_STYLES[
        getDimensionHashIndex(seriesKey, styleDimension, LINE_STYLES.length)
      ];
    },
    [styleDimension]
  );

  // Memoize stroke width calculations
  const getSeriesStrokeWidth = useCallback(
    (seriesKey: string, group: GroupedSeries): number => {
      if (isReferenceSeriesKey(seriesKey, group)) {
        return 10;
      }
      if (hiddenSeries.has(seriesKey)) {
        return 2;
      }
      return 4;
    },
    [isReferenceSeriesKey, hiddenSeries]
  );

  // Smart tick formatting function based on data range
  const createTickFormatter = useCallback(
    (chartData: ChartData[], indexName: string) => {
      if (chartData.length === 0)
        return (value: string | number) => String(value);

      const values = chartData
        .map((d) => d[indexName])
        .filter((v) => typeof v === "number") as number[];

      if (values.length === 0) return (value: string | number) => String(value);

      const min = Math.min(...values);
      const max = Math.max(...values);
      const range = max - min;

      // Determine appropriate formatting based on range and magnitude
      return (value: string | number): string => {
        const numValue = Number(value);

        // Handle very large numbers (scientific notation)
        if (
          Math.abs(numValue) >= 1e6 ||
          (range > 0 && Math.abs(numValue) >= 1e4)
        ) {
          return numValue.toExponential(1);
        }

        // Handle very small numbers (scientific notation)
        if (Math.abs(numValue) < 1e-3 && numValue !== 0) {
          return numValue.toExponential(1);
        }

        // Handle decimal precision based on range
        if (range < 1) {
          return numValue.toFixed(3);
        }
        if (range < 10) {
          return numValue.toFixed(2);
        }
        if (range < 100) {
          return numValue.toFixed(1);
        }
        return numValue.toFixed(0);
      };
    },
    []
  );

  // Calculate appropriate tick count based on chart width and data range
  const getTickCount = useCallback(
    (chartData: ChartData[], indexName: string): number => {
      if (chartData.length === 0) return 5;

      const values = chartData
        .map((d) => d[indexName])
        .filter((v) => typeof v === "number") as number[];

      if (values.length === 0) return 5;

      const range = Math.max(...values) - Math.min(...values);

      // Adjust tick count based on data density and range
      if (range < 10) return 8;
      if (range < 100) return 6;
      if (range < 1000) return 5;
      return 4;
    },
    []
  );

  if (seriesValues.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        No series data available
      </div>
    );
  }

  // Performance safeguard: Don't render if there are too many series
  if (seriesValues.length > maxSeriesLimit) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="space-y-4">
            <div className="text-lg font-medium text-amber-600">
              Too Many Series to Display
            </div>
            <div className="text-sm text-gray-600">
              Found {seriesValues.length} series values, but only up to{" "}
              {maxSeriesLimit} can be displayed for performance reasons.
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

  return (
    <div className="space-y-6">
      {/* Controls - only show if not hidden */}
      {!hideControls && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">
                  Group:
                </span>
                <Select
                  value={groupByDimension}
                  onValueChange={setGroupByDimension}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {availableDimensions.map((dim) => (
                      <SelectItem key={dim} value={dim}>
                        {dim}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">
                  Color:
                </span>
                <Select value={hueDimension} onValueChange={setHueDimension}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {availableDimensions.map((dim) => (
                      <SelectItem key={dim} value={dim}>
                        {dim}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">
                  Style:
                </span>
                <Select
                  value={styleDimension}
                  onValueChange={setStyleDimension}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {availableDimensions.map((dim) => (
                      <SelectItem key={dim} value={dim}>
                        {dim}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Summary of current configuration */}
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground">
                  {groupByDimension !== "none" && (
                    <span>
                      Groups by <strong>{groupByDimension}</strong>
                    </span>
                  )}
                  {hueDimension !== "none" && (
                    <span>
                      {groupByDimension !== "none" ? ", " : ""}Colors by{" "}
                      <strong>{hueDimension}</strong>
                    </span>
                  )}
                  {styleDimension !== "none" && (
                    <span>
                      {groupByDimension !== "none" || hueDimension !== "none"
                        ? ", "
                        : ""}
                      Styles by <strong>{styleDimension}</strong>
                    </span>
                  )}
                  {groupByDimension === "none" &&
                    hueDimension === "none" &&
                    styleDimension === "none" && (
                      <span>Using default grouping and styling</span>
                    )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts with Sidebar */}
      {groupedByIndex.map((group) => {
        const chartData = createChartData(group);
        const seriesKeys = getUniqueSeriesKeys(group);

        if (chartData.length === 0) return null;

        const showLegend = seriesKeys.length <= maxLegendItems;
        const currentZoomDomain = zoomDomain[group.indexType];
        const tickFormatter = createTickFormatter(chartData, group.indexName);
        const tickCount = getTickCount(chartData, group.indexName);

        // Create legend items for the sidebar using three-tier system
        const legendItems = seriesKeys.map((seriesKey, index) => {
          // Find the series that matches this key
          const matchingSeries = group.series.find((series) => {
            const key = createSeriesKey(
              series,
              groupByDimension,
              hueDimension,
              styleDimension
            );
            return key === seriesKey;
          });

          if (!matchingSeries) {
            return {
              key: seriesKey,
              label: seriesKey,
              sublabel: null,
              color: getSeriesColor(seriesKey, index),
              strokeDasharray: getSeriesStyle(seriesKey).strokeDasharray,
              isReference: false,
              category: "Other",
            };
          }

          const mainLabel = createMainLabel(matchingSeries, hueDimension);
          const subLabel = createSubLabel(matchingSeries, styleDimension);

          return {
            key: seriesKey,
            label: mainLabel,
            sublabel: subLabel,
            color: getSeriesColor(seriesKey, index),
            strokeDasharray: getSeriesStyle(seriesKey).strokeDasharray,
            isReference: isReferenceSeriesKey(seriesKey, group),
            category: categorizeSeries(seriesKey, group),
          };
        });

        return (
          <Card key={group.indexType}>
            <CardHeader>
              <CardTitle>
                Series by {group.indexName}
                {groupByDimension &&
                  groupByDimension !== "none" &&
                  ` (grouped by ${groupByDimension})`}
              </CardTitle>
              {!showLegend && (
                <div className="text-sm text-gray-500">
                  {seriesKeys.length} series (click legend items to toggle
                  visibility)
                </div>
              )}
              {enableZoom && (
                <div className="text-xs text-gray-400">
                  Use the brush below the chart to zoom and navigate
                </div>
              )}
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                {/* Chart */}
                <div className="flex-1">
                  <ResponsiveContainer width="100%" height={700}>
                    <LineChart
                      data={chartData}
                      margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: enableZoom ? 60 : 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey={group.indexName}
                        domain={currentZoomDomain || ["dataMin", "dataMax"]}
                        label={{
                          value: group.indexName,
                          position: "insideBottom",
                          offset: -5,
                        }}
                        type="number"
                        scale="linear"
                        tickFormatter={tickFormatter}
                        tickCount={tickCount}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis
                        domain={["dataMin - 0.1", "dataMax + 0.1"]}
                        label={{
                          value: "Value",
                          angle: -90,
                          position: "insideLeft",
                        }}
                        tickFormatter={(value: number) => value.toFixed(2)}
                      />
                      <Tooltip
                        content={
                          <CustomSeriesToolTip
                            hiddenSeries={hiddenSeries}
                            isReferenceSeriesKey={(seriesKey: string) =>
                              isReferenceSeriesKey(seriesKey, group)
                            }
                            hoveredSeries={hoveredSeries}
                          />
                        }
                        cursor={{ stroke: "#94A3B8", strokeDasharray: "4 4" }}
                      />
                      {/* Sort series keys for proper rendering order: hidden -> visible -> reference -> hovered */}
                      {seriesKeys
                        .sort((a, b) => {
                          const aIsReference = isReferenceSeriesKey(a, group);
                          const bIsReference = isReferenceSeriesKey(b, group);
                          const aIsHidden = hiddenSeries.has(a);
                          const bIsHidden = hiddenSeries.has(b);
                          const aIsHovered = hoveredSeries === a;
                          const bIsHovered = hoveredSeries === b;

                          // Create priority scores (higher = rendered later/on top)
                          const getPriority = (
                            isHidden: boolean,
                            isReference: boolean,
                            isHovered: boolean
                          ) => {
                            if (isHovered) return 4; // Highest priority - always on top
                            if (!isHidden && !isReference) return 3; // Regular visible lines
                            if (!isHidden) return 2; // Reference lines third highest

                            return 1; // Hidden lines lowest priority
                          };

                          const aPriority = getPriority(
                            aIsHidden,
                            aIsReference,
                            aIsHovered
                          );
                          const bPriority = getPriority(
                            bIsHidden,
                            bIsReference,
                            bIsHovered
                          );

                          return aPriority - bPriority;
                        })
                        .map((seriesKey, index) => {
                          const isHidden = hiddenSeries.has(seriesKey);
                          const isHovered = hoveredSeries === seriesKey;
                          const isOtherHovered =
                            hoveredSeries !== null &&
                            hoveredSeries !== seriesKey;
                          const isReference = isReferenceSeriesKey(
                            seriesKey,
                            group
                          );

                          // Determine stroke color: gray for hidden/unselected lines, original color for visible lines
                          let strokeColor;
                          if (isReference) {
                            strokeColor = "#000000"; // Red color for reference lines
                          } else if (isHidden && !isHovered) {
                            strokeColor = "#9CA3AF"; // Gray color for hidden lines
                          } else {
                            strokeColor = getSeriesColor(seriesKey, index); // Original color for visible lines
                          }

                          // Determine opacity
                          let opacity = 1;
                          if (isOtherHovered) {
                            opacity = 0.3; // Dimmed when another line is hovered
                          } else if (isReference) {
                            opacity = 1; // Reference lines always full opacity when not hidden
                          } else {
                            opacity = isHidden ? 0.7 : 1; // Slightly reduced opacity for hidden non-reference lines
                          }

                          return (
                            <Line
                              key={seriesKey}
                              type="monotone"
                              dataKey={seriesKey}
                              stroke={strokeColor}
                              strokeWidth={
                                isHovered
                                  ? getSeriesStrokeWidth(seriesKey, group) + 1
                                  : getSeriesStrokeWidth(seriesKey, group)
                              }
                              strokeOpacity={opacity}
                              dot={false} // Disable dots for better performance
                              activeDot={{ r: 4 }}
                              name={seriesKey}
                              {...getSeriesStyle(seriesKey)}
                              onClick={() => toggleSeries(seriesKey)}
                              onMouseEnter={() => handleSeriesHover(seriesKey)}
                              onMouseLeave={() => handleSeriesHover(null)}
                              style={{ cursor: "pointer" }}
                              isAnimationActive={false} // Disable animation for performance
                            />
                          );
                        })}
                      {enableZoom && (
                        <Brush
                          dataKey={group.indexName}
                          height={30}
                          stroke="#8884d8"
                          onChange={(brushData) => {
                            if (
                              brushData &&
                              brushData.startIndex !== undefined &&
                              brushData.endIndex !== undefined
                            ) {
                              const startValue =
                                chartData[brushData.startIndex]?.[
                                  group.indexName
                                ];
                              const endValue =
                                chartData[brushData.endIndex]?.[
                                  group.indexName
                                ];
                              if (
                                typeof startValue === "number" &&
                                typeof endValue === "number"
                              ) {
                                setZoomDomain((prev) => ({
                                  ...prev,
                                  [group.indexType]: [startValue, endValue],
                                }));
                              }
                            }
                          }}
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Sidebar Legend */}
                <SeriesLegendSidebar
                  legendItems={legendItems}
                  hiddenSeries={hiddenSeries}
                  onToggleSeries={toggleSeries}
                  onToggleGroup={(category) => toggleGroup(category, group)}
                  onHoverSeries={handleSeriesHover}
                  hoveredSeries={hoveredSeries}
                  maxVisibleGroups={maxVisibleGroups}
                />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
