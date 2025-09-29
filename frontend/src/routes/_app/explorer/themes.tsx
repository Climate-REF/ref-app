import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { ThematicContent } from "@/components/explorer/thematicContent.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";

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
    <Card>
      <CardContent className="space-y-4 pt-6">
        <ThematicContent />
      </CardContent>
    </Card>
  );
};

export const Route = createFileRoute("/_app/explorer/themes")({
  component: Themes,
  validateSearch: zodValidator(themesSchema),
});
