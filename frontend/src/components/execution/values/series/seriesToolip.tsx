import type { SeriesMetadata } from "../types";

export function SeriesTooltip({
  active,
  payload,
  label,
  hiddenLabels,
  hoveredLabel,
  seriesMetadata,
}: {
  active?: boolean;
  payload?: Array<{
    value: number;
    dataKey: string;
    color: string;
    name: string;
  }>;
  label?: string | number;
  hiddenLabels: Set<string>;
  hoveredLabel: string | null;
  seriesMetadata: SeriesMetadata[];
}) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  // Filter visible entries
  const visibleEntries = payload.filter((entry) => {
    const seriesIdx = Number.parseInt(entry.dataKey.replace("series_", ""));
    const metadata = seriesMetadata[seriesIdx];
    return metadata && !hiddenLabels.has(metadata.label);
  });

  if (visibleEntries.length === 0) {
    return null;
  }

  // Show the hovered entry or the first visible entry
  let displayEntry = visibleEntries[0];
  if (hoveredLabel) {
    const hoveredEntry = visibleEntries.find((entry) => {
      const seriesIdx = Number.parseInt(entry.dataKey.replace("series_", ""));
      const metadata = seriesMetadata[seriesIdx];
      return metadata?.label === hoveredLabel;
    });
    if (hoveredEntry) {
      displayEntry = hoveredEntry;
    }
  }

  const seriesIdx = Number.parseInt(
    displayEntry.dataKey.replace("series_", ""),
  );
  const metadata = seriesMetadata[seriesIdx];

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 max-w-sm">
      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
        {typeof label === "number" ? label.toFixed(2) : label}
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: metadata?.color || displayEntry.color }}
          />
          <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1">
            {metadata?.label || displayEntry.name}
          </span>
        </div>
        <div className="text-lg font-semibold text-gray-900 dark:text-gray-100 ml-5">
          {typeof displayEntry.value === "number"
            ? displayEntry.value.toFixed(3)
            : displayEntry.value}
        </div>
      </div>
      {visibleEntries.length > 1 && (
        <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 mt-2 border-t border-gray-200 dark:border-gray-600">
          +{visibleEntries.length - 1} other series at this point
        </div>
      )}
    </div>
  );
}
