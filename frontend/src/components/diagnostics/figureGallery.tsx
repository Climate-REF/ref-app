import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  MoreHorizontal,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import { FigureGalleryModal } from "./figureGalleryModal.tsx";
import { FigureGallerySkeleton } from "./figureGallerySkeleton.tsx";
import {
  matchesSelectorFilters,
  SelectorFilterPanel,
} from "./selectorFilterPanel.tsx";

interface DiagnosticFigureGalleryProps {
  providerSlug: string;
  diagnosticSlug: string;
  /** When set, display figures in paginated mode instead of infinite scroll */
  pageSize?: number;
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

function FigureCard({
  figure,
  executionGroup,
  onClick,
}: FigureWithGroup & { onClick: () => void }) {
  return (
    <Card
      className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <Figure {...figure} />
        <div className="mt-4 flex items-center justify-between">
          <div className="flex flex-col space-y-2">
            <small className="text-sm text-muted-foreground">
              <span className="font-semibold">Group:</span> {executionGroup.key}
            </small>
            <small className="text-sm text-muted-foreground truncate">
              <span className="font-semibold truncate">Filename:</span>{" "}
              {figure.filename}
            </small>
          </div>
          <FigureDropDown figure={figure} executionGroup={executionGroup} />
        </div>
      </CardContent>
    </Card>
  );
}

function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="flex items-center justify-between py-4">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 0}
        className="gap-1"
      >
        <ChevronLeft className="h-4 w-4" />
        Previous
      </Button>
      <span className="text-sm text-muted-foreground">
        Page {currentPage + 1} of {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages - 1}
        className="gap-1"
      >
        Next
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function FigureGallery({
  providerSlug,
  diagnosticSlug,
  pageSize,
}: DiagnosticFigureGalleryProps) {
  const [filter, setFilter] = useState("");
  const [selectorFilters, setSelectorFilters] = useState<
    Record<string, string[]>
  >({});
  const [selectedFigureIndex, setSelectedFigureIndex] = useState<number | null>(
    null,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);

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

  const allFigures = useMemo<FigureWithGroup[]>(
    () =>
      groups.flatMap((group) => {
        // Only use the latest execution to avoid showing duplicate/outdated figures
        const latestExecution = group.latest_execution;
        if (!latestExecution) return [];
        return (latestExecution.outputs ?? [])
          .filter((output) => output.output_type === "plot")
          .map((figure) => ({ figure, executionGroup: group }));
      }),
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
      if (!matchesSelectorFilters(executionGroup.selectors, selectorFilters)) {
        return false;
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

  // Reset page when filters change
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset page on filter change
  useEffect(() => {
    setCurrentPage(0);
  }, [filter, selectorFilters]);

  const usePagination = pageSize !== undefined && pageSize > 0;
  const totalPages = usePagination
    ? Math.ceil(filteredFigures.length / pageSize)
    : 1;

  const visibleFigures = usePagination
    ? filteredFigures.slice(
        currentPage * pageSize,
        (currentPage + 1) * pageSize,
      )
    : filteredFigures;

  const listRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: filteredFigures.length triggers re-measurement when filter changes affect layout position
  useLayoutEffect(() => {
    if (!usePagination && listRef.current) {
      const rect = listRef.current.getBoundingClientRect();
      setScrollMargin(rect.top + window.scrollY);
    }
  }, [filteredFigures.length, usePagination]);

  const totalRows = Math.ceil(filteredFigures.length / columns);
  const rowVirtualizer = useWindowVirtualizer({
    count: usePagination ? 0 : totalRows,
    estimateSize: () => 400,
    overscan: 9,
    scrollMargin,
    enabled: !usePagination,
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

  const openFigure = (index: number) => {
    setSelectedFigureIndex(index);
    setIsModalOpen(true);
  };

  const items = rowVirtualizer.getVirtualItems();
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="figure-filter">Filter by Figure Name</Label>
        <Input
          id="figure-filter"
          placeholder="Filter figures by name..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      <SelectorFilterPanel
        executionGroups={executionGroups?.data ?? []}
        filters={selectorFilters}
        onFiltersChange={setSelectorFilters}
      />

      {filteredFigures.length > 0 ? (
        usePagination ? (
          <>
            <div className="text-sm text-muted-foreground">
              Showing {currentPage * pageSize + 1}–
              {Math.min((currentPage + 1) * pageSize, filteredFigures.length)}{" "}
              of {filteredFigures.length} figures
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleFigures.map(({ figure, executionGroup }, index) => {
                const globalIndex = currentPage * pageSize + index;
                return (
                  <FigureCard
                    key={figure.id || globalIndex}
                    figure={figure}
                    executionGroup={executionGroup}
                    onClick={() => openFigure(globalIndex)}
                  />
                );
              })}
            </div>
            {totalPages > 1 && (
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            )}
          </>
        ) : (
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
                        <FigureCard
                          key={figure.id || globalIndex}
                          figure={figure}
                          executionGroup={executionGroup}
                          onClick={() => openFigure(globalIndex)}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
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
