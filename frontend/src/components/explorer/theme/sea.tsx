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
          metric: "timeseries",
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
    title: "Sea Ice",
    description: "Sea Ice Area Seasonal Cycle",
    content: [
      {
        type: "series-chart",
        provider: "esmvaltool",
        diagnostic: "sea-ice-area-basic",
        title: "Sea Ice Area Seasonal Cycle (Southern Hemisphere)",
        description:
          "20-year average seasonal cycle of the sea ice area in the Southern Hemisphere  (OSISAF-CCI reference data currently missing).",
        span: 1,
        metricUnits: "1e6 km^2",
        otherFilters: {
          region: "Southern Hemisphere",
          isolate_ids:
            "568191,568195,568199,568203,568207,568211,568215,568219,568223,568227,568231,568235,568239,568243,568247,568251,568255,568259,568263,568267,568271,568275,568279,568283,568287,568291,568295,568299,568303,568307,568311,568315,568319,568323,568327,568331,568335,568339,568343,568347,568351,568355,568359,568363,568367,568371,568375,568379,568383,568387,568391,568395,568399,568403,568407,568411,568415,568419,568423,568427,568431,568435,568439,568443,568447,568451,568455,568459,568463,568467,568471,568475,568479,568483,568487,568491,568495,568499,568503,568507,568511,568515,568519,568523,568527,568531,568535,568541,568545,568561,568585,568589,568593,568601,568609,568621,568627,568635,568639,568643",
          exclude_ids: "568564,568570",
        },
        groupingConfig: {
          groupBy: "source_id",
          hue: "source_id",
        },
      },
      {
        type: "series-chart",
        provider: "esmvaltool",
        diagnostic: "sea-ice-area-basic",
        title: "Sea Ice Area Seasonal Cycle (Northern Hemisphere)",
        description:
          "20-year average seasonal cycle of the sea ice area in the Northern Hemisphere (OSISAF-CCI reference data currently missing).",
        span: 1,
        metricUnits: "1e6 km^2",
        otherFilters: {
          statistic: "20-year average seasonal cycle of the sea ice area",
          exclude_ids: "568564,568570",
          region: "Northern Hemisphere",
        },
        groupingConfig: {
          groupBy: "source_id",
          hue: "source_id",
        },
      },
    ],
    placeholder: true,
  },
];

export function SeaTheme() {
  return <ExplorerThemeLayout cards={cards} />;
}
