import type {
  AftCollectionCard,
  AftCollectionCardContent,
  AftCollectionDetail,
  AftCollectionFilterControl,
  AftCollectionGroupingConfig,
  ThemeDetail,
} from "@/client/types.gen";
import type { ChartGroupingConfig } from "./grouping/types";
import type { ExplorerCard, ExplorerCardContent, FilterControl } from "./types";

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

/** The fields every type of content has. */
function baseFields(api: AftCollectionCardContent) {
  return {
    provider: api.provider,
    diagnostic: api.diagnostic,
    title: api.title,
    description: api.description ?? undefined,
    interpretation: api.interpretation ?? undefined,
    span: api.span ?? undefined,
    placeholder: api.placeholder ?? undefined,
    referenceDatasets: api.reference_datasets ?? undefined,
  };
}

/** The fields box-whisker and series charts share. */
function chartFields(api: AftCollectionCardContent) {
  return {
    metricUnits: api.metric_units ?? undefined,
    otherFilters: api.other_filters ?? undefined,
    symmetricalAxes: api.symmetrical_axes ?? undefined,
    groupingConfig: api.grouping_config
      ? toChartGroupingConfig(api.grouping_config)
      : undefined,
    filterControls: api.filter_controls?.map(toFilterControl),
  };
}

/** Convert a content item of the API to the frontend type, with null fields left undefined. */
export function toExplorerCardContent(
  apiContent: AftCollectionCardContent,
): ExplorerCardContent {
  const base = baseFields(apiContent);
  switch (apiContent.type) {
    case "box-whisker-chart":
      return {
        ...base,
        ...chartFields(apiContent),
        type: "box-whisker-chart",
        clipMin: apiContent.clip_min ?? undefined,
        clipMax: apiContent.clip_max ?? undefined,
        yMin: apiContent.y_min ?? undefined,
        yMax: apiContent.y_max ?? undefined,
        showZeroLine: apiContent.show_zero_line ?? undefined,
      };
    case "series-chart":
      return {
        ...base,
        ...chartFields(apiContent),
        type: "series-chart",
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

/** The cards of each collection of a theme, leaving out placeholders and collections without cards. */
export function buildCollectionGroups(theme: ThemeDetail) {
  return theme.collections
    .map((collection) => ({
      collection,
      cards: collectionToExplorerCards(collection),
    }))
    .filter((group) => group.cards.length > 0);
}
