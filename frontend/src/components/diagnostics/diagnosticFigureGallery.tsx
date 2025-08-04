import { useState } from "react";
import { Figure } from "@/components/execution/executionFiles/figure.tsx";
import { Input } from "@/components/ui/input.tsx";
import type { Execution } from "@/client/types.gen.ts";

interface DiagnosticFigureGalleryProps {
  executions: Execution[];
}

export function DiagnosticFigureGallery({ executions }: DiagnosticFigureGalleryProps) {
  const [filter, setFilter] = useState("");

  const figures = executions.flatMap((execution) =>
    (execution.outputs ?? []).filter((output) => {
      if (output.output_type !== "plot") {
        return false;
      }
      if (filter) {
        try {
          const regex = new RegExp(filter, "i");
          return regex.test(output.description);
        } catch (e) {
          // Invalid regex, don't filter
          return true;
        }
      }
      return true;
    }),
  );

  return (
    <div className="space-y-4">
      <div>
        <Input
          placeholder="Filter figures by name (regex)..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>
      {figures.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {figures.map((figure) => (
            <Figure key={figure.id} {...figure} />
          ))}
        </div>
      ) : (
        <div className="text-center text-sm text-muted-foreground">
          No figures found for this diagnostic or filter.
        </div>
      )}
    </div>
  );
}