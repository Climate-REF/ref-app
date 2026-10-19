import { Link } from "@tanstack/react-router";
import type { AftCollectionDetail } from "@/client/types.gen";
import { Badge } from "@/components/ui/badge";
import { collectionText } from "./collectionText";

interface CollectionHeaderProps {
  collection: AftCollectionDetail;
  plainLanguage: boolean;
}

/** A titled text set off from the description by a rule on its left. */
function Callout({ title, text }: { title: string; text: string }) {
  return (
    <div className="border-l-2 border-primary/30 pl-4 py-1">
      <p className="text-sm font-medium text-foreground mb-1">{title}</p>
      <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
    </div>
  );
}

export function CollectionHeader({
  collection,
  plainLanguage,
}: CollectionHeaderProps) {
  const { content } = collection;
  const description = collectionText(content, "description", plainLanguage);
  const whyItMatters = collectionText(content, "why_it_matters", plainLanguage);
  const takeaway = collectionText(content, "takeaway", plainLanguage);

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

      {whyItMatters && <Callout title="Why it matters" text={whyItMatters} />}

      {takeaway && <Callout title="Takeaway" text={takeaway} />}

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
              {d.provider_slug} / {d.diagnostic_slug}
            </Badge>
          </Link>
        ))}
      </div>
    </div>
  );
}
