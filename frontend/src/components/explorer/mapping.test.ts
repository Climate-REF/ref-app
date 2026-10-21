import { describe, expect, it } from "vitest";
import type {
  AftCollectionCard,
  AftCollectionCardContent,
  AftCollectionDetail,
} from "@/client/types.gen";
import {
  buildCollectionGroups,
  filterExplorerContentForDiagnostic,
  toExplorerCardContent,
} from "./mapping";

function makeCard(
  title: string,
  ...content: Array<{
    provider: string;
    diagnostic: string;
    type?: AftCollectionCard["content"][number]["type"];
    title?: string;
    placeholder?: boolean | null;
  }>
): AftCollectionCard {
  return {
    title,
    content: content.map((c) => ({
      type: c.type ?? "box-whisker-chart",
      provider: c.provider,
      diagnostic: c.diagnostic,
      title: c.title ?? `${c.provider}/${c.diagnostic}`,
      placeholder: c.placeholder ?? null,
    })),
  };
}

describe("filterExplorerContentForDiagnostic", () => {
  it("returns only content items matching the given provider and diagnostic", () => {
    const cards = [
      makeCard(
        "Card A",
        { provider: "ilamb", diagnostic: "amoc-rapid" },
        { provider: "esmvaltool", diagnostic: "tas-bias" },
      ),
    ];

    const result = filterExplorerContentForDiagnostic(
      cards,
      "ilamb",
      "amoc-rapid",
    );

    expect(result).toHaveLength(1);
    expect(result[0].provider).toBe("ilamb");
    expect(result[0].diagnostic).toBe("amoc-rapid");
  });

  it("returns items from multiple cards", () => {
    const cards = [
      makeCard("Card A", {
        provider: "ilamb",
        diagnostic: "amoc-rapid",
        title: "From A",
      }),
      makeCard("Card B", {
        provider: "ilamb",
        diagnostic: "amoc-rapid",
        title: "From B",
      }),
    ];

    const result = filterExplorerContentForDiagnostic(
      cards,
      "ilamb",
      "amoc-rapid",
    );

    expect(result).toHaveLength(2);
    expect(result[0].title).toBe("From A");
    expect(result[1].title).toBe("From B");
  });

  it("excludes placeholder cards entirely", () => {
    const cards: AftCollectionCard[] = [
      {
        title: "Placeholder Card",
        placeholder: true,
        content: [
          {
            type: "box-whisker-chart",
            provider: "ilamb",
            diagnostic: "amoc-rapid",
            title: "Should not appear",
          },
        ],
      },
      makeCard("Real Card", {
        provider: "ilamb",
        diagnostic: "amoc-rapid",
        title: "Should appear",
      }),
    ];

    const result = filterExplorerContentForDiagnostic(
      cards,
      "ilamb",
      "amoc-rapid",
    );

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Should appear");
  });

  it("excludes placeholder content items", () => {
    const cards = [
      makeCard(
        "Card A",
        { provider: "ilamb", diagnostic: "amoc-rapid", placeholder: true },
        { provider: "ilamb", diagnostic: "amoc-rapid", placeholder: false },
      ),
    ];

    const result = filterExplorerContentForDiagnostic(
      cards,
      "ilamb",
      "amoc-rapid",
    );

    expect(result).toHaveLength(1);
  });

  it("returns empty array when no content matches", () => {
    const cards = [
      makeCard("Card A", {
        provider: "esmvaltool",
        diagnostic: "tas-bias",
      }),
    ];

    const result = filterExplorerContentForDiagnostic(
      cards,
      "ilamb",
      "amoc-rapid",
    );

    expect(result).toHaveLength(0);
  });

  it("returns empty array for empty cards list", () => {
    const result = filterExplorerContentForDiagnostic(
      [],
      "ilamb",
      "amoc-rapid",
    );
    expect(result).toHaveLength(0);
  });

  it("requires both provider and diagnostic to match", () => {
    const cards = [
      makeCard(
        "Card A",
        { provider: "ilamb", diagnostic: "tas-bias" },
        { provider: "esmvaltool", diagnostic: "amoc-rapid" },
      ),
    ];

    const result = filterExplorerContentForDiagnostic(
      cards,
      "ilamb",
      "amoc-rapid",
    );

    expect(result).toHaveLength(0);
  });

  it("converts API content to frontend types with correct field mapping", () => {
    const cards: AftCollectionCard[] = [
      {
        title: "Card A",
        content: [
          {
            type: "box-whisker-chart",
            provider: "ilamb",
            diagnostic: "amoc-rapid",
            title: "AMOC Strength",
            description: "A description",
            interpretation: "Higher is better",
            span: 2,
            metric_units: "Sv",
            grouping_config: {
              group_by: "statistic",
              hue: "statistic",
            },
            other_filters: { region: "None" },
          },
        ],
      },
    ];

    const result = filterExplorerContentForDiagnostic(
      cards,
      "ilamb",
      "amoc-rapid",
    );

    expect(result).toHaveLength(1);
    const item = result[0];
    expect(item.type).toBe("box-whisker-chart");
    expect(item.title).toBe("AMOC Strength");
    expect(item.description).toBe("A description");
    expect(item.interpretation).toBe("Higher is better");
    expect(item.span).toBe(2);
    // Verify snake_case to camelCase conversion
    if (item.type === "box-whisker-chart") {
      expect(item.metricUnits).toBe("Sv");
      expect(item.otherFilters).toEqual({ region: "None" });
      expect(item.groupingConfig).toEqual({
        groupBy: "statistic",
        hue: "statistic",
        style: undefined,
      });
    }
  });

  it("converts filter_controls to filterControls for series-chart", () => {
    const cards: AftCollectionCard[] = [
      {
        title: "Card A",
        content: [
          {
            type: "series-chart",
            provider: "esmvaltool",
            diagnostic: "regional-historical-annual-cycle",
            title: "Annual Cycle",
            filter_controls: [
              {
                filter_key: "region",
                label: "Region",
                default_value: "Africa",
                exclude_values: ["Global"],
              },
            ],
          },
        ],
      },
    ];

    const result = filterExplorerContentForDiagnostic(
      cards,
      "esmvaltool",
      "regional-historical-annual-cycle",
    );

    expect(result).toHaveLength(1);
    const item = result[0];
    expect(item.type).toBe("series-chart");
    if (item.type === "series-chart") {
      expect(item.filterControls).toEqual([
        {
          filterKey: "region",
          label: "Region",
          defaultValue: "Africa",
          excludeValues: ["Global"],
        },
      ]);
    }
  });

  it("handles all content types correctly", () => {
    const cards: AftCollectionCard[] = [
      {
        title: "Mixed",
        content: [
          {
            type: "box-whisker-chart",
            provider: "ilamb",
            diagnostic: "amoc",
            title: "Box",
          },
          {
            type: "figure-gallery",
            provider: "ilamb",
            diagnostic: "amoc",
            title: "Gallery",
          },
          {
            type: "series-chart",
            provider: "ilamb",
            diagnostic: "amoc",
            title: "Series",
          },
          {
            type: "taylor-diagram",
            provider: "ilamb",
            diagnostic: "amoc",
            title: "Taylor",
          },
        ],
      },
    ];

    const result = filterExplorerContentForDiagnostic(cards, "ilamb", "amoc");

    expect(result).toHaveLength(4);
    expect(result.map((r) => r.type)).toEqual([
      "box-whisker-chart",
      "figure-gallery",
      "series-chart",
      "taylor-diagram",
    ]);
  });
});

