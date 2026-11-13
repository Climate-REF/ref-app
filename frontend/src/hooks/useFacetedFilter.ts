import { useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";
import {
  type FacetedFilterState,
  parseFacetedFilter,
  writeFacetedFilter,
} from "@/lib/facetedFilterSearch";

/**
 * The faceted filter stored in the current URL under `namespace`.
 *
 * Every param is `<namespace>.q` for the text filter and `<namespace>.<facetKey>`
 * for a facet, so several filters can share one page's search params. Without a text
 * param the text is `defaultText`, and text equal to it is not written to the URL.
 *
 * The filter keeps its identity until this namespace's params change, so a change to
 * another param of the page does not look like a change to this filter.
 */
export function useFacetedFilter(namespace: string, defaultText = "") {
  const search = useSearch({ strict: false });
  const navigate = useNavigate();

  const serialised = JSON.stringify(
    parseFacetedFilter(
      search as Record<string, unknown>,
      namespace,
      defaultText,
    ),
  );
  const filter = useMemo(
    () => JSON.parse(serialised) as FacetedFilterState,
    [serialised],
  );

  const setFilter = useCallback(
    (next: FacetedFilterState) => {
      navigate({
        // A `strict: false` search is wider than the router's params type.
        search: ((prev: Record<string, unknown>) =>
          writeFacetedFilter(prev, namespace, next, defaultText)) as any,
        replace: true,
        // A filter can sit far down the page, so changing it must not scroll to the top.
        resetScroll: false,
      });
    },
    [namespace, defaultText, navigate],
  );

  const updateFilter = useCallback(
    (patch: Partial<FacetedFilterState>) => {
      navigate({
        search: ((prev: Record<string, unknown>) =>
          writeFacetedFilter(
            prev,
            namespace,
            { ...parseFacetedFilter(prev, namespace, defaultText), ...patch },
            defaultText,
          )) as any,
        replace: true,
        resetScroll: false,
      });
    },
    [namespace, defaultText, navigate],
  );

  return { filter, setFilter, updateFilter };
}
