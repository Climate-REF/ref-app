import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { ThematicContent } from "@/components/explorer/thematicContent.tsx";

const themesSchema = z.object({
  theme: z
    .enum([
      "atmosphere",
      "earth-system",
      "impact-and-adaptation",
      "land",
      "ocean",
    ])
    .default("atmosphere"),
});

const Themes = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Theme Explorer</h2>
        <p className="text-muted-foreground mt-1">
          Browse climate model evaluation results organized by scientific theme.
        </p>
      </div>
      <ThematicContent />
    </div>
  );
};

export const Route = createFileRoute("/_app/explorer/themes")({
  component: Themes,
  validateSearch: zodValidator(themesSchema),
});
