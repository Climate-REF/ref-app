import { useEffect, useMemo } from "react";
import type { AftCollectionDetail } from "@/client/types.gen";
import { CollectionHeader } from "@/components/explorer/collectionHeader";
import { ExplorerCardGroup } from "@/components/explorer/explorerCardGroup";
import type { ExplorerCard as ExplorerCardType } from "@/components/explorer/types";
import { TooltipProvider } from "@/components/ui/tooltip.tsx";
import {
  cardSearchNamespace,
  uniqueSearchNamespaces,
} from "./content/filterControls";

interface CollectionGroup {
  collection: AftCollectionDetail;
  cards: ExplorerCardType[];
}

interface ExplorerThemeLayoutProps {
  collectionGroups: CollectionGroup[];
  plainLanguage: boolean;
}

/** The URL namespace of every content item of every card, in page order. */
function searchNamespaces(collectionGroups: CollectionGroup[]): string[] {
  const namespaces = collectionGroups.flatMap((group) =>
    group.cards.flatMap((card) =>
      card.content.map((_, index) =>
        cardSearchNamespace(group.collection.id, card.title, index),
      ),
    ),
  );
  return uniqueSearchNamespaces(namespaces);
}

export const ExplorerThemeLayout = ({
  collectionGroups,
  plainLanguage,
}: ExplorerThemeLayoutProps) => {
  // Scroll to card if hash is present in URL
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      setTimeout(() => {
        const element = document.getElementById(hash);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    }
  }, []);

  const namespaces = useMemo(
    () => searchNamespaces(collectionGroups),
    [collectionGroups],
  );

  let namespaceCursor = 0;
  return (
    <TooltipProvider>
      <div className="flex flex-col gap-16 min-h-0">
        {collectionGroups.map((group, index) => (
          <section
            key={group.collection.id}
            className={index > 0 ? "border-t pt-12" : ""}
          >
            <div className="pb-4">
              <CollectionHeader
                collection={group.collection}
                plainLanguage={plainLanguage}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {group.cards.map((card) => {
                const cardNamespaces = namespaces.slice(
                  namespaceCursor,
                  namespaceCursor + card.content.length,
                );
                namespaceCursor += card.content.length;
                return (
                  <ExplorerCardGroup
                    key={card.title}
                    card={card}
                    searchNamespaces={cardNamespaces}
                  />
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </TooltipProvider>
  );
};
