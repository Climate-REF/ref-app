import { FigureGallery } from "@/components/diagnostics/figureGallery";
import { useFacetedFilter } from "@/hooks/useFacetedFilter";
import type { ExplorerCardContent } from "../types";

interface FigureGalleryContentProps {
  contentItem: Extract<ExplorerCardContent, { type: "figure-gallery" }>;
  /** When set, keep the gallery's filter in this namespace of the URL's search params */
  searchNamespace?: string;
}

/**
 * A gallery whose filter is stored in the URL under `searchNamespace`.
 *
 * The card's filename filter is the text filter until the visitor changes it. It is not
 * written to the URL, so only a change is, and clearing it is kept as an empty text param.
 */
function NamespacedFigureGallery({
  contentItem,
  searchNamespace,
}: FigureGalleryContentProps & { searchNamespace: string }) {
  const { filter, setFilter } = useFacetedFilter(
    searchNamespace,
    contentItem.filenameFilter ?? "",
  );

  return (
    <FigureGallery
      providerSlug={contentItem.provider}
      diagnosticSlug={contentItem.diagnostic}
      pageSize={12}
      filter={filter}
      onFilterChange={setFilter}
    />
  );
}

export function FigureGalleryContent({
  contentItem,
  searchNamespace,
}: FigureGalleryContentProps) {
  if (searchNamespace) {
    return (
      <NamespacedFigureGallery
        contentItem={contentItem}
        searchNamespace={searchNamespace}
      />
    );
  }

  return (
    <FigureGallery
      providerSlug={contentItem.provider}
      diagnosticSlug={contentItem.diagnostic}
      pageSize={12}
      initialFilter={contentItem.filenameFilter}
    />
  );
}
