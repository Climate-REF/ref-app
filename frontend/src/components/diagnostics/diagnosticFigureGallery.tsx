import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  MoreHorizontal,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { ExecutionGroup, ExecutionOutput } from "@/client";
import { diagnosticsListExecutionGroupsOptions } from "@/client/@tanstack/react-query.gen.ts";
import { Figure } from "@/components/execution/executionFiles/figure.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
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

interface DiagnosticFigureGalleryProps {
  providerSlug: string;
  diagnosticSlug: string;
}

interface FigureWithGroup {
  figure: ExecutionOutput;
  executionGroup: ExecutionGroup;
}

export function DiagnosticFigureGallery({
  providerSlug,
  diagnosticSlug,
}: DiagnosticFigureGalleryProps) {
  const [filter, setFilter] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [selectedFigureIndex, setSelectedFigureIndex] = useState<number | null>(
    null,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: executionGroups, isLoading } = useQuery(
    diagnosticsListExecutionGroupsOptions({
      path: { provider_slug: providerSlug, diagnostic_slug: diagnosticSlug },
    }),
  );

  const allFigures: FigureWithGroup[] = (executionGroups?.data ?? []).flatMap(
    (group) =>
      (group.executions ?? []).flatMap((execution) =>
        (execution.outputs ?? [])
          .filter((output) => output.output_type === "plot")
          .map((figure) => ({ figure, executionGroup: group })),
      ),
  );

  const filteredFigures = allFigures.filter(({ figure, executionGroup }) => {
    if (
      selectedGroup !== "all" &&
      selectedGroup !== executionGroup.id.toString()
    ) {
      return false;
    }
    if (filter) {
      try {
        const regex = new RegExp(filter, "i");
        return regex.test(figure.description);
      } catch {
        // Invalid regex, don't filter
        return true;
      }
    }
    return true;
  });

  const uniqueGroups = Array.from(
    new Set(allFigures.map(({ executionGroup }) => executionGroup.id)),
  )
    .map((id) => executionGroups?.data?.find((g) => g.id === id))
    .filter(Boolean);

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

  useEffect(() => {
    if (!isModalOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        goToPrevious();
      } else if (event.key === "ArrowRight") {
        goToNext();
      } else if (event.key === "Escape") {
        setIsModalOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen, goToPrevious, goToNext]);

  if (isLoading) {
    return <div>Loading figures...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Figures Gallery</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="group-filter">Filter by Execution Group</Label>
            <Select value={selectedGroup} onValueChange={setSelectedGroup}>
              <SelectTrigger>
                <SelectValue placeholder="All groups" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Groups</SelectItem>
                {uniqueGroups.map((group) => (
                  <SelectItem key={group!.id} value={group!.id.toString()}>
                    {group!.key}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="figure-filter">Filter by Figure Name (regex)</Label>
            <Input
              id="figure-filter"
              placeholder="Filter figures by name..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
        </div>

        {filteredFigures.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFigures.map(({ figure, executionGroup }, index) => (
              <Card
                key={figure.id}
                className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => {
                  setSelectedFigureIndex(index);
                  setIsModalOpen(true);
                }}
              >
                <CardContent className="p-4">
                  <Figure {...figure} />
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Group: {executionGroup.key}
                    </p>
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
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center text-sm text-muted-foreground py-8">
            No figures found matching your filters.
          </div>
        )}

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-4xl">
            {selectedFigureIndex !== null && (
              <>
                <DialogHeader>
                  <DialogTitle>
                    {filteredFigures[selectedFigureIndex].figure.description}
                  </DialogTitle>
                </DialogHeader>
                <div className="flex items-center justify-between mb-4">
                  <Button
                    variant="outline"
                    onClick={goToPrevious}
                    disabled={filteredFigures.length <= 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {selectedFigureIndex + 1} of {filteredFigures.length}
                  </span>
                  <Button
                    variant="outline"
                    onClick={goToNext}
                    disabled={filteredFigures.length <= 1}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 mr-2" />
                  </Button>
                </div>
                <Figure {...filteredFigures[selectedFigureIndex].figure} />
                <div className="mt-4 text-sm text-muted-foreground">
                  <p>
                    Group:{" "}
                    {filteredFigures[selectedFigureIndex].executionGroup.key}
                  </p>
                  <p>
                    Description:{" "}
                    {filteredFigures[selectedFigureIndex].figure.description}
                  </p>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
