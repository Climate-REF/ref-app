import { Link } from "@tanstack/react-router";
import type {
  AftCollectionContent,
  AftCollectionDetail,
} from "@/client/types.gen";
import { Badge } from "@/components/ui/badge";

interface CollectionHeaderProps {
  collection: AftCollectionDetail;
  plainLanguage: boolean;
}

function getDescription(
  content: AftCollectionContent | null | undefined,
  plainLanguage: boolean,
): string | null | undefined {
  if (!content) return null;
  if (plainLanguage && content.plain_language?.description) {
    return content.plain_language.description;
  }
  return content.description;
}

function getWhyItMatters(
  content: AftCollectionContent | null | undefined,
  plainLanguage: boolean,
): string | null | undefined {
  if (!content) return null;
  if (plainLanguage && content.plain_language?.why_it_matters) {
    return content.plain_language.why_it_matters;
  }
  return content.why_it_matters;
}

function getTakeaway(
  content: AftCollectionContent | null | undefined,
  plainLanguage: boolean,
): string | null | undefined {
  if (!content) return null;
  if (plainLanguage && content.plain_language?.takeaway) {
    return content.plain_language.takeaway;
  }
  return content.takeaway;
}

/** Format a slug like "enso" into "Enso" or "annual-cycle" into "Annual Cycle" */
function formatSlug(slug: string): string {
  return slug
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function CollectionHeader({
  collection,
  plainLanguage,
}: CollectionHeaderProps) {
  const description = getDescription(collection.content, plainLanguage);
  const whyItMatters = getWhyItMatters(collection.content, plainLanguage);
  const takeaway = getTakeaway(collection.content, plainLanguage);

  return (
    <div className="max-w-prose space-y-4 pb-2">
      <div className="flex items-center gap-3 flex-wrap">
        <h3 className="text-xl font-semibold">
          {collection.id}. {collection.name}
        </h3>
        {collection.endorser && (
          <Badge variant="secondary" className="text-xs">
            {collection.endorser}
          </Badge>
        )}
      </div>

      {description && (
        <p className="text-base text-muted-foreground leading-relaxed">
          {description}
        </p>
      )}

      {whyItMatters && (
        <div className="border-l-2 border-primary/30 pl-4 py-1">
          <p className="text-sm font-medium text-foreground mb-1">
            Why it matters
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {whyItMatters}
          </p>
        </div>
      )}

      {takeaway && (
        <div className="border-l-2 border-primary/30 pl-4 py-1">
          <p className="text-sm font-medium text-foreground mb-1">Takeaway</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {takeaway}
          </p>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {collection.reference_dataset && (
          <Badge variant="outline" className="text-xs font-normal">
            Ref: {collection.reference_dataset}
          </Badge>
        )}

        {collection.diagnostics.map((d) => (
          <Link
            key={`${d.provider_slug}/${d.diagnostic_slug}`}
            to="/diagnostics/$providerSlug/$diagnosticSlug"
            params={{
              providerSlug: d.provider_slug,
              diagnosticSlug: d.diagnostic_slug,
            }}
          >
            <Badge
              variant="outline"
              className="text-xs font-normal hover:bg-accent cursor-pointer"
            >
              {formatSlug(d.provider_slug)} / {formatSlug(d.diagnostic_slug)}
            </Badge>
          </Link>
        ))}
      </div>
    </div>
  );
}