function makeContent(
  overrides: Partial<AftCollectionCardContent>,
): AftCollectionCardContent {
  return {
    type: "box-whisker-chart",
    provider: "ilamb",
    diagnostic: "amoc",
    title: "Content",
    ...overrides,
  };
}

describe("toExplorerCardContent", () => {
  it("maps the clip and y bounds and the zero line of a box-whisker chart", () => {
    const item = toExplorerCardContent(
      makeContent({
        clip_min: -1,
        clip_max: 2,
        y_min: -5,
        y_max: 5,
        show_zero_line: false,
        symmetrical_axes: true,
      }),
    );

    expect(item).toMatchObject({
      type: "box-whisker-chart",
      clipMin: -1,
      clipMax: 2,
      yMin: -5,
      yMax: 5,
      showZeroLine: false,
      symmetricalAxes: true,
    });
  });

  it("maps the label template and chart fields of a series chart", () => {
    const item = toExplorerCardContent(
      makeContent({
        type: "series-chart",
        label_template: "{source_id} ({experiment_id})",
        metric_units: "K",
        other_filters: { statistic: "mean" },
        grouping_config: { group_by: "source_id", hue: "experiment_id" },
      }),
    );

    expect(item).toMatchObject({
      type: "series-chart",
      labelTemplate: "{source_id} ({experiment_id})",
      metricUnits: "K",
      otherFilters: { statistic: "mean" },
      groupingConfig: { groupBy: "source_id", hue: "experiment_id" },
    });
    // Box-whisker only fields are not carried over to a series chart
    expect(item).not.toHaveProperty("clipMin");
  });

  it("maps the filters and reference standard deviation of a Taylor diagram", () => {
    const item = toExplorerCardContent(
      makeContent({
        type: "taylor-diagram",
        other_filters: { region: "global" },
        reference_stddev: 1.5,
        metric_units: "ignored",
      }),
    );

    expect(item).toEqual({
      provider: "ilamb",
      diagnostic: "amoc",
      title: "Content",
      type: "taylor-diagram",
      otherFilters: { region: "global" },
      referenceStddev: 1.5,
    });
  });

  it("maps the filename filter of a figure gallery", () => {
    const item = toExplorerCardContent(
      makeContent({ type: "figure-gallery", filename_filter: "bias" }),
    );

    expect(item).toEqual({
      provider: "ilamb",
      diagnostic: "amoc",
      title: "Content",
      type: "figure-gallery",
      filenameFilter: "bias",
    });
  });

  it("leaves null fields undefined", () => {
    const item = toExplorerCardContent(
      makeContent({
        type: "series-chart",
        description: null,
        interpretation: null,
        span: null,
        reference_datasets: null,
        metric_units: null,
        other_filters: null,
        symmetrical_axes: null,
        grouping_config: null,
        filter_controls: null,
        label_template: null,
      }),
    );

    for (const [key, value] of Object.entries(item)) {
      if (!["provider", "diagnostic", "title", "type"].includes(key)) {
        expect(value, key).toBeUndefined();
      }
    }
  });

  it("leaves null fields of a grouping config and filter control undefined", () => {
    const item = toExplorerCardContent(
      makeContent({
        grouping_config: {
          group_by: "source_id",
          hue: "source_id",
          style: null,
        },
        filter_controls: [
          {
            filter_key: "region",
            label: null,
            default_value: null,
            exclude_values: null,
          },
        ],
      }),
    );

    expect(item).toMatchObject({
      groupingConfig: {
        groupBy: "source_id",
        hue: "source_id",
        style: undefined,
      },
      filterControls: [
        {
          filterKey: "region",
          label: undefined,
          defaultValue: undefined,
          excludeValues: undefined,
        },
      ],
    });
  });
});

describe("buildCollectionGroups", () => {
  function makeCollection(
    id: string,
    explorerCards: AftCollectionCard[],
  ): AftCollectionDetail {
    return {
      id,
      name: `Collection ${id}`,
      diagnostics: [],
      explorer_cards: explorerCards,
    };
  }

  it("leaves out placeholder cards and content, and collections without cards", () => {
    const shown = makeCollection("1", [
      makeCard(
        "Card",
        { provider: "ilamb", diagnostic: "amoc", title: "Shown" },
        {
          provider: "ilamb",
          diagnostic: "amoc",
          title: "Hidden",
          placeholder: true,
        },
      ),
      { ...makeCard("Placeholder card"), placeholder: true },
    ]);
    const empty = makeCollection("2", [
      { ...makeCard("Placeholder card"), placeholder: true },
    ]);

    const groups = buildCollectionGroups({
      slug: "ocean",
      title: "Ocean",
      collections: [shown, empty],
      explorer_cards: [],
    });

    expect(groups).toHaveLength(1);
    expect(groups[0].collection).toBe(shown);
    expect(groups[0].cards).toEqual([
      {
        title: "Card",
        description: undefined,
        content: [expect.objectContaining({ title: "Shown" })],
      },
    ]);
  });
});
