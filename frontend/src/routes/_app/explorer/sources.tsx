import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { SourceExplorer } from "@/components/explorer/sourceExplorer.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";

const sourcesSchema = z.object({
  sourceId: z.string().optional(),
});

const Sources = () => {
  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <p className="text-sm text-muted-foreground">
          Browse target models and reference datasets available in this
          instance. Use the controls to narrow by project, experiment, or
          variable. Selecting a source will tailor diagnostics to your scope.
        </p>
        <SourceExplorer />
      </CardContent>
    </Card>
  );
};

export const Route = createFileRoute("/_app/explorer/sources")({
  component: Sources,
  validateSearch: zodValidator(sourcesSchema),
});
