import { AlertTriangle } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTheme } from "@/hooks/useTheme";
import type { SeriesValue } from "../types";
import { CanvasTooltip } from "./canvasTooltip";
import {
  type CrosshairPosition,
  SeriesCanvas,
  type SeriesCanvasHandle,
  seriesLineColor,
} from "./seriesCanvas";
import { SeriesLegend } from "./seriesLegend";
import { type ChartMargins, useChartScales } from "./useChartScales";
import type { NearestResult } from "./useSpatialIndex";
import { findTooltipPoints, useSpatialIndex } from "./useSpatialIndex";
import {
  createChartData,
  getDimensionKeys,
  hiddenLabelsWithSolo,
  labelDimensions,
  legendItems,
  toggleInSet,
  withLabelsHidden,
} from "./utils";

const REFERENCE_MISMATCH_ISSUE =
  "https://github.com/Climate-REF/climate-ref/issues/927";

interface SimpleSeriesVisualizationProps {
  seriesValues: SeriesValue[];
  referenceSeriesValues?: SeriesValue[];
  labelTemplate?: string;
  /** Dimension that decides a series' colour, defaults to the label */
  colorDimension?: string;
  maxSeriesLimit?: number;
  symmetricalAxes?: boolean;
  metricName?: string;
  units?: string;
}

const CHART_HEIGHT = 700;

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  nearest: NearestResult | null;
  allAtX: NearestResult[];
}

const HIDDEN_TOOLTIP: TooltipState = {
  visible: false,
  x: 0,
  y: 0,
  nearest: null,
  allAtX: [],
};

/** Where a mouse event is within the plot area, which starts inside the margins */
function plotPosition(
  e: React.MouseEvent<HTMLCanvasElement>,
  margins: ChartMargins,
) {
  const rect = e.currentTarget.getBoundingClientRect();
  return {
    x: e.clientX - rect.left - margins.left,
    y: e.clientY - rect.top - margins.top,
  };
}

