const BASE_TITLE = "Climate-REF";

/**
 * The document title for the matched routes, from the most specific route that sets `staticData.title`
 *
 * Matches run from the root to the current route, so a nested route's title wins over its layout's.
 * Without a title anywhere it is the site name alone.
 */
export function titleFromMatches(
  matches: readonly { staticData?: { title?: unknown } }[],
): string {
  const title = matches
    .map((match) => match.staticData?.title)
    .findLast((title) => typeof title === "string" && title !== "");
  return title ? `${title} - ${BASE_TITLE}` : BASE_TITLE;
}
