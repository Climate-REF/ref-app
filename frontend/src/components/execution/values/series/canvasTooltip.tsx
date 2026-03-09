import type { NearestResult } from "./useSpatialIndex";
import { isIntegerAxis } from "./utils";

const MAX_TOOLTIP_ENTRIES = 8;

interface CanvasTooltipProps {
  visible: boolean;
  x: number;
  y: number;
  nearest: NearestResult | null;
  allAtX: NearestResult[];
  containerWidth: number;
  indexName: string;
  isTimeAxis: boolean;
  units?: string;
}

export function formatXValue(
  value: number,
  indexName: string,
  isTimeAxis = false,
): string {
  if (isTimeAxis) {
    const date = new Date(value);
    // Show full date, include time if not midnight
    if (
      date.getHours() === 0 &&
      date.getMinutes() === 0 &&
      date.getSeconds() === 0
    ) {
      return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  if (Number.isInteger(value) && isIntegerAxis(indexName)) {
    return value.toString();
  }
  if (Number.isInteger(value)) {
    return value.toString();
  }
  if (isIntegerAxis(indexName) && Math.abs(value - Math.round(value)) < 1e-9) {
    return Math.round(value).toString();
  }
  return value.toPrecision(6);
}

export function formatYValue(value: number): string {
  if (Math.abs(value) >= 1e6 || (Math.abs(value) < 1e-3 && value !== 0)) {
    return value.toExponential(3);
  }
  return value.toPrecision(4);
}

export function formatDelta(delta: number): string {
  const sign = delta >= 0 ? "+" : "";
  if (Math.abs(delta) >= 1e6 || (Math.abs(delta) < 1e-3 && delta !== 0)) {
    return `${sign}${delta.toExponential(2)}`;
  }
  return `${sign}${delta.toPrecision(3)}`;
}

export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function CanvasTooltip({
  visible,
  x,
  y,
  nearest,
  allAtX,
  containerWidth,
  indexName,
  isTimeAxis,
  units,
}: CanvasTooltipProps) {
  if (!visible || !nearest || allAtX.length === 0) {
    return null;
  }

  const displayed = allAtX.slice(0, MAX_TOOLTIP_ENTRIES);
  const remaining = allAtX.length - displayed.length;

  // Find reference value at this X for delta computation
  const referenceEntry = allAtX.find((r) => r.metadata.isReference);
  const referenceValue = referenceEntry?.point.y ?? null;

  // Compute rank of nearest among all visible series (sorted by value descending)
  const sortedByValue = [...allAtX].sort((a, b) => b.point.y - a.point.y);
  const nearestRank =
    sortedByValue.findIndex(
      (r) => r.metadata.seriesIndex === nearest.metadata.seriesIndex,
    ) + 1;

  // Position tooltip to avoid going off-screen
  const tooltipWidth = 320;
  const flipX = x + tooltipWidth + 20 > containerWidth;
  const left = flipX ? x - tooltipWidth - 10 : x + 10;
  const top = Math.max(10, y - 60);

  return (
    <div
      className="absolute pointer-events-none z-10 rounded-md border border-border bg-white dark:bg-muted shadow-lg p-2 text-xs"
      style={{
        left,
        top,
        maxWidth: tooltipWidth,
      }}
    >
      {/* Header: X value with axis name */}
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-muted-foreground">{indexName}:</span>
        <span className="font-medium text-foreground font-mono tabular-nums">
          {formatXValue(nearest.point.x, indexName, isTimeAxis)}
        </span>
      </div>

      {/* Nearest series detail block */}
      <div className="bg-accent rounded-md px-2.5 py-2 mb-2 border border-border">
        <div className="flex items-center gap-2 mb-1.5">
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{
              backgroundColor: nearest.metadata.color,
            }}
          />
          <span className="font-semibold text-foreground truncate flex-1">
            {nearest.metadata.label}
          </span>
        </div>

        {/* Value + delta + rank */}
        <div className="flex items-baseline gap-3 ml-5">
          <span className="text-sm font-mono font-semibold text-foreground tabular-nums">
            {formatYValue(nearest.point.y)}
            {units && units !== "unitless" && (
              <span className="text-xs font-normal text-muted-foreground ml-1">
                {units}
              </span>
            )}
          </span>
          {referenceValue !== null && !nearest.metadata.isReference && (
            <span
              className={`font-mono tabular-nums ${
                nearest.point.y - referenceValue >= 0
                  ? "text-red-600 dark:text-red-400"
                  : "text-blue-600 dark:text-blue-400"
              }`}
            >
              {formatDelta(nearest.point.y - referenceValue)} vs ref
            </span>
          )}
          {allAtX.length > 1 && (
            <span className="text-muted-foreground">
              {ordinal(nearestRank)} of {allAtX.length}
            </span>
          )}
        </div>

        {/* Dimension details for nearest series */}
        {Object.keys(nearest.metadata.dimensions).length > 0 && (
          <div className="mt-1.5 ml-5 flex flex-wrap gap-x-3 gap-y-0.5">
            {Object.entries(nearest.metadata.dimensions).map(([key, value]) => (
              <span key={key} className="text-muted-foreground">
                <span className="opacity-70">{key}:</span> {value}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Other series at this X position */}
      {displayed.length > 1 && (
        <div className="space-y-0.5">
          {displayed
            .filter(
              (r) => r.metadata.seriesIndex !== nearest.metadata.seriesIndex,
            )
            .slice(0, MAX_TOOLTIP_ENTRIES - 1)
            .map(({ point, metadata }) => {
              const delta =
                referenceValue !== null && !metadata.isReference
                  ? point.y - referenceValue
                  : null;
              return (
                <div
                  key={metadata.seriesIndex}
                  className="flex items-center gap-2 opacity-70"
                >
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: metadata.color,
                    }}
                  />
                  <span className="text-muted-foreground truncate flex-1 max-w-36">
                    {metadata.label}
                  </span>
                  <span className="font-mono text-foreground tabular-nums">
                    {formatYValue(point.y)}
                  </span>
                  {delta !== null && (
                    <span
                      className={`font-mono tabular-nums ${
                        delta >= 0
                          ? "text-red-600/60 dark:text-red-400/60"
                          : "text-blue-600/60 dark:text-blue-400/60"
                      }`}
                    >
                      {formatDelta(delta)}
                    </span>
                  )}
                </div>
              );
            })}
        </div>
      )}

      {remaining > 0 && (
        <div className="text-muted-foreground pt-1.5 mt-1.5 border-t border-border">
          +{remaining} more series
        </div>
      )}
    </div>
  );
}
