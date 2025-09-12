import type { ExplorerCard } from "@/components/explorer/types";
import { ExplorerThemeLayout } from "../explorerThemeLayout";

const cards: ExplorerCard[] = [
  {
    title: "Terrestrial Carbon Cycle",
    description:
      "The exchange of carbon between the land surface and the atmosphere.",
    content: [
      {
        type: "box-whisker-chart",
        provider: "ilamb",
        diagnostic: "gpp-fluxnet2015",
        title: "Gross Primary Production",
        metricUnits: "kgC/m^2/s",
      },
      {
        type: "box-whisker-chart",
        provider: "ilamb",
        diagnostic: "nbp-hoffman",
        title: "Net Biome Production",
        metricUnits: "PgC/yr",
      },
      {
        type: "box-whisker-chart",
        provider: "ilamb",
        diagnostic: "csoil-hwsd2",
        title: "Soil Carbon",
        metricUnits: "kgC/m^2",
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
      },
      {
        type: "box-whisker-chart",
        provider: "ilamb",
        diagnostic: "mrsos-wangmao",
        title: "Surface Soil Moisture",
        metricUnits: "kg/m^2",
      },
      {
        type: "box-whisker-chart",
        provider: "ilamb",
        diagnostic: "mrro-lora",
        title: "Total Runoff",
        metricUnits: "kg/m^2/s",
      },
      {
        type: "box-whisker-chart",
        provider: "ilamb",
        diagnostic: "lai-avh15c1",
        title: "Leaf Area Index",
        metricUnits: "1",
      },
    ],
  },
];

export function LandTheme() {
  return <ExplorerThemeLayout cards={cards} />;
}
