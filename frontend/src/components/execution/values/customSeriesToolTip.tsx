import { Badge } from "@/components/ui/badge";

interface CustomSeriesToolTipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    dataKey: string;
    color: string;
    name: string;
    payload: Record<string, unknown>;
  }>;
  label?: string | number;
  coordinate?: { x: number; y: number };
  hiddenSeries: Set<string>;
  isReferenceSeriesKey: (seriesKey: string) => boolean;
  hoveredSeries?: string | null;
}

export function CustomSeriesToolTip({
  active,
  payload,
  label,
  hiddenSeries,
  isReferenceSeriesKey,
  hoveredSeries,
}: CustomSeriesToolTipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  // Separate reference and non-reference series
  const referenceEntries = payload.filter(
    (entry) =>
      isReferenceSeriesKey(entry.dataKey) && !hiddenSeries.has(entry.dataKey),
  );

  const nonReferenceEntries = payload.filter(
    (entry) =>
      !isReferenceSeriesKey(entry.dataKey) && !hiddenSeries.has(entry.dataKey),
  );

  // Find the hovered entry if available, otherwise use the first visible non-reference entry
  let closestEntry = nonReferenceEntries[0];
  if (hoveredSeries) {
    const hoveredEntry = payload.find(
      (entry) => entry.dataKey === hoveredSeries,
    );
    if (hoveredEntry && !hiddenSeries.has(hoveredEntry.dataKey)) {
      closestEntry = hoveredEntry;
    }
  }

  // If no visible entries at all, don't show tooltip
  if (referenceEntries.length === 0 && !closestEntry) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 max-w-sm">
      {/* Header with label */}
      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
        {typeof label === "number" ? label.toFixed(2) : label}
      </div>

      <div className="space-y-3">
        {/* Always show reference values first */}
        {referenceEntries.map((entry) => (
          <div key={entry.dataKey} className="space-y-1">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1">
                {entry.name}
              </span>
              <Badge variant="secondary" className="text-xs">
                Ref
              </Badge>
            </div>
            <div className="text-lg font-semibold text-gray-900 dark:text-gray-100 ml-5">
              {typeof entry.value === "number"
                ? entry.value.toFixed(3)
                : entry.value}
            </div>
          </div>
        ))}

        {/* Show closest non-reference entry if available */}
        {closestEntry && (
          <>
            {referenceEntries.length > 0 && (
              <div className="border-t border-gray-200 dark:border-gray-600 pt-2" />
            )}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: closestEntry.color }}
                />
                <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1">
                  {closestEntry.name}
                </span>
              </div>
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100 ml-5">
                {typeof closestEntry.value === "number"
                  ? closestEntry.value.toFixed(3)
                  : closestEntry.value}
              </div>
            </div>
          </>
        )}

        {/* Show count of additional series if there are more */}
        {nonReferenceEntries.length > 1 && (
          <div className="text-xs text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-200 dark:border-gray-600">
            +{nonReferenceEntries.length - 1} other series at this point
          </div>
        )}
      </div>
    </div>
  );
}
