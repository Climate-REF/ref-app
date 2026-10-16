import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import type { DiagnosticCatalogEntry } from "@/client";
import { diagnosticsCatalogOptions } from "@/client/@tanstack/react-query.gen";

export type DiagnosticLookup = (
  providerSlug: string,
  diagnosticSlug: string,
) => DiagnosticCatalogEntry | undefined;

/**
 * Resolve a diagnostic from its provider and diagnostic slugs
 *
 * Execution groups only carry the slugs, so pages showing their diagnostic's name look it up here.
 * The lookup returns undefined until the catalog loads, or for a diagnostic the catalog does not list.
 */
export function useDiagnosticLookup(): DiagnosticLookup {
  const { data } = useQuery(diagnosticsCatalogOptions());

  const bySlug = useMemo(
    () =>
      new Map(
        (data?.data ?? []).map((entry) => [
          `${entry.provider.slug}/${entry.slug}`,
          entry,
        ]),
      ),
    [data],
  );

  return useCallback(
    (providerSlug, diagnosticSlug) =>
      bySlug.get(`${providerSlug}/${diagnosticSlug}`),
    [bySlug],
  );
}
