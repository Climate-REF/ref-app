import type { ExplorerCard } from "@/components/explorer/types";
import { ExplorerThemeLayout } from "../explorerThemeLayout";

const cards: ExplorerCard[] = [
  {
    title: "Warming Levels",
    description:
      "Climate conditions at different global warming levels, relevant to policy targets.",
    content: [
      {
        type: "figure-gallery",
        provider: "esmvaltool",
        diagnostic: "climate-at-global-warming-levels",
        title: "Global Mean Temperature Change at Warming Levels",
        span: 2,
        placeholder: true,
      },
    ],
  },
];

export function ImpactAndAdaptationTheme() {
  return <ExplorerThemeLayout cards={cards} />;
}
