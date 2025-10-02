import type { ExplorerCard } from "@/components/explorer/types";
import { ExplorerThemeLayout } from "../explorerThemeLayout";

const cards: ExplorerCard[] = [
  {
    title: "Terrestrial Carbon Cycle",
    description:
      "The exchange of carbon between the land surface and the atmosphere.",
    placeholder: true,
    content: [
      {
        type: "box-whisker-chart",
        provider: "ilamb",
        diagnostic: "gpp-fluxnet2015",
        title: "Gross Primary Production (GPP)",
        metricUnits: "kgC/m^2/s",
        otherFilters: { region: "global" },
        groupingConfig: {
          groupBy: "metric",
          hue: "metric",
        },
      },
      {
        type: "series-chart",
        provider: "ilamb",
        diagnostic: "gpp-fluxnet2015",
        title: "Gross Primary Production (GPP) Annual Cycle",
        description: "Calculated as the mean seasonal cycle over 2001-2010",
        span: 2,
        metricUnits: "kgC/m^2/s",
        otherFilters: {
          metric: "cycle_global",
        },
        groupingConfig: {
          groupBy: "source_id",
          hue: "source_id",
        },
        placeholder: true,
      },
      {
        type: "box-whisker-chart",
        provider: "ilamb",
        diagnostic: "nbp-hoffman",
        title: "Net Biome Production",
        description:
          "Bias in Net Biome Production (NBP) compared to Hoffman et al. (2020) estimates",
        metricUnits: "PgC/yr",
        clipMax: 2000,
        groupingConfig: {
          groupBy: "statistic",
          hue: "statistic",
        },
        placeholder: true,
      },
      {
        type: "box-whisker-chart",
        provider: "ilamb",
        diagnostic: "csoil-hwsd2",
        title: "Soil Carbon",
        description: "Bias in Soil Carbon Content compared to HWSDv2",
        metricUnits: "kg/m^2",
        otherFilters: { statistic: "Bias" },
        groupingConfig: {
          groupBy: "region",
          hue: "region",
        },
      },
    ],
  },
  {
    title: "Terrestrial Model Performance",
    description:
      "Taylor diagram showing correlation and normalized standard deviation for model spatial distributions. A taylor diagram is a polar plot that graphically summarizes how closely a pattern (or a set of patterns) matches observations. The radial distance from the origin represents the normalized standard deviation, while the angle represents the correlation coefficient.",
    content: [
      {
        type: "taylor-diagram",
        provider: "ilamb",
        diagnostic: "gpp-fluxnet2015",
        title: "GPP Spatial Performance",
        description:
          "Model performance in reproducing spatial patterns of Gross Primary Production (GPP) compared to FLUXNET2015 observations.",
        interpretation:
          "Points closer to the reference (black square) indicate better model performance. Distance from the origin represents RMSE.",
        span: 1,
        otherFilters: { region: "global" },
        referenceStddev: 1.0,
      },
    ],
  },
  {
    title: "Land Surface & Hydrology",
    description:
      "Properties of the land surface including snow, soil moisture, and runoff.",
    content: [
      {
        type: "box-whisker-chart",
        provider: "ilamb",
        diagnostic: "snc-esacci",
        title: "Snow Cover Extent",
        metricUnits: "%",
        groupingConfig: {
          groupBy: "statistic",
          hue: "statistic",
        },
        otherFilters: {
          region: "global",
          metric: "Bias",
        },
      },
      {
        type: "box-whisker-chart",
        provider: "ilamb",
        diagnostic: "mrsos-wangmao",
        title: "Surface Soil Moisture",
        metricUnits: "kg/m^2",
        groupingConfig: {
          groupBy: "statistic",
          hue: "statistic",
        },
        otherFilters: {
          region: "global",
          metric: "Bias",
        },
      },
      {
        type: "box-whisker-chart",
        provider: "ilamb",
        diagnostic: "mrro-lora",
        title: "Total Runoff",
        metricUnits: "kg/m^2/s",
        groupingConfig: {
          groupBy: "statistic",
          hue: "statistic",
        },
        otherFilters: {
          region: "global",
          metric: "Bias",
        },
      },
      {
        type: "box-whisker-chart",
        provider: "ilamb",
        diagnostic: "lai-avh15c1",
        title: "Leaf Area Index",
        metricUnits: "1",
        groupingConfig: {
          groupBy: "statistic",
          hue: "statistic",
        },
        otherFilters: {
          region: "global",
          metric: "Bias",
        },
      },
    ],
  },
];

export function LandTheme() {
  return <ExplorerThemeLayout cards={cards} />;
}
