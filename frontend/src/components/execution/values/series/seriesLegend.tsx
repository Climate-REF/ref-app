import { Card, CardContent } from "@/components/ui/card";

export function SeriesLegend({
  uniqueLabels,
  hiddenLabels,
  hoveredLabel,
  onToggleLabel,
  onHoverLabel,
}: {
  uniqueLabels: Array<{ label: string; color: string; count: number }>;
  hiddenLabels: Set<string>;
  hoveredLabel: string | null;
  onToggleLabel: (label: string) => void;
  onHoverLabel: (label: string | null) => void;
}) {
  return (
    <div className="w-64 flex-shrink-0">
      <Card>
        <CardContent className="p-4">
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
            Legend ({uniqueLabels.length} labels)
          </div>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {uniqueLabels.map(({ label, color, count }) => {
              const isHidden = hiddenLabels.has(label);
              const isHovered = hoveredLabel === label;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => onToggleLabel(label)}
                  onMouseEnter={() => onHoverLabel(label)}
                  onMouseLeave={() => onHoverLabel(null)}
                  className={`w-full flex items-center gap-2 p-2 rounded transition-colors ${
                    isHovered
                      ? "bg-gray-100 dark:bg-gray-700"
                      : "hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                >
                  <div
                    className="w-4 h-4 rounded flex-shrink-0"
                    style={{
                      backgroundColor: isHidden ? "#9CA3AF" : color,
                      opacity: isHidden ? 0.5 : 1,
                    }}
                  />
                  <span
                    className={`text-sm text-left flex-1 truncate ${
                      isHidden
                        ? "text-gray-400 dark:text-gray-500 line-through"
                        : "text-gray-700 dark:text-gray-300"
                    }`}
                    title={label}
                  >
                    {label}
                  </span>
                  {count > 1 && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      ×{count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
