import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTheme } from "@/hooks/useTheme";
import type { SeriesValue } from "../types";
import { CanvasTooltip } from "./canvasTooltip";
import { type CrosshairPosition, SeriesCanvas } from "./seriesCanvas";
import { SeriesLegend } from "./seriesLegend";
import { useChartScales } from "./useChartScales";
import type { NearestResult } from "./useSpatialIndex";
import { useSpatialIndex } from "./useSpatialIndex";
import { createChartData, getDimensionKeys } from "./utils";

interface SimpleSeriesVisualizationProps {
  seriesValues: SeriesValue[];
  referenceSeriesValues?: SeriesValue[];
  labelTemplate?: string;
  maxSeriesLimit?: number;
  symmetricalAxes?: boolean;
  metricName?: string;
  units?: string;
}

const CHART_HEIGHT = 700;

export function SeriesVisualization({
  seriesValues,
  referenceSeriesValues = [],
  labelTemplate,
  maxSeriesLimit = 500,
  symmetricalAxes = false,
  metricName,
  units,
}: SimpleSeriesVisualizationProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const hoveredLabelRef = useRef<string | null>(null);
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);
  const [soloedLabel, setSoloedLabel] = useState<string | null>(null);
  const [legendVisible, setLegendVisible] = useState(true);
  const [groupByDimension, setGroupByDimension] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const crosshairRef = useRef<CrosshairPosition | null>(null);
  const [containerWidth, setContainerWidth] = useState(800);

  // Tooltip state
  const [tooltipState, setTooltipState] = useState<{
    visible: boolean;
    x: number;
    y: number;
    nearest: NearestResult | null;
    allAtX: NearestResult[];
  }>({ visible: false, x: 0, y: 0, nearest: null, allAtX: [] });
  const tooltipRafRef = useRef<number>(0);

  // Observe container width for responsive sizing
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Create chart data and metadata (stable unless data/props change)
  const { chartData, seriesMetadata, indexName } = useMemo(
    () => createChartData(seriesValues, referenceSeriesValues, labelTemplate),
    [seriesValues, referenceSeriesValues, labelTemplate],
  );

  // Available dimension keys for grouping
  const availableDimensions = useMemo(
    () => getDimensionKeys(seriesMetadata),
    [seriesMetadata],
  );

  // Map from label to its dimensions
  const labelDimensionMap = useMemo(() => {
    const map = new Map<string, Record<string, string>>();
    for (const meta of seriesMetadata) {
      if (!map.has(meta.label)) {
        map.set(meta.label, meta.dimensions);
      }
    }
    return map;
  }, [seriesMetadata]);

  // State for hidden labels
  const [hiddenLabels, setHiddenLabels] = useState<Set<string>>(
    () => new Set<string>(),
  );

  // Get unique labels with their colors and counts
  const uniqueLabels = useMemo(() => {
    const labelMap = new Map<
      string,
      { color: string; count: number; isReference: boolean }
    >();
    for (const meta of seriesMetadata) {
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
    }
    return Array.from(labelMap.entries())
      .map(([label, { color, count, isReference }]) => ({
        label,
        color,
        count,
        isReference,
      }))
      .sort((a, b) => {
        if (a.isReference && !b.isReference) return -1;
        if (!a.isReference && b.isReference) return 1;
        return a.label.localeCompare(b.label);
      });
  }, [seriesMetadata]);

  // Effective hidden labels accounting for solo mode
  const effectiveHiddenLabels = useMemo(() => {
    if (!soloedLabel) return hiddenLabels;
    const hidden = new Set<string>();
    for (const item of uniqueLabels) {
      if (item.label !== soloedLabel && !item.isReference) {
        hidden.add(item.label);
      }
    }
    return hidden;
  }, [soloedLabel, hiddenLabels, uniqueLabels]);

  // Compute scales
  const { xScale, yScale, innerWidth, innerHeight, margins } = useChartScales(
    chartData,
    seriesMetadata,
    effectiveHiddenLabels,
    indexName,
    containerWidth,
    CHART_HEIGHT,
    symmetricalAxes,
  );

  // Spatial index for fast nearest-point lookup
  const spatialIndex = useSpatialIndex(
    chartData,
    seriesMetadata,
    indexName,
    xScale,
    yScale,
  );

  // Toggle label visibility
  const toggleLabel = useCallback(
    (label: string) => {
      if (soloedLabel) {
        setSoloedLabel(null);
        return;
      }
      setHiddenLabels((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(label)) {
          newSet.delete(label);
        } else {
          newSet.add(label);
        }
        return newSet;
      });
    },
    [soloedLabel],
  );

  // Solo mode
  const handleSolo = useCallback((label: string) => {
    setSoloedLabel((prev) => (prev === label ? null : label));
  }, []);

  // Bulk actions
  const showAll = useCallback(() => {
    setSoloedLabel(null);
    setHiddenLabels(new Set());
  }, []);

  const hideAll = useCallback(() => {
    setSoloedLabel(null);
    const allNonRef = new Set<string>();
    for (const item of uniqueLabels) {
      if (!item.isReference) {
        allNonRef.add(item.label);
      }
    }
    setHiddenLabels(allNonRef);
  }, [uniqueLabels]);

  // Handle label hover from legend -- triggers canvas redraw via ref, not React re-render of canvas
  const handleLabelHover = useCallback((label: string | null) => {
    hoveredLabelRef.current = label;
    setHoveredLabel(label);
    // Trigger canvas redraw without React re-render
    const canvas = containerRef.current?.querySelector("canvas") as
      | (HTMLCanvasElement & { redraw?: () => void })
      | null;
    canvas?.redraw?.();
  }, []);

  // Canvas mouse handlers
  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      // Capture values synchronously — React pools events, so currentTarget
      // and coordinates become null inside requestAnimationFrame.
      const canvas = e.currentTarget as HTMLCanvasElement & {
        redraw?: () => void;
      };
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left - margins.left;
      const mouseY = e.clientY - rect.top - margins.top;

      cancelAnimationFrame(tooltipRafRef.current);
      tooltipRafRef.current = requestAnimationFrame(() => {
        const nearest = spatialIndex.findNearest(
          mouseX,
          mouseY,
          effectiveHiddenLabels,
        );

        if (nearest) {
          const allAtX = spatialIndex.findNearestAtX(
            mouseX,
            mouseY,
            effectiveHiddenLabels,
          );

          hoveredLabelRef.current = nearest.metadata.label;

          // Set crosshair at the snapped X data position
          crosshairRef.current = {
            dataPixelX: nearest.point.pixelX,
            nearestPixelX: nearest.point.pixelX,
            nearestPixelY: nearest.point.pixelY,
            nearestColor: nearest.metadata.isReference
              ? "#000000"
              : nearest.metadata.color,
          };

          canvas.redraw?.();

          setTooltipState({
            visible: true,
            x: margins.left + nearest.point.pixelX,
            y: margins.top + nearest.point.pixelY,
            nearest,
            allAtX,
          });
        } else {
          crosshairRef.current = null;
          if (hoveredLabelRef.current !== null) {
            hoveredLabelRef.current = null;
          }
          canvas.redraw?.();
          setTooltipState((prev) =>
            prev.visible
              ? { visible: false, x: 0, y: 0, nearest: null, allAtX: [] }
              : prev,
          );
        }
      });
    },
    [spatialIndex, effectiveHiddenLabels, margins],
  );

  const handleCanvasMouseLeave = useCallback(() => {
    cancelAnimationFrame(tooltipRafRef.current);
    hoveredLabelRef.current = null;
    crosshairRef.current = null;
    setTooltipState({ visible: false, x: 0, y: 0, nearest: null, allAtX: [] });
    const canvas = containerRef.current?.querySelector("canvas") as
      | (HTMLCanvasElement & { redraw?: () => void })
      | null;
    canvas?.redraw?.();
  }, []);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const mouseX = e.clientX - rect.left - margins.left;
      const mouseY = e.clientY - rect.top - margins.top;

      const nearest = spatialIndex.findNearest(
        mouseX,
        mouseY,
        effectiveHiddenLabels,
      );
      if (nearest) {
        handleSolo(nearest.metadata.label);
      }
    },
    [spatialIndex, effectiveHiddenLabels, handleSolo, margins],
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
      <div className="flex-1 min-w-0" ref={containerRef}>
        <div className="flex justify-end mb-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLegendVisible(!legendVisible)}
            className="h-7 text-xs text-muted-foreground"
          >
            {legendVisible ? "Hide Legend" : "Show Legend"}
          </Button>
        </div>
        <div className="relative">
          <SeriesCanvas
            chartData={chartData}
            seriesMetadata={seriesMetadata}
            indexName={indexName}
            hiddenLabels={effectiveHiddenLabels}
            hoveredLabelRef={hoveredLabelRef}
            crosshairRef={crosshairRef}
            xScale={xScale}
            yScale={yScale}
            margins={margins}
            width={containerWidth}
            height={CHART_HEIGHT}
            innerWidth={innerWidth}
            innerHeight={innerHeight}
            isDark={isDark}
            metricName={metricName}
            units={units}
            onMouseMove={handleCanvasMouseMove}
            onMouseLeave={handleCanvasMouseLeave}
            onClick={handleCanvasClick}
          />
          <CanvasTooltip
            visible={tooltipState.visible}
            x={tooltipState.x}
            y={tooltipState.y}
            nearest={tooltipState.nearest}
            allAtX={tooltipState.allAtX}
            containerWidth={containerWidth}
            indexName={indexName}
            units={units}
          />
        </div>
      </div>

      {/* Legend Sidebar */}
      {legendVisible && (
        <SeriesLegend
          uniqueLabels={uniqueLabels}
          hiddenLabels={effectiveHiddenLabels}
          hoveredLabel={hoveredLabel}
          soloedLabel={soloedLabel}
          onToggleLabel={toggleLabel}
          onHoverLabel={handleLabelHover}
          onSoloLabel={handleSolo}
          onShowAll={showAll}
          onHideAll={hideAll}
          groupByDimension={groupByDimension}
          onGroupByDimensionChange={setGroupByDimension}
          availableDimensions={availableDimensions}
          labelDimensionMap={labelDimensionMap}
        />
      )}
    </div>
  );
}
