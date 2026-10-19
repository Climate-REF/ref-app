import type { AftCollectionContent, ThemeDetail } from "@/client/types.gen";

/** The texts of a collection that can have a plain language version. */
const PLAIN_LANGUAGE_FIELDS = [
  "description",
  "why_it_matters",
  "takeaway",
] as const;

type PlainLanguageField = (typeof PLAIN_LANGUAGE_FIELDS)[number];

/** A text of a collection, in plain language when asked for and the collection has it. */
export function collectionText(
  content: AftCollectionContent | null | undefined,
  field: PlainLanguageField,
  plainLanguage: boolean,
): string | null | undefined {
  if (!content) return null;
  if (plainLanguage && content.plain_language?.[field]) {
    return content.plain_language[field];
  }
  return content[field];
}

/** True when at least one collection carries a plain language summary worth toggling to. */
export function hasPlainLanguageContent(theme: ThemeDetail): boolean {
  return theme.collections.some((c) =>
    PLAIN_LANGUAGE_FIELDS.some((field) => c.content?.plain_language?.[field]),
  );
}
