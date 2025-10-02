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
        title: "Gross Primary Production",
        metricUnits: "kgC/m^2/s",
        otherFilters: { region: "global" },
        groupingConfig: {
          groupBy: "metric",
          hue: "metric",
        },
      },
      {
        type: "box-whisker-chart",
        provider: "ilamb",
        diagnostic: "nbp-hoffman",
        title: "Net Biome Production",
        metricUnits: "PgC/yr",
        clipMax: 2000,
        groupingConfig: {
          groupBy: "metric",
          hue: "metric",
        },
      },
      {
        type: "box-whisker-chart",
        provider: "ilamb",
        diagnostic: "csoil-hwsd2",
        title: "Soil Carbon",
        metricUnits: "kgC/m^2",
        groupingConfig: {
          groupBy: "metric",
          hue: "metric",
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
          "Model performance in reproducing spatial patterns of Gross Primary Production",
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
          groupBy: "metric",
          hue: "metric",
        },
      },
      {
        type: "box-whisker-chart",
        provider: "ilamb",
        diagnostic: "mrsos-wangmao",
        title: "Surface Soil Moisture",
        metricUnits: "kg/m^2",
        groupingConfig: {
          groupBy: "metric",
          hue: "metric",
        },
      },
      {
        type: "box-whisker-chart",
        provider: "ilamb",
        diagnostic: "mrro-lora",
        title: "Total Runoff",
        metricUnits: "kg/m^2/s",
        groupingConfig: {
          groupBy: "metric",
          hue: "metric",
        },
      },
      {
        type: "box-whisker-chart",
        provider: "ilamb",
        diagnostic: "lai-avh15c1",
        title: "Leaf Area Index",
        metricUnits: "1",
        groupingConfig: {
          groupBy: "metric",
          hue: "metric",
        },
      },
    ],
  },
];

export function LandTheme() {
  return <ExplorerThemeLayout cards={cards} />;
}
