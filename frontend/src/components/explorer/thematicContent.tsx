import { useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { BookOpen, FlaskConical } from "lucide-react";
import { useState } from "react";
import { explorerGetThemeOptions } from "@/client/@tanstack/react-query.gen";
import type {
  AftCollectionCard,
  AftCollectionCardContent,
  AftCollectionDetail,
  AftCollectionFilterControl,
  AftCollectionGroupingConfig,
  ThemeDetail,
} from "@/client/types.gen";
import { Button } from "@/components/ui/button.tsx";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Route } from "@/routes/_app/explorer/themes.tsx";
import { ExplorerThemeLayout } from "./explorerThemeLayout";
import type { ChartGroupingConfig } from "./grouping/types";
import type { ExplorerCard, ExplorerCardContent, FilterControl } from "./types";

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

function toFilterControl(
  apiControl: AftCollectionFilterControl,
): FilterControl {
  return {
    filterKey: apiControl.filter_key,
    label: apiControl.label ?? undefined,
    defaultValue: apiControl.default_value ?? undefined,
    excludeValues: apiControl.exclude_values ?? undefined,
  };
}

/**
 * Filter explorer cards to only content items matching a specific diagnostic,
 * then convert to frontend types.
 */
export function filterExplorerContentForDiagnostic(
  cards: AftCollectionCard[],
  providerSlug: string,
  diagnosticSlug: string,
) {
  return cards
    .filter((card: AftCollectionCard) => !card.placeholder)
    .flatMap((card) => card.content)
    .filter(
      (c: AftCollectionCardContent) =>
        c.provider === providerSlug &&
        c.diagnostic === diagnosticSlug &&
        !c.placeholder,
    )
    .map(toExplorerCardContent);
}

export function toExplorerCardContent(
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
        filterControls: apiContent.filter_controls
          ? apiContent.filter_controls.map(toFilterControl)
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
      return {
        ...base,
        type: "figure-gallery",
        filenameFilter: apiContent.filename_filter ?? undefined,
      };
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
          <div className="flex items-center gap-3">
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
            <p className="text-xs text-muted-foreground">
              Toggle between technical descriptions and plain language summaries
            </p>
          </div>
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
