import { useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { BookOpen, FlaskConical } from "lucide-react";
import { useState } from "react";
import { explorerGetThemeOptions } from "@/client/@tanstack/react-query.gen";
import type {
  AftCollectionCard,
  AftCollectionCardContent,
  AftCollectionDetail,
  AftCollectionGroupingConfig,
  ThemeDetail,
} from "@/client/types.gen";
import { Button } from "@/components/ui/button.tsx";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Route } from "@/routes/_app/explorer/themes.tsx";
import { ExplorerThemeLayout } from "./explorerThemeLayout";
import type { ChartGroupingConfig } from "./grouping/types";
import type { ExplorerCard, ExplorerCardContent } from "./types";

const themes = [
  { name: "atmosphere", title: "Atmosphere" },
  { name: "earth-system", title: "Earth System" },
  { name: "impact-and-adaptation", title: "Impact & Adaptation" },
  { name: "land", title: "Land & Land Ice" },
  { name: "ocean", title: "Ocean & Sea Ice" },
] as const;

type ThemeName = (typeof themes)[number]["name"];

function toChartGroupingConfig(
  apiConfig: AftCollectionGroupingConfig,
): ChartGroupingConfig {
  return {
    groupBy: apiConfig.group_by,
    hue: apiConfig.hue,
    style: apiConfig.style ?? undefined,
  };
}

function toExplorerCardContent(
  apiContent: AftCollectionCardContent,
): ExplorerCardContent {
  const base = {
    provider: apiContent.provider,
    diagnostic: apiContent.diagnostic,
    title: apiContent.title,
    description: apiContent.description ?? undefined,
    interpretation: apiContent.interpretation ?? undefined,
    span: apiContent.span ?? undefined,
    placeholder: apiContent.placeholder ?? undefined,
    referenceDatasets: apiContent.reference_datasets ?? undefined,
  };
  switch (apiContent.type) {
    case "box-whisker-chart":
      return {
        ...base,
        type: "box-whisker-chart",
        metricUnits: apiContent.metric_units ?? undefined,
        otherFilters: apiContent.other_filters ?? undefined,
        clipMin: apiContent.clip_min ?? undefined,
        clipMax: apiContent.clip_max ?? undefined,
        yMin: apiContent.y_min ?? undefined,
        yMax: apiContent.y_max ?? undefined,
        showZeroLine: apiContent.show_zero_line ?? undefined,
        symmetricalAxes: apiContent.symmetrical_axes ?? undefined,
        groupingConfig: apiContent.grouping_config
          ? toChartGroupingConfig(apiContent.grouping_config)
          : undefined,
      };
    case "series-chart":
      return {
        ...base,
        type: "series-chart",
        metricUnits: apiContent.metric_units ?? undefined,
        otherFilters: apiContent.other_filters ?? undefined,
        symmetricalAxes: apiContent.symmetrical_axes ?? undefined,
        groupingConfig: apiContent.grouping_config
          ? toChartGroupingConfig(apiContent.grouping_config)
          : undefined,
        labelTemplate: apiContent.label_template ?? undefined,
      };
    case "taylor-diagram":
      return {
        ...base,
        type: "taylor-diagram",
        otherFilters: apiContent.other_filters ?? undefined,
        referenceStddev: apiContent.reference_stddev ?? undefined,
      };
    case "figure-gallery":
      return { ...base, type: "figure-gallery" };
  }
}

function collectionToExplorerCards(
  collection: AftCollectionDetail,
): ExplorerCard[] {
  return collection.explorer_cards
    .filter((card: AftCollectionCard) => !card.placeholder)
    .map((card: AftCollectionCard) => ({
      title: card.title,
      description: card.description ?? undefined,
      content: card.content
        .filter((c: AftCollectionCardContent) => !c.placeholder)
        .map(toExplorerCardContent),
    }));
}

function buildCollectionGroups(theme: ThemeDetail) {
  return theme.collections
    .map((collection) => ({
      collection,
      cards: collectionToExplorerCards(collection),
    }))
    .filter((group) => group.cards.length > 0);
}

function hasPlainLanguageContent(theme: ThemeDetail): boolean {
  return theme.collections.some((c) => {
    const pl = c.content?.plain_language;
    return pl?.description || pl?.why_it_matters || pl?.takeaway;
  });
}

function ThemeContent({
  theme,
  plainLanguage,
}: {
  theme: ThemeDetail;
  plainLanguage: boolean;
}) {
  const collectionGroups = buildCollectionGroups(theme);
  return (
    <ExplorerThemeLayout
      collectionGroups={collectionGroups}
      plainLanguage={plainLanguage}
    />
  );
}

export function ThematicContent() {
  const { theme } = Route.useSearch();
  const navigate = useNavigate();
  const themeObj = themes.find((t) => t.name === theme);
  const [plainLanguage, setPlainLanguage] = useState(false);

  const { data: themeData } = useSuspenseQuery(
    explorerGetThemeOptions({ path: { theme_slug: theme } }),
  );
  const showPlainLanguageToggle = hasPlainLanguageContent(themeData);

  return (
    <>
      <title>{`${themeObj?.title} Explorer - Climate REF`}</title>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <Tabs<ThemeName>
            value={theme}
            onValueChange={(value) => {
              navigate({
                to: Route.fullPath,
                search: { theme: value },
              });
            }}
          >
            <TabsList className="overflow-x-auto">
              {themes.map((item) => (
                <TabsTrigger<ThemeName> key={item.name} value={item.name}>
                  {item.title}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          {showPlainLanguageToggle && (
            <Button
              variant={plainLanguage ? "default" : "outline"}
              size="sm"
              onClick={() => setPlainLanguage(!plainLanguage)}
              className="gap-2 shrink-0"
            >
              {plainLanguage ? (
                <BookOpen className="h-4 w-4" />
              ) : (
                <FlaskConical className="h-4 w-4" />
              )}
              {plainLanguage ? "Plain Language" : "Technical"}
            </Button>
          )}
        </div>
        {showPlainLanguageToggle && (
          <p className="text-xs text-muted-foreground">
            Toggle between technical descriptions and plain language summaries
            using the button above.
          </p>
        )}
      </div>
      <div className="mt-6">
        {theme && (
          <ThemeContent theme={themeData} plainLanguage={plainLanguage} />
        )}
      </div>
    </>
  );
}
