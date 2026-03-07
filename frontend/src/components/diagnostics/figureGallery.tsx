import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { Download, ExternalLink, MoreHorizontal } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ExecutionGroup, ExecutionOutput } from "@/client";
import { diagnosticsListExecutionGroupsOptions } from "@/client/@tanstack/react-query.gen.ts";
import { Figure } from "@/components/diagnostics/figure.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { FigureGalleryModal } from "./figureGalleryModal.tsx";
import { FigureGallerySkeleton } from "./figureGallerySkeleton.tsx";

interface DiagnosticFigureGalleryProps {
  providerSlug: string;
  diagnosticSlug: string;
}

interface FigureWithGroup {
  figure: ExecutionOutput;
  executionGroup: ExecutionGroup;
}

const FigureDropDown = ({ figure, executionGroup }: FigureWithGroup) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link
            to="/executions/$groupId"
            params={{ groupId: executionGroup.id.toString() }}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View Group
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={figure.url} download>
            <Download className="h-4 w-4 mr-2" />
            Download
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

/**
 * Extract unique selector dimensions and their values from execution groups.
 * Returns only dimensions with more than one unique value (single-value dimensions
 * aren't useful as filters).
 */
function extractSelectorDimensions(groups: ExecutionGroup[]) {
  const dimensionValues: Record<string, Set<string>> = {};

  for (const group of groups) {
    for (const pairs of Object.values(group.selectors)) {
      for (const [key, value] of pairs) {
        if (!dimensionValues[key]) dimensionValues[key] = new Set();
        dimensionValues[key].add(value);
      }
    }
  }

  return Object.entries(dimensionValues)
    .filter(([, values]) => values.size > 1)
    .map(([key, values]) => ({
      key,
      values: [...values].sort(),
    }));
}

export function FigureGallery({
  providerSlug,
  diagnosticSlug,
}: DiagnosticFigureGalleryProps) {
  const [filter, setFilter] = useState("");
  const [selectorFilters, setSelectorFilters] = useState<
    Record<string, string>
  >({});
  const [selectedFigureIndex, setSelectedFigureIndex] = useState<number | null>(
    null,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  const getColumns = useCallback(() => {
    const width = window.innerWidth;
    if (width < 768) return 1;
    if (width < 1024) return 2;
    return 3;
  }, []);

  const [columns, setColumns] = useState(getColumns());

  const { data: executionGroups, isLoading } = useQuery(
    diagnosticsListExecutionGroupsOptions({
      path: { provider_slug: providerSlug, diagnostic_slug: diagnosticSlug },
    }),
  );

  useEffect(() => {
    const handleResize = () => {
      setColumns(getColumns());
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [getColumns]);

  const groups = executionGroups?.data ?? [];
  const selectorDimensions = useMemo(
    () => extractSelectorDimensions(groups),
    [groups],
  );

  const allFigures = useMemo<FigureWithGroup[]>(
    () =>
      groups.flatMap((group) =>
        (group.executions ?? []).flatMap((execution) =>
          (execution.outputs ?? [])
            .filter((output) => output.output_type === "plot")
            .map((figure) => ({ figure, executionGroup: group })),
        ),
      ),
    [groups],
  );

  const filteredFigures = useMemo(() => {
    const filterRegex = filter
      ? (() => {
          try {
            return new RegExp(filter, "i");
          } catch {
            return null;
          }
        })()
      : null;

    return allFigures.filter(({ figure, executionGroup }) => {
      for (const [key, filterValue] of Object.entries(selectorFilters)) {
        if (filterValue === "all") continue;
        const groupValues = Object.values(executionGroup.selectors).flatMap(
          (pairs) => pairs.filter(([k]) => k === key).map(([, v]) => v),
        );
        if (groupValues.length > 0 && !groupValues.includes(filterValue)) {
          return false;
        }
      }
      if (filterRegex) {
        return (
          filterRegex.test(figure.description) ||
          filterRegex.test(figure.filename)
        );
      }
      return true;
    });
  }, [allFigures, selectorFilters, filter]);

  const listRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: filteredFigures.length triggers re-measurement when filter changes affect layout position
  useEffect(() => {
    if (listRef.current) {
      const rect = listRef.current.getBoundingClientRect();
      setScrollMargin(rect.top + window.scrollY);
    }
  }, [filteredFigures.length]);

  const totalRows = Math.ceil(filteredFigures.length / columns);
  const rowVirtualizer = useWindowVirtualizer({
    count: totalRows,
    estimateSize: () => 400,
    overscan: 9,
    scrollMargin,
  });

  const goToPrevious = useCallback(() => {
    setSelectedFigureIndex((prev) =>
      prev === null || prev === 0 ? filteredFigures.length - 1 : prev - 1,
    );
  }, [filteredFigures.length]);

  const goToNext = useCallback(() => {
    setSelectedFigureIndex((prev) =>
      prev === null || prev === filteredFigures.length - 1 ? 0 : prev + 1,
    );
  }, [filteredFigures.length]);

  if (isLoading) {
    return <FigureGallerySkeleton nColumns={columns} nRows={2} />;
  }

  const items = rowVirtualizer.getVirtualItems();
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {selectorDimensions.map((dim) => (
          <div className="space-y-2" key={dim.key}>
            <Label>{dim.key}</Label>
            <Select
              value={selectorFilters[dim.key] ?? "all"}
              onValueChange={(value) =>
                setSelectorFilters((prev) => ({ ...prev, [dim.key]: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All ({dim.values.length})</SelectItem>
                {dim.values.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
        <div className="space-y-2">
          <Label htmlFor="figure-filter">Filter by Figure Name</Label>
          <Input
            id="figure-filter"
            placeholder="Filter figures by name..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
      </div>

      {filteredFigures.length > 0 ? (
        <div
          ref={listRef}
          className="relative"
          style={{
            height: rowVirtualizer.getTotalSize(),
          }}
        >
          <div
            className="absolute top-0 left-0 w-full"
            style={{
              transform: `translateY(${(items[0]?.start ?? 0) - rowVirtualizer.options.scrollMargin}px)`,
            }}
          >
            {items.map((virtualRow) => (
              <div
                key={virtualRow.index}
                data-index={virtualRow.index}
                ref={rowVirtualizer.measureElement}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
                  {Array.from({ length: columns }, (_, colIndex) => {
                    const globalIndex = virtualRow.index * columns + colIndex;
                    if (globalIndex >= filteredFigures.length) return null;
                    const { figure, executionGroup } =
                      filteredFigures[globalIndex];
                    return (
                      <Card
                        key={figure.id || globalIndex}
                        className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => {
                          setSelectedFigureIndex(globalIndex);
                          setIsModalOpen(true);
                        }}
                      >
                        <CardContent className="p-4">
                          <Figure {...figure} />

                          <div className="mt-4 flex items-center justify-between">
                            <div className="flex flex-col space-y-2">
                              <small className="text-sm text-muted-foreground">
                                <span className="font-semibold">Group:</span>{" "}
                                {executionGroup.key}
                              </small>
                              <small className="text-sm text-muted-foreground truncate">
                                <span className="font-semibold truncate">
                                  Filename:
                                </span>{" "}
                                {figure.filename}
                              </small>
                            </div>

                            <FigureDropDown
                              figure={figure}
                              executionGroup={executionGroup}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center text-sm text-muted-foreground py-8 min-h-[350px]">
          No figures found matching your filters.
        </div>
      )}

      <FigureGalleryModal
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        figures={filteredFigures}
        selectedIndex={selectedFigureIndex}
        onPrevious={goToPrevious}
        onNext={goToNext}
      />
    </div>
  );
}
