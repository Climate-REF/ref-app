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
