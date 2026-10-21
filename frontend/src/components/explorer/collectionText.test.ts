import { describe, expect, it } from "vitest";
import type {
  AftCollectionContent,
  AftCollectionDetail,
  ThemeDetail,
} from "@/client/types.gen";
import { collectionText, hasPlainLanguageContent } from "./collectionText";

const content: AftCollectionContent = {
  description: "Technical description",
  why_it_matters: "Technical why",
  takeaway: "Technical takeaway",
  plain_language: {
    description: "Plain description",
    why_it_matters: "Plain why",
    takeaway: null,
  },
};

describe("collectionText", () => {
  it("returns the technical text unless plain language is asked for", () => {
    expect(collectionText(content, "description", false)).toBe(
      "Technical description",
    );
    expect(collectionText(content, "why_it_matters", false)).toBe(
      "Technical why",
    );
  });

  it("returns the plain language text when asked for", () => {
    expect(collectionText(content, "description", true)).toBe(
      "Plain description",
    );
    expect(collectionText(content, "why_it_matters", true)).toBe("Plain why");
  });

  it("falls back to the technical text when there is no plain language one", () => {
    expect(collectionText(content, "takeaway", true)).toBe(
      "Technical takeaway",
    );
    expect(
      collectionText({ takeaway: "Only technical" }, "takeaway", true),
    ).toBe("Only technical");
  });

  it("returns null for a collection without content", () => {
    expect(collectionText(null, "description", true)).toBeNull();
    expect(collectionText(undefined, "takeaway", false)).toBeNull();
  });
});

describe("hasPlainLanguageContent", () => {
  function makeTheme(
    ...contents: (AftCollectionContent | null)[]
  ): ThemeDetail {
    return {
      slug: "ocean",
      title: "Ocean",
      explorer_cards: [],
      collections: contents.map(
        (c, i): AftCollectionDetail => ({
          id: String(i),
          name: `Collection ${i}`,
          diagnostics: [],
          explorer_cards: [],
          content: c,
        }),
      ),
    };
  }

  it("is true when any collection has a plain language text", () => {
    expect(
      hasPlainLanguageContent(
        makeTheme(null, { plain_language: { takeaway: "Plain takeaway" } }),
      ),
    ).toBe(true);
  });

  it("is false when no collection has a plain language text", () => {
    expect(
      hasPlainLanguageContent(
        makeTheme(null, { description: "Technical" }, { plain_language: {} }),
      ),
    ).toBe(false);
  });
});
