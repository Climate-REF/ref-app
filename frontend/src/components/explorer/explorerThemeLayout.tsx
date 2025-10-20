import { useEffect } from "react";
import { ExplorerCard } from "@/components/explorer/explorerCard";
import type { ExplorerCard as ExplorerCardType } from "@/components/explorer/types";
import { TooltipProvider } from "@/components/ui/tooltip.tsx";

// Re-export types for backward compatibility
export type {
  ExplorerCard as ExplorerCardType,
  ExplorerCardContent,
} from "@/components/explorer/types";

interface ExplorerThemeLayoutProps {
  cards: ExplorerCardType[];
}

export const ExplorerThemeLayout = ({ cards }: ExplorerThemeLayoutProps) => {
  // Scroll to card if hash is present in URL
  useEffect(() => {
    const hash = window.location.hash.slice(1); // Remove the # character
    if (hash) {
      // Use setTimeout to ensure the DOM is fully rendered
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
      <div className="flex flex-col gap-4 min-h-0">
        {cards.map((card) => (
          <div key={card.title} className="flex-1">
            <ExplorerCard card={card} />
          </div>
        ))}
      </div>
    </TooltipProvider>
  );
};
