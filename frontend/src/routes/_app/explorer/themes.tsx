import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { MipEraProvider } from "@/components/charts/mipEraContext";
import { MipEraSelector } from "@/components/charts/mipEraSelector";
import { ThematicContent } from "@/components/explorer/thematicContent.tsx";
import { mipEraSearchSchema } from "@/lib/mipEras";

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
  ...mipEraSearchSchema,
});

const Themes = () => {
  const { mip_era: mipEra } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Theme Explorer</h2>
        <p className="text-muted-foreground mt-1">
          Browse climate model evaluation results organized by scientific theme.
        </p>
      </div>
      <MipEraSelector
        mipEra={mipEra}
        onChange={(next) =>
          navigate({ search: (prev) => ({ ...prev, mip_era: next }) })
        }
      />
      <MipEraProvider mipEra={mipEra}>
        <ThematicContent />
      </MipEraProvider>
    </div>
  );
};

export const Route = createFileRoute("/_app/explorer/themes")({
  component: Themes,
  validateSearch: zodValidator(themesSchema),
});
