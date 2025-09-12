import type { ExplorerCard } from "@/components/explorer/types";
import { ExplorerThemeLayout } from "../explorerThemeLayout";

const cards: ExplorerCard[] = [
  {
    title: "Ocean State",
    description:
      "Key indicators of ocean health, circulation, and heat content.",
    content: [
      {
        type: "box-whisker-chart",
        provider: "ilamb",
        diagnostic: "amoc-rapid",
        title: "AMOC Strength",
        metricUnits: "Sv",
      },
      {
        type: "box-whisker-chart",
        provider: "ilamb",
        diagnostic: "ohc-noaa",
        title: "Ocean Heat Content Anomaly",
        metricUnits: "J",
      },
      {
        type: "box-whisker-chart",
        provider: "ilamb",
        diagnostic: "so-woa2023-surface",
        title: "Sea Surface Salinity",
        metricUnits: "psu",
      },
      {
        type: "box-whisker-chart",
        provider: "ilamb",
        diagnostic: "thetao-woa2023-surface",
        title: "Sea Surface Temperature",
        metricUnits: "K",
      },
    ],
  },
  {
    title: "Cryosphere",
    description: "The state of Earth's sea ice.",
    content: [
      {
        type: "box-whisker-chart",
        provider: "esmvaltool",
        diagnostic: "sea-ice-area-basic",
        title: "Sea Ice Area",
        metricUnits: "km^2",
        groupingConfig: {
          groupBy: "region",
          hue: "season",
        },
      },
    ],
  },
];

export function SeaTheme() {
  return <ExplorerThemeLayout cards={cards} />;
}
