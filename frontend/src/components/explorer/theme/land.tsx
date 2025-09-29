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
