import { describe, expect, it } from "vitest";
import type { AftCollectionCard } from "@/client/types.gen";
import { filterExplorerContentForDiagnostic } from "./thematicContent";

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
