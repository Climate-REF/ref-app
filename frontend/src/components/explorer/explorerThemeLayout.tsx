import { useEffect } from "react";
import type { AftCollectionDetail } from "@/client/types.gen";
import { CollectionHeader } from "@/components/explorer/collectionHeader";
import { ExplorerCardGroup } from "@/components/explorer/explorerCardGroup";
import type { ExplorerCard as ExplorerCardType } from "@/components/explorer/types";
import { TooltipProvider } from "@/components/ui/tooltip.tsx";

interface CollectionGroup {
  collection: AftCollectionDetail;
  cards: ExplorerCardType[];
}

interface ExplorerThemeLayoutProps {
  collectionGroups: CollectionGroup[];
  plainLanguage: boolean;
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
            <div className="flex flex-col gap-4">
              {group.cards.map((card) => (
                <div key={card.title} className="flex-1">
                  <ExplorerCardGroup card={card} />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </TooltipProvider>
  );
};
