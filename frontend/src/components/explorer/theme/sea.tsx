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
      {
        type: "taylor-diagram",
        provider: "ilamb",
        diagnostic: "thetao-woa2023-surface",
        title: "Sea Surface Temperature (Taylor Diagram)",
        description:
          "Taylor diagram showing the performance of global sea surface temperatures against WOA2023 observations. Taylor diagrams summarize how closely models match observations in terms of correlation, standard deviation, and root-mean-square difference.",
        interpretation:
          "Points closer to the reference (black square) indicate better model performance. Distance from the origin represents RMSE.",
        otherFilters: {
          region: "None",
          metric: "Spatial Distribution",
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
