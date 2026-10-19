import type { Facet } from "./types";

/**
 * Move the facets named in `lastKeys` to the end, keeping the order of both parts.
 */
export function orderFacets(facets: Facet[], lastKeys: string[] = []): Facet[] {
  const isLast = (facet: Facet) => lastKeys.includes(facet.key);
  return [
    ...facets.filter((facet) => !isLast(facet)),
    ...facets.filter(isLast),
  ];
}
