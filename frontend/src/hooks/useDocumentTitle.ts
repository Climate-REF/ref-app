import { useMatches } from "@tanstack/react-router";
import { titleFromMatches } from "@/lib/documentTitle";

/**
 * The document title for the current route, from the most specific route's `staticData.title`
 *
 * It is returned for use with React's <title> component.
 * For dynamic titles, a page can still render its own <title>, which overrides this one.
 */
export function useDocumentTitle() {
  return titleFromMatches(useMatches());
}
