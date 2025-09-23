import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect } from "react";
import type { ExecutionGroup, ExecutionOutput } from "@/client";
import { Figure } from "@/components/execution/executionFiles/figure.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";

interface FigureWithGroup {
  figure: ExecutionOutput;
  executionGroup: ExecutionGroup;
}

interface FigureGalleryModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  figures: FigureWithGroup[];
  selectedIndex: number | null;
  onPrevious: () => void;
  onNext: () => void;
}

export function FigureGalleryModal({
  isOpen,
  onOpenChange,
  figures,
  selectedIndex,
  onPrevious,
  onNext,
}: FigureGalleryModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        onPrevious();
      } else if (event.key === "ArrowRight") {
        onNext();
      } else if (event.key === "Escape") {
        onOpenChange(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onPrevious, onNext, onOpenChange]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
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
                onClick={onPrevious}
                disabled={figures.length <= 1}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                {selectedIndex + 1} of {figures.length}
              </span>
              <Button
                variant="outline"
                onClick={onNext}
                disabled={figures.length <= 1}
              >
                Next
                <ChevronRight className="h-4 w-4 mr-2" />
              </Button>
            </div>
            <Figure {...figures[selectedIndex].figure} />
            <div className="mt-4 text-sm text-muted-foreground">
              <p>Group: {figures[selectedIndex].executionGroup.key}</p>
              <p>Description: {figures[selectedIndex].figure.description}</p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
