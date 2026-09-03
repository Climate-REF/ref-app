import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { useState } from "react";
import { z } from "zod";
import { explorerGetThemeOptions } from "@/client/@tanstack/react-query.gen";
import { MipEraScope } from "@/components/charts/mipEraBar";
import {
  hasPlainLanguageContent,
  PlainLanguageToggle,
  ThematicContent,
} from "@/components/explorer/thematicContent.tsx";
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
  const { mip_era, theme } = Route.useSearch();
  const { mipEra, setMipEra } = useMipEra(mip_era);
  const [plainLanguage, setPlainLanguage] = useState(false);

  // The same query ThematicContent suspends on, so the toggle never pops in late.
  const { data: themeData } = useSuspenseQuery(
    explorerGetThemeOptions({ path: { theme_slug: theme } }),
  );
  const showPlainLanguageToggle = hasPlainLanguageContent(themeData);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Theme Explorer</h2>
        <p className="text-muted-foreground mt-1">
          Browse climate model evaluation results organized by scientific theme.
        </p>
      </div>
      <MipEraScope
        mipEra={mipEra}
        setMipEra={setMipEra}
        actions={
          showPlainLanguageToggle ? (
            <PlainLanguageToggle
              plainLanguage={plainLanguage}
              setPlainLanguage={setPlainLanguage}
            />
          ) : null
        }
      >
        <ThematicContent plainLanguage={plainLanguage} />
      </MipEraScope>
    </div>
  );
};

export const Route = createFileRoute("/_app/explorer/themes")({
  component: Themes,
  validateSearch: zodValidator(themesSchema),
});
