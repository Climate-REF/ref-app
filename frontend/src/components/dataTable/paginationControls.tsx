import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";

interface PaginationControlsProps {
  offset: number;
  limit: number;
  totalCount: number;
  onOffsetChange: (offset: number) => void;
  onLimitChange: (limit: number) => void;
}

const PAGE_SIZE_OPTIONS = [25, 50, 100, 250];

export function PaginationControls({
  offset,
  limit,
  totalCount,
  onOffsetChange,
  onLimitChange,
}: PaginationControlsProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));
  const currentPage = Math.min(Math.floor(offset / limit) + 1, totalPages);
  const rangeStart =
    offset >= totalCount ? 0 : Math.min(offset + 1, totalCount);
  const rangeEnd =
    offset >= totalCount ? 0 : Math.min(offset + limit, totalCount);

  const canGoPrevious = offset > 0;
  const canGoNext = offset + limit < totalCount;

  return (
    <div className="flex items-center justify-between px-2 py-2">
      <div className="text-sm text-muted-foreground">
        {totalCount > 0 && rangeStart > 0
          ? `Showing ${rangeStart}-${rangeEnd} of ${totalCount}`
          : "No results"}
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows per page</span>
          <Select
            value={String(limit)}
            onValueChange={(value) => onLimitChange(Number(value))}
          >
            <SelectTrigger className="h-8 w-[80px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-muted-foreground">
          Page {currentPage} of {totalPages}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label="First page"
            onClick={() => onOffsetChange(0)}
            disabled={!canGoPrevious}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label="Previous page"
            onClick={() => onOffsetChange(Math.max(0, offset - limit))}
            disabled={!canGoPrevious}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label="Next page"
            onClick={() => onOffsetChange(offset + limit)}
            disabled={!canGoNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label="Last page"
            onClick={() => onOffsetChange((totalPages - 1) * limit)}
            disabled={!canGoNext}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