export function SeriesVisualization({
  seriesValues,
  referenceSeriesValues = [],
  labelTemplate,
  colorDimension,
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
  const canvasRef = useRef<SeriesCanvasHandle>(null);
  const [containerWidth, setContainerWidth] = useState(800);

  // Tooltip state
  const [tooltipState, setTooltipState] =
    useState<TooltipState>(HIDDEN_TOOLTIP);
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
  const {
    chartData,
    seriesMetadata,
    indexName,
    isTimeAxis,
    valueUnits,
    indexUnits,
  } = useMemo(
    () =>
      createChartData(
        seriesValues,
        referenceSeriesValues,
        labelTemplate,
        colorDimension,
      ),
    [seriesValues, referenceSeriesValues, labelTemplate, colorDimension],
  );

  const referenceCount = useMemo(
    () => seriesMetadata.filter((meta) => meta.isReference).length,
    [seriesMetadata],
  );

  // Prefer per-series value_units for the Y-axis/tooltip unit label; fall
  // back to the card-config `units` prop when no series carries value_units
  // (e.g. ILAMB series, which never set it).
  const effectiveUnits = valueUnits ?? units;

  // Available dimension keys for grouping
  const availableDimensions = useMemo(
    () => getDimensionKeys(seriesMetadata),
    [seriesMetadata],
  );

  const labelDimensionMap = useMemo(
    () => labelDimensions(seriesMetadata),
    [seriesMetadata],
  );

  // State for hidden labels
  const [hiddenLabels, setHiddenLabels] = useState<Set<string>>(
    () => new Set<string>(),
  );

  const uniqueLabels = useMemo(
    () => legendItems(seriesMetadata),
    [seriesMetadata],
  );

  // Effective hidden labels accounting for solo mode
  const effectiveHiddenLabels = useMemo(
    () => hiddenLabelsWithSolo(hiddenLabels, soloedLabel, uniqueLabels),
    [soloedLabel, hiddenLabels, uniqueLabels],
  );

  // Compute scales
  const { xScale, yScale, innerWidth, innerHeight, margins } = useChartScales(
    chartData,
    seriesMetadata,
    effectiveHiddenLabels,
    indexName,
    containerWidth,
    CHART_HEIGHT,
    symmetricalAxes,
    isTimeAxis,
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
      setHiddenLabels((prev) => toggleInSet(prev, label));
    },
    [soloedLabel],
  );

  // Hide or show several labels at once. Leaving solo mode keeps what it was
  // showing, so only these labels change.
  const setLabelsHidden = useCallback(
    (labels: string[], hidden: boolean) => {
      setSoloedLabel(null);
      setHiddenLabels((prev) =>
        withLabelsHidden(
          soloedLabel ? effectiveHiddenLabels : prev,
          labels,
          hidden,
        ),
      );
    },
    [soloedLabel, effectiveHiddenLabels],
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
    canvasRef.current?.redraw();
  }, []);

  // Canvas mouse handlers
  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      // Capture values synchronously — React pools events, so currentTarget
      // and coordinates become null inside requestAnimationFrame.
      const { x: mouseX, y: mouseY } = plotPosition(e, margins);

      cancelAnimationFrame(tooltipRafRef.current);
      tooltipRafRef.current = requestAnimationFrame(() => {
        const found = findTooltipPoints(
          spatialIndex,
          mouseX,
          mouseY,
          effectiveHiddenLabels,
        );

        if (found) {
          const { nearest, allAtX } = found;

          hoveredLabelRef.current = nearest.metadata.label;

          // Set crosshair at the snapped X data position
          crosshairRef.current = {
            dataPixelX: nearest.point.pixelX,
            nearestPixelX: nearest.point.pixelX,
            nearestPixelY: nearest.point.pixelY,
            nearestColor: seriesLineColor(nearest.metadata, isDark),
          };

          canvasRef.current?.redraw();

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
          canvasRef.current?.redraw();
          setTooltipState((prev) => (prev.visible ? HIDDEN_TOOLTIP : prev));
        }
      });
    },
    [spatialIndex, effectiveHiddenLabels, margins, isDark],
  );

  const handleCanvasMouseLeave = useCallback(() => {
    cancelAnimationFrame(tooltipRafRef.current);
    hoveredLabelRef.current = null;
    crosshairRef.current = null;
    setTooltipState(HIDDEN_TOOLTIP);
    canvasRef.current?.redraw();
  }, []);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const { x: mouseX, y: mouseY } = plotPosition(e, margins);

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
            <div className="text-sm text-muted-foreground">
              Found {totalSeries} series values, but only up to {maxSeriesLimit}{" "}
              can be displayed for performance reasons.
            </div>
            <div className="text-sm text-muted-foreground">
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
      <div className="text-center text-muted-foreground py-8">
        No series data available
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {referenceCount > 1 ? (
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>Multiple reference curves</AlertTitle>
          <AlertDescription>
            This chart draws {referenceCount} reference curves. The reference is
            regridded onto each model grid before the statistic is computed, so
            one observational dataset can produce several different curves. This
            is tracked in{" "}
            <a
              className="underline underline-offset-2"
              href={REFERENCE_MISMATCH_ISSUE}
              target="_blank"
              rel="noreferrer"
            >
              climate-ref#927
            </a>
            .
          </AlertDescription>
        </Alert>
      ) : null}
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
              ref={canvasRef}
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
              isTimeAxis={isTimeAxis}
              metricName={metricName}
              units={effectiveUnits}
              indexUnits={indexUnits}
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
              isTimeAxis={isTimeAxis}
              isDark={isDark}
              units={effectiveUnits}
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
            onSetLabelsHidden={setLabelsHidden}
            onHoverLabel={handleLabelHover}
            onSoloLabel={handleSolo}
            onShowAll={showAll}
            onHideAll={hideAll}
            groupByDimension={groupByDimension}
            onGroupByDimensionChange={setGroupByDimension}
            availableDimensions={availableDimensions}
            labelDimensionMap={labelDimensionMap}
            isDark={isDark}
          />
        )}
      </div>
    </div>
  );
}
