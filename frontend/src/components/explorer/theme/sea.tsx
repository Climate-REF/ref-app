import {
  ExplorerCard,
  ExplorerThemeLayout,
} from "./_components/explorerThemeLayout";

const cards: ExplorerCard[] = [
  {
    title: "Ocean State",
    description: "Key indicators of ocean health, circulation, and heat content.",
    content: [
      {
        type: "ensemble-chart",
        provider: "ilamb",
        diagnostic: "amoc-rapid",
        title: "AMOC Strength",
        metricUnits: "Sv",
      },
      {
        type: "ensemble-chart",
        provider: "ilamb",
        diagnostic: "ohc-noaa",
        title: "Ocean Heat Content Anomaly",
        metricUnits: "J",
      },
      {
        type: "ensemble-chart",
        provider: "ilamb",
        diagnostic: "so-woa2023-surface",
        title: "Sea Surface Salinity",
        metricUnits: "psu",
      },
      {
        type: "ensemble-chart",
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
        type: "ensemble-chart",
        provider: "esmvaltool",
        diagnostic: "sea-ice-area-basic",
        title: "Sea Ice Area",
        metricUnits: "km^2",
        xAxis: "region",
      },
    ],
  },
];

export function SeaTheme() {
  return <ExplorerThemeLayout cards={cards} />;
}