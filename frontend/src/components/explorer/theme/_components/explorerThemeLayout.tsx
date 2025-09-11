import { TooltipProvider } from "@/components/ui/tooltip.tsx";
import { ExplorerCard } from "@/components/explorer/theme/_components/explorerCard";
import type { ExplorerCard as ExplorerCardType } from "@/components/explorer/types";

// Re-export types for backward compatibility
export type {
  ExplorerCardContent,
  ExplorerCard as ExplorerCardType,
} from "@/components/explorer/types";

interface ExplorerThemeLayoutProps {
  cards: ExplorerCardType[];
}

export const ExplorerThemeLayout = ({ cards }: ExplorerThemeLayoutProps) => {
  return (
    <TooltipProvider>
      <div className="flex flex-col gap-4">
        {cards.map((card) => (
          <ExplorerCard key={card.title} card={card} />
        ))}
      </div>
    </TooltipProvider>
  );
};
