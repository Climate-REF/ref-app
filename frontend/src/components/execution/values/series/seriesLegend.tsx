import { memo, useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface LegendItem {
  label: string;
  color: string;
  count: number;
  isReference: boolean;
}

interface SeriesLegendProps {
  uniqueLabels: LegendItem[];
  hiddenLabels: Set<string>;
  hoveredLabel: string | null;
  soloedLabel: string | null;
  onToggleLabel: (label: string) => void;
  onHoverLabel: (label: string | null) => void;
  onSoloLabel: (label: string) => void;
  onShowAll: () => void;
  onHideAll: () => void;
  groupByDimension: string | null;
  onGroupByDimensionChange: (dimension: string | null) => void;
  availableDimensions: string[];
  labelDimensionMap: Map<string, Record<string, string>>;
}

export const SeriesLegend = memo(function SeriesLegend({
  uniqueLabels,
  hiddenLabels,
  hoveredLabel,
  soloedLabel,
  onToggleLabel,
  onHoverLabel,
  onSoloLabel,
  onShowAll,
  onHideAll,
  groupByDimension,
  onGroupByDimensionChange,
  availableDimensions,
  labelDimensionMap,
}: SeriesLegendProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set(),
  );

  const filteredLabels = useMemo(() => {
    if (!searchQuery) return uniqueLabels;
    const query = searchQuery.toLowerCase();
    return uniqueLabels.filter((item) =>
      item.label.toLowerCase().includes(query),
    );
  }, [uniqueLabels, searchQuery]);

  // Group labels by dimension value
  const groupedLabels = useMemo(() => {
    if (!groupByDimension) {
      return null;
    }

    const groups = new Map<string, LegendItem[]>();
    for (const item of filteredLabels) {
      const dims = labelDimensionMap.get(item.label);
      const groupKey = dims?.[groupByDimension] ?? "Unknown";
      const group = groups.get(groupKey);
      if (group) {
        group.push(item);
      } else {
        groups.set(groupKey, [item]);
      }
    }

    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredLabels, groupByDimension, labelDimensionMap]);

  const toggleGroupCollapse = useCallback((groupKey: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  }, []);

  const toggleGroupVisibility = useCallback(
    (items: LegendItem[]) => {
      const allHidden = items.every((item) => hiddenLabels.has(item.label));
      for (const item of items) {
        const isHidden = hiddenLabels.has(item.label);
        // If all are hidden, show all; otherwise hide all
        if (allHidden && isHidden) {
          onToggleLabel(item.label);
        } else if (!allHidden && !isHidden) {
          onToggleLabel(item.label);
        }
      }
    },
    [hiddenLabels, onToggleLabel],
  );

  const visibleCount = uniqueLabels.filter(
    (item) => !hiddenLabels.has(item.label),
  ).length;

  return (
    <div className="w-72 flex-shrink-0 flex flex-col gap-2">
      {/* Search */}
      <Input
        type="text"
        placeholder="Search series..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="h-8 text-sm"
      />

      {/* Bulk controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={onShowAll}
          className="flex-1 h-7 text-xs"
        >
          Show All
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onHideAll}
          className="flex-1 h-7 text-xs"
        >
          Hide All
        </Button>
        {soloedLabel && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onSoloLabel(soloedLabel)}
            className="h-7 text-xs"
          >
            Unsolo
          </Button>
        )}
      </div>

      {/* Group by dimension selector */}
      {availableDimensions.length > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            Group:
          </span>
          <select
            value={groupByDimension ?? ""}
            onChange={(e) => onGroupByDimensionChange(e.target.value || null)}
            className="flex-1 h-7 text-xs rounded-md border border-input bg-background px-2"
          >
            <option value="">None</option>
            {availableDimensions.map((dim) => (
              <option key={dim} value={dim}>
                {dim}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Status bar */}
      <div className="text-xs text-muted-foreground px-1">
        {visibleCount}/{uniqueLabels.length} visible
        {searchQuery && ` (${filteredLabels.length} matching "${searchQuery}")`}
        {soloedLabel && (
          <span className="ml-1 text-blue-600 dark:text-blue-400">
            Solo: {soloedLabel}
          </span>
        )}
      </div>

      {/* Legend list */}
      <ScrollArea className="flex-1 max-h-[550px]">
        {groupedLabels ? (
          <div className="space-y-1 pr-3">
            {groupedLabels.map(([groupKey, items]) => {
              const groupHiddenCount = items.filter((item) =>
                hiddenLabels.has(item.label),
              ).length;
              const allGroupHidden = groupHiddenCount === items.length;
              const isCollapsed = collapsedGroups.has(groupKey);

              return (
                <Collapsible
                  key={groupKey}
                  open={!isCollapsed}
                  onOpenChange={() => toggleGroupCollapse(groupKey)}
                >
                  <div className="flex items-center gap-1">
                    <CollapsibleTrigger className="flex items-center gap-1.5 flex-1 px-2 py-1 rounded hover:bg-accent text-left">
                      <span className="text-xs text-muted-foreground">
                        {isCollapsed ? "\u25B6" : "\u25BC"}
                      </span>
                      <span className="text-xs font-medium truncate flex-1">
                        {groupKey}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {items.length - groupHiddenCount}/{items.length}
                      </span>
                    </CollapsibleTrigger>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleGroupVisibility(items);
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded hover:bg-accent"
                      title={allGroupHidden ? "Show group" : "Hide group"}
                    >
                      {allGroupHidden ? "show" : "hide"}
                    </button>
                  </div>
                  <CollapsibleContent>
                    <div className="ml-3 space-y-0.5">
                      {items.map((item) => (
                        <LegendEntry
                          key={item.label}
                          item={item}
                          isHidden={hiddenLabels.has(item.label)}
                          isHovered={hoveredLabel === item.label}
                          isSoloed={soloedLabel === item.label}
                          onToggle={() => onToggleLabel(item.label)}
                          onHover={onHoverLabel}
                          onSolo={() => onSoloLabel(item.label)}
                        />
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        ) : (
          <div className="space-y-0.5 pr-3">
            {filteredLabels.map((item) => (
              <LegendEntry
                key={item.label}
                item={item}
                isHidden={hiddenLabels.has(item.label)}
                isHovered={hoveredLabel === item.label}
                isSoloed={soloedLabel === item.label}
                onToggle={() => onToggleLabel(item.label)}
                onHover={onHoverLabel}
                onSolo={() => onSoloLabel(item.label)}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
});

function LegendEntry({
  item,
  isHidden,
  isHovered,
  isSoloed,
  onToggle,
  onHover,
  onSolo,
}: {
  item: LegendItem;
  isHidden: boolean;
  isHovered: boolean;
  isSoloed: boolean;
  onToggle: () => void;
  onHover: (label: string | null) => void;
  onSolo: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      onDoubleClick={(e) => {
        e.preventDefault();
        onSolo();
      }}
      onMouseEnter={() => onHover(item.label)}
      onMouseLeave={() => onHover(null)}
      className={`w-full flex items-center gap-1.5 px-2 py-1 rounded transition-colors text-left ${
        isHovered
          ? "bg-accent"
          : isSoloed
            ? "bg-blue-50 dark:bg-blue-950/30"
            : "hover:bg-accent/50"
      }`}
      title={`${item.label}\nClick to toggle, double-click to solo`}
    >
      <div
        className="w-3 h-3 rounded-sm flex-shrink-0"
        style={{
          backgroundColor: isHidden ? "#9CA3AF" : item.color,
          opacity: isHidden ? 0.4 : 1,
        }}
      />
      <span
        className={`text-xs text-left flex-1 truncate ${
          isHidden ? "text-muted-foreground line-through" : "text-foreground"
        }`}
      >
        {item.label}
      </span>
      {item.count > 1 && (
        <span className="text-xs text-muted-foreground">x{item.count}</span>
      )}
    </button>
  );
}
