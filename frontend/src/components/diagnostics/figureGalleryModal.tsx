import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect } from "react";
import { Figure } from "@/components/diagnostics/figure";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import type { FigureWithGroup } from "./figureGalleryData";

interface FigureGalleryModalProps {
  figures: FigureWithGroup[];
  /** The index of the figure shown, or null when the modal is closed */
  selectedIndex: number | null;
  /** Show the figure at an index, or close the modal with null */
  onSelect: (index: number | null) => void;
}

/** The index `by` figures on from `index`, wrapping around past either end */
const stepped = (index: number, by: number, count: number) =>
  (index + by + count) % count;

export function FigureGalleryModal({
  figures,
  selectedIndex,
  onSelect,
}: FigureGalleryModalProps) {
  const count = figures.length;
  useEffect(() => {
    if (selectedIndex === null) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        onSelect(stepped(selectedIndex, -1, count));
      } else if (event.key === "ArrowRight") {
        onSelect(stepped(selectedIndex, 1, count));
      } else if (event.key === "Escape") {
        onSelect(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex, count, onSelect]);

  return (
    <Dialog
      open={selectedIndex !== null}
      onOpenChange={(open) => !open && onSelect(null)}
    >
      <DialogContent className="w-3/4 max-h-full sm:max-w-full">
        {selectedIndex !== null && figures[selectedIndex] && (
          <>
            <DialogHeader>
              <DialogTitle>
                {figures[selectedIndex].figure.description}
              </DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="outline"
                onClick={() => onSelect(stepped(selectedIndex, -1, count))}
                disabled={count <= 1}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                {selectedIndex + 1} of {count}
              </span>
              <Button
                variant="outline"
                onClick={() => onSelect(stepped(selectedIndex, 1, count))}
                disabled={count <= 1}
              >
                Next
                <ChevronRight className="h-4 w-4 mr-2" />
              </Button>
            </div>
            <Figure {...figures[selectedIndex].figure} size="large" />
            <div className="mt-4 text-sm text-muted-foreground">
              <p>Group: {figures[selectedIndex].executionGroup.key}</p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
