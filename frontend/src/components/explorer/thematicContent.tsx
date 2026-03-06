import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { explorerGetThemeOptions } from "@/client/@tanstack/react-query.gen";
import type {
  AftCollectionCard,
  AftCollectionCardContent,
  AftCollectionGroupingConfig,
  ThemeDetail,
} from "@/client/types.gen";
import { Button } from "@/components/ui/button.tsx";
import { Route } from "@/routes/_app/explorer/themes.tsx";
import { ExplorerThemeLayout } from "./explorerThemeLayout";
import type { ChartGroupingConfig } from "./grouping/types";
import type { ExplorerCard, ExplorerCardContent } from "./types";

const themes = [
  { name: "atmosphere", title: "Atmosphere" },
  { name: "earth-system", title: "Earth System" },
  { name: "impact-and-adaptation", title: "Impact and Adaptation" },
  { name: "land", title: "Land and Land Ice" },
  { name: "ocean", title: "Ocean and Sea Ice" },
];

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

function themeToExplorerCards(theme: ThemeDetail): ExplorerCard[] {
  return theme.explorer_cards.map((card: AftCollectionCard) => ({
    title: card.title,
    description: card.description ?? undefined,
    placeholder: card.placeholder ?? undefined,
    content: card.content.map(toExplorerCardContent),
  }));
}

function ThemeContent({ slug }: { slug: string }) {
  const { data: theme } = useSuspenseQuery(
    explorerGetThemeOptions({ path: { theme_slug: slug } }),
  );
  const cards = themeToExplorerCards(theme);
  return <ExplorerThemeLayout cards={cards} />;
}

export function ThematicContent() {
  const { theme } = Route.useSearch();
  const themeObj = themes.find((t) => t.name === theme);
  return (
    <>
      <title>{`${themeObj?.title} Explorer - Climate REF`}</title>
      <div className="space-x-2">
        {themes.map((item) => (
          <Link
            key={item.name}
            to={Route.fullPath}
            // @ts-expect-error Incorrect type for search
            search={{ theme: item.name }}
          >
            <Button
              key={item.title}
              variant={item.name === theme ? "default" : "outline"}
            >
              {item.title}
            </Button>
          </Link>
        ))}
      </div>
      <div>{theme && <ThemeContent slug={theme} />}</div>
    </>
  );
}
