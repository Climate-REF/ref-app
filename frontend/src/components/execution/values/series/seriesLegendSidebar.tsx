import { memo, useCallback, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SeriesLegendItem {
  key: string;
  label: string;
  sublabel?: string | null;
  color: string;
  strokeDasharray?: string;
  isReference?: boolean;
  category?: string;
}

interface SeriesLegendSidebarProps {
  legendItems: SeriesLegendItem[];
  hiddenSeries: Set<string>;
  onToggleSeries: (seriesKey: string) => void;
  onToggleGroup?: (category: string) => void;
  onHoverSeries?: (seriesKey: string | null) => void;
  hoveredSeries?: string | null;
  maxVisibleGroups?: number;
  className?: string;
}

interface GroupedLegendItems {
  [category: string]: SeriesLegendItem[];
}

function SeriesLegendSidebarComponent({
  legendItems,
  hiddenSeries,
  onToggleSeries,
  onToggleGroup,
  onHoverSeries,
  hoveredSeries,
  className,
}: SeriesLegendSidebarProps) {
  // Initialize collapsed state - start with all categories collapsed
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(
    () => {
      const groupedItems: GroupedLegendItems = legendItems.reduce(
        (acc, item) => {
          const category = item.category || "Other";
          if (!acc[category]) {
            acc[category] = [];
          }
          acc[category].push(item);
          return acc;
        },
        {} as GroupedLegendItems,
      );

      // Start with all categories collapsed except those with visible items
      const collapsed = new Set<string>();
      Object.entries(groupedItems).forEach(([category, items]) => {
        // Only collapse if all items in this category are hidden
        const allHidden = items.every((item) => hiddenSeries.has(item.key));
        if (allHidden && items.length > 0) {
          collapsed.add(category);
        }
      });
      return collapsed;
    },
  );

  // Group legend items by category (memoized to prevent re-calculation on every render)
  const groupedItems: GroupedLegendItems = useMemo(() => {
    return legendItems.reduce((acc, item) => {
      const category = item.category || "Other";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    }, {} as GroupedLegendItems);
  }, [legendItems]);

  // Sort categories: reference lines first, then activated groups alphabetically, then unactivated groups
  const sortedCategories = useMemo(() => {
    return Object.keys(groupedItems).sort((a, b) => {
      const aHasReference = groupedItems[a].some((item) => item.isReference);
      const bHasReference = groupedItems[b].some((item) => item.isReference);
      const aHasVisible = groupedItems[a].some(
        (item) => !hiddenSeries.has(item.key),
      );
      const bHasVisible = groupedItems[b].some(
        (item) => !hiddenSeries.has(item.key),
      );

      // Reference lines always first
      if (aHasReference && !bHasReference) return -1;
      if (!aHasReference && bHasReference) return 1;

      // If both are reference or both are non-reference, sort by activation status
      if (aHasReference === bHasReference) {
        // Activated (visible) groups come before unactivated (hidden) groups
        if (aHasVisible && !bHasVisible) return -1;
        if (!aHasVisible && bHasVisible) return 1;

        // Within the same activation status, sort alphabetically
        return a.localeCompare(b);
      }

      return 0;
    });
  }, [groupedItems, hiddenSeries]);

  // Auto-expand categories that have visible (non-hidden) series
  const shouldAutoExpand = useCallback(
    (category: string): boolean => {
      const items = groupedItems[category];
      return items.some((item) => !hiddenSeries.has(item.key));
    },
    [groupedItems, hiddenSeries],
  );

  // Determine if we should show all groups or limit them
  const visibleCategories = sortedCategories;

  const toggleCategory = useCallback((category: string) => {
    setCollapsedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  }, []);

  if (legendItems.length === 0) {
    return null;
  }

  return (
    <div
      className={cn("w-80 flex-shrink-0 h-[700px] flex flex-col", className)}
    >
      <div className="pb-3 flex-shrink-0">
        <div className="text-base">Series Legend</div>
      </div>
      <div className="space-y-3 overflow-y-auto flex-1 min-h-0">
        {visibleCategories.map((category) => {
          const items = groupedItems[category];
          const hasVisibleItems = shouldAutoExpand(category);
          const isCollapsed =
            collapsedCategories.has(category) && !hasVisibleItems;
          const visibleItems = items.filter(
            (item) => !hiddenSeries.has(item.key),
          );
          const hiddenCount = items.length - visibleItems.length;

          return (
            <div key={category} className="space-y-1">
              {/* Category header */}
              <div className="flex gap-1">
                {/* Group toggle button */}
                {onToggleGroup && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="px-2 py-1 h-auto text-xs"
                    onClick={() => onToggleGroup(category)}
                    title={
                      hasVisibleItems
                        ? "Hide all in group"
                        : "Show all in group"
                    }
                  >
                    {hasVisibleItems ? "Hide" : "Show"}
                  </Button>
                )}

                {/* Category expand/collapse button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "flex-1 justify-between p-1 h-auto font-medium text-xs",
                    hasVisibleItems
                      ? "text-foreground"
                      : "text-muted-foreground",
                  )}
                  onClick={() => toggleCategory(category)}
                >
                  <span className="flex items-center gap-2">
                    {category}
                    {hiddenCount > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {hiddenCount} hidden
                      </Badge>
                    )}
                    {visibleItems.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {visibleItems.length} visible
                      </Badge>
                    )}
                  </span>
                  <span
                    className={cn(
                      "transition-transform",
                      isCollapsed ? "rotate-0" : "rotate-90",
                    )}
                  >
                    ▶
                  </span>
                </Button>
              </div>

              {/* Category items - show if not collapsed OR if has visible items */}
              {!isCollapsed && (
                <div className="space-y-1 pl-2">
                  {items.map((item) => {
                    const isHidden = hiddenSeries.has(item.key);
                    const isHovered = hoveredSeries === item.key;
                    const strokeWidth = item.isReference ? 3 : 2;

                    return (
                      <Button
                        key={item.key}
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "w-full justify-start p-2 h-auto text-left hover:bg-muted/50",
                          isHidden && "opacity-40",
                          isHovered && "bg-muted/30",
                        )}
                        onClick={() => onToggleSeries(item.key)}
                        onMouseEnter={() => onHoverSeries?.(item.key)}
                        onMouseLeave={() => onHoverSeries?.(null)}
                      >
                        <div className="flex items-center gap-2 w-full">
                          {/* Line preview */}
                          <svg
                            width="24"
                            height="12"
                            className="flex-shrink-0"
                            aria-label={item.label}
                            role="img"
                          >
                            <line
                              x1="2"
                              y1="6"
                              x2="22"
                              y2="6"
                              stroke={isHidden ? "#9CA3AF" : item.color}
                              strokeWidth={strokeWidth}
                              strokeDasharray={item.strokeDasharray || "none"}
                            />
                          </svg>

                          {/* Label and sublabel */}
                          <div className="flex-1 min-w-0">
                            <div
                              className={cn(
                                "text-sm truncate",
                                isHidden &&
                                  "text-muted-foreground line-through",
                              )}
                            >
                              {item.label}
                            </div>
                            {item.sublabel && (
                              <div
                                className={cn(
                                  "text-xs text-muted-foreground truncate",
                                  isHidden && "line-through",
                                )}
                              >
                                {item.sublabel}
                              </div>
                            )}
                          </div>

                          {/* Reference badge */}
                          {item.isReference && (
                            <Badge variant="secondary" className="text-xs">
                              Ref
                            </Badge>
                          )}
                        </div>
                      </Button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const SeriesLegendSidebar = memo(SeriesLegendSidebarComponent);
