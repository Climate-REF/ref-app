import { stat } from "fs";
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
        groupingConfig: {
          groupBy: "statistic",
          hue: "statistic",
        },
        otherFilters: {
          region: "None",
          metric: "Bias",
          statistic: "Period Mean",
        },
      },

      {
        type: "box-whisker-chart",
        provider: "ilamb",
        diagnostic: "so-woa2023-surface",
        title: "Sea Surface Salinity",
        metricUnits: "psu",
        groupingConfig: {
          groupBy: "statistic",
          hue: "statistic",
        },
        otherFilters: {
          region: "None",
          metric: "Bias",
          statistic: "Period Mean",
        },
      },
      {
        type: "box-whisker-chart",
        provider: "ilamb",
        diagnostic: "thetao-woa2023-surface",
        title: "Sea Surface Temperature",
        metricUnits: "K",
        groupingConfig: {
          groupBy: "statistic",
          hue: "statistic",
        },
        otherFilters: {
          region: "None",
          metric: "Bias",
          statistic: "Period Mean",
        },
      },
    ],
    placeholder: true,
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
          groupBy: "metric",
          hue: "metric",
        },
      },
    ],
    placeholder: true,
  },
];

export function SeaTheme() {
  return <ExplorerThemeLayout cards={cards} />;
}
