import { Card, CardContent } from "@/components/ui/card.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Select, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";

export function FigureGallerySkeleton({
  nColumns = 3,
  nRows = 2,
}: {
  nColumns?: number;
  nRows?: number;
}) {
  const nItems = nColumns * nRows;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="group-filter">Filter by Execution Group</Label>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="All groups" />
            </SelectTrigger>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="figure-filter">Filter by Figure Name (regex)</Label>
          <Input id="figure-filter" placeholder="Filter figures by name..." />
        </div>
      </div>

      <div className={`grid grid-cols-${nColumns} gap-4`}>
        {Array.from({ length: nItems }, (_, i) => {
          return (
            <Card
              // biome-ignore lint/suspicious/noArrayIndexKey: Skeleton only
              key={`skeleton-${i}`}
              className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
            >
              <CardContent className="p-4">
                <div className="animate-pulse h-96 bg-muted rounded-md" />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
