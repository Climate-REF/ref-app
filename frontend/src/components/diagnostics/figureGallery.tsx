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
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { diagnosticsListExecutionGroupsOptions } from "@/client/@tanstack/react-query.gen.ts";
import { MipEraEmptyState } from "@/components/charts/mipEraBar";
import { useSelectedMipEra } from "@/components/charts/mipEraContext";
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
  collectLatestPlotFigures,
  type FigureWithGroup,
  filterFigures,
} from "./figureGalleryData";
import { FigureGalleryModal } from "./figureGalleryModal.tsx";
import { FigureGallerySkeleton } from "./figureGallerySkeleton.tsx";
import { SelectorFilterPanel } from "./selectorFilterPanel.tsx";

interface DiagnosticFigureGalleryProps {
  providerSlug: string;
  diagnosticSlug: string;
  /** When set, display figures in paginated mode instead of infinite scroll */
  pageSize?: number;
  /** Pre-set the filename filter (e.g. from explorer card config) */
  initialFilter?: string;
}

const FigureDropDown = ({ figure, executionGroup }: FigureWithGroup) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
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

/** Grid columns at a window width, matching the grid's md and lg breakpoints */
function columnsAt(width: number): number {
  if (width < 768) return 1;
  if (width < 1024) return 2;
  return 3;
}

/** How many columns the figure grid has at the current window width */
function useGridColumns(): number {
  const [columns, setColumns] = useState(() => columnsAt(window.innerWidth));
  useEffect(() => {
    const handleResize = () => setColumns(columnsAt(window.innerWidth));
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return columns;
}

interface FigureGridProps {
  figures: FigureWithGroup[];
  /** Open the figure at an index of `figures` */
  onOpen: (index: number) => void;
}

/** One page of figures at a time, with controls to change page */
function PaginatedFigureGrid({
  figures,
  onOpen,
  pageSize,
  page,
  onPageChange,
}: FigureGridProps & {
  pageSize: number;
  page: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.ceil(figures.length / pageSize);
  const start = page * pageSize;
  const pageFigures = figures.slice(start, start + pageSize);
  return (
    <>
      <div className="text-sm text-muted-foreground">
        Showing {start + 1}–{start + pageFigures.length} of {figures.length}{" "}
        figures
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pageFigures.map(({ figure, executionGroup }, index) => (
          <FigureCard
            key={figure.id || start + index}
            figure={figure}
            executionGroup={executionGroup}
            onClick={() => onOpen(start + index)}
          />
        ))}
      </div>
      {totalPages > 1 && (
        <PaginationControls
          currentPage={page}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      )}
    </>
  );
}

/** All the figures in rows, rendering only the rows near the window's scroll position */
function VirtualFigureGrid({
  figures,
  onOpen,
  columns,
}: FigureGridProps & { columns: number }) {
  const listRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: figures.length triggers re-measurement when filter changes affect layout position
  useLayoutEffect(() => {
    if (listRef.current) {
      const rect = listRef.current.getBoundingClientRect();
      setScrollMargin(rect.top + window.scrollY);
    }
  }, [figures.length]);

  const rowVirtualizer = useWindowVirtualizer({
    count: Math.ceil(figures.length / columns),
    estimateSize: () => 400,
    overscan: 9,
    scrollMargin,
  });
  const rows = rowVirtualizer.getVirtualItems();

  return (
    <div
      ref={listRef}
      className="relative"
      style={{ height: rowVirtualizer.getTotalSize() }}
    >
      <div
        className="absolute top-0 left-0 w-full"
        style={{
          transform: `translateY(${(rows[0]?.start ?? 0) - rowVirtualizer.options.scrollMargin}px)`,
        }}
      >
        {rows.map((virtualRow) => {
          const start = virtualRow.index * columns;
          return (
            <div
              key={virtualRow.index}
              data-index={virtualRow.index}
              ref={rowVirtualizer.measureElement}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
                {figures
                  .slice(start, start + columns)
                  .map(({ figure, executionGroup }, colIndex) => (
                    <FigureCard
                      key={figure.id || start + colIndex}
                      figure={figure}
                      executionGroup={executionGroup}
                      onClick={() => onOpen(start + colIndex)}
                    />
                  ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function FigureGallery({
  providerSlug,
  diagnosticSlug,
  pageSize,
  initialFilter,
}: DiagnosticFigureGalleryProps) {
  const [filter, setFilter] = useState(initialFilter ?? "");
  const [selectorFilters, setSelectorFilters] = useState<
    Record<string, string[]>
  >({});
  const [selectedFigureIndex, setSelectedFigureIndex] = useState<number | null>(
    null,
  );
  const [currentPage, setCurrentPage] = useState(0);
  const columns = useGridColumns();
  const selectedMipEra = useSelectedMipEra();

  const { data: executionGroups, isLoading } = useQuery(
    diagnosticsListExecutionGroupsOptions({
      path: { provider_slug: providerSlug, diagnostic_slug: diagnosticSlug },
      query: { mip_era: selectedMipEra ?? undefined },
    }),
  );
  const groups = executionGroups?.data ?? [];

  const allFigures = useMemo(() => collectLatestPlotFigures(groups), [groups]);
  const filteredFigures = useMemo(
    () => filterFigures(allFigures, filter, selectorFilters),
    [allFigures, filter, selectorFilters],
  );

  if (isLoading) {
    return <FigureGallerySkeleton nColumns={columns} nRows={2} />;
  }

  // A filter change can leave the current page past the last one
  const changeFilter = (text: string) => {
    setFilter(text);
    setCurrentPage(0);
  };
  const changeSelectorFilters = (filters: Record<string, string[]>) => {
    setSelectorFilters(filters);
    setCurrentPage(0);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="figure-filter">Filter by Figure Name</Label>
        <Input
          id="figure-filter"
          placeholder="Filter figures by name..."
          value={filter}
          onChange={(e) => changeFilter(e.target.value)}
        />
      </div>

      <SelectorFilterPanel
        executionGroups={groups}
        filters={selectorFilters}
        onFiltersChange={changeSelectorFilters}
      />

      {filteredFigures.length === 0 ? (
        <div className="flex min-h-[350px] items-center justify-center text-sm text-muted-foreground">
          {groups.length === 0 ? (
            <MipEraEmptyState what="figures" />
          ) : (
            "No figures found matching your filters."
          )}
        </div>
      ) : pageSize !== undefined && pageSize > 0 ? (
        <PaginatedFigureGrid
          figures={filteredFigures}
          onOpen={setSelectedFigureIndex}
          pageSize={pageSize}
          page={currentPage}
          onPageChange={setCurrentPage}
        />
      ) : (
        <VirtualFigureGrid
          figures={filteredFigures}
          onOpen={setSelectedFigureIndex}
          columns={columns}
        />
      )}

      <FigureGalleryModal
        figures={filteredFigures}
        selectedIndex={selectedFigureIndex}
        onSelect={setSelectedFigureIndex}
      />
    </div>
  );
}
