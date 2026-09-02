import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { MipEraScope } from "@/components/charts/mipEraBar";
import { ThematicContent } from "@/components/explorer/thematicContent.tsx";
import { useMipEra } from "@/hooks/useMipEra";
import { mipEraSearchFields } from "@/lib/mipEras";

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
  ...mipEraSearchFields,
});

const Themes = () => {
  const { mip_era } = Route.useSearch();
  const { mipEra, setMipEra } = useMipEra(mip_era);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Theme Explorer</h2>
        <p className="text-muted-foreground mt-1">
          Browse climate model evaluation results organized by scientific theme.
        </p>
      </div>
      <MipEraScope mipEra={mipEra} setMipEra={setMipEra}>
        <ThematicContent />
      </MipEraScope>
    </div>
  );
};

export const Route = createFileRoute("/_app/explorer/themes")({
  component: Themes,
  validateSearch: zodValidator(themesSchema),
});
